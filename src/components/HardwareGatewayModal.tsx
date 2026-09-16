import React, { useState } from 'react';
import {
  X,
  Zap,
  Activity,
  Server,
  Radio,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileText,
  Sliders,
  ShieldCheck,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { Assessment, HardwareGatewayConnection } from '../types/solaris';
import {
  supportedGatewayPresets,
  createSimulatedGateway,
  parseInverterCsvData,
} from '../services/hardwareGatewayService';

interface HardwareGatewayModalProps {
  assessment: Assessment;
  onClose: () => void;
}

export const HardwareGatewayModal: React.FC<HardwareGatewayModalProps> = ({
  assessment,
  onClose,
}) => {
  const [selectedBrand, setSelectedBrand] = useState<HardwareGatewayConnection['brand']>('enphase');
  const [endpointInput, setEndpointInput] = useState<string>('https://envoy.local/production.json');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [gatewayData, setGatewayData] = useState<HardwareGatewayConnection>(() =>
    createSimulatedGateway('enphase', assessment.system.systemCapacityKwp)
  );

  const [csvUploadCount, setCsvUploadCount] = useState<number | null>(null);

  const handleBrandSelect = (brand: HardwareGatewayConnection['brand']) => {
    setSelectedBrand(brand);
    const preset = supportedGatewayPresets.find((p) => p.brand === brand);
    if (preset) {
      setEndpointInput(preset.defaultPortOrEndpoint);
      setGatewayData(createSimulatedGateway(brand, assessment.system.systemCapacityKwp));
    }
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const rows = parseInverterCsvData(text);
      setCsvUploadCount(rows.length);
      setIsConnected(true);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto" id="hardware-gateway-modal">
      <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-xl p-6 sm:p-7 space-y-6 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 font-['Space_Grotesk']">
                  Hardware Gateway & Inverter Integration
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  PHASE 2 HARDWARE LINK
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Connect your physical inverter gateway or stream telemetry from smart energy meters
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

        {/* Supported Gateway Integrations Grid */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 block">
            Select Inverter Gateway / Protocol
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {supportedGatewayPresets.map((preset) => (
              <button
                key={preset.brand}
                type="button"
                onClick={() => handleBrandSelect(preset.brand)}
                className={`p-3 rounded-2xl text-left border transition-all ${
                  selectedBrand === preset.brand
                    ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                }`}
              >
                <strong className="text-xs font-bold text-slate-900 block truncate">{preset.name.split(' ')[0]}</strong>
                <p className="text-[10px] text-slate-500 line-clamp-1">{preset.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Connection Setup Form */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4 text-xs">
          {selectedBrand === 'csv_upload' ? (
            <div className="space-y-3">
              <label className="font-bold text-slate-800 block">
                Upload Inverter CSV Log File
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:bg-white transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleCsvFile}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <UploadCloud className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                <p className="font-bold text-slate-800">
                  {csvUploadCount ? `Loaded ${csvUploadCount} telemetry records` : 'Click or Drag & Drop Inverter CSV Log'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Format: Timestamp, Solar_kW, Consumption_kW, Battery_SoC
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Local IP / API Endpoint
                  </label>
                  <input
                    type="text"
                    value={endpointInput}
                    onChange={(e) => setEndpointInput(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. https://envoy.local/production.json"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    API Key / Token (Optional)
                  </label>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Enter auth bearer token if required"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Hardware Telemetry Status */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <strong className="text-xs font-bold text-slate-900">
                Connected Gateway: {gatewayData.name}
              </strong>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              SN: {gatewayData.serialNumber} • {gatewayData.firmwareVersion}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[10px]">Instant Power Output</span>
              <strong className="text-emerald-600 font-black text-sm">{gatewayData.currentPowerAcKw} kW</strong>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[10px]">Daily Energy Yield</span>
              <strong className="text-slate-900 font-black text-sm">{gatewayData.dailyYieldKwh} kWh</strong>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[10px]">Grid Voltage & Freq</span>
              <strong className="text-slate-900 font-black text-sm">{gatewayData.gridVoltageV}V / {gatewayData.gridFrequencyHz}Hz</strong>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[10px]">Inverter Core Temp</span>
              <strong className="text-slate-900 font-black text-sm">{gatewayData.inverterTempC}°C (Normal)</strong>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Local Network Safe (Zero Cloud Telemetry Tracking)</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors shadow-sm shadow-indigo-100"
          >
            Save Gateway Settings
          </button>
        </div>
      </div>
    </div>
  );
};
