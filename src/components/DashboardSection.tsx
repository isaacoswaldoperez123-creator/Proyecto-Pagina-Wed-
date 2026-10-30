import React, { useMemo, useState } from 'react';
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
  Wallet as WalletIcon,
  ChevronRight,
  Eye,
} from 'lucide-react';
import {
  AppSection,
  Category,
  PAYMENT_METHOD_LABELS,
  SupportedCurrency,
  Transaction,
  TransactionType,
  Wallet,
  formatMoney,
} from '../types/finance';

interface DashboardSectionProps {
  transactions: Transaction[];
  wallets: Wallet[];
  categories: Category[];
  currency: SupportedCurrency;
  selectedMonth: string; // e.g., '2026-10'
  onChangeMonth: (month: string) => void;
  onOpenNewTransaction: (type: TransactionType) => void;
  onEditTransaction: (tx: Transaction) => void;
  onNavigate: (section: AppSection) => void;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  transactions,
  wallets,
  categories,
  currency,
  selectedMonth,
  onChangeMonth,
  onOpenNewTransaction,
  onEditTransaction,
  onNavigate,
}) => {
  const [previewReceiptTx, setPreviewReceiptTx] = useState<Transaction | null>(null);

  const catMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );
  const walMap = useMemo(
    () => new Map(wallets.map((w) => [w.id, w])),
    [wallets]
  );

  const totalBalance = useMemo(
    () => wallets.reduce((acc, w) => acc + w.balance, 0),
    [wallets]
  );

  const liquidBalance = useMemo(
    () =>
      wallets
        .filter((w) => w.isLiquid && (w.type === 'cash' || w.type === 'bank' || w.type === 'card'))
        .reduce((acc, w) => acc + w.balance, 0),
    [wallets]
  );

  const monthTransactions = useMemo(
    () => transactions.filter((t) => t.date.startsWith(selectedMonth)),
    [transactions, selectedMonth]
  );

  const monthIncome = useMemo(
    () =>
      monthTransactions
        .filter((t) => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0),
    [monthTransactions]
  );

  const monthExpense = useMemo(
    () =>
      monthTransactions
        .filter((t) => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0),
    [monthTransactions]
  );

  const netSavingsRate =
    monthIncome > 0
      ? Math.round(((monthIncome - monthExpense) / monthIncome) * 100)
      : 0;

  const expensesByCategory = useMemo(() => {
    const totals = new Map<string, number>();
    monthTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        totals.set(t.categoryId, (totals.get(t.categoryId) || 0) + t.amount);
      });

    return Array.from(totals.entries())
      .map(([catId, amount]) => {
        const cat = catMap.get(catId);
        return {
          id: catId,
          name: cat?.name || 'Otros',
          color: cat?.colorHex || '#64748B',
          amount,
          pct: monthExpense > 0 ? (amount / monthExpense) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [monthTransactions, catMap, monthExpense]);

  const monthlySeries = useMemo(() => {
    const months = [
      { key: '2026-05', label: 'May', income: 4100, expense: 1620 },
      { key: '2026-06', label: 'Jun', income: 4250, expense: 1790 },
      { key: '2026-07', label: 'Jul', income: 4600, expense: 1910 },
      { key: '2026-08', label: 'Ago', income: 4320, expense: 1540 },
      { key: '2026-09', label: 'Sep', income: 0, expense: 0 },
      { key: '2026-10', label: 'Oct', income: 0, expense: 0 },
    ];

    return months.map((m) => {
      if (m.key === '2026-09' || m.key === '2026-10') {
        const mTxs = transactions.filter((t) => t.date.startsWith(m.key));
        const inc = mTxs
          .filter((t) => t.type === 'income')
          .reduce((s, t) => s + t.amount, 0);
        const exp = mTxs
          .filter((t) => t.type === 'expense')
          .reduce((s, t) => s + t.amount, 0);
        return { ...m, income: inc, expense: exp };
      }
      return m;
    });
  }, [transactions]);

  const maxMonthlyVal = Math.max(
    5000,
    ...monthlySeries.flatMap((m) => [m.income, m.expense])
  );

  const weeklyTrend = useMemo(() => {
    const weeks = [
      { label: 'Sem 1 (01-07)', expense: 0, income: 0 },
      { label: 'Sem 2 (08-14)', expense: 0, income: 0 },
      { label: 'Sem 3 (15-21)', expense: 0, income: 0 },
      { label: 'Sem 4 (22-31)', expense: 0, income: 0 },
    ];

    monthTransactions.forEach((tx) => {
      const day = parseInt(tx.date.split('-')[2] || '1', 10);
      const idx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
      if (tx.type === 'expense') {
        weeks[idx].expense += tx.amount;
      } else {
        weeks[idx].income += tx.amount;
      }
    });

    return weeks;
  }, [monthTransactions]);

  const maxWeeklyExpense = Math.max(400, ...weeklyTrend.map((w) => w.expense));

  const topZoneThisMonth = useMemo(() => {
    const zMap = new Map<string, number>();
    monthTransactions
      .filter((t) => t.type === 'expense' && t.location?.zone)
      .forEach((t) => {
        const z = t.location!.zone;
        zMap.set(z, (zMap.get(z) || 0) + t.amount);
      });
    const sorted = Array.from(zMap.entries()).sort((a, b) => b[1] - a[1]);
    return sorted[0] || null;
  }, [monthTransactions]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Resumen Financiero Ejecutivo
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Tienes{' '}
            <strong className="font-mono text-slate-900 dark:text-white">
              {formatMoney(totalBalance, currency)}
            </strong>{' '}
            en patrimonio total · Ganaste{' '}
            <strong className="font-mono text-emerald-700 dark:text-emerald-400">
              {formatMoney(monthIncome, currency)}
            </strong>{' '}
            este mes · Gastaste{' '}
            <strong className="font-mono text-rose-600 dark:text-rose-400">
              {formatMoney(monthExpense, currency)}
            </strong>
            {topZoneThisMonth && (
              <>
                {' '}
                (principal zona:{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('map')}
                  className="underline font-medium hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  {topZoneThisMonth[0]} con {formatMoney(topZoneThisMonth[1], currency)}
                </button>
                )
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {[
              { key: '2026-10', label: 'Octubre 2026' },
              { key: '2026-09', label: 'Septiembre 2026' },
            ].map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => onChangeMonth(m.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedMonth === m.key
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onOpenNewTransaction('income')}
            className="px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Ingreso</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenNewTransaction('expense')}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Gasto</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Saldo Total (Patrimonio)</span>
            <WalletIcon className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatMoney(totalBalance, currency)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{wallets.length} carteras activas</span>
            <button
              type="button"
              onClick={() => onNavigate('wallets')}
              className="text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
            >
              Ver cuentas
            </button>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Ingresos del Mes ({selectedMonth})</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
            +{formatMoney(monthIncome, currency)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              {monthTransactions.filter((t) => t.type === 'income').length} depósitos registrados
            </span>
            <button
              type="button"
              onClick={() => onNavigate('incomes')}
              className="text-slate-700 dark:text-slate-300 hover:underline font-medium"
            >
              Historial
            </button>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Gastos del Mes ({selectedMonth})</span>
            <ArrowDownRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
            -{formatMoney(monthExpense, currency)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Tasa de ahorro neto: {netSavingsRate}%</span>
            <button
              type="button"
              onClick={() => onNavigate('expenses')}
              className="text-slate-700 dark:text-slate-300 hover:underline font-medium"
            >
              Detalle
            </button>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Dinero Líquido Inmediato</span>
            <MapPin className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatMoney(liquidBalance, currency)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Efectivo + Cuentas operativas</span>
            <button
              type="button"
              onClick={() => onNavigate('map')}
              className="text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
            >
              Mapa gastos
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Gastos por Categoría
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ¿En qué gasté durante {selectedMonth}?
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
                Total: {formatMoney(monthExpense, currency)}
              </span>
            </div>

            <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex mb-5">
              {expensesByCategory.map((item) => (
                <div
                  key={item.id}
                  style={{
                    width: `${Math.max(item.pct, 2)}%`,
                    backgroundColor: item.color,
                  }}
                  title={`${item.name}: ${formatMoney(item.amount, currency)} (${item.pct.toFixed(1)}%)`}
                  className="h-full transition-all"
                />
              ))}
            </div>

            <div className="space-y-3">
              {expensesByCategory.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No hay gastos registrados en este mes.
                </p>
              ) : (
                expensesByCategory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
                      <span className="text-slate-500 dark:text-slate-400">
                        {item.pct.toFixed(1)}%
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white w-20 text-right">
                        {formatMoney(item.amount, currency)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {expensesByCategory.length} categorías con movimiento
            </span>
            <button
              type="button"
              onClick={() => onNavigate('budgets')}
              className="text-emerald-700 dark:text-emerald-400 hover:underline font-medium flex items-center gap-1"
            >
              <span>Ver límites de presupuesto</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-4 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Ingresos vs. Gastos
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Evolución comparativa semestral
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-600 inline-block" /> Ingresos
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-rose-500 inline-block" /> Gastos
                </span>
              </div>
            </div>

            <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-slate-200 dark:border-slate-800">
              {monthlySeries.map((m) => {
                const incH = Math.max(6, Math.round((m.income / maxMonthlyVal) * 140));
                const expH = Math.max(6, Math.round((m.expense / maxMonthlyVal) * 140));
                const isSelected = m.key === selectedMonth;
                return (
                  <div
                    key={m.key}
                    className={`flex-1 flex flex-col items-center gap-2 p-1.5 rounded-lg transition-colors ${
                      isSelected ? 'bg-slate-100/80 dark:bg-slate-800/60' : ''
                    }`}
                  >
                    <div className="w-full flex items-end justify-center gap-1.5 h-36">
                      <div
                        style={{ height: `${incH}px` }}
                        title={`Ingresos ${m.label}: ${formatMoney(m.income, currency)}`}
                        className="w-3 bg-emerald-600 dark:bg-emerald-500 rounded-t-xs transition-all"
                      />
                      <div
                        style={{ height: `${expH}px` }}
                        title={`Gastos ${m.label}: ${formatMoney(m.expense, currency)}`}
                        className="w-3 bg-rose-500 dark:bg-rose-400 rounded-t-xs transition-all"
                      />
                    </div>
                    <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Flujo neto del mes activo:</span>
            <span
              className={`font-mono font-semibold tabular-nums ${
                monthIncome - monthExpense >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatMoney(monthIncome - monthExpense, currency, true)}
            </span>
          </div>
        </div>

        <div className="lg:col-span-3 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Tendencia Semanal
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ritmo de gasto por semana ({selectedMonth})
              </p>
            </div>

            <div className="space-y-4">
              {weeklyTrend.map((w) => {
                const pct = Math.min(100, Math.round((w.expense / maxWeeklyExpense) * 100));
                return (
                  <div key={w.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">{w.label}</span>
                      <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                        {formatMoney(w.expense, currency)}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${ Math.max(pct, w.expense > 0 ? 6 : 0) }%` }}
                        className="h-full bg-slate-800 dark:bg-emerald-500 rounded-full transition-all"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Promedio semanal:</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-white">
              {formatMoney(monthExpense / 4, currency)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Últimos Movimientos Registrados
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Haz clic en cualquier movimiento para editarlo o inspeccionar su ubicación y comprobante.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => onNavigate('incomes')}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
            >
              Ver todos los ingresos
            </button>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
              ·
            </span>
            <button
              type="button"
              onClick={() => onNavigate('expenses')}
              className="text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
            >
              Ver todos los gastos
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-950/40">
                <th className="py-3 px-6">Fecha</th>
                <th className="py-3 px-4">Concepto / Comercio</th>
                <th className="py-3 px-4">Categoría · Cartera</th>
                <th className="py-3 px-4">Ubicación (Mapa)</th>
                <th className="py-3 px-6 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
              {transactions.slice(0, 8).map((tx) => {
                const cat = catMap.get(tx.categoryId);
                const wal = walMap.get(tx.walletId);
                return (
                  <tr
                    key={tx.id}
                    onClick={() => onEditTransaction(tx)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-6 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {tx.date}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{tx.sourceOrMerchant}</span>
                        {tx.receiptDataUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewReceiptTx(tx);
                            }}
                            title="Ver comprobante adjunto"
                            className="text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-normal text-[11px]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Recibo</span>
                          </button>
                        )}
                      </div>
                      {tx.note && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md">
                          {tx.note}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      <span>{cat?.name || 'General'}</span>
                      <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                      <span>{wal?.name || 'Cartera'}</span>
                      <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                      <span>{PAYMENT_METHOD_LABELS[tx.paymentMethod]}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {tx.location ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate('map');
                          }}
                          className="hover:text-emerald-700 dark:hover:text-emerald-400 inline-flex items-center gap-1"
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>{tx.location.name}</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td
                      className={`py-3 px-6 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${
                        tx.type === 'income'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {formatMoney(
                        tx.type === 'income' ? tx.amount : -tx.amount,
                        currency,
                        true
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {previewReceiptTx && previewReceiptTx.receiptDataUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewReceiptTx(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-md w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Comprobante: {previewReceiptTx.sourceOrMerchant}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {previewReceiptTx.date} · {formatMoney(previewReceiptTx.amount, currency)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewReceiptTx(null)}
                className="px-3 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 rounded-md"
              >
                Cerrar
              </button>
            </div>
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center">
              <img
                src={previewReceiptTx.receiptDataUrl}
                alt={`Comprobante de ${previewReceiptTx.sourceOrMerchant}`}
                referrerPolicy="no-referrer"
                className="max-h-96 w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
