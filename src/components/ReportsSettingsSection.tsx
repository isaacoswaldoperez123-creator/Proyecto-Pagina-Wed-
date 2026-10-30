import React, { useState } from 'react';
import {
  Download,
  Printer,
  Database,
  GitBranch,
  Shield,
  Sun,
  Moon,
  Monitor,
  RotateCcw,
  Check,
} from 'lucide-react';
import {
  CURRENCY_CONFIG,
  Category,
  SupportedCurrency,
  ThemeMode,
  Transaction,
  UserProfile,
  Wallet,
  formatMoney,
} from '../types/finance';
import { exportTransactionsToCSV } from '../lib/supabaseClient';

interface ReportsSettingsSectionProps {
  profile: UserProfile;
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  currency: SupportedCurrency;
  themeMode: ThemeMode;
  onUpdateProfile: (patch: Partial<UserProfile>) => void;
  onChangeCurrency: (c: SupportedCurrency) => void;
  onChangeThemeMode: (m: ThemeMode) => void;
  onResetDemoData: () => void;
}

export const ReportsSettingsSection: React.FC<ReportsSettingsSectionProps> = ({
  profile,
  transactions,
  categories,
  wallets,
  currency,
  themeMode,
  onUpdateProfile,
  onChangeCurrency,
  onChangeThemeMode,
  onResetDemoData,
}) => {
  const [fullName, setFullName] = useState(profile.fullName);
  const [savedNotice, setSavedNotice] = useState(false);
  const [activeDocTab, setActiveDocTab] = useState<'sql' | 'git' | 'env'>('sql');

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({ fullName: fullName.trim() || profile.fullName });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Reportes, Configuración y Arquitectura
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Exporta tu contabilidad a CSV o PDF, personaliza tu moneda y revisa el esquema SQL/RLS y flujo Git de producción.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 no-print">
          <button
            type="button"
            onClick={() =>
              exportTransactionsToCSV(
                transactions,
                categories,
                wallets,
                currency,
                'kaudal_estado_cuenta_completo.csv'
              )
            }
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Todo a CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            <span>Generar Estado de Cuenta PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Perfil de Usuario y Seguridad OAuth
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sesión autenticada con Google y protegida mediante Row Level Security.
              </p>
            </div>
            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nombre completo
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Correo verificado (Google OAuth)
              </label>
              <input
                type="email"
                disabled
                value={profile.email}
                className="w-full px-3.5 py-2 text-xs font-mono bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400 space-y-1">
              <div>auth.uid(): {profile.id}</div>
              <div>Moneda Base BD: USD (Conversión en tiempo real)</div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onResetDemoData}
                className="text-xs text-slate-500 hover:text-rose-600 inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar datos iniciales</span>
              </button>

              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                {savedNotice && <Check className="w-3.5 h-3.5" />}
                <span>{savedNotice ? 'Perfil Actualizado' : 'Guardar Perfil'}</span>
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-7 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Moneda de Visualización y Preferencia de Tema
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Todos los montos se almacenan en USD en PostgreSQL y se formatean al instante en la divisa elegida.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {(Object.keys(CURRENCY_CONFIG) as SupportedCurrency[]).map((code) => {
                const cfg = CURRENCY_CONFIG[code];
                const active = currency === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onChangeCurrency(code)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      active
                        ? 'border-emerald-600 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                      <span>{cfg.code}</span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-400">
                        {cfg.symbol}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {cfg.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">
                      1 USD = {cfg.rateFromUSD} {cfg.code}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Apariencia de la Interfaz (Persistencia automática y soporte del sistema)
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'light', label: 'Modo Claro', icon: Sun },
                  { id: 'dark', label: 'Modo Oscuro', icon: Moon },
                  { id: 'system', label: 'Según Sistema', icon: Monitor },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = themeMode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onChangeThemeMode(item.id as ThemeMode)}
                      className={`py-2.5 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                        active
                          ? 'border-slate-900 bg-slate-900 text-white dark:border-emerald-500 dark:bg-emerald-600'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <span className="text-slate-500">Balance Histórico Auditado:</span>{' '}
              <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                +{formatMoney(totalIncome, currency)}
              </strong>{' '}
              ingresos vs.{' '}
              <strong className="font-mono text-rose-600 dark:text-rose-400">
                -{formatMoney(totalExpense, currency)}
              </strong>{' '}
              gastos
            </div>
            <span className="font-mono text-slate-500">
              {transactions.length} movimientos totales
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden no-print">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Especificación Técnica: Base de Datos SQL, RLS y Flujo Git
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Documentación ejecutable lista para producción en Supabase y GitHub.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveDocTab('sql')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                activeDocTab === 'sql'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>1. Esquema PostgreSQL & RLS</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDocTab('env')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                activeDocTab === 'env'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>2. Seguridad & Variables (.env)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDocTab('git')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                activeDocTab === 'git'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>3. Comandos Git & Despliegue</span>
            </button>
          </div>
        </div>

        <div className="p-6 bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed">
          {activeDocTab === 'sql' && (
            <pre>{`-- Archivo: supabase/migrations/001_initial_schema.sql
-- Tablas: profiles, wallets, categories, favorite_places, transactions, wallet_transfers, budgets, savings_goals
-- Todas las tablas tienen RLS estricto:
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallets_all_own" ON public.wallets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_all_own" ON public.transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`}</pre>
          )}

          {activeDocTab === 'env' && (
            <pre>{`# Archivo: .env.example (Nunca subir .env.local ni tokens personales al repositorio)
VITE_SUPABASE_URL="https://tu-proyecto.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_GOOGLE_MAPS_API_KEY="AIzaSy_RESTRINGIDA_POR_DOMINIO_HTTP_REFERRER"
SUPABASE_SERVICE_ROLE_KEY="SOLO_EN_ENTORNO_SERVIDOR_NUNCA_EN_CLIENTE"`}</pre>
          )}

          {activeDocTab === 'git' && (
            <pre>{`# Flujo de ramas y Conventional Commits hacia GitHub:
git checkout -b main
git add .
git commit -m "feat(finance): build full-stack personal finance platform with RLS and geospatial map"
git remote add origin https://github.com/isaacoswaldoperez123-creator/Proyecto-Pagina-Wed-.git
git push -u origin main`}</pre>
          )}
        </div>
      </div>
    </div>
  );
};
