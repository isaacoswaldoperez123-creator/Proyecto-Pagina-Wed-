import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  Target,
  Sliders,
  ArrowUpRight,
} from 'lucide-react';
import {
  Category,
  CategoryBudget,
  SavingsGoal,
  SupportedCurrency,
  Transaction,
  Wallet,
  formatMoney,
} from '../types/finance';

interface BudgetsGoalsSectionProps {
  budgets: CategoryBudget[];
  goals: SavingsGoal[];
  categories: Category[];
  transactions: Transaction[];
  wallets: Wallet[];
  selectedMonth: string;
  currency: SupportedCurrency;
  onUpdateBudgetLimit: (categoryId: string, monthKey: string, newLimit: number) => void;
  onAddGoal: (goal: Omit<SavingsGoal, 'id' | 'userId'>) => void;
  onContributeToGoal: (goalId: string, fromWalletId: string, amount: number) => void;
}

export const BudgetsGoalsSection: React.FC<BudgetsGoalsSectionProps> = ({
  budgets,
  goals,
  categories,
  transactions,
  wallets,
  selectedMonth,
  currency,
  onUpdateBudgetLimit,
  onAddGoal,
  onContributeToGoal,
}) => {
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editLimitVal, setEditLimitVal] = useState<string>('');

  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [contribWalletId, setContribWalletId] = useState<string>(wallets[0]?.id || '');
  const [contribAmount, setContribAmount] = useState<string>('');

  const [showNewGoal, setShowNewGoal] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('0');
  const [goalDate, setGoalDate] = useState('2027-06-30');
  const [goalTag, setGoalTag] = useState('Ahorro');

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );

  const budgetRows = useMemo(() => {
    const spentMap = new Map<string, number>();
    transactions
      .filter((t) => t.type === 'expense' && t.date.startsWith(selectedMonth))
      .forEach((t) => {
        spentMap.set(t.categoryId, (spentMap.get(t.categoryId) || 0) + t.amount);
      });

    return expenseCategories.map((cat) => {
      const b = budgets.find(
        (item) => item.categoryId === cat.id && item.monthKey === selectedMonth
      ) ||
        budgets.find((item) => item.categoryId === cat.id) || {
          id: `temp_${cat.id}`,
          userId: '',
          categoryId: cat.id,
          monthKey: selectedMonth,
          limitAmount: 300,
          alertThresholdPct: 80,
        };

      const spent = spentMap.get(cat.id) || 0;
      const pct = b.limitAmount > 0 ? Math.round((spent / b.limitAmount) * 100) : 0;
      const status: 'nominal' | 'warning' | 'exceeded' =
        pct >= 100 ? 'exceeded' : pct >= b.alertThresholdPct ? 'warning' : 'nominal';

      return {
        category: cat,
        budget: b,
        spent,
        remaining: Math.max(0, b.limitAmount - spent),
        pct,
        status,
      };
    });
  }, [expenseCategories, budgets, transactions, selectedMonth]);

  const totalBudgeted = useMemo(
    () => budgetRows.reduce((s, r) => s + r.budget.limitAmount, 0),
    [budgetRows]
  );
  const totalSpentInBudgets = useMemo(
    () => budgetRows.reduce((s, r) => s + r.spent, 0),
    [budgetRows]
  );

  const handleSaveLimit = (categoryId: string) => {
    const parsed = parseFloat(editLimitVal);
    if (Number.isFinite(parsed) && parsed > 0) {
      onUpdateBudgetLimit(categoryId, selectedMonth, Number(parsed.toFixed(2)));
    }
    setEditingCatId(null);
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(goalTarget);
    const current = parseFloat(goalCurrent) || 0;
    if (!goalName.trim() || !Number.isFinite(target) || target <= 0) return;
    onAddGoal({
      name: goalName.trim(),
      targetAmount: Number(target.toFixed(2)),
      currentAmount: Number(current.toFixed(2)),
      targetDate: goalDate,
      categoryTag: goalTag.trim() || 'Meta',
      linkedWalletId: wallets[0]?.id,
    });
    setGoalName('');
    setGoalTarget('');
    setGoalCurrent('0');
    setShowNewGoal(false);
  };

  const handleContributeSubmit = (e: React.FormEvent, goalId: string) => {
    e.preventDefault();
    const amt = parseFloat(contribAmount);
    if (!Number.isFinite(amt) || amt <= 0 || !contribWalletId) return;
    onContributeToGoal(goalId, contribWalletId, Number(amt.toFixed(2)));
    setContribAmount('');
    setActiveGoalId(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Presupuestos Mensuales y Metas de Ahorro
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Controla tus techos de gasto por categoría en {selectedMonth} con alertas preventivas al 80% y monitorea el avance de tus metas patrimoniales.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewGoal((prev) => !prev)}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Meta de Ahorro</span>
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Ejecución de Presupuestos por Categoría ({selectedMonth})
            </h2>
          </div>

          <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
            Consumido:{' '}
            <strong className="text-slate-900 dark:text-white">
              {formatMoney(totalSpentInBudgets, currency)}
            </strong>{' '}
            de {formatMoney(totalBudgeted, currency)} (
            {totalBudgeted > 0
              ? Math.round((totalSpentInBudgets / totalBudgeted) * 100)
              : 0}
            %)
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgetRows.map((row) => {
            const isEditing = editingCatId === row.category.id;
            return (
              <div
                key={row.category.id}
                className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: row.category.colorHex }}
                      />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {row.category.name}
                      </h3>
                    </div>

                    {row.status === 'exceeded' ? (
                      <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 inline-flex items-center gap-1 shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Excedido ({row.pct}%)</span>
                      </span>
                    ) : row.status === 'warning' ? (
                      <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 inline-flex items-center gap-1 shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Alerta {row.pct}%</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>En rango ({row.pct}%)</span>
                      </span>
                    )}
                  </div>

                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, Math.max(3, row.pct))}%` }}
                      className={`h-full rounded-full transition-all ${
                        row.status === 'exceeded'
                          ? 'bg-rose-600'
                          : row.status === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex items-end justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="text-[11px] text-slate-500">Gastado / Límite</div>
                    <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                      {formatMoney(row.spent, currency)} /{' '}
                      {formatMoney(row.budget.limitAmount, currency)}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="10"
                        value={editLimitVal}
                        onChange={(e) => setEditLimitVal(e.target.value)}
                        className="w-20 px-2 py-1 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveLimit(row.category.id)}
                        className="px-2 py-1 text-xs font-semibold text-white bg-emerald-600 rounded"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCatId(row.category.id);
                        setEditLimitVal(row.budget.limitAmount.toString());
                      }}
                      className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white underline"
                    >
                      Ajustar techo
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showNewGoal && (
        <form
          onSubmit={handleCreateGoal}
          className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Crear Nueva Meta de Ahorro o Inversión
            </h3>
            <button
              type="button"
              onClick={() => setShowNewGoal(false)}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Nombre de la Meta *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Prima de Apartamento, Viaje a Europa..."
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Monto Objetivo (USD) *
              </label>
              <input
                type="number"
                step="10"
                required
                placeholder="5000"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Fecha Meta
              </label>
              <input
                type="date"
                value={goalDate}
                onChange={(e) => setGoalDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-1.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
              >
                Guardar Meta
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Metas de Ahorro y Construcción de Patrimonio
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {goals.map((g) => {
            const pct =
              g.targetAmount > 0
                ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
                : 0;
            const remaining = Math.max(0, g.targetAmount - g.currentAmount);
            const isContributing = activeGoalId === g.id;

            return (
              <div
                key={g.id}
                className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {g.categoryTag} · Meta: {g.targetDate}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        {g.name}
                      </h3>
                    </div>
                    <span className="text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {pct}%
                    </span>
                  </div>

                  <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.max(4, pct)}%` }}
                      className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                    <div>
                      <span className="text-slate-500 block font-sans text-[11px]">
                        Acumulado actual
                      </span>
                      <strong className="text-slate-900 dark:text-white">
                        {formatMoney(g.currentAmount, currency)}
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block font-sans text-[11px]">
                        Objetivo total
                      </span>
                      <strong className="text-slate-900 dark:text-white">
                        {formatMoney(g.targetAmount, currency)}
                      </strong>
                    </div>
                  </div>
                </div>

                {isContributing ? (
                  <form
                    onSubmit={(e) => handleContributeSubmit(e, g.id)}
                    className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={contribWalletId}
                        onChange={(e) => setContribWalletId(e.target.value)}
                        className="px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                      >
                        {wallets.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="10"
                        min="1"
                        required
                        placeholder="Monto USD"
                        value={contribAmount}
                        onChange={(e) => setContribAmount(e.target.value)}
                        className="px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveGoalId(null)}
                        className="px-2.5 py-1 text-xs text-slate-500"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 text-xs font-semibold text-white bg-emerald-600 rounded"
                      >
                        Confirmar Aporte
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Faltan {formatMoney(remaining, currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveGoalId(g.id)}
                      className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold inline-flex items-center gap-1"
                    >
                      <span>Abonar a meta</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
