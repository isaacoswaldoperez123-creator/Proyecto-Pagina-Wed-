import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Wallet as WalletIcon,
  Landmark,
  CreditCard,
  PiggyBank,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  SupportedCurrency,
  Transaction,
  WALLET_TYPE_LABELS,
  Wallet,
  WalletTransfer,
  WalletType,
  formatMoney,
} from '../types/finance';
import { validateTransferInput } from '../lib/supabaseClient';

interface WalletsSectionProps {
  wallets: Wallet[];
  transfers: WalletTransfer[];
  transactions: Transaction[];
  currency: SupportedCurrency;
  onAddTransfer: (
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    date: string,
    note: string
  ) => void;
  onAddWallet: (wallet: Omit<Wallet, 'id' | 'userId'>) => void;
}

export const WalletsSection: React.FC<WalletsSectionProps> = ({
  wallets,
  transfers,
  transactions,
  currency,
  onAddTransfer,
  onAddWallet,
}) => {
  const [fromWalletId, setFromWalletId] = useState<string>(wallets[1]?.id || wallets[0]?.id || '');
  const [toWalletId, setToWalletId] = useState<string>(wallets[0]?.id || '');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferDate, setTransferDate] = useState<string>('2026-10-29');
  const [transferNote, setTransferNote] = useState<string>('');
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  const [showNewWalletForm, setShowNewWalletForm] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletType, setNewWalletType] = useState<WalletType>('bank');
  const [newWalletBalance, setNewWalletBalance] = useState('');
  const [newWalletInstitution, setNewWalletInstitution] = useState('');
  const [newWalletMask, setNewWalletMask] = useState('');

  const totalPatrimony = useMemo(
    () => wallets.reduce((acc, w) => acc + w.balance, 0),
    [wallets]
  );

  const immediateCashAndBank = useMemo(
    () =>
      wallets
        .filter((w) => w.type === 'cash' || w.type === 'bank' || w.type === 'card')
        .reduce((acc, w) => acc + w.balance, 0),
    [wallets]
  );

  const savingsTotal = useMemo(
    () =>
      wallets
        .filter((w) => w.type === 'savings')
        .reduce((acc, w) => acc + w.balance, 0),
    [wallets]
  );

  const walMap = useMemo(() => new Map(wallets.map((w) => [w.id, w])), [wallets]);

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);
    setTransferSuccess(null);

    const parsedAmt = parseFloat(transferAmount);
    const originWallet = walMap.get(fromWalletId);

    const validation = validateTransferInput({
      fromWalletId,
      toWalletId,
      amount: parsedAmt,
      fromWalletBalance: originWallet?.balance ?? 0,
    });

    if (!validation.valid) {
      setTransferError(validation.error || 'Datos de transferencia inválidos.');
      return;
    }

    onAddTransfer(
      fromWalletId,
      toWalletId,
      Number(parsedAmt.toFixed(2)),
      transferDate,
      transferNote.trim() || 'Transferencia entre carteras propias'
    );

    const destWallet = walMap.get(toWalletId);
    setTransferAmount('');
    setTransferNote('');
    setTransferSuccess(
      `Transferencia de ${formatMoney(parsedAmt, currency)} completada de ${originWallet?.name} a ${destWallet?.name}.`
    );
  };

  const handleCreateWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletName.trim()) return;
    const bal = parseFloat(newWalletBalance) || 0;
    onAddWallet({
      name: newWalletName.trim(),
      type: newWalletType,
      currency: 'USD',
      balance: Number(bal.toFixed(2)),
      institution: newWalletInstitution.trim() || WALLET_TYPE_LABELS[newWalletType],
      accountMask: newWalletMask.trim() || '•••• 0000',
      isLiquid: true,
    });
    setNewWalletName('');
    setNewWalletBalance('');
    setNewWalletInstitution('');
    setNewWalletMask('');
    setShowNewWalletForm(false);
  };

  const renderWalletIcon = (type: WalletType) => {
    switch (type) {
      case 'cash':
        return <WalletIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'bank':
        return <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'card':
        return <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'savings':
        return <PiggyBank className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dinero Líquido y Cuentas
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Administra tus carteras de efectivo, cuentas bancarias, tarjetas y fondos de ahorro con transferencias en tiempo real.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewWalletForm((prev) => !prev)}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Cartera / Cuenta</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Patrimonio Líquido Consolidado
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatMoney(totalPatrimony, currency)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Suma exacta de {wallets.length} carteras activas
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Disponibilidad Operativa (Efectivo + Bancos)
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatMoney(immediateCashAndBank, currency)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Liquidez inmediata para compras diarias
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Reservas y Cuentas de Ahorro
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatMoney(savingsTotal, currency)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Capital resguardado y fondo de emergencia
          </div>
        </div>
      </div>

      {showNewWalletForm && (
        <form
          onSubmit={handleCreateWallet}
          className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Registrar Nueva Cartera o Cuenta Bancaria
            </h2>
            <button
              type="button"
              onClick={() => setShowNewWalletForm(false)}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Nombre de la Cartera *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Caja Chica, Cuenta Davivienda..."
                value={newWalletName}
                onChange={(e) => setNewWalletName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Tipo de Cartera *
              </label>
              <select
                value={newWalletType}
                onChange={(e) => setNewWalletType(e.target.value as WalletType)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                {Object.entries(WALLET_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Saldo Inicial (USD) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={newWalletBalance}
                onChange={(e) => setNewWalletBalance(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Institución / Banco
              </label>
              <input
                type="text"
                placeholder="Ej. Banco Cuscatlán"
                value={newWalletInstitution}
                onChange={(e) => setNewWalletInstitution(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-1.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
              >
                Guardar Cartera
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {wallets.map((w) => {
          const txCount = transactions.filter((t) => t.walletId === w.id).length;
          const pctOfTotal =
            totalPatrimony > 0 ? Math.round((w.balance / totalPatrimony) * 100) : 0;
          return (
            <div
              key={w.id}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {WALLET_TYPE_LABELS[w.type]} · {w.institution}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {w.name}
                  </h2>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                  {renderWalletIcon(w.type)}
                </div>
              </div>

              <div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatMoney(w.balance, currency)}
                </div>
                <div className="mt-2 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, Math.max(4, pctOfTotal))}%` }}
                    className="h-full bg-slate-800 dark:bg-emerald-500 rounded-full"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono">{w.accountMask}</span>
                <span>
                  {pctOfTotal}% del total · {txCount} movs
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-5">
          <div className="flex items-center gap-2.5">
            <ArrowLeftRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Transferir Dinero entre Carteras
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reconciliación atómica e instantánea de saldos (Ej. retiro de cajero o aporte a ahorros).
              </p>
            </div>
          </div>

          {transferError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{transferError}</span>
            </div>
          )}

          {transferSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{transferSuccess}</span>
            </div>
          )}

          <form onSubmit={handleExecuteTransfer} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Cartera Origen (-)
                </label>
                <select
                  value={fromWalletId}
                  onChange={(e) => setFromWalletId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatMoney(w.balance, currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Cartera Destino (+)
                </label>
                <select
                  value={toWalletId}
                  onChange={(e) => setToWalletId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatMoney(w.balance, currency)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Monto a transferir (USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Fecha de operación
                </label>
                <input
                  type="date"
                  required
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Concepto o Nota
              </label>
              <input
                type="text"
                placeholder="Ej. Retiro en cajero para efectivo semanal..."
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Ejecutar Transferencia en Tiempo Real</span>
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Historial de Transferencias Internas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Movimientos de liquidez entre tus propias cuentas (no alteran tu patrimonio neto).
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-950/40">
                    <th className="py-3 px-6">Fecha</th>
                    <th className="py-3 px-4">Origen → Destino</th>
                    <th className="py-3 px-4">Concepto</th>
                    <th className="py-3 px-6 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
                  {transfers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-500">
                        No hay transferencias registradas todavía.
                      </td>
                    </tr>
                  ) : (
                    transfers.map((tr) => {
                      const fromW = walMap.get(tr.fromWalletId);
                      const toW = walMap.get(tr.toWalletId);
                      return (
                        <tr
                          key={tr.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-3.5 px-6 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {tr.date}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                            <span>{fromW?.name || 'Origen'}</span>
                            <span className="mx-2 text-emerald-600 dark:text-emerald-400 font-mono">
                              →
                            </span>
                            <span>{toW?.name || 'Destino'}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                            {tr.note}
                          </td>
                          <td className="py-3.5 px-6 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                            {formatMoney(tr.amount, currency)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Trigger PostgreSQL: trg_execute_wallet_transfer</span>
            <span>Integridad transaccional ACID verificada</span>
          </div>
        </div>
      </div>
    </div>
  );
};
