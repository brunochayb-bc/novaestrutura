import { useMemo, useState, useEffect } from 'react';
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
  Info,
  Menu,
  ChevronLeft
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ 
    key: 'totalRevenue', 
    direction: 'desc' 
  });

  // Operational Settings State
  const initialOpSettings: Record<Vertical, OperationalSettings> = {
    'Financeiro I': { suporteTreinamento: 1, relacionamento: 2, gestaoContratual: 1, capacidadeVisitasPresenciaisMes: 4, capacidadeContatosRemotosMes: 40 },
    'Financeiro II': { suporteTreinamento: 1, relacionamento: 2, gestaoContratual: 1, capacidadeVisitasPresenciaisMes: 2, capacidadeContatosRemotosMes: 60 },
    'Governo': { suporteTreinamento: 1, relacionamento: 2, gestaoContratual: 1, capacidadeVisitasPresenciaisMes: 6, capacidadeContatosRemotosMes: 20 },
    'Agro/Corp': { suporteTreinamento: 1, relacionamento: 2, gestaoContratual: 1, capacidadeVisitasPresenciaisMes: 4, capacidadeContatosRemotosMes: 50 },
  };

  const initialParams: Record<Vertical, VerticalOperationalParams> = {
    'Financeiro I': { visitasAno: 1, contatosRemotosAno: 1, percentDesuso: 15, percentRemotos: 60, percentNaoAcessiveis: 5 },
    'Financeiro II': { visitasAno: 0.5, contatosRemotosAno: 2, percentDesuso: 20, percentRemotos: 70, percentNaoAcessiveis: 10 },
    'Governo': { visitasAno: 1.5, contatosRemotosAno: 1, percentDesuso: 10, percentRemotos: 30, percentNaoAcessiveis: 20 },
    'Agro/Corp': { visitasAno: 1, contatosRemotosAno: 1.5, percentDesuso: 25, percentRemotos: 80, percentNaoAcessiveis: 15 },
  };

  const [opSettings, setOpSettings] = useState<Record<Vertical, OperationalSettings>>(() => {
    const saved = localStorage.getItem('opSettings');
    if (!saved) return initialOpSettings;
    const parsed = JSON.parse(saved);
    // Merge to ensure new fields are present
    const merged = { ...initialOpSettings };
    (Object.keys(parsed) as Vertical[]).forEach(v => {
      merged[v] = { ...initialOpSettings[v], ...parsed[v] };
    });
    return merged;
  });
  const [opParams, setOpParams] = useState<Record<Vertical, VerticalOperationalParams>>(() => {
    const saved = localStorage.getItem('opParams');
    if (!saved) return initialParams;
    const parsed = JSON.parse(saved);
    // Merge to ensure new fields are present
    const merged = { ...initialParams };
    (Object.keys(parsed) as Vertical[]).forEach(v => {
      merged[v] = { ...initialParams[v], ...parsed[v] };
    });
    return merged;
  });

  // Persist to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('opSettings', JSON.stringify(opSettings));
    localStorage.setItem('opParams', JSON.stringify(opParams));
  }, [opSettings, opParams]);
  const [expandedVerticals, setExpandedVerticals] = useState<Record<Vertical, boolean>>({
    'Financeiro I': true,
    'Financeiro II': false,
    'Governo': false,
    'Agro/Corp': false,
  });
  const [unsavedVerticals, setUnsavedVerticals] = useState<Set<Vertical>>(new Set());

  const toggleVertical = (v: Vertical) => {
    setExpandedVerticals(prev => ({ ...prev, [v]: !prev[v] }));
  };

  const handleSave = (vertical: Vertical) => {
    setUnsavedVerticals(prev => {
      const next = new Set(prev);
      next.delete(vertical);
      return next;
    });
    // Here logic to save to a database would be implemented
  };

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

  const totals = useMemo(() => {
    if (selectedVertical === 'Tudo') {
      const clients = data.verticals.reduce((sum, v) => sum + v.totalClients, 0);
      const users = data.verticals.reduce((sum, v) => sum + v.totalUsers, 0);
      const revenue = data.verticals.reduce((sum, v) => sum + v.totalRevenue, 0);
      return {
        totalClients: clients,
        totalUsers: users,
        totalRevenue: revenue,
        averageTicket: clients > 0 ? revenue / clients : 0,
        usersPerClient: clients > 0 ? users / clients : 0
      };
    } else {
      const v = data.verticals.find(vs => vs.vertical === selectedVertical);
      return {
        totalClients: v?.totalClients || 0,
        totalUsers: v?.totalUsers || 0,
        totalRevenue: v?.totalRevenue || 0,
        averageTicket: v?.averageTicket || 0,
        usersPerClient: v?.usersPerClient || 0
      };
    }
  }, [data, selectedVertical]);

  const updateOpSetting = (vertical: Vertical, field: keyof OperationalSettings, value: number) => {
    setUnsavedVerticals(prev => new Set(prev).add(vertical));
    setOpSettings(prev => ({
      ...prev,
      [vertical]: {
        ...prev[vertical],
        [field]: value
      }
    }));
  };

  const effortLevelLabels = ["Baixo", "Médio", "Alto", "Muito Alto"];

  const getRecommendedProfile = (settings: OperationalSettings): string => {
    const { suporteTreinamento: st, relacionamento: rel, gestaoContratual: gc } = settings;
    
    // Logic based on the provided table:
    // Senior: High REL and GC, or very high GC
    if (gc >= 3) return 'Sênior';
    if (gc === 2) {
      if (st >= 2 && rel === 0) return 'Pleno'; // Row 30: A, B, A -> Pleno
      return 'Sênior'; 
    }
    if (rel >= 2) {
      if (rel === 3 && gc <= 1) return 'Pleno'; // Rows 14, 15, 24, 25: REL=MA, GC=B or M -> Pleno
      return 'Sênior';
    }
    
    // Pleno: Middle ground
    if (rel >= 1 || gc >= 1) return 'Pleno';
    
    // Junior: Low REL and GC
    return 'Júnior';
  };

  const updateOpParam = (vertical: Vertical, field: keyof VerticalOperationalParams, value: number) => {
    setUnsavedVerticals(prev => new Set(prev).add(vertical));
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
      <div className="grid grid-cols-4 gap-4 h-24 shrink-0">
        {[
          { label: 'Total de Clientes', value: formatNumber(totals.totalClients), icon: Users, sub: selectedVertical === 'Tudo' ? `${data.verticals.length} Verticais` : 'Vertical Selecionada', color: 'bg-indigo-500' },
          { label: 'Total de usuários', value: formatNumber(totals.totalUsers), icon: Monitor, sub: `${(totals.totalUsers / totals.totalClients || 0).toFixed(1)} usuários/cliente`, color: 'bg-emerald-500' },
          { label: 'Total', value: formatCurrency(totals.totalRevenue), icon: DollarSign, sub: 'Faturamento Mensal', accent: true, color: 'bg-sky-500' },
          { label: 'ticket médio/cliente', value: formatCurrency(totals.averageTicket), icon: Target, color: 'bg-amber-500' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "bg-slate-950 border-2 border-white/10 rounded-2xl p-3 flex flex-col justify-center relative overflow-hidden group shadow-[0_8px_30px_rgb(0,0,0,0.4)]",
              stat.accent && "border-sky-500/50 ring-1 ring-sky-500/20"
            )}
          >
            <div className={cn("absolute right-0 top-0 w-1.5 h-full opacity-80", stat.color)} />
            <stat.icon className="absolute right-4 top-4 w-10 h-10 text-white/[0.05] group-hover:text-white/[0.1] transition-all group-hover:rotate-12" />
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">{stat.label}</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-black text-white tracking-tight drop-shadow-sm">{stat.value}</p>
            </div>
            {stat.sub && (
              <p className="text-[8px] text-slate-500 font-bold mt-1 inline-flex items-center">
                <span className={cn("w-1 h-1 rounded-full mr-2", stat.color)} />
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
                    <tr 
                      key={v.vertical} 
                      onClick={() => setSelectedVertical(v.vertical)}
                      className={cn(
                        "group cursor-pointer transition-all rounded-xl",
                        selectedVertical === v.vertical ? "bg-sky-500/10 border-sky-500/20" : "bg-slate-950/20 hover:bg-slate-950/50"
                      )}
                    >
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
                  <tr className="bg-sky-500/10 border-t border-sky-500/20">
                    <td className="px-4 py-4 rounded-l-xl border-y border-l border-sky-500/20 font-black text-sky-400 uppercase tracking-wider">Total</td>
                    <td className="px-4 py-4 border-y border-sky-500/20 text-white font-mono font-bold">{formatNumber(totals.totalClients)}</td>
                    <td className="px-4 py-4 border-y border-sky-500/20 text-white font-mono font-bold">{formatNumber(totals.totalUsers)}</td>
                    <td className="px-4 py-4 border-y border-sky-500/20 text-white font-mono font-bold">{formatCurrency(totals.totalRevenue)}</td>
                    <td className="px-4 py-4 border-y border-sky-500/20 text-white font-mono font-bold">{formatCurrency(totals.averageTicket)}</td>
                    <td className="px-4 py-4 rounded-r-xl border-y border-r border-sky-500/20 text-right text-white font-mono font-bold">{totals.usersPerClient.toFixed(1)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Top 20 Section */}
        <div className="col-span-4 flex flex-col min-h-0 bg-slate-900/80 border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 to-indigo-500" />
          <div className="p-5 border-b border-white/5 flex flex-col space-y-2 bg-slate-950/20">
            <h3 className="text-sm font-black text-white flex items-center uppercase tracking-wider">Top 20 Clientes {selectedVertical !== 'Tudo' ? `- ${selectedVertical}` : ''}</h3>
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
                        <div className="flex flex-col min-w-0">
                          <span className="text-slate-100 font-bold group-hover:text-white truncate max-w-[180px]" title={client.name}>{client.name}</span>
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
              <div 
                className="bg-slate-950/50 px-8 py-5 border-b border-white/5 flex justify-between items-center cursor-pointer hover:bg-slate-950/70 transition-colors"
                onClick={() => toggleVertical(v)}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: VERTICAL_COLORS[v] }} />
                  <h2 className="text-xl font-bold tracking-tight text-white uppercase">{v}</h2>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="flex space-x-8 mr-4">
                    <div className="text-center">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Clientes</p>
                      <p className="text-sm font-black text-white">{formatNumber(stats.totalClients)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Usuários</p>
                      <p className="text-sm font-black text-white">{formatNumber(stats.totalUsers)}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (unsavedVerticals.has(v)) handleSave(v);
                    }}
                    className={cn(
                      "flex items-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
                      unsavedVerticals.has(v)
                        ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400 active:scale-95" 
                        : "bg-slate-800/50 text-slate-600 border border-white/5 cursor-not-allowed"
                    )}
                  >
                    <Target className="w-3.5 h-3.5 mr-2" />
                    Gravar
                  </button>

                  <div className="p-1">
                    {expandedVerticals[v] ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {expandedVerticals[v] && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-8 grid grid-cols-2 gap-12">
                      {/* Calibration Section */}
                      <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center">
                            <Settings2 className="w-4 h-4 mr-2 text-indigo-400" />
                            Calibração de Esforço
                          </h3>
                        </div>

                        {[
                          { key: 'suporteTreinamento', label: 'Suporte / Treinamento' },
                          { key: 'relacionamento', label: 'Relacionamento' },
                          { key: 'gestaoContratual', label: 'Gestão Contratual' }
                        ].map((item) => (
                          <div key={item.key} className="space-y-3">
                            <div className="flex justify-between items-center text-[11px] font-bold">
                              <span className="text-slate-300 uppercase tracking-tight">{item.label}</span>
                              <span className="text-white font-black">{effortLevelLabels[(opSettings[v] as any)[item.key]]}</span>
                            </div>
                            <div className="relative px-1">
                              <input 
                                type="range" 
                                min="0" 
                                max="3" 
                                step="1"
                                value={(opSettings[v] as any)[item.key]}
                                onChange={(e) => updateOpSetting(v, item.key as any, parseInt(e.target.value))}
                                className="w-full accent-sky-500 h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                              />
                              <div className="flex justify-between mt-2 text-[8px] text-slate-700 font-bold px-0">
                                <span className="w-0 flex justify-start whitespace-nowrap">BAIXO</span>
                                <span className="w-0 flex justify-center whitespace-nowrap">MÉDIO</span>
                                <span className="w-0 flex justify-center whitespace-nowrap">ALTO</span>
                                <span className="w-0 flex justify-end whitespace-nowrap">MUITO ALTO</span>
                              </div>
                            </div>
                          </div>
                        ))}

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Capacidade Visitas/Mês</label>
                            <input 
                              type="number"
                              value={opSettings[v].capacidadeVisitasPresenciaisMes}
                              onChange={(e) => updateOpSetting(v, 'capacidadeVisitasPresenciaisMes', parseInt(e.target.value) || 0)}
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white outline-none focus:border-sky-500 transition-colors"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Capacidade Contatos/Mês</label>
                            <input 
                              type="number"
                              value={opSettings[v].capacidadeContatosRemotosMes}
                              onChange={(e) => updateOpSetting(v, 'capacidadeContatosRemotosMes', parseInt(e.target.value) || 0)}
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white outline-none focus:border-sky-500 transition-colors"
                            />
                          </div>
                        </div>

                        {/* Profile Recommended */}
                  <div className="mt-8 pt-6 border-t border-white/5">
                    <div className="bg-gradient-to-br from-sky-500/10 to-indigo-500/10 border border-sky-500/20 p-5 rounded-2xl relative overflow-hidden group">
                      <div className="absolute right-0 top-0 w-1 h-full bg-sky-500" />
                      <ShieldCheck className="absolute right-4 bottom-4 w-12 h-12 text-sky-500/10 group-hover:scale-110 transition-transform" />
                      
                      <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-2">Perfil Recomendado (CS)</p>
                      <div className="flex items-baseline space-x-2">
                        <h4 className="text-2xl font-black text-white uppercase tracking-tight">
                          {getRecommendedProfile(opSettings[v])}
                        </h4>
                        <span className="text-[10px] text-slate-500 font-bold">Indicado pela Calibração</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-start space-x-3">
                    <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-400 leading-relaxed">A calibração de complexidade recomenda o perfil de Customer Success ideal com base nas demandas de suporte, relacionamento e gestão.</p>
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
                            type="range" step="0.5" min="0.5" max="2" 
                            value={opParams[v].visitasAno}
                            onChange={(e) => updateOpParam(v, 'visitasAno', parseFloat(e.target.value))}
                            className="w-full accent-sky-500 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between mt-2 text-[9px] text-slate-600 font-bold px-0">
                            <span className="w-0 flex justify-start whitespace-nowrap">0.5</span>
                            <span className="w-0 flex justify-center whitespace-nowrap">1</span>
                            <span className="w-0 flex justify-center whitespace-nowrap">1.5</span>
                            <span className="w-0 flex justify-end whitespace-nowrap">2x</span>
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
                            type="range" step="0.5" min="1" max="3" 
                            value={opParams[v].contatosRemotosAno}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              // Special values as requested: 1, 1.5, 2, 2.5, 3
                              const snaps = [1, 1.5, 2, 2.5, 3];
                              const snapped = snaps.reduce((prev, curr) => Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev);
                              updateOpParam(v, 'contatosRemotosAno', snapped);
                            }}
                            className="w-full accent-emerald-500 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between mt-2 text-[9px] text-slate-600 font-bold px-0">
                            <span className="w-0 flex justify-start whitespace-nowrap">1</span>
                            <span className="w-0 flex justify-center whitespace-nowrap">1.5</span>
                            <span className="w-0 flex justify-center whitespace-nowrap">2</span>
                            <span className="w-0 flex justify-center whitespace-nowrap">2.5</span>
                            <span className="w-0 flex justify-end whitespace-nowrap">3x</span>
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
                        { key: 'percentRemotos', label: 'Remotos', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                        { key: 'percentNaoAcessiveis', label: 'Não acessíveis', color: 'text-slate-400', bg: 'bg-slate-500/10' },
                      ].map((item) => {
                        const percentage = (opParams[v] as any)[item.key];
                        const absoluteValue = Math.round((percentage / 100) * stats.totalUsers);
                        
                        return (
                          <div key={item.key} className={cn("p-4 rounded-2xl border border-white/5", item.bg)}>
                            <p className="text-[9px] font-black uppercase text-slate-400 mb-2 leading-tight h-5">{item.label}</p>
                            <div className="flex items-center space-x-2">
                              <input 
                                type="number" 
                                value={percentage}
                                onChange={(e) => updateOpParam(v, item.key as any, Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                                className="bg-transparent text-xl font-black text-white w-12 outline-none"
                              />
                              <span className="text-xs font-bold text-slate-500">%</span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 mt-1">
                              {formatNumber(absoluteValue)} usuários
                            </p>
                            <div className="h-1 bg-white/10 rounded-full mt-3 overflow-hidden">
                              <div className="h-full bg-current opacity-60" style={{ width: `${percentage}%`, color: 'inherit' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Operational Portfolio Summary */}
                  <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center">
                      <BarChart3 className="w-4 h-4 mr-2 text-sky-400" />
                      Carteira para atuação do time de CS
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      {(() => {
                        const visitsAno = opParams[v]?.visitasAno || 0;
                        const contatosAno = opParams[v]?.contatosRemotosAno || 0;
                        const pNaoAcess = opParams[v]?.percentNaoAcessiveis || 0;
                        const pRemotos = opParams[v]?.percentRemotos || 0;
                        const pDesuso = opParams[v]?.percentDesuso || 0;

                        const vVisits = Math.round(stats.totalUsers * Math.max(0, 1 - (pNaoAcess + pRemotos) / 100) * visitsAno);
                        const vRemotes = Math.round(stats.totalUsers * (pRemotos / 100) * contatosAno);
                        const vDesuso = Math.round(stats.totalUsers * (pDesuso / 100));

                        return [
                          { 
                            label: 'Carteira Ativa p/ Visitação', 
                            value: vVisits,
                            sub: `Base x ${visitsAno}v/ano`,
                            color: 'text-emerald-400',
                            bg: 'bg-emerald-500/5'
                          },
                          { 
                            label: 'Carteira Ativa p/ Remoto', 
                            value: vRemotes,
                            sub: `Base x ${contatosAno}c/ano`,
                            color: 'text-amber-400',
                            bg: 'bg-amber-500/5'
                          },
                          { 
                            label: 'Carteira em Desuso', 
                            value: vDesuso,
                            sub: 'Conforme % Desuso',
                            color: 'text-rose-400',
                            bg: 'bg-rose-500/5'
                          }
                        ];
                      })().map((item, i) => (
                        <div key={i} className={cn("p-4 rounded-2xl border border-white/5", item.bg)}>
                          <p className="text-[9px] font-black uppercase text-slate-500 mb-1 leading-tight h-5">{item.label}</p>
                          <p className={cn("text-xl font-black mb-0.5", item.color)}>{formatNumber(item.value)}</p>
                          <p className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">{item.sub}</p>
                        </div>
                      ))}
                    </div>

                    {/* Headcount Calculation */}
                    {(() => {
                      const visitsAno = opParams[v]?.visitasAno || 0;
                      const contatosAno = opParams[v]?.contatosRemotosAno || 0;
                      const pNaoAcess = opParams[v]?.percentNaoAcessiveis || 0;
                      const pRemotos = opParams[v]?.percentRemotos || 0;
                      const pDesuso = opParams[v]?.percentDesuso || 0;

                      const baseVisits = Math.max(0, 1 - (pNaoAcess + pRemotos) / 100);
                      const baseRemotes = pRemotos / 100;
                      const baseDesuso = pDesuso / 100;

                      const vVisits = Math.round(stats.totalUsers * baseVisits * visitsAno);
                      const vRemotes = Math.round(stats.totalUsers * baseRemotes * contatosAno);
                      const vDesuso = Math.round(stats.totalUsers * baseDesuso);
                      
                      const totalDemand = vVisits + vRemotes + vDesuso;
                      const capVisits = opSettings[v]?.capacidadeVisitasPresenciaisMes || 0;
                      const capRemotes = opSettings[v]?.capacidadeContatosRemotosMes || 0;
                      const capPerYear = (capVisits + capRemotes) * 12;
                      const hc = capPerYear > 0 ? (totalDemand / capPerYear).toFixed(1) : '0.0';

                      return (
                        <div className="mt-6 p-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-1">Headcount CS Necessário</p>
                            <p className="text-xs text-slate-400 font-medium">
                              Calculado com base na demanda anual total vs. capacidade individual
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-black text-emerald-400">
                              {hc}
                              <span className="text-xs ml-1 uppercase opacity-60">FTEs</span>
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
      <aside className={cn(
        "flex flex-col bg-slate-950/40 border-r border-white/10 shrink-0 z-50 transition-all duration-300 relative",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}>
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-24 w-6 h-6 bg-slate-900 border border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors z-50"
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className={cn("p-6 pb-10", isSidebarCollapsed && "px-4")}>
          <div className="flex items-center px-1 mb-10 overflow-hidden">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20 mr-4 shrink-0">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col"
              >
                <span className="text-xs font-black tracking-widest text-slate-500 uppercase leading-none mb-1">Cortex</span>
                <span className="text-lg font-black text-white tracking-tighter leading-none whitespace-nowrap">BI PLATFORM</span>
              </motion.div>
            )}
          </div>

          <nav className="space-y-2">
            {[
              { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
              { id: 'operational', label: 'Capacidade Operacional CS', icon: ShieldCheck },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as View)}
                className={cn(
                  "w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all group overflow-hidden",
                  currentView === item.id 
                    ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" 
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0 transition-colors", 
                  !isSidebarCollapsed && "mr-3",
                  currentView === item.id ? "text-sky-400" : "text-slate-600 group-hover:text-slate-400"
                )} />
                {!isSidebarCollapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="whitespace-nowrap">
                    {item.label}
                  </motion.span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 pt-0">
          {/* Section removed per request */}
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
