import React, { useMemo, useState } from 'react';
import { Plus, Search, Trash2, Edit3, RotateCcw } from 'lucide-react';
import {
  Category,
  RECURRENCE_LABELS,
  SupportedCurrency,
  Transaction,
  Wallet,
  formatMoney,
} from '../types/finance';

interface IncomesSectionProps {
  transactions: Transaction[];
  wallets: Wallet[];
  categories: Category[];
  currency: SupportedCurrency;
  onOpenNewIncome: () => void;
  onEditIncome: (tx: Transaction) => void;
  onDeleteIncome: (id: string) => void;
}

export const IncomesSection: React.FC<IncomesSectionProps> = ({
  transactions,
  wallets,
  categories,
  currency,
  onOpenNewIncome,
  onEditIncome,
  onDeleteIncome,
}) => {
  const [searchSource, setSearchSource] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [recurrenceFilter, setRecurrenceFilter] = useState<'all' | 'recurring' | 'single'>('all');

  const incomes = useMemo(
    () => transactions.filter((t) => t.type === 'income'),
    [transactions]
  );

  const filteredIncomes = useMemo(() => {
    return incomes.filter((inc) => {
      if (
        searchSource.trim() &&
        !inc.sourceOrMerchant.toLowerCase().includes(searchSource.toLowerCase()) &&
        !(inc.note || '').toLowerCase().includes(searchSource.toLowerCase())
      ) {
        return false;
      }
      if (dateFrom && inc.date < dateFrom) return false;
      if (dateTo && inc.date > dateTo) return false;
      if (minAmount && inc.amount < parseFloat(minAmount)) return false;
      if (recurrenceFilter === 'recurring' && !inc.isRecurring) return false;
      if (recurrenceFilter === 'single' && inc.isRecurring) return false;
      return true;
    });
  }, [incomes, searchSource, dateFrom, dateTo, minAmount, recurrenceFilter]);

  const totalFilteredIncome = useMemo(
    () => filteredIncomes.reduce((acc, t) => acc + t.amount, 0),
    [filteredIncomes]
  );

  const recurringMonthlyIncome = useMemo(
    () =>
      filteredIncomes
        .filter((t) => t.isRecurring)
        .reduce((acc, t) => acc + t.amount, 0),
    [filteredIncomes]
  );

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const walMap = useMemo(() => new Map(wallets.map((w) => [w.id, w])), [wallets]);

  const handleResetFilters = () => {
    setSearchSource('');
    setDateFrom('');
    setDateTo('');
    setMinAmount('');
    setRecurrenceFilter('all');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Ingresos Entrantes
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Control de nómina, honorarios profesionales, dividendos e ingresos extraordinarios.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewIncome}
          className="px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Ingreso</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Total Ingresos (Filtro Actual)
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
            +{formatMoney(totalFilteredIncome, currency)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {filteredIncomes.length} registros encontrados
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Ingresos Recurrentes
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatMoney(recurringMonthlyIncome, currency)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Base predecible de liquidez
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Ingresos Únicos / Proyectos
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatMoney(totalFilteredIncome - recurringMonthlyIncome, currency)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Consultorías y entradas variables
          </div>
        </div>
      </div>

      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Buscar por fuente o nota
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ej. TechCorp, Consultoría, ETF..."
                value={searchSource}
                onChange={(e) => setSearchSource(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Desde fecha
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Hasta fecha
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Monto mínimo (USD)
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'recurring', label: 'Solo Recurrentes' },
              { id: 'single', label: 'Solo Únicos' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRecurrenceFilter(tab.id as 'all' | 'recurring' | 'single')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  recurrenceFilter === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpiar filtros</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-950/40">
                <th className="py-3 px-6">Fecha</th>
                <th className="py-3 px-4">Fuente del Ingreso</th>
                <th className="py-3 px-4">Categoría · Cartera Destino</th>
                <th className="py-3 px-4">Frecuencia</th>
                <th className="py-3 px-4 text-right">Monto</th>
                <th className="py-3 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
              {filteredIncomes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No se encontraron ingresos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredIncomes.map((inc) => {
                  const cat = catMap.get(inc.categoryId);
                  const wal = walMap.get(inc.walletId);
                  return (
                    <tr
                      key={inc.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3.5 px-6 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {inc.date}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {inc.sourceOrMerchant}
                        </div>
                        {inc.note && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {inc.note}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <span>{cat?.name || 'Ingresos'}</span>
                        <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                        <span>{wal?.name || 'Cuenta'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {inc.isRecurring
                          ? `Recurrente · ${
                              inc.recurrenceInterval
                                ? RECURRENCE_LABELS[inc.recurrenceInterval]
                                : 'Mensual'
                            }`
                          : 'Ingreso Único'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold tabular-nums text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        +{formatMoney(inc.amount, currency)}
                      </td>
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onEditIncome(inc)}
                            aria-label="Editar ingreso"
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteIncome(inc.id)}
                            aria-label="Eliminar ingreso"
                            className="p-1.5 text-slate-500 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
