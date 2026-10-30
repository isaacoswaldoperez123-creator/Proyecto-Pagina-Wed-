import {
  Category,
  CategoryBudget,
  FavoritePlace,
  SavingsGoal,
  SupportedCurrency,
  Transaction,
  UserProfile,
  Wallet,
  WalletTransfer,
} from '../types/finance';
import {
  DEMO_USERS,
  INITIAL_BUDGETS,
  INITIAL_CATEGORIES,
  INITIAL_FAVORITE_PLACES,
  INITIAL_SAVINGS_GOALS,
  INITIAL_TRANSACTIONS,
  INITIAL_TRANSFERS,
  INITIAL_WALLETS,
  PRIMARY_USER_ID,
} from '../data/initialData';

const STORAGE_KEYS = {
  SESSION_USER_ID: 'kaudal_auth_uid_v1',
  PROFILES: 'kaudal_profiles_v1',
  WALLETS: 'kaudal_wallets_v1',
  CATEGORIES: 'kaudal_categories_v1',
  FAVORITE_PLACES: 'kaudal_fav_places_v1',
  TRANSACTIONS: 'kaudal_transactions_v1',
  TRANSFERS: 'kaudal_transfers_v1',
  BUDGETS: 'kaudal_budgets_v1',
  GOALS: 'kaudal_savings_goals_v1',
};

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateTransactionInput(input: {
  amount: number;
  sourceOrMerchant: string;
  date: string;
  walletId: string;
  categoryId: string;
}): ValidationResult {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { valid: false, error: 'El monto debe ser un número positivo mayor a $0.00.' };
  }
  if (input.amount > 10_000_000) {
    return { valid: false, error: 'El monto excede el límite permitido por transacción.' };
  }
  if (!input.sourceOrMerchant || input.sourceOrMerchant.trim().length < 2) {
    return { valid: false, error: 'Ingresa una fuente o comercio válido (mínimo 2 caracteres).' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { valid: false, error: 'La fecha debe tener formato válido YYYY-MM-DD.' };
  }
  if (!input.walletId) {
    return { valid: false, error: 'Selecciona una cartera o cuenta válida.' };
  }
  if (!input.categoryId) {
    return { valid: false, error: 'Selecciona una categoría válida.' };
  }
  return { valid: true };
}

export function validateTransferInput(input: {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  fromWalletBalance: number;
}): ValidationResult {
  if (!input.fromWalletId || !input.toWalletId) {
    return { valid: false, error: 'Selecciona tanto la cartera de origen como la de destino.' };
  }
  if (input.fromWalletId === input.toWalletId) {
    return { valid: false, error: 'La cartera de origen y destino deben ser distintas.' };
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { valid: false, error: 'El monto a transferir debe ser mayor a $0.00.' };
  }
  if (input.amount > input.fromWalletBalance) {
    return {
      valid: false,
      error: 'Saldo insuficiente en la cartera de origen para cubrir esta transferencia.',
    };
  }
  return { valid: true };
}

function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStore<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota errors in private mode
  }
}

