import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapPin,
  Flame,
  Layers,
  Star,
  Plus,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Navigation,
  Printer,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  Category,
  FavoritePlace,
  PlaceLocation,
  SupportedCurrency,
  Transaction,
  Wallet,
  formatMoney,
} from '../types/finance';
import { exportTransactionsToCSV } from '../lib/supabaseClient';

interface ExpensesMapSectionProps {
  transactions: Transaction[];
  categories: Category[];
  wallets: Wallet[];
  favoritePlaces: FavoritePlace[];
  currency: SupportedCurrency;
  focusedTransaction?: Transaction | null;
  onOpenNewExpenseAtPlace: (place?: PlaceLocation) => void;
  onEditTransaction: (tx: Transaction) => void;
  onToggleFavoritePlace: (place: PlaceLocation, defaultCategoryId?: string) => void;
}

const MAP_BOUNDS = {
  minLat: 13.655,
  maxLat: 13.735,
  minLng: -89.295,
  maxLng: -89.13,
};

function projectLatLng(lat: number, lng: number, width: number, height: number) {
  const clampedLat = Math.max(MAP_BOUNDS.minLat, Math.min(MAP_BOUNDS.maxLat, lat));
  const clampedLng = Math.max(MAP_BOUNDS.minLng, Math.min(MAP_BOUNDS.maxLng, lng));
  const x =
    ((clampedLng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) *
    (width - 100) +
    50;
  const y =
    ((MAP_BOUNDS.maxLat - clampedLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) *
    (height - 90) +
    45;
  return { x, y };
}

interface PlaceGroup {
  place: PlaceLocation;
  transactions: Transaction[];
  totalAmount: number;
  primaryCategory?: Category;
}

export const ExpensesMapSection: React.FC<ExpensesMapSectionProps> = ({
  transactions,
  categories,
  wallets,
  favoritePlaces,
  currency,
  focusedTransaction,
  onOpenNewExpenseAtPlace,
  onEditTransaction,
  onToggleFavoritePlace,
}) => {
  const [monthFilter, setMonthFilter] = useState<string>('2026-10');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [maxAmountFilter, setMaxAmountFilter] = useState<number>(1000);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [enableClustering, setEnableClustering] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedPlaceKey, setSelectedPlaceKey] = useState<string | null>(null);

  const heatmapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );

  const geoExpenses = useMemo(() => {
    return transactions.filter((t) => {
      if (t.type !== 'expense' || !t.location) return false;
      if (monthFilter !== 'all' && !t.date.startsWith(monthFilter)) return false;
      if (categoryFilter !== 'all' && t.categoryId !== categoryFilter) return false;
      if (t.amount > maxAmountFilter) return false;
      return true;
    });
  }, [transactions, monthFilter, categoryFilter, maxAmountFilter]);

  const placeGroups = useMemo(() => {
    const groups = new Map<string, PlaceGroup>();
    geoExpenses.forEach((tx) => {
      if (!tx.location) return;
      const key = tx.location.placeId || tx.location.name;
      const existing = groups.get(key);
      if (existing) {
        existing.transactions.push(tx);
        existing.totalAmount += tx.amount;
      } else {
        groups.set(key, {
          place: tx.location,
          transactions: [tx],
          totalAmount: tx.amount,
          primaryCategory: catMap.get(tx.categoryId),
        });
      }
    });
    return Array.from(groups.entries()).map(([key, val]) => ({ key, ...val }));
  }, [geoExpenses, catMap]);

  useEffect(() => {
    if (focusedTransaction?.location) {
      const k = focusedTransaction.location.placeId || focusedTransaction.location.name;
      setSelectedPlaceKey(k);
    } else if (!selectedPlaceKey && placeGroups.length > 0) {
      setSelectedPlaceKey(placeGroups[0].key);
    }
  }, [focusedTransaction, placeGroups, selectedPlaceKey]);

  const renderedMarkers = useMemo(() => {
    const W = 880;
    const H = 480;
    const items = placeGroups.map((pg) => {
      const pt = projectLatLng(pg.place.latitude, pg.place.longitude, W, H);
      return { ...pg, x: pt.x, y: pt.y };
    });

    if (!enableClustering) {
      return items.map((item) => ({
        isCluster: false,
        id: item.key,
        x: item.x,
        y: item.y,
        totalAmount: item.totalAmount,
        count: item.transactions.length,
        label: item.place.name,
        categoryName: item.primaryCategory?.name || 'Gasto',
        color: item.primaryCategory?.colorHex || '#059669',
        members: [item],
      }));
    }

    const clusters: Array<{
      isCluster: boolean;
      id: string;
      x: number;
      y: number;
      totalAmount: number;
      count: number;
      label: string;
      categoryName: string;
      color: string;
      members: typeof items;
    }> = [];

    const visited = new Set<string>();
    for (const item of items) {
      if (visited.has(item.key)) continue;
      visited.add(item.key);
      const nearby = [item];

      for (const other of items) {
        if (visited.has(other.key)) continue;
        const dist = Math.hypot(item.x - other.x, item.y - other.y);
        if (dist < 105) {
          visited.add(other.key);
          nearby.push(other);
        }
      }

      if (nearby.length === 1) {
        clusters.push({
          isCluster: false,
          id: item.key,
          x: item.x,
          y: item.y,
          totalAmount: item.totalAmount,
          count: item.transactions.length,
          label: item.place.name,
          categoryName: item.primaryCategory?.name || 'Gasto',
          color: item.primaryCategory?.colorHex || '#059669',
          members: nearby,
        });
      } else {
        const avgX = nearby.reduce((s, n) => s + n.x, 0) / nearby.length;
        const avgY = nearby.reduce((s, n) => s + n.y, 0) / nearby.length;
        const sumAmt = nearby.reduce((s, n) => s + n.totalAmount, 0);
        const sumCount = nearby.reduce((s, n) => s + n.transactions.length, 0);
        clusters.push({
          isCluster: true,
          id: `cluster_${item.key}`,
          x: avgX,
          y: avgY,
          totalAmount: sumAmt,
          count: sumCount,
          label: `Cluster Zona ${item.place.zone}`,
          categoryName: `${nearby.length} comercios agrupados`,
          color: '#0F172A',
          members: nearby,
        });
      }
    }
    return clusters;
  }, [placeGroups, enableClustering]);

  useEffect(() => {
    const canvas = heatmapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (!showHeatmap || placeGroups.length === 0) return;

    const maxAmt = Math.max(100, ...placeGroups.map((p) => p.totalAmount));

    placeGroups.forEach((pg) => {
      const { x, y } = projectLatLng(pg.place.latitude, pg.place.longitude, W, H);
      const intensity = Math.min(1, Math.max(0.25, pg.totalAmount / maxAmt));
      const radius = 55 + intensity * 55;

      const grad = ctx.createRadialGradient(x, y, 6, x, y, radius);
      grad.addColorStop(0, `rgba(220, 38, 38, ${0.52 * intensity})`);
      grad.addColorStop(0.45, `rgba(245, 158, 11, ${0.34 * intensity})`);
      grad.addColorStop(0.8, `rgba(16, 185, 129, ${0.16 * intensity})`);
      grad.addColorStop(1, 'rgba(16, 185, 129, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [placeGroups, showHeatmap]);

  const top5Places = useMemo(() => {
    return [...placeGroups]
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);
  }, [placeGroups]);

  const totalGeoSpent = useMemo(
    () => geoExpenses.reduce((acc, t) => acc + t.amount, 0),
    [geoExpenses]
  );

  const topZoneAlert = useMemo(() => {
    const zTotals = new Map<string, { amount: number; count: number }>();
    geoExpenses.forEach((tx) => {
      const z = tx.location?.zone || 'San Salvador';
      const cur = zTotals.get(z) || { amount: 0, count: 0 };
      zTotals.set(z, { amount: cur.amount + tx.amount, count: cur.count + 1 });
    });
    const sorted = Array.from(zTotals.entries()).sort((a, b) => b[1].amount - a[1].amount);
    if (sorted.length === 0) return null;
    const [zoneName, stats] = sorted[0];
    const sharePct = totalGeoSpent > 0 ? Math.round((stats.amount / totalGeoSpent) * 100) : 0;
    return { zoneName, amount: stats.amount, count: stats.count, sharePct };
  }, [geoExpenses, totalGeoSpent]);

  const zoneComparison = useMemo(() => {
    const zones = new Set<string>();
    const octMap = new Map<string, number>();
    const sepMap = new Map<string, number>();

    transactions
      .filter((t) => t.type === 'expense' && t.location?.zone)
      .forEach((t) => {
        const z = t.location!.zone;
        zones.add(z);
        if (t.date.startsWith('2026-10')) {
          octMap.set(z, (octMap.get(z) || 0) + t.amount);
        } else if (t.date.startsWith('2026-09')) {
          sepMap.set(z, (sepMap.get(z) || 0) + t.amount);
        }
      });

    return Array.from(zones)
      .map((zone) => {
        const oct = octMap.get(zone) || 0;
        const sep = sepMap.get(zone) || 0;
        const diff = oct - sep;
        const pct = sep > 0 ? Math.round(((oct - sep) / sep) * 100) : oct > 0 ? 100 : 0;
        return { zone, oct, sep, diff, pct };
      })
      .sort((a, b) => b.oct - a.oct);
  }, [transactions]);

  const selectedPlaceDetail = useMemo(() => {
    if (!selectedPlaceKey) return null;
    const allAtPlace = transactions.filter(
      (t) =>
        t.type === 'expense' &&
        t.location &&
        (t.location.placeId === selectedPlaceKey || t.location.name === selectedPlaceKey)
    );
    if (allAtPlace.length === 0) return null;
    const place = allAtPlace[0].location!;
    const lifetimeSpent = allAtPlace.reduce((s, t) => s + t.amount, 0);
    const avgTicket = lifetimeSpent / allAtPlace.length;
    const isFav = favoritePlaces.some(
      (fp) => fp.placeId === place.placeId || fp.name === place.name
    );
    return { place, transactions: allAtPlace, lifetimeSpent, avgTicket, isFav };
  }, [selectedPlaceKey, transactions, favoritePlaces]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Mapa de Gastos y Análisis Geoespacial
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Visualiza dónde gastas tu dinero con marcadores por monto y categoría, mapa de calor térmico, clustering y comparativa zonal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 no-print">
          <button
            type="button"
            onClick={() =>
              exportTransactionsToCSV(
                geoExpenses,
                categories,
                wallets,
                currency,
                `kaudal_mapa_gastos_${monthFilter}.csv`
              )
            }
            className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Mapa CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir / PDF por Ubicación</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenNewExpenseAtPlace(selectedPlaceDetail?.place)}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Gasto con Ubicación</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
              Resumen Automático de Concentración por Zona
            </div>
            {topZoneAlert ? (
              <p className="text-xs text-slate-700 dark:text-slate-200">
                En el periodo seleccionado gastaste{' '}
                <strong className="font-mono text-slate-900 dark:text-white">
                  {formatMoney(topZoneAlert.amount, currency)}
                </strong>{' '}
                en la zona de{' '}
                <strong className="text-emerald-700 dark:text-emerald-400">
                  {topZoneAlert.zoneName}
                </strong>{' '}
                ({topZoneAlert.count} compras · {topZoneAlert.sharePct}% del gasto en mapa).
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Ajusta los filtros para ver la alerta de concentración zonal.
              </p>
            )}
          </div>
          <div className="text-right font-mono shrink-0">
            <div className="text-xs text-slate-400">Total Mapa</div>
            <div className="text-base font-bold text-slate-900 dark:text-white">
              {formatMoney(totalGeoSpent, currency)}
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-center space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Lugares frecuentes favoritos (1 toque para registrar gasto ahí):</span>
            <span className="font-mono">{favoritePlaces.length} guardados</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {favoritePlaces.map((fp) => (
              <button
                key={fp.id}
                type="button"
                onClick={() => onOpenNewExpenseAtPlace(fp)}
                className="px-2.5 py-1 text-xs font-medium bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <Star className="w-3 h-3 text-amber-500 fill-current" />
                <span>+ Gasto en {fp.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {[
              { id: '2026-10', label: 'Oct 2026' },
              { id: '2026-09', label: 'Sep 2026' },
              { id: 'all', label: 'Histórico Completo' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setMonthFilter(p.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  monthFilter === p.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filtrar mapa por categoría"
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
          >
            <option value="all">Todas las categorías</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span>Hasta:</span>
            <input
              type="range"
              min="50"
              max="1000"
              step="25"
              value={maxAmountFilter}
              onChange={(e) => setMaxAmountFilter(Number(e.target.value))}
              className="w-24 accent-emerald-600"
            />
            <span className="font-mono font-semibold text-slate-900 dark:text-white w-16">
              ${maxAmountFilter}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHeatmap((prev) => !prev)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              showHeatmap
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Mapa de Calor: {showHeatmap ? 'Activo' : 'Oculto'}</span>
          </button>

          <button
            type="button"
            onClick={() => setEnableClustering((prev) => !prev)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              enableClustering
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Agrupar Pines (Clustering): {enableClustering ? 'Sí' : 'No'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
          <div className="relative h-[480px] w-full bg-slate-100 dark:bg-slate-950 overflow-hidden select-none">
            <div
              onMouseDown={(e) => {
                setIsDragging(true);
                setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
              }}
              onMouseMove={(e) => {
                if (!isDragging) return;
                setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
              }}
              className="w-full h-full relative cursor-grab active:cursor-grabbing transition-transform duration-75"
            >
              <svg
                viewBox="0 0 880 480"
                className="w-full h-full object-cover"
                aria-label="Mapa interactivo de gastos en Gran San Salvador"
              >
                <defs>
                  <pattern
                    id="mapGrid"
                    width="44"
                    height="44"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 44 0 L 0 0 0 44"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.6"
                      className="text-slate-200/80 dark:text-slate-800/70"
                    />
                  </pattern>
                </defs>

                <rect width="880" height="480" fill="url(#mapGrid)" />

                <ellipse
                  cx="210"
                  cy="95"
                  rx="115"
                  ry="55"
                  className="fill-emerald-500/10 dark:fill-emerald-500/5"
                />
                <ellipse
                  cx="285"
                  cy="245"
                  rx="65"
                  ry="38"
                  className="fill-emerald-500/10 dark:fill-emerald-500/5"
                />
                <ellipse
                  cx="735"
                  cy="220"
                  rx="85"
                  ry="65"
                  className="fill-amber-500/5 dark:fill-amber-500/5"
                />

                <path
                  d="M 20 340 Q 210 310 380 265 T 860 215"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-slate-300 dark:text-slate-800"
                />
                <path
                  d="M 20 340 Q 210 310 380 265 T 860 215"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="8 6"
                  className="text-amber-500/60 dark:text-amber-400/50"
                />
                <path
                  d="M 190 175 L 440 190 L 630 198"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4.5"
                  className="text-slate-300 dark:text-slate-800"
                />
                <path
                  d="M 465 30 L 420 260 L 385 450"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-slate-300 dark:text-slate-800"
                />
                <path
                  d="M 135 370 Q 260 280 295 165"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  className="text-slate-200 dark:text-slate-800/90"
                />

                <g className="text-[10px] font-mono fill-slate-400 dark:fill-slate-500 uppercase tracking-wider">
                  <text x="115" y="325">
                    Santa Tecla
                  </text>
                  <text x="220" y="365">
                    Antiguo Cuscatlán
                  </text>
                  <text x="275" y="155">
                    Colonia Escalón
                  </text>
                  <text x="310" y="235">
                    San Benito / Zona Rosa
                  </text>
                  <text x="535" y="185">
                    Centro Histórico
                  </text>
                  <text x="695" y="190">
                    Soyapango / Plaza Mundo
                  </text>
                </g>
              </svg>

              <canvas
                ref={heatmapCanvasRef}
                width={880}
                height={480}
                className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-200 ${
                  showHeatmap ? 'opacity-100' : 'opacity-0'
                }`}
              />

              <div className="absolute inset-0 pointer-events-none">
                {renderedMarkers.map((m) => {
                  const isSelected =
                    !m.isCluster && selectedPlaceKey === m.id;
                  const leftPct = (m.x / 880) * 100;
                  const topPct = (m.y / 480) * 100;

                  return (
                    <div
                      key={m.id}
                      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                      className="absolute -translate-x-1/2 -translate-y-full pointer-events-auto z-10"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (m.isCluster) {
                            setEnableClustering(false);
                            setZoom(1.25);
                            setSelectedPlaceKey(m.members[0]?.key || null);
                          } else {
                            setSelectedPlaceKey(m.id);
                          }
                        }}
                        className={`group flex flex-col items-center transition-transform ${
                          isSelected ? 'scale-110 z-20' : 'hover:scale-105'
                        }`}
                      >
                        <div
                          className={`px-2.5 py-1 rounded-lg border shadow-sm flex items-center gap-1.5 whitespace-nowrap text-xs font-mono font-semibold ${
                            m.isCluster
                              ? 'bg-slate-900 text-white border-emerald-400'
                              : isSelected
                              ? 'bg-emerald-600 text-white border-white ring-2 ring-emerald-500'
                              : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                              backgroundColor: isSelected ? '#ffffff' : m.color,
                            }}
                          />
                          <span>{formatMoney(m.totalAmount, currency)}</span>
                          {m.count > 1 && (
                            <span className="text-[10px] opacity-80">
                              ({m.count})
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 px-1.5 py-0.5 rounded bg-white/90 dark:bg-slate-900/90 text-[10px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 max-w-[140px] truncate">
                          {m.label} · {m.categoryName}
                        </div>
                        <div className="w-0.5 h-2.5 bg-slate-700 dark:bg-emerald-400" />
                        <div className="w-2 h-2 rounded-full bg-slate-900 dark:bg-emerald-400 -mt-0.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="absolute top-3 right-3 flex flex-col gap-1.5 bg-white/95 dark:bg-slate-900/95 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 no-print">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.2).toFixed(2))))}
                aria-label="Acercar mapa"
                className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.8, Number((z - 0.2).toFixed(2))))}
                aria-label="Alejar mapa"
                className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                aria-label="Centrar mapa"
                className="p-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 pointer-events-none">
              <div className="flex items-center gap-2">
                <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Área Metropolitana de San Salvador · {placeGroups.length} ubicaciones activas ({geoExpenses.length} compras)
                </span>
              </div>
              <div className="font-mono text-[10px]">
                Haz clic en cualquier marcador para inspeccionar su historial completo
              </div>
            </div>
          </div>

          <div className="p-5 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Comparativa de Gasto por Zona entre Meses (Octubre vs. Septiembre 2026)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Detecta en qué zonas geográficas aumentó o disminuyó tu gasto mensual.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                    <th className="py-2 pr-4">Zona Geográfica</th>
                    <th className="py-2 px-3 text-right">Septiembre 2026</th>
                    <th className="py-2 px-3 text-right">Octubre 2026</th>
                    <th className="py-2 pl-3 text-right">Variación Mensual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {zoneComparison.map((zc) => (
                    <tr key={zc.zone}>
                      <td className="py-2.5 pr-4 font-medium text-slate-900 dark:text-white">
                        {zc.zone}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {formatMoney(zc.sep, currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                        {formatMoney(zc.oct, currency)}
                      </td>
                      <td className="py-2.5 pl-3 text-right font-mono tabular-nums whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            zc.diff > 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : zc.diff < 0
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {zc.diff > 0 ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : zc.diff < 0 ? (
                            <TrendingDown className="w-3.5 h-3.5" />
                          ) : null}
                          <span>
                            {formatMoney(zc.diff, currency, true)} ({zc.pct > 0 ? `+${zc.pct}%` : `${zc.pct}%`})
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
            {selectedPlaceDetail ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      Ficha Histórica del Lugar Seleccionado
                    </div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                      {selectedPlaceDetail.place.name}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedPlaceDetail.place.address}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onToggleFavoritePlace(
                        selectedPlaceDetail.place,
                        selectedPlaceDetail.transactions[0]?.categoryId
                      )
                    }
                    title={
                      selectedPlaceDetail.isFav
                        ? 'Quitar de favoritos'
                        : 'Guardar como lugar favorito'
                    }
                    className={`p-2 rounded-lg border transition-colors shrink-0 ${
                      selectedPlaceDetail.isFav
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-500'
                        : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-amber-500'
                    }`}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        selectedPlaceDetail.isFav ? 'fill-current' : ''
                      }`}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div>
                    <div className="text-[11px] text-slate-500">Total Gastado Aquí</div>
                    <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                      {formatMoney(selectedPlaceDetail.lifetimeSpent, currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">
                      Ticket Promedio ({selectedPlaceDetail.transactions.length} visitas)
                    </div>
                    <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                      {formatMoney(selectedPlaceDetail.avgTicket, currency)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Historial de compras en esta ubicación:
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                    {selectedPlaceDetail.transactions.map((tx) => (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => onEditTransaction(tx)}
                        className="w-full p-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 dark:text-white truncate">
                            {tx.sourceOrMerchant}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {tx.date} · {catMap.get(tx.categoryId)?.name}
                          </div>
                        </div>
                        <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white shrink-0">
                          -{formatMoney(tx.amount, currency)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenNewExpenseAtPlace(selectedPlaceDetail.place)}
                  className="w-full py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Registrar nuevo gasto en {selectedPlaceDetail.place.name}</span>
                </button>
              </>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                Selecciona cualquier marcador en el mapa para inspeccionar el historial de ese lugar.
              </div>
            )}
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 flex-1">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Top 5 Lugares Donde Más Gasto
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ranking de comercios y centros comerciales según el filtro activo.
              </p>
            </div>

            <div className="space-y-3">
              {top5Places.map((item, index) => {
                const pct =
                  totalGeoSpent > 0
                    ? Math.round((item.totalAmount / totalGeoSpent) * 100)
                    : 0;
                const active = selectedPlaceKey === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setSelectedPlaceKey(item.key);
                      setZoom(1.2);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors space-y-1.5 ${
                      active
                        ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                        <span className="font-mono text-slate-400">
                          0{index + 1}.
                        </span>
                        <span className="truncate">{item.place.name}</span>
                      </div>
                      <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white shrink-0">
                        {formatMoney(item.totalAmount, currency)}
                      </span>
                    </div>

                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        style={{
                          width: `${Math.max(5, pct)}%`,
                          backgroundColor: item.primaryCategory?.colorHex || '#059669',
                        }}
                        className="h-full rounded-full"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>
                        {item.place.zone} · {item.transactions.length} visitas
                      </span>
                      <span className="font-mono">{pct}% del mapa</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
