import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Line, Text } from '@react-three/drei';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Activity, AlertTriangle, ShieldCheck, Zap, Server, RefreshCw, BarChart2, Cpu, FileText, Globe } from 'lucide-react';

// Read Vite Environment Variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'false' ? false : true;

// Mock Fallback Data
const MOCK_ASSETS = [
  { zone: 'ES', name: 'Spain (Red Eléctrica)', capacity_mw: 42000, current_load_mw: 38450.0, load_ratio: 0.915, temperature_c: 38.5, risk_score: 0.8842, status: 'CRITICAL' },
  { zone: 'DE', name: 'Germany (TenneT)', capacity_mw: 75000, current_load_mw: 54100.0, load_ratio: 0.721, temperature_c: 24.2, risk_score: 0.3812, status: 'SAFE' },
  { zone: 'FR', name: 'France (RTE)', capacity_mw: 85000, current_load_mw: 67200.0, load_ratio: 0.791, temperature_c: 29.8, risk_score: 0.6210, status: 'WARNING' }
];

const MOCK_FORECAST = Array.from({ length: 24 }, (_, i) => {
  const h = i;
  const base = 35000 + 6000 * Math.sin((h - 8) * Math.PI / 12);
  return {
    hour: `${h}:00`,
    p10_mw: Math.round(base * 0.94),
    p50_mw: Math.round(base),
    p90_mw: Math.round(base * 1.06),
    capacity_mw: 42000
  };
});

const MOCK_SHAP = [
  { feature: 'temperature', impact: 0.38, label: 'High Temp (38.5°C)' },
  { feature: 'load_lag_1h', impact: 0.32, label: 'Peak Hourly Load' },
  { feature: 'temp_humidity_index', impact: 0.18, label: 'Heat Humidity Stress' },
  { feature: 'load_rolling_mean_24h', impact: 0.08, label: '24h Sustained Demand' },
  { feature: 'is_weekend', impact: -0.04, label: 'Weekday Industrial Baseline' }
];

const MOCK_SHED_SCHEDULE = {
  severity: 'HIGH',
  reasoning: 'Overload risk score (0.88) exceeds safety threshold 0.80. Spain grid demand (38,450 MW) operates near maximum capacity margin (36,960 MW). Immediate curtailment required.',
  recommended_action: 'Initiate Stage-1 rotational load shedding of 1,639 MW across non-critical industrial feeders.',
  shed_schedule: [
    { step: 1, target_feeder: 'Feeder-ES-IND-01', shed_mw: 983.4, priority: 'Low' },
    { step: 2, target_feeder: 'Feeder-ES-IND-02', shed_mw: 655.6, priority: 'Medium' }
  ]
};

// 3D Substation Node Component
function SubstationNode({ position, color, label, risk, onClick }) {
  const meshRef = useRef();
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
      if (risk > 0.7) {
        meshRef.current.scale.x = 1 + 0.1 * Math.sin(state.clock.elapsedTime * 6);
        meshRef.current.scale.y = 1 + 0.1 * Math.sin(state.clock.elapsedTime * 6);
        meshRef.current.scale.z = 1 + 0.1 * Math.sin(state.clock.elapsedTime * 6);
      }
    }
  });

  return (
    <group position={position} onClick={onClick}>
      <Sphere ref={meshRef} args={[0.4, 32, 32]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} roughness={0.2} />
      </Sphere>
      <Text position={[0, 0.7, 0]} fontSize={0.3} color="white" anchorX="center" anchorY="middle">
        {label}
      </Text>
    </group>
  );
}

// 3D Grid Topology Component
function GridTopology3D({ selectedZone, onSelectZone }) {
  const nodes = [
    { id: 'ES', name: 'ES Substation', pos: [-2.5, 0, 0], color: '#ef4444', risk: 0.88 },
    { id: 'DE', name: 'DE Central', pos: [0, 1.8, 0], color: '#10b981', risk: 0.38 },
    { id: 'FR', name: 'FR North', pos: [2.5, 0, 0], color: '#f59e0b', risk: 0.62 }
  ];

  const lines = [
    { from: [-2.5, 0, 0], to: [0, 1.8, 0], color: '#f59e0b' },
    { from: [0, 1.8, 0], to: [2.5, 0, 0], color: '#3b82f6' },
    { from: [-2.5, 0, 0], to: [2.5, 0, 0], color: '#ef4444' }
  ];

  return (
    <div className="w-full h-64 bg-[#0f172a]/60 rounded-xl overflow-hidden relative border border-slate-800">
      <div className="absolute top-3 left-3 z-10 text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-700">
        <Globe className="w-3.5 h-3.5 text-blue-400" />
        Interactive 3D Grid Topology
      </div>
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.8} />
        {lines.map((l, i) => (
          <Line key={i} points={[l.from, l.to]} color={l.color} lineWidth={2} dashed={false} />
        ))}
        {nodes.map(n => (
          <SubstationNode
            key={n.id}
            position={n.pos}
            color={selectedZone === n.id ? '#38bdf8' : n.color}
            label={n.id}
            risk={n.risk}
            onClick={() => onSelectZone(n.id)}
          />
        ))}
      </Canvas>
    </div>
  );
}