export const rlsEngine = {
  getSessionUserId(): string | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SESSION_USER_ID);
      if (saved === 'LOGGED_OUT') return null;
      return saved || PRIMARY_USER_ID;
    } catch {
      return PRIMARY_USER_ID;
    }
  },

  signInWithGoogleOAuth(userId: string = PRIMARY_USER_ID): UserProfile {
    const profiles = readStore<Record<string, UserProfile>>(STORAGE_KEYS.PROFILES, DEMO_USERS);
    const user = profiles[userId] || DEMO_USERS[PRIMARY_USER_ID];
    user.lastLoginAt = new Date().toISOString();
    profiles[user.id] = user;
    writeStore(STORAGE_KEYS.PROFILES, profiles);
    localStorage.setItem(STORAGE_KEYS.SESSION_USER_ID, user.id);
    return user;
  },

  signOut(): void {
    localStorage.setItem(STORAGE_KEYS.SESSION_USER_ID, 'LOGGED_OUT');
  },

  getUserProfile(authUid: string): UserProfile {
    const profiles = readStore<Record<string, UserProfile>>(STORAGE_KEYS.PROFILES, DEMO_USERS);
    return profiles[authUid] || DEMO_USERS[PRIMARY_USER_ID];
  },

  updateUserProfile(authUid: string, patch: Partial<UserProfile>): UserProfile {
    const profiles = readStore<Record<string, UserProfile>>(STORAGE_KEYS.PROFILES, DEMO_USERS);
    const current = profiles[authUid] || DEMO_USERS[PRIMARY_USER_ID];
    const updated: UserProfile = { ...current, ...patch, id: authUid };
    profiles[authUid] = updated;
    writeStore(STORAGE_KEYS.PROFILES, profiles);
    return updated;
  },

  getWallets(authUid: string): Wallet[] {
    const all = readStore<Wallet[]>(STORAGE_KEYS.WALLETS, INITIAL_WALLETS);
    return all.filter((w) => w.userId === authUid);
  },

  saveWallets(authUid: string, userWallets: Wallet[]): Wallet[] {
    const all = readStore<Wallet[]>(STORAGE_KEYS.WALLETS, INITIAL_WALLETS);
    const others = all.filter((w) => w.userId !== authUid);
    const merged = [...others, ...userWallets.map((w) => ({ ...w, userId: authUid }))];
    writeStore(STORAGE_KEYS.WALLETS, merged);
    return userWallets;
  },

  getCategories(authUid: string): Category[] {
    const all = readStore<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    return all.filter((c) => c.userId === authUid);
  },

  saveCategories(authUid: string, userCategories: Category[]): Category[] {
    const all = readStore<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    const others = all.filter((c) => c.userId !== authUid);
    const merged = [...others, ...userCategories.map((c) => ({ ...c, userId: authUid }))];
    writeStore(STORAGE_KEYS.CATEGORIES, merged);
    return userCategories;
  },

  getFavoritePlaces(authUid: string): FavoritePlace[] {
    const all = readStore<FavoritePlace[]>(STORAGE_KEYS.FAVORITE_PLACES, INITIAL_FAVORITE_PLACES);
    return all.filter((p) => p.userId === authUid);
  },

  saveFavoritePlaces(authUid: string, places: FavoritePlace[]): FavoritePlace[] {
    const all = readStore<FavoritePlace[]>(STORAGE_KEYS.FAVORITE_PLACES, INITIAL_FAVORITE_PLACES);
    const others = all.filter((p) => p.userId !== authUid);
    const merged = [...others, ...places.map((p) => ({ ...p, userId: authUid }))];
    writeStore(STORAGE_KEYS.FAVORITE_PLACES, merged);
    return places;
  },

  getTransactions(authUid: string): Transaction[] {
    const all = readStore<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    return all
      .filter((t) => t.userId === authUid)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  },

  saveTransactions(authUid: string, userTransactions: Transaction[]): Transaction[] {
    const all = readStore<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    const others = all.filter((t) => t.userId !== authUid);
    const merged = [...others, ...userTransactions.map((t) => ({ ...t, userId: authUid }))];
    writeStore(STORAGE_KEYS.TRANSACTIONS, merged);
    return userTransactions;
  },

  getTransfers(authUid: string): WalletTransfer[] {
    const all = readStore<WalletTransfer[]>(STORAGE_KEYS.TRANSFERS, INITIAL_TRANSFERS);
    return all
      .filter((tr) => tr.userId === authUid)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  },

  saveTransfers(authUid: string, userTransfers: WalletTransfer[]): WalletTransfer[] {
    const all = readStore<WalletTransfer[]>(STORAGE_KEYS.TRANSFERS, INITIAL_TRANSFERS);
    const others = all.filter((tr) => tr.userId !== authUid);
    const merged = [...others, ...userTransfers.map((tr) => ({ ...tr, userId: authUid }))];
    writeStore(STORAGE_KEYS.TRANSFERS, merged);
    return userTransfers;
  },

  getBudgets(authUid: string): CategoryBudget[] {
    const all = readStore<CategoryBudget[]>(STORAGE_KEYS.BUDGETS, INITIAL_BUDGETS);
    return all.filter((b) => b.userId === authUid);
  },

  saveBudgets(authUid: string, userBudgets: CategoryBudget[]): CategoryBudget[] {
    const all = readStore<CategoryBudget[]>(STORAGE_KEYS.BUDGETS, INITIAL_BUDGETS);
    const others = all.filter((b) => b.userId !== authUid);
    const merged = [...others, ...userBudgets.map((b) => ({ ...b, userId: authUid }))];
    writeStore(STORAGE_KEYS.BUDGETS, merged);
    return userBudgets;
  },

  getSavingsGoals(authUid: string): SavingsGoal[] {
    const all = readStore<SavingsGoal[]>(STORAGE_KEYS.GOALS, INITIAL_SAVINGS_GOALS);
    return all.filter((g) => g.userId === authUid);
  },

  saveSavingsGoals(authUid: string, userGoals: SavingsGoal[]): SavingsGoal[] {
    const all = readStore<SavingsGoal[]>(STORAGE_KEYS.GOALS, INITIAL_SAVINGS_GOALS);
    const others = all.filter((g) => g.userId !== authUid);
    const merged = [...others, ...userGoals.map((g) => ({ ...g, userId: authUid }))];
    writeStore(STORAGE_KEYS.GOALS, merged);
    return userGoals;
  },

  resetDemoData(): void {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  },
};

export function exportTransactionsToCSV(
  transactions: Transaction[],
  categories: Category[],
  wallets: Wallet[],
  currency: SupportedCurrency,
  filename: string = 'kaudal_movimientos.csv'
): void {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const walMap = new Map(wallets.map((w) => [w.id, w.name]));

  const headers = [
    'ID',
    'Fecha',
    'Tipo',
    'Monto_USD',
    'Moneda_Vista',
    'Fuente_o_Comercio',
    'Categoria',
    'Cartera',
    'Metodo_Pago',
    'Recurrente',
    'Lugar_Nombre',
    'Zona_Geografica',
    'Latitud',
    'Longitud',
    'Nota',
  ];

  const rows = transactions.map((t) => [
    t.id,
    t.date,
    t.type === 'income' ? 'Ingreso' : 'Gasto',
    t.amount.toFixed(2),
    currency,
    `"${(t.sourceOrMerchant || '').replace(/"/g, '""')}"`,
    `"${(catMap.get(t.categoryId) || 'General').replace(/"/g, '""')}"`,
    `"${(walMap.get(t.walletId) || 'Principal').replace(/"/g, '""')}"`,
    t.paymentMethod,
    t.isRecurring ? 'Si' : 'No',
    `"${(t.location?.name || '').replace(/"/g, '""')}"`,
    `"${(t.location?.zone || '').replace(/"/g, '""')}"`,
    t.location?.latitude ?? '',
    t.location?.longitude ?? '',
    `"${(t.note || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
