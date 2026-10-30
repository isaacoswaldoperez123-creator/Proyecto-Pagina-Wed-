-- ============================================================================
-- KAUDAL FINANZAS PERSONALES — ESQUEMA POSTGRESQL & POLÍTICAS RLS (SUPABASE)
-- Base de datos relacional con aislamiento estricto por usuario (auth.uid())
-- ============================================================================

-- 1. EXTENSIONES REQUERIDAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TIPOS ENUMERADOS
DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('income', 'expense');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE wallet_type AS ENUM ('cash', 'bank', 'card', 'savings');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method_type AS ENUM ('cash', 'debit_card', 'credit_card', 'bank_transfer', 'digital_wallet');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. TABLA DE PERFILES DE USUARIO (Sincronizada con auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  base_currency TEXT NOT NULL DEFAULT 'USD',
  display_currency TEXT NOT NULL DEFAULT 'USD',
  theme_preference TEXT NOT NULL DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
  monthly_global_budget NUMERIC(14, 2) DEFAULT 2500.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABLA DE CARTERAS / DINERO LÍQUIDO (Efectivo, Bancos, Tarjetas, Ahorros)
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  type wallet_type NOT NULL DEFAULT 'bank',
  currency TEXT NOT NULL DEFAULT 'USD',
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  institution TEXT,
  account_mask TEXT,
  is_liquid BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABLA DE CATEGORÍAS PERSONALIZABLES
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  type transaction_type NOT NULL,
  color_hex TEXT NOT NULL DEFAULT '#059669',
  icon_name TEXT NOT NULL DEFAULT 'Receipt',
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name, type)
);

-- 6. TABLA DE LUGARES FAVORITOS (Para registro rápido 1-toque en Mapa)
CREATE TABLE IF NOT EXISTS public.favorite_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id TEXT,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  zone TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  default_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TABLA PRINCIPAL DE MOVIMIENTOS (Ingresos y Gastos Geolocalizados)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  type transaction_type NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_or_merchant TEXT NOT NULL,
  note TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_interval TEXT CHECK (recurrence_interval IN ('weekly', 'biweekly', 'monthly', 'yearly') OR recurrence_interval IS NULL),
  payment_method payment_method_type NOT NULL DEFAULT 'debit_card',
  receipt_url TEXT,
  -- Campos de Geolocalización (Google Maps / Places API)
  place_id TEXT,
  place_name TEXT,
  place_address TEXT,
  place_zone TEXT,
  latitude DOUBLE PRECISION CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90)),
  longitude DOUBLE PRECISION CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. TABLA DE TRANSFERENCIAS ENTRE CARTERAS
CREATE TABLE IF NOT EXISTS public.wallet_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  to_wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT different_wallets CHECK (from_wallet_id <> to_wallet_id)
);

-- 9. TABLA DE PRESUPUESTOS MENSUALES POR CATEGORÍA
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL CHECK (month_key ~ '^\d{4}-\d{2}$'), -- Ejemplo: '2026-10'
  limit_amount NUMERIC(14, 2) NOT NULL CHECK (limit_amount > 0),
  alert_threshold_pct INTEGER NOT NULL DEFAULT 80 CHECK (alert_threshold_pct BETWEEN 10 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category_id, month_key)
);

-- 10. TABLA DE METAS DE AHORRO
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC(14, 2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (current_amount >= 0),
  target_date DATE,
  category_tag TEXT NOT NULL DEFAULT 'Emergencia',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES DE RENDIMIENTO
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_type ON public.categories(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON public.transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_geo ON public.transactions(user_id, latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_zone ON public.transactions(user_id, place_zone) WHERE place_zone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transfers_user_date ON public.wallet_transfers(user_id, transfer_date DESC);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON public.budgets(user_id, month_key);

-- ============================================================================
-- TRIGGERS TRANSACCIONALES PARA SALDOS EN TIEMPO REAL
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_sync_wallet_balance_on_tx()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'income' THEN
      UPDATE public.wallets SET balance = balance + NEW.amount, updated_at = NOW() WHERE id = NEW.wallet_id AND user_id = NEW.user_id;
    ELSE
      UPDATE public.wallets SET balance = balance - NEW.amount, updated_at = NOW() WHERE id = NEW.wallet_id AND user_id = NEW.user_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.type = 'income' THEN
      UPDATE public.wallets SET balance = balance - OLD.amount, updated_at = NOW() WHERE id = OLD.wallet_id AND user_id = OLD.user_id;
    ELSE
      UPDATE public.wallets SET balance = balance + OLD.amount, updated_at = NOW() WHERE id = OLD.wallet_id AND user_id = OLD.user_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Revertir efecto anterior
    IF OLD.type = 'income' THEN
      UPDATE public.wallets SET balance = balance - OLD.amount WHERE id = OLD.wallet_id AND user_id = OLD.user_id;
    ELSE
      UPDATE public.wallets SET balance = balance + OLD.amount WHERE id = OLD.wallet_id AND user_id = OLD.user_id;
    END IF;
    -- Aplicar nuevo efecto
    IF NEW.type = 'income' THEN
      UPDATE public.wallets SET balance = balance + NEW.amount, updated_at = NOW() WHERE id = NEW.wallet_id AND user_id = NEW.user_id;
    ELSE
      UPDATE public.wallets SET balance = balance - NEW.amount, updated_at = NOW() WHERE id = NEW.wallet_id AND user_id = NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_wallet_balance ON public.transactions;
CREATE TRIGGER trg_sync_wallet_balance
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_wallet_balance_on_tx();

-- Trigger para transferencias entre carteras
CREATE OR REPLACE FUNCTION public.fn_execute_wallet_transfer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.wallets SET balance = balance - NEW.amount, updated_at = NOW()
  WHERE id = NEW.from_wallet_id AND user_id = NEW.user_id;

  UPDATE public.wallets SET balance = balance + NEW.amount, updated_at = NOW()
  WHERE id = NEW.to_wallet_id AND user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_execute_wallet_transfer ON public.wallet_transfers;
CREATE TRIGGER trg_execute_wallet_transfer
AFTER INSERT ON public.wallet_transfers
FOR EACH ROW EXECUTE FUNCTION public.fn_execute_wallet_transfer();

-- ============================================================================
-- POLÍTICAS DE SEGURIDAD ROW LEVEL SECURITY (RLS) — AISLAMIENTO POR auth.uid()
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Políticas para wallets
CREATE POLICY "wallets_all_own" ON public.wallets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas para categories
CREATE POLICY "categories_all_own" ON public.categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas para favorite_places
CREATE POLICY "favorite_places_all_own" ON public.favorite_places FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas para transactions
CREATE POLICY "transactions_all_own" ON public.transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas para wallet_transfers
CREATE POLICY "wallet_transfers_all_own" ON public.wallet_transfers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas para budgets
CREATE POLICY "budgets_all_own" ON public.budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas para savings_goals
CREATE POLICY "savings_goals_all_own" ON public.savings_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
