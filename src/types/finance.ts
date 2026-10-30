export type TransactionType = 'income' | 'expense';

export type WalletType = 'cash' | 'bank' | 'card' | 'savings';

export type PaymentMethodType =
  | 'cash'
  | 'debit_card'
  | 'credit_card'
  | 'bank_transfer'
  | 'digital_wallet';

export type RecurrenceInterval = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export type SupportedCurrency = 'USD' | 'EUR' | 'MXN' | 'COP' | 'GTQ' | 'CRC';

export type ThemeMode = 'light' | 'dark' | 'system';

export type AppSection =
  | 'dashboard'
  | 'incomes'
  | 'expenses'
  | 'wallets'
  | 'map'
  | 'budgets'
  | 'reports';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarInitials: string;
  verifiedGoogleAuth: boolean;
  baseCurrency: SupportedCurrency;
  displayCurrency: SupportedCurrency;
  themePreference: ThemeMode;
  monthlyGlobalBudget: number;
  lastLoginAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  name: string;
  type: WalletType;
  currency: SupportedCurrency;
  balance: number; // Stored in USD base
  institution: string;
  accountMask: string;
  isLiquid: boolean;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: TransactionType;
  colorHex: string;
  isSystem?: boolean;
}

export interface PlaceLocation {
  placeId: string;
  name: string;
  address: string;
  zone: string;
  latitude: number;
  longitude: number;
}

export interface FavoritePlace extends PlaceLocation {
  id: string;
  userId: string;
  defaultCategoryId?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  categoryId: string;
  type: TransactionType;
  amount: number; // Stored in USD base
  date: string; // YYYY-MM-DD
  sourceOrMerchant: string;
  note: string;
  isRecurring: boolean;
  recurrenceInterval?: RecurrenceInterval;
  paymentMethod: PaymentMethodType;
  receiptDataUrl?: string;
  receiptFileName?: string;
  location?: PlaceLocation;
  createdAt: string;
}

export interface WalletTransfer {
  id: string;
  userId: string;
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  date: string;
  note: string;
  createdAt: string;
}

export interface CategoryBudget {
  id: string;
  userId: string;
  categoryId: string;
  monthKey: string; // e.g., '2026-10'
  limitAmount: number;
  alertThresholdPct: number;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  linkedWalletId?: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  categoryTag: string;
}

export const CURRENCY_CONFIG: Record<
  SupportedCurrency,
  { symbol: string; code: SupportedCurrency; name: string; rateFromUSD: number; locale: string }
> = {
  USD: { symbol: '$', code: 'USD', name: 'Dólar Estadounidense (USD)', rateFromUSD: 1, locale: 'en-US' },
  EUR: { symbol: '€', code: 'EUR', name: 'Euro (EUR)', rateFromUSD: 0.92, locale: 'es-ES' },
  MXN: { symbol: 'MX$', code: 'MXN', name: 'Peso Mexicano (MXN)', rateFromUSD: 19.85, locale: 'es-MX' },
  COP: { symbol: 'COL$', code: 'COP', name: 'Peso Colombiano (COP)', rateFromUSD: 4210, locale: 'es-CO' },
  GTQ: { symbol: 'Q', code: 'GTQ', name: 'Quetzal Guatemalteco (GTQ)', rateFromUSD: 7.75, locale: 'es-GT' },
  CRC: { symbol: '₡', code: 'CRC', name: 'Colón Costarricense (CRC)', rateFromUSD: 515, locale: 'es-CR' },
};

export function formatMoney(
  amountInUSD: number,
  currency: SupportedCurrency = 'USD',
  showSign: boolean = false
): string {
  const cfg = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;
  const converted = amountInUSD * cfg.rateFromUSD;
  const isWhole = currency === 'COP' || currency === 'CRC';
  const formatted = new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency: cfg.code,
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(Math.abs(converted));

  if (showSign && amountInUSD !== 0) {
    return amountInUSD > 0 ? `+${formatted}` : `-${formatted}`;
  }
  return amountInUSD < 0 ? `-${formatted}` : formatted;
}

export const WALLET_TYPE_LABELS: Record<WalletType, string> = {
  cash: 'Efectivo',
  bank: 'Cuenta Bancaria',
  card: 'Tarjeta Débito / Crédito',
  savings: 'Ahorros / Fondo Líquido',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  cash: 'Efectivo',
  debit_card: 'Tarjeta de Débito',
  credit_card: 'Tarjeta de Crédito',
  bank_transfer: 'Transferencia Bancaria',
  digital_wallet: 'Billetera Digital',
};

export const RECURRENCE_LABELS: Record<RecurrenceInterval, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  yearly: 'Anual',
};