export default function GridSenseDashboard() {
  const [selectedZone, setSelectedZone] = useState('ES');
  const [useMock, setUseMock] = useState(USE_MOCK_DATA);
  const [assets, setAssets] = useState(MOCK_ASSETS);
  const [forecast, setForecast] = useState(MOCK_FORECAST);
  const [shapFactors, setShapFactors] = useState(MOCK_SHAP);
  const [shedSchedule, setShedSchedule] = useState(MOCK_SHED_SCHEDULE);
  const [loading, setLoading] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Test API root connection
      const rootRes = await fetch(`${API_BASE_URL}/`);
      if (rootRes.ok) {
        setApiConnected(true);
        if (!useMock) {
          // Assets list
          const assetsRes = await fetch(`${API_BASE_URL}/assets`);
          if (assetsRes.ok) {
            const data = await assetsRes.json();
            setAssets(data.assets || MOCK_ASSETS);
          }
          // Forecast for selected zone
          const fcRes = await fetch(`${API_BASE_URL}/forecast/${selectedZone}?horizon_hours=24`);
          if (fcRes.ok) {
            const fcData = await fcRes.json();
            const formatted = fcData.forecast.map(pt => ({
              hour: `${pt.hour}:00`,
              p10_mw: pt.p10_mw,
              p50_mw: pt.p50_mw,
              p90_mw: pt.p90_mw,
              capacity_mw: pt.capacity_mw
            }));
            setForecast(formatted);
          }
          // Risk & SHAP factors
          const riskRes = await fetch(`${API_BASE_URL}/risk/${selectedZone}`);
          if (riskRes.ok) {
            const rData = await riskRes.json();
            if (rData.top_contributing_factors) {
              setShapFactors(rData.top_contributing_factors.map(f => ({
                feature: f.feature,
                impact: f.impact,
                label: f.feature.replace('_', ' ')
              })));
            }
          }
          // Shed schedule
          const shedRes = await fetch(`${API_BASE_URL}/shed-schedule/${selectedZone}`);
          if (shedRes.ok) {
            const sData = await shedRes.json();
            setShedSchedule(sData);
          }
        }
      } else {
        setApiConnected(false);
      }
    } catch (err) {
      console.warn("API Connection unavailable, using mock dataset:", err);
      setApiConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedZone, useMock]);

  const activeAsset = assets.find(a => a.zone === selectedZone) || assets[0];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Header Navigation */}
      <header className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600/20 rounded-xl border border-blue-500/30 text-blue-400">
            <Zap className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-white">GridSense AI</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                v1.0 Operational Pilot
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              AI-Powered Short-Term Load Forecasting & Overload Risk Intelligence
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Toggle Indicator */}
          <button
            onClick={() => setUseMock(!useMock)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
              useMock
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            {useMock ? 'DEMO MOCK DATA' : apiConnected ? 'LIVE REST API CONNECTED' : 'API CONNECTING...'}
          </button>

          <button
            onClick={fetchDashboardData}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Grid Topology & Asset Monitor Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: 3D Grid Topology */}
        <div className="lg:col-span-1 glass-panel p-5 rounded-2xl flex flex-col justify-between space-y-4">
          <GridTopology3D selectedZone={selectedZone} onSelectZone={setSelectedZone} />

          {/* Active Selected Zone Card */}
          <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selected Zone Overview</span>
              <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                activeAsset.status === 'CRITICAL' ? 'status-critical' : activeAsset.status === 'WARNING' ? 'status-warning' : 'status-safe'
              }`}>
                {activeAsset.status}
              </span>
            </div>
            <div className="text-lg font-bold text-white">{activeAsset.name}</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
                <div className="text-slate-400">Current Demand</div>
                <div className="text-sm font-extrabold text-blue-400 mt-0.5">{activeAsset.current_load_mw.toLocaleString()} MW</div>
              </div>
              <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
                <div className="text-slate-400">Grid Capacity</div>
                <div className="text-sm font-extrabold text-slate-200 mt-0.5">{activeAsset.capacity_mw.toLocaleString()} MW</div>
              </div>
              <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
                <div className="text-slate-400">Ambient Temp</div>
                <div className="text-sm font-extrabold text-amber-400 mt-0.5">{activeAsset.temperature_c}°C</div>
              </div>
              <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
                <div className="text-slate-400">Overload Risk</div>
                <div className="text-sm font-extrabold text-rose-400 mt-0.5">{(activeAsset.risk_score * 100).toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Asset Risk Table */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Monitored Grid Asset Rankings
            </h2>
            <span className="text-xs text-slate-400">Sorted by Overload Risk Score</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Zone / Asset</th>
                  <th className="p-3">Capacity</th>
                  <th className="p-3">Current Load</th>
                  <th className="p-3">Load Ratio</th>
                  <th className="p-3">Temp</th>
                  <th className="p-3">Risk Score</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {assets.map(asset => (
                  <tr
                    key={asset.zone}
                    onClick={() => setSelectedZone(asset.zone)}
                    className={`cursor-pointer transition hover:bg-slate-800/50 ${
                      selectedZone === asset.zone ? 'bg-blue-600/10 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <td className="p-3 font-semibold text-white">{asset.name} ({asset.zone})</td>
                    <td className="p-3 font-mono">{asset.capacity_mw.toLocaleString()} MW</td>
                    <td className="p-3 font-mono">{asset.current_load_mw.toLocaleString()} MW</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              asset.load_ratio > 0.88 ? 'bg-rose-500' : asset.load_ratio > 0.75 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, asset.load_ratio * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-semibold">{(asset.load_ratio * 100).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-amber-300">{asset.temperature_c}°C</td>
                    <td className="p-3 font-mono font-bold text-rose-400">{(asset.risk_score * 100).toFixed(1)}%</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        asset.status === 'CRITICAL' ? 'status-critical' : asset.status === 'WARNING' ? 'status-warning' : 'status-safe'
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Forecast & Explainability Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 24h Load Forecast with Quantiles */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-400" />
                24-Hour Demand Forecast ({selectedZone})
              </h2>
              <p className="text-xs text-slate-400">LightGBM Regression output with P10/P50/P90 prediction intervals</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"/> P50 Expected</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-300/40 inline-block"/> P10-P90 Band</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecast} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="p90_mw" stroke="none" fill="url(#forecastBand)" name="P90 Upper" />
                <Area type="monotone" dataKey="p10_mw" stroke="none" fill="#0f172a" name="P10 Lower" />
                <Area type="monotone" dataKey="p50_mw" stroke="#3b82f6" strokeWidth={2.5} fill="none" name="P50 Forecast (MW)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: SHAP Feature Contribution */}
        <div className="lg:col-span-1 glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-400" />
              SHAP Risk Explainer
            </h2>
            <span className="text-xs text-slate-400">Top Factors</span>
          </div>

          <p className="text-xs text-slate-400">Feature contributions driving overload risk calculation for {selectedZone}</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shapFactors} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={10} />
                <YAxis dataKey="label" type="category" stroke="#94a3b8" fontSize={10} width={90} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
                  {shapFactors.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.impact > 0 ? '#ef4444' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Decision-Support Load Shedding Schedule Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              shedSchedule.severity === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Recommended Load-Shedding Schedule (Decision Support)</h2>
              <p className="text-xs text-slate-400">Rule-layer prioritization engine — advisory only, non-autonomous</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-lg text-xs font-extrabold tracking-wider ${
            shedSchedule.severity === 'HIGH' ? 'status-critical' : 'status-safe'
          }`}>
            SEVERITY: {shedSchedule.severity}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Transparent Reasoning Engine
            </span>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              {shedSchedule.reasoning}
            </p>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Operator Action Directive
            </span>
            <p className="text-xs text-slate-200 leading-relaxed font-semibold">
              {shedSchedule.recommended_action}
            </p>
          </div>
        </div>

        {shedSchedule.shed_schedule && shedSchedule.shed_schedule.length > 0 && (
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Order Step</th>
                  <th className="p-3">Target Feeder</th>
                  <th className="p-3">Shed Amount (MW)</th>
                  <th className="p-3">Feeder Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {shedSchedule.shed_schedule.map(step => (
                  <tr key={step.step} className="hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-white">Step #{step.step}</td>
                    <td className="p-3 font-mono text-blue-300">{step.target_feeder}</td>
                    <td className="p-3 font-mono font-bold text-rose-400">{step.shed_mw} MW</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                        {step.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
