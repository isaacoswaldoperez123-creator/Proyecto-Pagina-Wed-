/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  Wallet as WalletIcon,
  MapPin,
  Target,
  FileSpreadsheet,
  Sun,
  Moon,
  LogOut,
  Plus,
  Menu,
  X,
} from 'lucide-react';
import {
  AppSection,
  Category,
  CategoryBudget,
  FavoritePlace,
  PlaceLocation,
  SavingsGoal,
  SupportedCurrency,
  ThemeMode,
  Transaction,
  TransactionType,
  UserProfile,
  Wallet,
  WalletTransfer,
  formatMoney,
} from './types/finance';
import { rlsEngine } from './lib/supabaseClient';
import { AuthScreen } from './components/AuthScreen';
import { DashboardSection } from './components/DashboardSection';
import { IncomesSection } from './components/IncomesSection';
import { ExpensesSection } from './components/ExpensesSection';
import { WalletsSection } from './components/WalletsSection';
import { ExpensesMapSection } from './components/ExpensesMapSection';
import { BudgetsGoalsSection } from './components/BudgetsGoalsSection';
import { ReportsSettingsSection } from './components/ReportsSettingsSection';
import { TransactionModal } from './components/TransactionModal';

const NAV_ITEMS: Array<{
  id: AppSection;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Dashboard (Inicio)', shortLabel: 'Inicio', icon: LayoutDashboard },
  { id: 'incomes', label: 'Ingresos Entrantes', shortLabel: 'Ingresos', icon: TrendingUp },
  { id: 'expenses', label: 'Gastos y Compras', shortLabel: 'Gastos', icon: Receipt },
  { id: 'wallets', label: 'Dinero Líquido y Cuentas', shortLabel: 'Carteras', icon: WalletIcon },
  { id: 'map', label: 'Mapa de Gastos', shortLabel: 'Mapa', icon: MapPin },
  { id: 'budgets', label: 'Presupuestos y Metas', shortLabel: 'Metas', icon: Target },
  { id: 'reports', label: 'Reportes y Configuración', shortLabel: 'Reportes', icon: FileSpreadsheet },
];

