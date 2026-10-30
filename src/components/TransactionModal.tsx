import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Navigation,
  Upload,
  Star,
  Check,
  AlertCircle,
  FileText,
} from 'lucide-react';
import {
  Category,
  FavoritePlace,
  PAYMENT_METHOD_LABELS,
  PaymentMethodType,
  PlaceLocation,
  RECURRENCE_LABELS,
  RecurrenceInterval,
  Transaction,
  TransactionType,
  Wallet,
} from '../types/finance';
import {
  SAN_SALVADOR_PLACES_CATALOG,
  generateReceiptSvgDataUrl,
} from '../data/initialData';
import { validateTransactionInput } from '../lib/supabaseClient';

interface TransactionModalProps {
  isOpen: boolean;
  initialType: TransactionType;
  editingTransaction?: Transaction | null;
  presetPlace?: PlaceLocation | null;
  wallets: Wallet[];
  categories: Category[];
  favoritePlaces: FavoritePlace[];
  onClose: () => void;
  onSave: (
    txData: Omit<Transaction, 'id' | 'userId' | 'createdAt'>,
    existingId?: string
  ) => void;
  onToggleFavoritePlace: (place: PlaceLocation, defaultCategoryId?: string) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  initialType,
  editingTransaction,
  presetPlace,
  wallets,
  categories,
  favoritePlaces,
  onClose,
  onSave,
  onToggleFavoritePlace,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState<string>('');
  const [sourceOrMerchant, setSourceOrMerchant] = useState<string>('');
  const [date, setDate] = useState<string>('2026-10-29');
  const [walletId, setWalletId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('debit_card');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurrenceInterval, setRecurrenceInterval] =
    useState<RecurrenceInterval>('monthly');
  const [note, setNote] = useState<string>('');

  const [includeLocation, setIncludeLocation] = useState<boolean>(false);
  const [placeQuery, setPlaceQuery] = useState<string>('');
  const [selectedPlace, setSelectedPlace] = useState<PlaceLocation | null>(null);
  const [customZone, setCustomZone] = useState<string>('San Salvador Centro');
  const [customLat, setCustomLat] = useState<string>('13.6982');
  const [customLng, setCustomLng] = useState<string>('-89.1910');
  const [geoStatus, setGeoStatus] = useState<string>('');

  const [receiptDataUrl, setReceiptDataUrl] = useState<string | undefined>(undefined);
  const [receiptFileName, setReceiptFileName] = useState<string | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredCategories = categories.filter((c) => c.type === type);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setGeoStatus('');

    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setSourceOrMerchant(editingTransaction.sourceOrMerchant);
      setDate(editingTransaction.date);
      setWalletId(editingTransaction.walletId);
      setCategoryId(editingTransaction.categoryId);
      setPaymentMethod(editingTransaction.paymentMethod);
      setIsRecurring(editingTransaction.isRecurring);
      setRecurrenceInterval(editingTransaction.recurrenceInterval || 'monthly');
      setNote(editingTransaction.note || '');
      setReceiptDataUrl(editingTransaction.receiptDataUrl);
      setReceiptFileName(editingTransaction.receiptFileName);

