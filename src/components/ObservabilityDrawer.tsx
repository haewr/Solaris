import React from 'react';
import { X, BarChart2, DollarSign, Database, Zap, Clock, ShieldCheck, Server } from 'lucide-react';
import { weatherMetrics } from '../services/weatherService';
import { buildingMetrics } from '../services/buildingFootprintService';

interface ObservabilityDrawerProps {
  onClose: () => void;
  assessmentCount: number;
}

export const ObservabilityDrawer: React.FC<ObservabilityDrawerProps> = ({
  onClose,
  assessmentCount,
}) => {
  const cacheHitRate =
    weatherMetrics.totalRequests > 0
      ? Math.round((weatherMetrics.cacheHits / weatherMetrics.totalRequests) * 100)
      : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto" id="observability-metrics-modal">
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-xl p-6 sm:p-7 space-y-6 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-['Space_Grotesk']">
                System Observability & Zero-Cost Architecture
              </h3>
              <p className="text-xs text-slate-500">
                Live operational telemetry, caching performance and provider metrics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Marginal Cost Metric Highlight */}
        <div className="bg-emerald-50/80 border border-emerald-200 p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block">
              Cumulative Third-Party API Spend
            </span>
            <div className="text-2xl font-black text-emerald-950 font-['Space_Grotesk']">$0.00 USD</div>
            <p className="text-xs text-emerald-700">
              Zero Google Solar API or proprietary roof vendor charges incurred.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3.5 text-xs">
          {/* Spatial Lookups */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500 font-medium">
              <span>Spatial Hits</span>
              <Database className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl font-black text-slate-900 font-['Space_Grotesk']">{buildingMetrics.spatialHits}</div>
            <p className="text-[10px] text-slate-400">
              Avg latency: {buildingMetrics.lastDurationMs} ms
            </p>
          </div>

          {/* Weather Cache Hit Rate */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500 font-medium">
              <span>Weather Cache Hit</span>
              <Server className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl font-black text-indigo-600 font-['Space_Grotesk']">{cacheHitRate}%</div>
            <p className="text-[10px] text-slate-400">
              {weatherMetrics.cacheHits} hits / {weatherMetrics.totalRequests} queries
            </p>
          </div>

          {/* Active Geohash Buckets */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500 font-medium">
              <span>Cached Spatial Buckets</span>
              <Zap className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-slate-900 font-['Space_Grotesk']">{weatherMetrics.activeCachedBuckets}</div>
            <p className="text-[10px] text-slate-400">1–3 km geographic resolution</p>
          </div>

          {/* Total Solar Assessments */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500 font-medium">
              <span>Assessments Generated</span>
              <Clock className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-xl font-black text-slate-900 font-['Space_Grotesk']">{assessmentCount}</div>
            <p className="text-[10px] text-slate-400">Model: solaris-pv-v1 (pvlib)</p>
          </div>
        </div>

        {/* Building Provider Distribution */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
          <span className="font-bold text-slate-700 block">Open Building Providers Active:</span>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 text-[11px] font-medium shadow-2xs">
              Open Buildings (Google Research Open Data)
            </span>
            <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 text-[11px] font-medium shadow-2xs">
              Microsoft Global ML Footprints
            </span>
            <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 text-[11px] font-medium shadow-2xs">
              OpenStreetMap (OSM)
            </span>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
          >
            Close Metrics
          </button>
        </div>
      </div>
    </div>
  );
};
