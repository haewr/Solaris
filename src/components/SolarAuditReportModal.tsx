import React from 'react';
import {
  X,
  Printer,
  Download,
  ShieldCheck,
  Sun,
  Zap,
  Home,
  Compass,
  DollarSign,
  Leaf,
  Calendar,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { Assessment } from '../types/solaris';

interface SolarAuditReportModalProps {
  assessment: Assessment;
  onClose: () => void;
}

export const SolarAuditReportModal: React.FC<SolarAuditReportModalProps> = ({
  assessment,
  onClose,
}) => {
  const { forecast, system, roof, address, createdAt } = assessment;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(assessment, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `SOLARIS_ENGINEERING_AUDIT_${assessment.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto" id="solar-audit-report-modal">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-10 space-y-8 my-8 text-slate-800 print:m-0 print:p-0 print:border-none print:shadow-none">
        {/* Modal Top Actions (Hidden in Print) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
              ENGINEERING AUDIT DOSSIER
            </span>
            <span className="text-xs text-slate-500">Document #{assessment.id.slice(0, 8).toUpperCase()}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-100"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={handleDownloadJson}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Raw JSON</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
                S
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 font-['Space_Grotesk']">
                SOLARIS SOLAR AUDIT
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Open Building Footprints • pvlib NOCT & POA Physical Solar Pipeline
            </p>
            <p className="text-xs font-semibold text-slate-800 pt-1">
              Property Location: <span className="font-normal text-slate-600">{address}</span>
            </p>
          </div>

          <div className="text-left sm:text-right text-xs space-y-1 text-slate-500">
            <div><strong>Audit Date:</strong> {new Date(createdAt).toLocaleDateString()}</div>
            <div><strong>Coordinates:</strong> {assessment.lat.toFixed(5)}, {assessment.lng.toFixed(5)}</div>
            <div><strong>Physics Engine:</strong> pvlib-v1 (NOCT + Hay-Davies POA)</div>
            <div><strong>Status:</strong> <span className="text-emerald-700 font-bold">VERIFIED COMPLETE</span></div>
          </div>
        </div>

        {/* Executive Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">System Capacity</span>
            <div className="text-xl font-black text-slate-900 font-['Space_Grotesk'] mt-0.5">{forecast.systemSizeKwp} kWp</div>
            <span className="text-[11px] text-slate-500">{system.panelCount} × {system.panelWattage}W Mono</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Annual Generation</span>
            <div className="text-xl font-black text-indigo-600 font-['Space_Grotesk'] mt-0.5">{forecast.annualPotentialMwh} MWh</div>
            <span className="text-[11px] text-slate-500">~{forecast.predictedKwh} kWh / day avg</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Usable Roof Area</span>
            <div className="text-xl font-black text-slate-900 font-['Space_Grotesk'] mt-0.5">{roof.usableAreaM2} m²</div>
            <span className="text-[11px] text-slate-500">Tilt: {roof.tiltDeg}° • Facing: {roof.orientationCategory}</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Carbon Avoidance</span>
            <div className="text-xl font-black text-emerald-600 font-['Space_Grotesk'] mt-0.5">{forecast.co2SavedKgAnnual.toLocaleString()} kg</div>
            <span className="text-[11px] text-slate-500">CO2 offset per year</span>
          </div>
        </div>

        {/* Engineering Equipment Bill of Materials (BOM) */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-indigo-600" />
            Preliminary Equipment Bill of Materials (BOM)
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-2xl overflow-hidden">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Component</th>
                  <th className="p-3">Specifications</th>
                  <th className="p-3 text-center">Quantity</th>
                  <th className="p-3 text-right">Standard Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-3 font-semibold text-slate-900">PV Solar Modules</td>
                  <td className="p-3 text-slate-600">Tier-1 Monocrystalline PERC/TOPCon {system.panelWattage}W</td>
                  <td className="p-3 text-center font-bold text-slate-900">{system.panelCount} units</td>
                  <td className="p-3 text-right text-slate-600">{(system.moduleEfficiency * 100).toFixed(1)}% STC</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-900">Grid-Tied Inverter</td>
                  <td className="p-3 text-slate-600">Dual MPPT Pure Sine Inverter ({system.inverterCapacityKw} kW AC)</td>
                  <td className="p-3 text-center font-bold text-slate-900">1 unit</td>
                  <td className="p-3 text-right text-slate-600">97.8% Euro</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-900">Racking & Mounting</td>
                  <td className="p-3 text-slate-600">Anodized Aluminum Racking (Roof Pitch: {roof.tiltDeg}°)</td>
                  <td className="p-3 text-center font-bold text-slate-900">{system.panelCount} sets</td>
                  <td className="p-3 text-right text-slate-600">Class 4 Wind Rated</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-900">BOS / Balance of System</td>
                  <td className="p-3 text-slate-600">DC Disconnect, AC Breaker, SPD Surge Protection & Cables</td>
                  <td className="p-3 text-center font-bold text-slate-900">1 lot</td>
                  <td className="p-3 text-right text-slate-600">IEEE 1547 / NEC 690</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Generation Profile Table */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-600" />
            Monthly Solar Yield Profile
          </h4>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
            {forecast.monthlyEstimateKwh.map((m) => (
              <div key={m.month} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">{m.month}</span>
                <strong className="text-sm font-black text-slate-900 block my-0.5">{m.kwh}</strong>
                <span className="text-[10px] text-slate-500">{m.avgDailyKwh} kWh/d</span>
              </div>
            ))}
          </div>
        </div>

        {/* Environmental Certificate */}
        <div className="bg-emerald-50/80 border border-emerald-200 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-emerald-950 block font-bold">25-Year Carbon Offset Equivalency</strong>
              <p className="text-emerald-800">
                Prevents <strong>{((forecast.co2SavedKgAnnual * 25) / 1000).toFixed(1)} metric tons</strong> of CO2 emissions — equivalent to planting ~<strong>{Math.round((forecast.co2SavedKgAnnual * 25) / 21)} trees</strong>.
              </p>
            </div>
          </div>
          <div className="text-emerald-900 font-bold text-[11px] px-3 py-1 bg-white rounded-full border border-emerald-200 shadow-2xs">
            Net-Zero Impact
          </div>
        </div>

        {/* Document Footer */}
        <div className="border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400 space-y-1">
          <p>Generated by SOLARIS — Open Solar Potential & Physical Photovoltaic Modeling Pipeline</p>
          <p>Zero paid API dependencies • Open Buildings Datasets & pvlib Physics Engine</p>
        </div>
      </div>
    </div>
  );
};