      if (editingTransaction.location) {
        setIncludeLocation(true);
        setSelectedPlace(editingTransaction.location);
        setPlaceQuery(editingTransaction.location.name);
        setCustomZone(editingTransaction.location.zone);
        setCustomLat(editingTransaction.location.latitude.toString());
        setCustomLng(editingTransaction.location.longitude.toString());
      } else {
        setIncludeLocation(false);
        setSelectedPlace(null);
        setPlaceQuery('');
      }
    } else {
      setType(initialType);
      setAmount('');
      setDate('2026-10-29');
      setWalletId(wallets[0]?.id || '');
      const defaultCat = categories.find((c) => c.type === initialType);
      setCategoryId(defaultCat?.id || '');
      setPaymentMethod(initialType === 'income' ? 'bank_transfer' : 'debit_card');
      setIsRecurring(false);
      setRecurrenceInterval('monthly');
      setNote('');
      setReceiptDataUrl(undefined);
      setReceiptFileName(undefined);

      if (presetPlace && initialType === 'expense') {
        setIncludeLocation(true);
        setSelectedPlace(presetPlace);
        setPlaceQuery(presetPlace.name);
        setSourceOrMerchant(presetPlace.name);
        setCustomZone(presetPlace.zone);
        setCustomLat(presetPlace.latitude.toString());
        setCustomLng(presetPlace.longitude.toString());
      } else {
        setSourceOrMerchant('');
        setIncludeLocation(initialType === 'expense');
        setSelectedPlace(null);
        setPlaceQuery('');
      }
    }
  }, [isOpen, editingTransaction, initialType, presetPlace, wallets, categories]);

  useEffect(() => {
    const validCat = categories.some((c) => c.id === categoryId && c.type === type);
    if (!validCat) {
      const firstMatch = categories.find((c) => c.type === type);
      if (firstMatch) setCategoryId(firstMatch.id);
    }
  }, [type, categories, categoryId]);

  if (!isOpen) return null;

  const matchingPlaces = SAN_SALVADOR_PLACES_CATALOG.filter(
    (p) =>
      p.name.toLowerCase().includes(placeQuery.toLowerCase()) ||
      p.zone.toLowerCase().includes(placeQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(placeQuery.toLowerCase())
  );

  const handleSelectPlace = (place: PlaceLocation, defaultCatId?: string) => {
    setSelectedPlace(place);
    setPlaceQuery(place.name);
    setCustomZone(place.zone);
    setCustomLat(place.latitude.toString());
    setCustomLng(place.longitude.toString());
    if (!sourceOrMerchant.trim()) {
      setSourceOrMerchant(place.name);
    }
    if (defaultCatId && categories.some((c) => c.id === defaultCatId)) {
      setCategoryId(defaultCatId);
    }
  };

  const handleDetectGeolocation = () => {
    setGeoStatus('Detectando ubicación del dispositivo...');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          let closest = SAN_SALVADOR_PLACES_CATALOG[0];
          let minDist = Infinity;
          for (const candidate of SAN_SALVADOR_PLACES_CATALOG) {
            const d = Math.hypot(candidate.latitude - lat, candidate.longitude - lng);
            if (d < minDist) {
              minDist = d;
              closest = candidate;
            }
          }
          if (minDist < 0.25) {
            handleSelectPlace(closest);
            setGeoStatus(`Ubicación sugerida por GPS: ${closest.name}`);
          } else {
            const customLoc: PlaceLocation = {
              placeId: `gps_${Date.now()}`,
              name: placeQuery.trim() || sourceOrMerchant.trim() || 'Ubicación GPS Actual',
              address: `Coordenadas GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
              zone: 'Zona GPS Detectada',
              latitude: Number(lat.toFixed(5)),
              longitude: Number(lng.toFixed(5)),
            };
            handleSelectPlace(customLoc);
            setGeoStatus(`Coordenadas del dispositivo aplicadas (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          }
        },
        () => {
          const suggested = SAN_SALVADOR_PLACES_CATALOG[0];
          handleSelectPlace(suggested);
          setGeoStatus(`Ubicación sugerida: ${suggested.name} (San Salvador)`);
        },
        { timeout: 3500 }
      );
    } else {
      const suggested = SAN_SALVADOR_PLACES_CATALOG[0];
      handleSelectPlace(suggested);
      setGeoStatus(`Ubicación sugerida: ${suggested.name}`);
    }
  };

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('El comprobante fotográfico no debe superar 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setReceiptDataUrl(reader.result);
        setReceiptFileName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateDigitalReceipt = () => {
    const parsedAmt = parseFloat(amount) || 50;
    const catName =
      categories.find((c) => c.id === categoryId)?.name || 'Gasto Verificado';
    const merchant = sourceOrMerchant.trim() || placeQuery.trim() || 'Comercio San Salvador';
    const url = generateReceiptSvgDataUrl(
      merchant,
      parsedAmt,
      date,
      catName,
      `DTE-${Math.floor(100000 + Math.random() * 900000)}`
    );
    setReceiptDataUrl(url);
    setReceiptFileName(`comprobante_${date}.svg`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const parsedAmount = parseFloat(amount);

    const validation = validateTransactionInput({
      amount: parsedAmount,
      sourceOrMerchant,
      date,
      walletId,
      categoryId,
    });

    if (!validation.valid) {
      setErrorMsg(validation.error || 'Verifica los campos del formulario.');
      return;
    }

    let finalLocation: PlaceLocation | undefined = undefined;
    if (type === 'expense' && includeLocation) {
      if (selectedPlace && selectedPlace.name === placeQuery.trim()) {
        finalLocation = selectedPlace;
      } else if (placeQuery.trim()) {
        const latNum = parseFloat(customLat);
        const lngNum = parseFloat(customLng);
        finalLocation = {
          placeId: `custom_${Date.now()}`,
          name: placeQuery.trim(),
          address: `${placeQuery.trim()}, ${customZone}`,
          zone: customZone.trim() || 'San Salvador',
          latitude: Number.isFinite(latNum) ? latNum : 13.6982,
          longitude: Number.isFinite(lngNum) ? lngNum : -89.191,
        };
      }
    }

    onSave(
      {
        walletId,
        categoryId,
        type,
        amount: Number(parsedAmount.toFixed(2)),
        date,
        sourceOrMerchant: sourceOrMerchant.trim(),
        note: note.trim(),
        isRecurring,
        recurrenceInterval: isRecurring ? recurrenceInterval : undefined,
        paymentMethod,
        receiptDataUrl: type === 'expense' ? receiptDataUrl : undefined,
        receiptFileName: type === 'expense' ? receiptFileName : undefined,
        location: finalLocation,
      },
      editingTransaction?.id
    );
    onClose();
  };

  const isCurrentPlaceFavorite =
    selectedPlace &&
    favoritePlaces.some(
      (fp) =>
        fp.placeId === selectedPlace.placeId ||
        fp.name.toLowerCase() === selectedPlace.name.toLowerCase()
    );

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-tx-title"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2
              id="modal-tx-title"
              className="text-lg font-bold text-slate-900 dark:text-white"
            >
              {editingTransaction
                ? 'Editar Movimiento'
                : type === 'income'
                ? 'Registrar Nuevo Ingreso'
                : 'Registrar Gasto o Compra'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Actualiza automáticamente el saldo líquido de tu cartera seleccionada.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 px-4 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                type === 'income'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Ingreso Entrante (+)
            </button>
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 px-4 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                type === 'expense'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Gasto / Compra (-)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Monto (USD) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-500 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Fecha *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-500 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Método de Pago *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-600 text-slate-900 dark:text-white"
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {type === 'income' ? 'Fuente del Ingreso *' : 'Comercio o Concepto *'}
              </label>
              <input
                type="text"
                required
                placeholder={
                  type === 'income'
                    ? 'Ej. Nómina TechCorp, Consultoría...'
                    : 'Ej. Plaza Mundo, Super Selectos Escalón...'
                }
                value={sourceOrMerchant}
                onChange={(e) => setSourceOrMerchant(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-600 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Cartera / Cuenta *
                </label>
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-600 text-slate-900 dark:text-white"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (${w.balance.toFixed(0)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Categoría *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-600 text-slate-900 dark:text-white"
                >
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Movimiento Recurrente</span>
              </label>

              {isRecurring && (
                <select
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(e.target.value as RecurrenceInterval)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                >
                  {Object.entries(RECURRENCE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <input
                type="text"
                placeholder="Nota adicional o detalle del movimiento (opcional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-600 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {type === 'expense' && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeLocation}
                    onChange={(e) => setIncludeLocation(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Geolocalizar este gasto en el Mapa (Places API)</span>
                </label>

                {includeLocation && (
                  <button
                    type="button"
                    onClick={handleDetectGeolocation}
                    className="px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-md hover:bg-emerald-100 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Sugerir con GPS del dispositivo</span>
                  </button>
                )}
              </div>

              {includeLocation && (
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  {favoritePlaces.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Lugares favoritos (1 toque para autocompletar):
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {favoritePlaces.map((fp) => {
                          const isSelected = selectedPlace?.placeId === fp.placeId;
                          return (
                            <button
                              key={fp.id}
                              type="button"
                              onClick={() => handleSelectPlace(fp, fp.defaultCategoryId)}
                              className={`px-2.5 py-1 text-xs rounded-md border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                                isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-500'
                              }`}
                            >
                              <Star className="w-3 h-3 fill-current" />
                              <span>{fp.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-7">
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Buscar comercio o dirección (Google Places Autocomplete)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Ej. Plaza Mundo, Multiplaza, Super Selectos Escalón..."
                          value={placeQuery}
                          onChange={(e) => {
                            setPlaceQuery(e.target.value);
                            setSelectedPlace(null);
                          }}
                          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                        />
                        {selectedPlace && (
                          <button
                            type="button"
                            onClick={() =>
                              onToggleFavoritePlace(selectedPlace, categoryId)
                            }
                            title={
                              isCurrentPlaceFavorite
                                ? 'Quitar de lugares favoritos'
                                : 'Guardar en lugares favoritos'
                            }
                            className={`p-1.5 rounded-md border transition-colors shrink-0 ${
                              isCurrentPlaceFavorite
                                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-600'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-amber-500'
                            }`}
                          >
                            <Star
                              className={`w-4 h-4 ${
                                isCurrentPlaceFavorite ? 'fill-current' : ''
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Zona / Municipio
                      </label>
                      <input
                        type="text"
                        value={customZone}
                        onChange={(e) => setCustomZone(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="max-h-28 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900">
                    {matchingPlaces.slice(0, 5).map((p) => {
                      const active = selectedPlace?.placeId === p.placeId;
                      return (
                        <button
                          key={p.placeId}
                          type="button"
                          onClick={() => handleSelectPlace(p)}
                          className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors ${
                            active
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {p.name}
                            </span>
                            <span className="text-slate-400 mx-1.5">·</span>
                            <span className="text-slate-500 dark:text-slate-400 truncate">
                              {p.address}
                            </span>
                          </div>
                          {active && (
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {geoStatus && (
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                      {geoStatus}
                    </div>
                  )}
                </div>
              )}

              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Comprobante Fotográfico o Factura DTE (Opcional)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {receiptFileName
                      ? `Archivo adjunto: ${receiptFileName}`
                      : 'Sube una foto de tu recibo o genera un comprobante digital.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptFileChange}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleGenerateDigitalReceipt}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    Generar DTE Digital
                  </button>

                  {receiptDataUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptDataUrl(undefined);
                        setReceiptFileName(undefined);
                      }}
                      className="text-xs text-rose-600 hover:underline px-2"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap"
            >
              {editingTransaction ? 'Guardar Cambios' : 'Registrar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
