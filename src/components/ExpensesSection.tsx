import React, { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  MapPin,
  Edit3,
  Trash2,
  Eye,
  FolderPlus,
  RotateCcw,
} from 'lucide-react';
import {
  AppSection,
  Category,
  PAYMENT_METHOD_LABELS,
  PaymentMethodType,
  SupportedCurrency,
  Transaction,
  Wallet,
  formatMoney,
} from '../types/finance';

interface ExpensesSectionProps {
  transactions: Transaction[];
  wallets: Wallet[];
  categories: Category[];
  currency: SupportedCurrency;
  onOpenNewExpense: () => void;
  onEditExpense: (tx: Transaction) => void;
  onDeleteExpense: (id: string) => void;
  onAddCategory: (name: string, colorHex: string) => void;
  onDeleteCategory: (id: string) => void;
  onNavigateToMap: (tx?: Transaction) => void;
  onNavigateSection: (s: AppSection) => void;
}

export const ExpensesSection: React.FC<ExpensesSectionProps> = ({
  transactions,
  wallets,
  categories,
  currency,
  onOpenNewExpense,
  onEditExpense,
  onDeleteExpense,
  onAddCategory,
  onDeleteCategory,
  onNavigateToMap,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<'all' | PaymentMethodType>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#059669');
  const [previewReceipt, setPreviewReceipt] = useState<Transaction | null>(null);

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );

  const expenses = useMemo(
    () => transactions.filter((t) => t.type === 'expense'),
    [transactions]
  );

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (
        searchQuery.trim() &&
        !exp.sourceOrMerchant.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(exp.note || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(exp.location?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      if (selectedCategoryId !== 'all' && exp.categoryId !== selectedCategoryId) {
        return false;
      }
      if (selectedPayment !== 'all' && exp.paymentMethod !== selectedPayment) {
        return false;
      }
      if (dateFrom && exp.date < dateFrom) return false;
      if (dateTo && exp.date > dateTo) return false;
      return true;
    });
  }, [expenses, searchQuery, selectedCategoryId, selectedPayment, dateFrom, dateTo]);

  const totalFilteredExpense = useMemo(
    () => filteredExpenses.reduce((acc, t) => acc + t.amount, 0),
    [filteredExpenses]
  );

  const geolocatedCount = useMemo(
    () => filteredExpenses.filter((t) => Boolean(t.location)).length,
    [filteredExpenses]
  );

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const walMap = useMemo(() => new Map(wallets.map((w) => [w.id, w])), [wallets]);

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddCategory(newCatName.trim(), newCatColor);
    setNewCatName('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Gastos y Compras Realizadas
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Registro detallado con categorías personalizables, método de pago, comprobante fotográfico y ubicación.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowCatManager((prev) => !prev)}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Categorías ({expenseCategories.length})</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewExpense}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Gasto</span>
          </button>
        </div>
      </div>

      {showCatManager && (
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Gestor de Categorías Personalizables
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Crea nuevas categorías de gasto o administra las existentes para tu contabilidad.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCatManager(false)}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              Ocultar
            </button>
          </div>

          <form onSubmit={handleCreateCategory} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Nombre de nueva categoría
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Educación, Mascotas, Suscripciones Cloud..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Color identificador
              </label>
              <input
                type="color"
                value={newCatColor}
                onChange={(e) => setNewCatColor(e.target.value)}
                className="h-8 w-14 rounded cursor-pointer border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap"
            >
              Crear Categoría
            </button>
          </form>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-2">
            {expenseCategories.map((cat) => (
              <div
                key={cat.id}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: cat.colorHex }}
                  />
                  <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                    {cat.name}
                  </span>
                </div>
                {!cat.isSystem && (
                  <button
                    type="button"
                    onClick={() => onDeleteCategory(cat.id)}
                    className="text-slate-400 hover:text-rose-600 shrink-0"
                    title="Eliminar categoría personalizada"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Buscar por comercio, lugar o nota
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ej. Plaza Mundo, Selectos, gasolina..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Categoría
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="all">Todas las categorías</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Método de pago
            </label>
            <select
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value as 'all' | PaymentMethodType)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="all">Todos los métodos</option>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
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
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Mostrando <strong className="font-mono text-slate-900 dark:text-white">{filteredExpenses.length}</strong> gastos
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Total filtrado:{' '}
              <strong className="font-mono text-rose-600 dark:text-rose-400">
                -{formatMoney(totalFilteredExpense, currency)}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>{geolocatedCount} con ubicación en Google Maps</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategoryId('all');
              setSelectedPayment('all');
              setDateFrom('');
              setDateTo('');
            }}
            className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-950/40">
                <th className="py-3 px-6">Fecha</th>
                <th className="py-3 px-4">Comercio / Detalle</th>
                <th className="py-3 px-4">Categoría · Método</th>
                <th className="py-3 px-4">Ubicación · Zona</th>
                <th className="py-3 px-4">Comprobante</th>
                <th className="py-3 px-4 text-right">Monto</th>
                <th className="py-3 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No se encontraron gastos con los criterios actuales.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const cat = catMap.get(exp.categoryId);
                  const wal = walMap.get(exp.walletId);
                  return (
                    <tr
                      key={exp.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3.5 px-6 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {exp.date}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {exp.sourceOrMerchant}
                        </div>
                        {exp.note && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs truncate">
                            {exp.note}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {cat?.name || 'General'}
                        </span>
                        <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                        <span>{PAYMENT_METHOD_LABELS[exp.paymentMethod]}</span>
                        <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                        <span>{wal?.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {exp.location ? (
                          <button
                            type="button"
                            onClick={() => onNavigateToMap(exp)}
                            className="hover:text-emerald-700 dark:hover:text-emerald-400 inline-flex items-center gap-1 text-left"
                          >
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>
                              {exp.location.name} ·{' '}
                              <span className="text-slate-400">{exp.location.zone}</span>
                            </span>
                          </button>
                        ) : (
                          <span className="text-slate-400">Sin ubicación</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {exp.receiptDataUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewReceipt(exp)}
                            className="text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-medium"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver foto/DTE</span>
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                        -{formatMoney(exp.amount, currency)}
                      </td>
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onEditExpense(exp)}
                            aria-label="Editar gasto"
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteExpense(exp.id)}
                            aria-label="Eliminar gasto"
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

      {previewReceipt && previewReceipt.receiptDataUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewReceipt(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-md w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {previewReceipt.sourceOrMerchant}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {previewReceipt.date} · {formatMoney(previewReceipt.amount, currency)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewReceipt(null)}
                className="px-3 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 rounded-md"
              >
                Cerrar
              </button>
            </div>
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center">
              <img
                src={previewReceipt.receiptDataUrl}
                alt={`Comprobante de ${previewReceipt.sourceOrMerchant}`}
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