export default function App() {
  // 1. Auth & RLS User State
  const [authUid, setAuthUid] = useState<string | null>(() =>
    rlsEngine.getSessionUserId()
  );
  const [profile, setProfile] = useState<UserProfile>(() =>
    rlsEngine.getUserProfile(rlsEngine.getSessionUserId() || 'usr_isaac_oswaldo_001')
  );

  // 2. Navigation & Period State
  const [activeSection, setActiveSection] = useState<AppSection>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // 3. Theme State (Light / Dark / System)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('kaudal_theme_mode_v1') as ThemeMode | null;
    return saved || 'system';
  });
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('kaudal_theme_mode_v1', themeMode);
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const shouldBeDark =
        themeMode === 'dark' || (themeMode === 'system' && mediaQuery.matches);
      setIsDark(shouldBeDark);
      document.documentElement.classList.toggle('dark', shouldBeDark);
    };

    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [themeMode]);

  const handleToggleQuickTheme = () => {
    setThemeMode(isDark ? 'light' : 'dark');
  };

  // 4. Financial Domain State (Filtered strictly by authUid via RLS Engine)
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favoritePlaces, setFavoritePlaces] = useState<FavoritePlace[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transfers, setTransfers] = useState<WalletTransfer[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);

  // Modal State
  const [txModalOpen, setTxModalOpen] = useState<boolean>(false);
  const [txModalType, setTxModalType] = useState<TransactionType>('expense');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [presetPlace, setPresetPlace] = useState<PlaceLocation | null>(null);
  const [focusedMapTx, setFocusedMapTx] = useState<Transaction | null>(null);

  const loadUserData = (uid: string) => {
    setProfile(rlsEngine.getUserProfile(uid));
    setWallets(rlsEngine.getWallets(uid));
    setCategories(rlsEngine.getCategories(uid));
    setFavoritePlaces(rlsEngine.getFavoritePlaces(uid));
    setTransactions(rlsEngine.getTransactions(uid));
    setTransfers(rlsEngine.getTransfers(uid));
    setBudgets(rlsEngine.getBudgets(uid));
    setSavingsGoals(rlsEngine.getSavingsGoals(uid));
  };

  useEffect(() => {
    if (authUid) {
      loadUserData(authUid);
    }
  }, [authUid]);

  // Auth Handlers
  const handleLogin = (uid: string) => {
    const user = rlsEngine.signInWithGoogleOAuth(uid);
    setAuthUid(user.id);
    loadUserData(user.id);
  };

  const handleLogout = () => {
    rlsEngine.signOut();
    setAuthUid(null);
  };

  // Transaction CRUD with real-time Wallet Balance synchronization (matching PostgreSQL trigger)
  const handleSaveTransaction = (
    txData: Omit<Transaction, 'id' | 'userId' | 'createdAt'>,
    existingId?: string
  ) => {
    if (!authUid) return;

    let updatedWallets = [...wallets];
    let updatedTransactions = [...transactions];

    if (existingId) {
      const oldTx = transactions.find((t) => t.id === existingId);
      if (oldTx) {
        // Revert old wallet balance impact
        updatedWallets = updatedWallets.map((w) => {
          if (w.id !== oldTx.walletId) return w;
          const reverted =
            oldTx.type === 'income'
              ? w.balance - oldTx.amount
              : w.balance + oldTx.amount;
          return { ...w, balance: Number(reverted.toFixed(2)) };
        });
      }

      // Apply new wallet balance impact
      updatedWallets = updatedWallets.map((w) => {
        if (w.id !== txData.walletId) return w;
        const nextBal =
          txData.type === 'income'
            ? w.balance + txData.amount
            : w.balance - txData.amount;
        return { ...w, balance: Number(nextBal.toFixed(2)) };
      });

      updatedTransactions = updatedTransactions.map((t) =>
        t.id === existingId
          ? { ...t, ...txData, id: existingId, userId: authUid }
          : t
      );
    } else {
      const newTx: Transaction = {
        ...txData,
        id: `tx_${Date.now()}`,
        userId: authUid,
        createdAt: new Date().toISOString(),
      };

      updatedWallets = updatedWallets.map((w) => {
        if (w.id !== newTx.walletId) return w;
        const nextBal =
          newTx.type === 'income'
            ? w.balance + newTx.amount
            : w.balance - newTx.amount;
        return { ...w, balance: Number(nextBal.toFixed(2)) };
      });

      updatedTransactions = [newTx, ...updatedTransactions];
    }

    updatedTransactions.sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
    );

    setWallets(rlsEngine.saveWallets(authUid, updatedWallets));
    setTransactions(rlsEngine.saveTransactions(authUid, updatedTransactions));
  };

  const handleDeleteTransaction = (id: string) => {
    if (!authUid) return;
    const target = transactions.find((t) => t.id === id);
    if (!target) return;

    const updatedWallets = wallets.map((w) => {
      if (w.id !== target.walletId) return w;
      const reverted =
        target.type === 'income'
          ? w.balance - target.amount
          : w.balance + target.amount;
      return { ...w, balance: Number(reverted.toFixed(2)) };
    });

    const updatedTransactions = transactions.filter((t) => t.id !== id);
    setWallets(rlsEngine.saveWallets(authUid, updatedWallets));
    setTransactions(rlsEngine.saveTransactions(authUid, updatedTransactions));
  };

  // Wallet & Transfer Handlers
  const handleAddTransfer = (
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    date: string,
    note: string
  ) => {
    if (!authUid) return;
    const newTransfer: WalletTransfer = {
      id: `trf_${Date.now()}`,
      userId: authUid,
      fromWalletId,
      toWalletId,
      amount,
      date,
      note,
      createdAt: new Date().toISOString(),
    };

    const updatedWallets = wallets.map((w) => {
      if (w.id === fromWalletId) {
        return { ...w, balance: Number((w.balance - amount).toFixed(2)) };
      }
      if (w.id === toWalletId) {
        return { ...w, balance: Number((w.balance + amount).toFixed(2)) };
      }
      return w;
    });

    const updatedTransfers = [newTransfer, ...transfers];
    setWallets(rlsEngine.saveWallets(authUid, updatedWallets));
    setTransfers(rlsEngine.saveTransfers(authUid, updatedTransfers));
  };

  const handleAddWallet = (walletData: Omit<Wallet, 'id' | 'userId'>) => {
    if (!authUid) return;
    const newWallet: Wallet = {
      ...walletData,
      id: `wal_${Date.now()}`,
      userId: authUid,
    };
    const next = [...wallets, newWallet];
    setWallets(rlsEngine.saveWallets(authUid, next));
  };

  // Category Handlers
  const handleAddCategory = (name: string, colorHex: string) => {
    if (!authUid) return;
    const newCat: Category = {
      id: `cat_${Date.now()}`,
      userId: authUid,
      name,
      type: 'expense',
      colorHex,
      isSystem: false,
    };
    const next = [...categories, newCat];
    setCategories(rlsEngine.saveCategories(authUid, next));
  };

  const handleDeleteCategory = (id: string) => {
    if (!authUid) return;
    const next = categories.filter((c) => c.id !== id || c.isSystem);
    setCategories(rlsEngine.saveCategories(authUid, next));
  };

  // Favorite Places Toggle
  const handleToggleFavoritePlace = (
    place: PlaceLocation,
    defaultCategoryId?: string
  ) => {
    if (!authUid) return;
    const exists = favoritePlaces.some(
      (fp) =>
        fp.placeId === place.placeId ||
        fp.name.toLowerCase() === place.name.toLowerCase()
    );
    let next: FavoritePlace[];
    if (exists) {
      next = favoritePlaces.filter(
        (fp) =>
          fp.placeId !== place.placeId &&
          fp.name.toLowerCase() !== place.name.toLowerCase()
      );
    } else {
      next = [
        ...favoritePlaces,
        {
          ...place,
          id: `fav_${Date.now()}`,
          userId: authUid,
          defaultCategoryId,
        },
      ];
    }
    setFavoritePlaces(rlsEngine.saveFavoritePlaces(authUid, next));
  };

  // Budgets & Savings Goals Handlers
  const handleUpdateBudgetLimit = (
    categoryId: string,
    monthKey: string,
    newLimit: number
  ) => {
    if (!authUid) return;
    const exists = budgets.some(
      (b) => b.categoryId === categoryId && b.monthKey === monthKey
    );
    let next: CategoryBudget[];
    if (exists) {
      next = budgets.map((b) =>
        b.categoryId === categoryId && b.monthKey === monthKey
          ? { ...b, limitAmount: newLimit }
          : b
      );
    } else {
      next = [
        ...budgets,
        {
          id: `bdg_${Date.now()}`,
          userId: authUid,
          categoryId,
          monthKey,
          limitAmount: newLimit,
          alertThresholdPct: 80,
        },
      ];
    }
    setBudgets(rlsEngine.saveBudgets(authUid, next));
  };

  const handleAddGoal = (goalData: Omit<SavingsGoal, 'id' | 'userId'>) => {
    if (!authUid) return;
    const newGoal: SavingsGoal = {
      ...goalData,
      id: `goal_${Date.now()}`,
      userId: authUid,
    };
    const next = [...savingsGoals, newGoal];
    setSavingsGoals(rlsEngine.saveSavingsGoals(authUid, next));
  };

  const handleContributeToGoal = (
    goalId: string,
    fromWalletId: string,
    amount: number
  ) => {
    if (!authUid) return;
    const updatedGoals = savingsGoals.map((g) =>
      g.id === goalId
        ? { ...g, currentAmount: Number((g.currentAmount + amount).toFixed(2)) }
        : g
    );
    const updatedWallets = wallets.map((w) =>
      w.id === fromWalletId
        ? { ...w, balance: Number((w.balance - amount).toFixed(2)) }
        : w
    );
    setSavingsGoals(rlsEngine.saveSavingsGoals(authUid, updatedGoals));
    setWallets(rlsEngine.saveWallets(authUid, updatedWallets));
  };

  // Profile & Currency Handlers
  const handleUpdateProfile = (patch: Partial<UserProfile>) => {
    if (!authUid) return;
    const next = rlsEngine.updateUserProfile(authUid, patch);
    setProfile(next);
  };

  const handleChangeCurrency = (c: SupportedCurrency) => {
    handleUpdateProfile({ displayCurrency: c });
  };

  const handleResetDemoData = () => {
    rlsEngine.resetDemoData();
    if (authUid) loadUserData(authUid);
  };

  const totalNetWorth = useMemo(
    () => wallets.reduce((s, w) => s + w.balance, 0),
    [wallets]
  );

  // If unauthenticated, show Google OAuth Login Screen
  if (!authUid) {
    return (
      <AuthScreen
        onLogin={handleLogin}
        isDark={isDark}
        onToggleTheme={handleToggleQuickTheme}
      />
    );
  }

  const currentNavMeta =
    NAV_ITEMS.find((n) => n.id === activeSection) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Sidebar Navigation (260px fixed width) */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col justify-between bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 no-print">
        <div className="p-6 space-y-6">
          {/* Brand Wordmark */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveSection('dashboard')}
              className="text-lg font-bold tracking-tight font-display text-slate-900 dark:text-white whitespace-nowrap"
            >
              Kaudal Finanzas
            </button>
            <span className="text-[11px] font-mono text-slate-400">
              {profile.displayCurrency}
            </span>
          </div>

          {/* Quick Net Worth Summary Box */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Patrimonio Total Disponible
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
              {formatMoney(totalNetWorth, profile.displayCurrency)}
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 truncate">
              {profile.email}
            </div>
          </div>

          {/* Primary Navigation Links */}
          <nav className="space-y-1" aria-label="Navegación principal">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full px-3.5 py-2.5 rounded-lg text-xs font-medium flex items-center gap-3 transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile & Logout */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 dark:text-white truncate">
                {profile.fullName}
              </div>
              <div className="text-[11px] text-slate-500 font-mono truncate">
                RLS: {profile.id.slice(0, 14)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2 px-3 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión OAuth</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on Left — Controls & Primary Action on Right */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-3.5 flex items-center justify-between gap-6 no-print">
          {/* Zone 1: Mobile Menu Trigger + Contextual Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Abrir menú de navegación"
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
              <span className="font-display font-bold text-slate-900 dark:text-white whitespace-nowrap">
                Kaudal
              </span>
              <span aria-hidden="true">/</span>
              <span className="text-slate-900 dark:text-slate-100 font-semibold truncate">
                {currentNavMeta.label}
              </span>
            </div>
          </div>

          {/* Zone 2 & 3: Currency Selector, Theme Toggle, Quick Expense CTA & Logout */}
          <div className="flex items-center gap-2.5 shrink-0">
            <select
              aria-label="Moneda de visualización"
              value={profile.displayCurrency}
              onChange={(e) => handleChangeCurrency(e.target.value as SupportedCurrency)}
              className="hidden sm:block px-2.5 py-1.5 text-xs font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg border border-transparent focus:border-emerald-500"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="MXN">MXN ($)</option>
              <option value="COP">COP ($)</option>
              <option value="GTQ">GTQ (Q)</option>
              <option value="CRC">CRC (₡)</option>
            </select>

            <button
              type="button"
              onClick={handleToggleQuickTheme}
              aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingTx(null);
                setPresetPlace(null);
                setTxModalType('expense');
                setTxModalOpen(true);
              }}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Movimiento</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="lg:hidden p-2 rounded-lg text-rose-600 bg-rose-50 dark:bg-rose-950/40"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 space-y-1 no-print">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-emerald-600'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Active Section Viewport */}
        <main className="flex-1 p-4 md:p-8 max-w-[1400px] w-full mx-auto">
          {activeSection === 'dashboard' && (
            <DashboardSection
              transactions={transactions}
              wallets={wallets}
              categories={categories}
              currency={profile.displayCurrency}
              selectedMonth={selectedMonth}
              onChangeMonth={setSelectedMonth}
              onOpenNewTransaction={(type) => {
                setEditingTx(null);
                setPresetPlace(null);
                setTxModalType(type);
                setTxModalOpen(true);
              }}
              onEditTransaction={(tx) => {
                setEditingTx(tx);
                setTxModalType(tx.type);
                setTxModalOpen(true);
              }}
              onNavigate={setActiveSection}
            />
          )}

          {activeSection === 'incomes' && (
            <IncomesSection
              transactions={transactions}
              wallets={wallets}
              categories={categories}
              currency={profile.displayCurrency}
              onOpenNewIncome={() => {
                setEditingTx(null);
                setPresetPlace(null);
                setTxModalType('income');
                setTxModalOpen(true);
              }}
              onEditIncome={(tx) => {
                setEditingTx(tx);
                setTxModalType('income');
                setTxModalOpen(true);
              }}
              onDeleteIncome={handleDeleteTransaction}
            />
          )}

          {activeSection === 'expenses' && (
            <ExpensesSection
              transactions={transactions}
              wallets={wallets}
              categories={categories}
              currency={profile.displayCurrency}
              onOpenNewExpense={() => {
                setEditingTx(null);
                setPresetPlace(null);
                setTxModalType('expense');
                setTxModalOpen(true);
              }}
              onEditExpense={(tx) => {
                setEditingTx(tx);
                setTxModalType('expense');
                setTxModalOpen(true);
              }}
              onDeleteExpense={handleDeleteTransaction}
              onAddCategory={handleAddCategory}
              onDeleteCategory={handleDeleteCategory}
              onNavigateToMap={(tx) => {
                if (tx) setFocusedMapTx(tx);
                setActiveSection('map');
              }}
              onNavigateSection={setActiveSection}
            />
          )}

          {activeSection === 'wallets' && (
            <WalletsSection
              wallets={wallets}
              transfers={transfers}
              transactions={transactions}
              currency={profile.displayCurrency}
              onAddTransfer={handleAddTransfer}
              onAddWallet={handleAddWallet}
            />
          )}

          {activeSection === 'map' && (
            <ExpensesMapSection
              transactions={transactions}
              categories={categories}
              wallets={wallets}
              favoritePlaces={favoritePlaces}
              currency={profile.displayCurrency}
              focusedTransaction={focusedMapTx}
              onOpenNewExpenseAtPlace={(place) => {
                setEditingTx(null);
                setPresetPlace(place || null);
                setTxModalType('expense');
                setTxModalOpen(true);
              }}
              onEditTransaction={(tx) => {
                setEditingTx(tx);
                setTxModalType(tx.type);
                setTxModalOpen(true);
              }}
              onToggleFavoritePlace={handleToggleFavoritePlace}
            />
          )}

          {activeSection === 'budgets' && (
            <BudgetsGoalsSection
              budgets={budgets}
              goals={savingsGoals}
              categories={categories}
              transactions={transactions}
              wallets={wallets}
              selectedMonth={selectedMonth}
              currency={profile.displayCurrency}
              onUpdateBudgetLimit={handleUpdateBudgetLimit}
              onAddGoal={handleAddGoal}
              onContributeToGoal={handleContributeToGoal}
            />
          )}

          {activeSection === 'reports' && (
            <ReportsSettingsSection
              profile={profile}
              transactions={transactions}
              categories={categories}
              wallets={wallets}
              currency={profile.displayCurrency}
              themeMode={themeMode}
              onUpdateProfile={handleUpdateProfile}
              onChangeCurrency={handleChangeCurrency}
              onChangeThemeMode={setThemeMode}
              onResetDemoData={handleResetDemoData}
            />
          )}
        </main>
      </div>

      {/* Unified Transaction Modal (Create / Edit Income or Expense with Places & Receipt) */}
      <TransactionModal
        isOpen={txModalOpen}
        initialType={txModalType}
        editingTransaction={editingTx}
        presetPlace={presetPlace}
        wallets={wallets}
        categories={categories}
        favoritePlaces={favoritePlaces}
        onClose={() => {
          setTxModalOpen(false);
          setEditingTx(null);
          setPresetPlace(null);
        }}
        onSave={handleSaveTransaction}
        onToggleFavoritePlace={handleToggleFavoritePlace}
      />
    </div>
  );
}
