import { useMemo, useState } from 'react';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Target, 
  ChevronRight, 
  BarChart3, 
  PieChart as PieIcon,
  Filter,
  Monitor,
  ChevronUp,
  ChevronDown,
  LayoutDashboard,
  ShieldCheck,
  Settings2,
  Calendar,
  Phone,
  ArrowRight,
  Info
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { getDashboardData } from './data';
import { cn, formatCurrency, formatNumber } from './lib/utils';
import { Vertical, OperationalSettings, VerticalOperationalParams } from './types';
import { motion, AnimatePresence } from 'motion/react';

const VERTICAL_COLORS: Record<Vertical, string> = {
  'Financeiro I': '#0ea5e9',   // Blue
  'Financeiro II': '#10b981',  // Green
  'Governo': '#f59e0b',        // Amber/Yellow
  'Agro/Corp': '#ef4444',      // Red/Orange focus
};

type View = 'dashboard' | 'operational';

export default function App() {
  const data = useMemo(() => getDashboardData(), []);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedVertical, setSelectedVertical] = useState<Vertical | 'Tudo'>('Tudo');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ 
    key: 'totalRevenue', 
    direction: 'desc' 
  });

  // Operational Settings State
  const initialOpSettings: Record<Vertical, OperationalSettings> = {
    'Financeiro I': { suporteTreinamento: 25, relacionamento: 50, gestaoContratual: 25 },
    'Financeiro II': { suporteTreinamento: 25, relacionamento: 50, gestaoContratual: 25 },
    'Governo': { suporteTreinamento: 25, relacionamento: 50, gestaoContratual: 25 },
    'Agro/Corp': { suporteTreinamento: 25, relacionamento: 50, gestaoContratual: 25 },
  };

  const initialParams: Record<Vertical, VerticalOperationalParams> = {
    'Financeiro I': { visitasAno: 1, contatosRemotosAno: 1, percentDesuso: 15, percentRemotos: 60, percentNaoAcessiveis: 5 },
    'Financeiro II': { visitasAno: 0.5, contatosRemotosAno: 2, percentDesuso: 20, percentRemotos: 70, percentNaoAcessiveis: 10 },
    'Governo': { visitasAno: 1.5, contatosRemotosAno: 0.4, percentDesuso: 10, percentRemotos: 30, percentNaoAcessiveis: 20 },
    'Agro/Corp': { visitasAno: 1, contatosRemotosAno: 1.5, percentDesuso: 25, percentRemotos: 80, percentNaoAcessiveis: 15 },
  };

  const [opSettings, setOpSettings] = useState(initialOpSettings);
  const [opParams, setOpParams] = useState(initialParams);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const maxRevenue = useMemo(() => Math.max(...data.verticals.map(v => v.totalRevenue)), [data]);
  const maxTicket = useMemo(() => Math.max(...data.verticals.map(v => v.averageTicket)), [data]);

  const sortedVerticals = useMemo(() => {
    const items = [...data.verticals];
    items.sort((a: any, b: any) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return items;
  }, [data, sortConfig]);

  const topClients = useMemo(() => {
    const list = selectedVertical === 'Tudo' 
      ? data.verticals.flatMap(v => v.topClients)
      : data.verticals.find(v => v.vertical === selectedVertical)?.topClients || [];
    return [...list].sort((a, b) => b.revenue - a.revenue).slice(0, 20);
  }, [data, selectedVertical]);

  const barData = useMemo(() => data.verticals.map(v => ({
    name: v.vertical,
    revenue: v.totalRevenue,
    clients: v.totalClients,
    users: v.totalUsers,
    ticket: v.averageTicket,
    fill: VERTICAL_COLORS[v.vertical],
    participation: v.revenueParticipation
  })).sort((a, b) => b.revenue - a.revenue), [data]);

  const updateOpSetting = (vertical: Vertical, field: keyof OperationalSettings, rawValue: number) => {
    // Snap to 0, 25, 50, 75, 100
    const snaps = [0, 25, 50, 75, 100];
    const value = snaps.reduce((prev, curr) => Math.abs(curr - rawValue) < Math.abs(prev - rawValue) ? curr : prev);

    setOpSettings(prev => {
      const current = prev[vertical];
      if (current[field] === value) return prev;

      const otherFields = (Object.keys(current) as (keyof OperationalSettings)[]).filter(k => k !== field);
      const otherSum = otherFields.reduce((sum, k) => sum + current[k], 0);
      
      let nextValues = { ...current, [field]: value };
      const remaining = 100 - value;

      if (otherSum > 0) {
        otherFields.forEach(k => {
          nextValues[k] = Math.round((current[k] / otherSum) * remaining);
        });
      } else {
        otherFields.forEach(k => {
          nextValues[k] = Math.round(remaining / otherFields.length);
        });
      }

      // Final adjustment for rounding errors
      const finalSum = Object.values(nextValues).reduce((a, b) => a + b, 0);
      if (finalSum !== 100) {
        const lastField = otherFields[otherFields.length - 1];
        nextValues[lastField] += (100 - finalSum);
      }

      return {
        ...prev,
        [vertical]: nextValues
      };
    });
  };

  const updateOpParam = (vertical: Vertical, field: keyof VerticalOperationalParams, value: number) => {
    setOpParams(prev => ({
      ...prev,
      [vertical]: { ...prev[vertical], [field]: value }
    }));
  };

  const renderDashboard = () => (
    <div className="flex flex-col flex-1 space-y-4 min-h-0 overflow-hidden">
      {/* Header */}
      <header className="flex justify-between items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 shrink-0 shadow-2xl">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
            Visão Geral Clientes
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex bg-slate-950/50 p-1 rounded-xl border border-white/5">
            {['Tudo', 'Financeiro I', 'Financeiro II', 'Governo', 'Agro/Corp'].map((v) => (
              <button
                key={v}
                onClick={() => setSelectedVertical(v as any)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap",
                  selectedVertical === v 
                    ? "bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-[0_0_20px_rgba(14,165,233,0.1)]" 
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Stats Grid - High Contrast */}
      <div className="grid grid-cols-4 gap-4 h-28 shrink-0">
        {[
          { label: 'Total de Clientes', value: formatNumber(data.totalClients), icon: Users, sub: `${data.verticals.length} Verticais`, color: 'bg-indigo-500' },
          { label: 'Total de usuários', value: formatNumber(data.totalUsers), icon: Monitor, sub: `${(data.totalUsers / data.totalClients).toFixed(1)} usuários/cliente`, color: 'bg-emerald-500' },
          { label: 'MRR Consolidado', value: formatCurrency(data.totalRevenue), icon: DollarSign, sub: 'Faturamento Mensal', accent: true, color: 'bg-sky-500' },
          { label: 'ticket médio/cliente', value: formatCurrency(data.averageTicket), icon: Target, color: 'bg-amber-500' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "bg-slate-950 border-2 border-white/10 rounded-2xl p-5 flex flex-col justify-center relative overflow-hidden group shadow-[0_8px_30px_rgb(0,0,0,0.4)]",
              stat.accent && "border-sky-500/50 ring-1 ring-sky-500/20"
            )}
          >
            <div className={cn("absolute right-0 top-0 w-1.5 h-full opacity-80", stat.color)} />
            <stat.icon className="absolute right-4 top-4 w-12 h-12 text-white/[0.05] group-hover:text-white/[0.1] transition-all group-hover:rotate-12" />
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1.5">{stat.label}</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-3xl font-black text-white tracking-tight drop-shadow-sm">{stat.value}</p>
            </div>
            {stat.sub && (
              <p className="text-[10px] text-slate-500 font-bold mt-2 inline-flex items-center">
                <span className={cn("w-1.5 h-1.5 rounded-full mr-2", stat.color)} />
                {stat.sub}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Charts Section */}
        <div className="col-span-8 flex flex-col space-y-4 min-h-0">
          <div className="grid grid-cols-2 gap-4 h-[40%] shrink-0">
            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 flex flex-col">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center">
                <BarChart3 className="w-3.5 h-3.5 mr-2 text-sky-500" />
                Receita por Vertical
              </h3>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ left: -30, right: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} width={100} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                      formatter={(val: number) => [formatCurrency(val), 'MRR Total']}
                    />
                    <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={20}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 flex flex-col">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center">
                <PieIcon className="w-3.5 h-3.5 mr-2 text-indigo-500" />
                Participação de Mercado
              </h3>
              <div className="flex-1 flex items-center min-h-0">
                <div className="w-[45%] h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={barData}
                        dataKey="revenue"
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="90%"
                        paddingAngle={5}
                      >
                        {barData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(255,255,255,0.1)" />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                        formatter={(value: number, name: string) => [
                          `${((value / data.totalRevenue) * 100).toFixed(1)}%`,
                          name
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 pl-4 space-y-2">
                  {barData.map((v) => (
                    <div key={v.name} className="flex items-center justify-between">
                      <div className="flex items-center text-[10px] font-bold text-slate-500 uppercase">
                        <div className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: v.fill }} />
                        {v.name}
                      </div>
                      <span className="text-xs font-black text-white">{v.participation.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-slate-900/60 border border-white/10 rounded-2xl p-5 flex flex-col min-h-0 shadow-inner overflow-hidden">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-2 text-emerald-500" />
              Visão Detalhada por Vertical
            </h3>
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-xs text-left border-separate border-spacing-y-1">
                <thead className="text-slate-500 font-bold uppercase text-[9px] tracking-widest sticky top-0 bg-slate-900/90 backdrop-blur z-20">
                  <tr>
                    <th className="px-4 py-2 cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('vertical')}>
                      <div className="flex items-center">Vertical {sortConfig.key === 'vertical' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}</div>
                    </th>
                    <th className="px-4 py-2 cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('totalClients')}>
                      <div className="flex items-center">Clientes {sortConfig.key === 'totalClients' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}</div>
                    </th>
                    <th className="px-4 py-2 cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('totalUsers')}>
                      <div className="flex items-center">Usuários {sortConfig.key === 'totalUsers' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}</div>
                    </th>
                    <th className="px-4 py-2 cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('totalRevenue')}>
                      <div className="flex items-center">Faturamento {sortConfig.key === 'totalRevenue' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}</div>
                    </th>
                    <th className="px-4 py-2 cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('averageTicket')}>
                      <div className="flex items-center">Ticket Médio {sortConfig.key === 'averageTicket' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}</div>
                    </th>
                    <th className="px-4 py-2 cursor-pointer hover:text-white transition-colors text-right" onClick={() => requestSort('usersPerClient')}>
                      <div className="flex items-center justify-end">Usuários/Cli {sortConfig.key === 'usersPerClient' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y-0">
                  {sortedVerticals.map((v: any) => (
                    <tr key={v.vertical} className="group bg-slate-950/20 hover:bg-slate-950/50 transition-all rounded-xl">
                      <td className="px-4 py-3 first:rounded-l-xl border-y border-l border-white/5 group-hover:border-white/10">
                        <div className="flex items-center font-black text-white whitespace-nowrap">
                          <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: VERTICAL_COLORS[v.vertical as Vertical] }} />
                          {v.vertical}
                        </div>
                      </td>
                      <td className="px-4 py-3 border-y border-white/5 group-hover:border-white/10 text-slate-400 font-mono text-[11px]">{formatNumber(v.totalClients)}</td>
                      <td className="px-4 py-3 border-y border-white/5 group-hover:border-white/10 text-slate-400 font-mono text-[11px]">{formatNumber(v.totalUsers)}</td>
                      <td className="px-4 py-3 border-y border-white/5 group-hover:border-white/10">
                        <div className="flex flex-col min-w-[120px]">
                          <span className="font-mono text-sky-400 font-bold whitespace-nowrap">{formatCurrency(v.totalRevenue)}</span>
                          <div className="h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(v.totalRevenue / maxRevenue) * 100}%` }} className="h-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-y border-white/5 group-hover:border-white/10">
                        <div className="flex flex-col min-w-[100px]">
                          <span className="text-slate-300 font-semibold font-mono text-[11px] whitespace-nowrap">{formatCurrency(v.averageTicket)}</span>
                          <div className="h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(v.averageTicket / maxTicket) * 100}%` }} className="h-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 last:rounded-r-xl border-y border-r border-white/5 group-hover:border-white/10 text-right">
                        <span className="text-emerald-400 font-bold font-mono text-[11px]">{v.usersPerClient.toFixed(1)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Top 20 Section */}
        <div className="col-span-4 flex flex-col min-h-0 bg-slate-900/80 border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 to-indigo-500" />
          <div className="p-5 border-b border-white/5 flex flex-col space-y-2 bg-slate-950/20">
            <h3 className="text-sm font-black text-white flex items-center uppercase tracking-wider">Top 20 Clientes</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Ordenado por Volume (MRR)</p>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead className="bg-[#0f172a]/95 backdrop-blur-md sticky top-0 z-20">
                <tr className="text-slate-500 font-black uppercase text-[9px] tracking-widest border-b border-white/5">
                  <th className="px-4 py-3">Ranking / Nome</th>
                  <th className="px-4 py-3 text-right">Faturamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {topClients.map((client, idx) => (
                  <tr key={idx} className="hover:bg-sky-500/5 group transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <span className={cn("mr-3 font-mono text-[10px] w-5 text-center", idx < 3 ? "text-amber-400 font-black" : "text-slate-600")}>{(idx + 1).toString().padStart(2, '0')}</span>
                        <div className="flex flex-col">
                          <span className="text-slate-100 font-bold group-hover:text-white truncate max-w-[120px]">{client.name}</span>
                          <span className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">{client.vertical}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right"><span className="font-mono text-sky-400 font-bold">{formatCurrency(client.revenue)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderOperational = () => (
    <div className="flex flex-col flex-1 space-y-4 min-h-0 overflow-hidden">
      <header className="flex justify-between items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 shrink-0 shadow-2xl">
        <h1 className="text-2xl font-black uppercase tracking-tighter bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">
          Capacidade Operacional - Customer Success
        </h1>
      </header>

      <div className="flex-1 overflow-auto custom-scrollbar space-y-6 pb-10">
        {(Object.keys(opSettings) as Vertical[]).map((v) => {
          const stats = data.verticals.find(vs => vs.vertical === v);
          if (!stats) return null;

          const totalAllocation = opSettings[v].suporteTreinamento + opSettings[v].relacionamento + opSettings[v].gestaoContratual;

          return (
            <motion.div 
              key={v}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="bg-slate-950/50 px-8 py-5 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: VERTICAL_COLORS[v] }} />
                  <h2 className="text-xl font-bold tracking-tight text-white uppercase">{v}</h2>
                </div>
                <div className="flex space-x-8">
                  <div className="text-center">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Clientes</p>
                    <p className="text-sm font-black text-white">{formatNumber(stats.totalClients)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Usuários</p>
                    <p className="text-sm font-black text-white">{formatNumber(stats.totalUsers)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Faturamento</p>
                    <p className="text-sm font-black text-sky-400">{formatCurrency(stats.totalRevenue)}</p>
                  </div>
                </div>
              </div>

              <div className="p-8 grid grid-cols-2 gap-12">
                {/* Calibration Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center">
                      <Settings2 className="w-4 h-4 mr-2 text-indigo-400" />
                      Calibração de Esforço
                    </h3>
                    <div className={cn(
                      "text-[10px] font-black px-3 py-1 rounded-full border",
                      totalAllocation === 100 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-sky-500/10 text-sky-400 border-sky-500/20"
                    )}>
                      TOTAL: {totalAllocation}%
                    </div>
                  </div>

                  {[
                    { key: 'suporteTreinamento', label: 'Suporte / Treinamento', color: 'bg-sky-500' },
                    { key: 'relacionamento', label: 'Relacionamento', color: 'bg-amber-500' },
                    { key: 'gestaoContratual', label: 'Gestão Contratual', color: 'bg-indigo-500' }
                  ].map((item) => (
                    <div key={item.key} className="space-y-3">
                      <div className="flex justify-between items-center text-[11px] font-bold">
                        <span className="text-slate-300 uppercase tracking-tight">{item.label}</span>
                        <span className="text-white font-black">{(opSettings[v] as any)[item.key]}%</span>
                      </div>
                      <div className="relative px-1">
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          step="25"
                          value={(opSettings[v] as any)[item.key]}
                          onChange={(e) => updateOpSetting(v, item.key as any, parseInt(e.target.value))}
                          className="w-full accent-sky-500 h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between mt-2 text-[8px] text-slate-700 font-bold px-0.5">
                          <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-start space-x-3">
                    <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-400 leading-relaxed">A soma total da calibração determina a distribuição de carga horária do time de CS focada nesta vertical específica.</p>
                  </div>
                </div>

                {/* Goals & Classification */}
                <div className="space-y-8">
                  <div className="space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center">
                      <Target className="w-4 h-4 mr-2 text-rose-400" />
                      Metas de Cobertura Operacional
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center text-[11px] font-bold text-slate-300 whitespace-nowrap">
                            <Calendar className="w-3.5 h-3.5 mr-2 text-sky-500" />
                            Visitas presenciais / user / ano
                          </div>
                          <span className="text-white font-black text-sm">{opParams[v].visitasAno}x</span>
                        </div>
                        <div className="relative px-2">
                          <input 
                            type="range" step="0.5" min="0" max="2" 
                            value={opParams[v].visitasAno}
                            onChange={(e) => updateOpParam(v, 'visitasAno', parseFloat(e.target.value))}
                            className="w-full accent-sky-500 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between mt-2 text-[9px] text-slate-600 font-bold px-1">
                            <span>0</span><span>0.5</span><span>1</span><span>1.5</span><span>2x</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center text-[11px] font-bold text-slate-300 whitespace-nowrap">
                            <Phone className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                            Contatos remotos / user / ano
                          </div>
                          <span className="text-white font-black text-sm">{opParams[v].contatosRemotosAno}x</span>
                        </div>
                        <div className="relative px-2">
                          <input 
                            type="range" step="0.1" min="0" max="3" 
                            value={opParams[v].contatosRemotosAno}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              // Special values as requested: 0, 0.4, 1, 1.5, 2, 2.5, 3
                              const snaps = [0, 0.4, 1, 1.5, 2, 2.5, 3];
                              const snapped = snaps.reduce((prev, curr) => Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev);
                              updateOpParam(v, 'contatosRemotosAno', snapped);
                            }}
                            className="w-full accent-emerald-500 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between mt-2 text-[9px] text-slate-600 font-bold px-1">
                            <span>0</span><span>0.4</span><span>1</span><span>2</span><span>3x</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 pt-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center">
                      <Users className="w-4 h-4 mr-2 text-amber-400" />
                      Classificação da Base de Usuários
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { key: 'percentDesuso', label: 'Em Desuso', color: 'text-rose-400', bg: 'bg-rose-500/10' },
                        { key: 'percentRemotos', label: 'Remotos/Dispersos', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                        { key: 'percentNaoAcessiveis', label: 'Não-Acessíveis', color: 'text-slate-400', bg: 'bg-slate-500/10' },
                      ].map((item) => {
                        const percent = (opParams[v] as any)[item.key];
                        const count = Math.round((stats.totalUsers * percent) / 100);
                        return (
                          <div key={item.key} className={cn("p-4 rounded-2xl border border-white/5", item.bg)}>
                            <div className="flex justify-between items-start mb-2">
                              <p className="text-[9px] font-black uppercase text-slate-400 leading-tight h-5 max-w-[70px]">{item.label}</p>
                              <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded", item.bg.replace('/10', '/30'), item.color)}>
                                {formatNumber(count)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input 
                                type="number" 
                                value={percent}
                                onChange={(e) => updateOpParam(v, item.key as any, Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                                className="bg-transparent text-xl font-black text-white w-12 outline-none"
                              />
                              <span className="text-xs font-bold text-slate-500">%</span>
                            </div>
                            <div className="h-1 bg-white/10 rounded-full mt-3 overflow-hidden">
                              <div className="h-full bg-current opacity-60" style={{ width: `${percent}%`, color: 'inherit' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Operational Coverage Calculation */}
                  <div className="bg-slate-950/40 border border-white/5 p-6 rounded-3xl space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center">
                      <LayoutDashboard className="w-4 h-4 mr-2 text-sky-400" />
                      Dimensionamento de Headcount CS
                    </h3>
                    
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Carteira Ativa (Total - Não-Acessíveis)</span>
                        <span className="text-sm font-black text-white">
                          {formatNumber(stats.totalUsers - Math.round((stats.totalUsers * opParams[v].percentNaoAcessiveis) / 100))}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                          <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Base Presencial</p>
                          <p className="text-xs font-black text-slate-200">
                            {formatNumber(Math.max(0, (stats.totalUsers - Math.round((stats.totalUsers * opParams[v].percentNaoAcessiveis) / 100)) - Math.round((stats.totalUsers * opParams[v].percentRemotos) / 100)))}
                          </p>
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                          <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Base Remota</p>
                          <p className="text-xs font-black text-slate-200">
                            {formatNumber(Math.round((stats.totalUsers * opParams[v].percentRemotos) / 100))}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-5 rounded-2xl relative overflow-hidden">
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Carga de Ações / Ano</p>
                          <div className="text-right">
                            <span className="text-xl font-black text-white">
                              {formatNumber(Math.round(
                                (Math.max(0, (stats.totalUsers - Math.round((stats.totalUsers * opParams[v].percentNaoAcessiveis) / 100)) - Math.round((stats.totalUsers * opParams[v].percentRemotos) / 100)) * opParams[v].visitasAno) +
                                (Math.round((stats.totalUsers * opParams[v].percentRemotos) / 100) * opParams[v].contatosRemotosAno)
                              ))}
                            </span>
                            <p className="text-[8px] text-slate-500 font-bold uppercase">Interações Totais</p>
                          </div>
                        </div>

                        <div className="flex justify-between items-end border-t border-white/5 pt-4">
                          <div>
                            <span className="text-4xl font-black text-emerald-400 tracking-tighter">
                              {(( (Math.max(0, (stats.totalUsers - Math.round((stats.totalUsers * opParams[v].percentNaoAcessiveis) / 100)) - Math.round((stats.totalUsers * opParams[v].percentRemotos) / 100)) * opParams[v].visitasAno) +
                                (Math.round((stats.totalUsers * opParams[v].percentRemotos) / 100) * opParams[v].contatosRemotosAno) ) / 1200).toFixed(1)}
                            </span>
                            <span className="text-sm font-black text-white ml-2">Headcount CS</span>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-bold text-slate-500">Ref: 1.200 interações/ano</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-[#0f172a] text-slate-100 overflow-hidden font-sans"
         style={{ backgroundImage: 'radial-gradient(at 0% 0%, rgba(56, 189, 248, 0.05) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(139, 92, 246, 0.05) 0px, transparent 50%)' }}>
      
      {/* Sidebar */}
      <aside className="w-64 flex flex-col bg-slate-950/40 border-r border-white/10 shrink-0 z-50">
        <div className="p-8 pb-10">
          <div className="flex items-center px-1 mb-10">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20 mr-4">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-widest text-slate-500 uppercase leading-none mb-1">Cortex</span>
              <span className="text-lg font-black text-white tracking-tighter leading-none">BI PLATFORM</span>
            </div>
          </div>

          <nav className="space-y-2">
            {[
              { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
              { id: 'operational', label: 'Capacidade CS', icon: ShieldCheck },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as View)}
                className={cn(
                  "w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all group",
                  currentView === item.id 
                    ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" 
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                )}
              >
                <item.icon className={cn("w-5 h-5 mr-3 transition-colors", currentView === item.id ? "text-sky-400" : "text-slate-600 group-hover:text-slate-400")} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 pt-0">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center mr-3">
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[11px] font-bold text-white truncate">Bruno Chayb</span>
                <span className="text-[9px] text-slate-500 font-bold truncate">Enterprise Lead</span>
              </div>
            </div>
            <div className="text-[9px] text-slate-600 font-bold uppercase tracking-widest bg-slate-950/50 p-2 rounded text-center border border-white/5 cursor-pointer hover:text-slate-400 transition-colors">
              SAIR DA PLATAFORMA
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 p-6 relative">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {renderDashboard()}
            </motion.div>
          ) : (
            <motion.div 
              key="operational"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {renderOperational()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
