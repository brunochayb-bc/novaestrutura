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

const EFFORT_LABELS: Record<number, string> = {
  25: 'Baixo',
  50: 'Médio',
  75: 'Alto',
  100: 'Muito Alto'
};

const getRecommendedProfile = (settings: OperationalSettings) => {
  const { suporteTreinamento, relacionamento, gestaoContratual } = settings;
  
  // Rule for Senior: Gestao Contratual is High or Very High, OR (Relacionamento is High/Very High AND Gestao Contratual is at least Mid)
  if (gestaoContratual >= 75 || (relacionamento >= 75 && gestaoContratual >= 50)) {
    return { title: 'Customer Success Sênior', description: 'Perfil estratégico focado em grandes contas, negociações complexas e visão de longo prazo.' };
  }
  
  // Rule for Pleno: Gestao Contratual is Mid, OR Relacionamento is at least Mid, OR Suporte/Treinamento is Very High
  if (gestaoContratual >= 50 || relacionamento >= 50 || suporteTreinamento === 100) {
    return { title: 'Customer Success Pleno', description: 'Perfil analítico focado em engajamento, retenção e suporte especializado de alta complexidade.' };
  }
  
  // Otherwise, Junior
  return { title: 'Customer Success Júnior', description: 'Perfil operacional focado em suporte técnico, treinamentos e rotinas de atendimento.' };
};

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
    'Financeiro I': { visitasAno: 1, contatosRemotosAno: 1.5, percentDesuso: 15, percentRemotos: 60, percentNaoAcessiveis: 5, capacidadeVisitasMes: 15, capacidadeRemotosMes: 100 },
    'Financeiro II': { visitasAno: 1, contatosRemotosAno: 2, percentDesuso: 20, percentRemotos: 70, percentNaoAcessiveis: 10, capacidadeVisitasMes: 15, capacidadeRemotosMes: 120 },
    'Governo': { visitasAno: 1.5, contatosRemotosAno: 1, percentDesuso: 10, percentRemotos: 30, percentNaoAcessiveis: 20, capacidadeVisitasMes: 10, capacidadeRemotosMes: 80 },
    'Agro/Corp': { visitasAno: 1, contatosRemotosAno: 2, percentDesuso: 25, percentRemotos: 80, percentNaoAcessiveis: 15, capacidadeVisitasMes: 20, capacidadeRemotosMes: 150 },
  };

  const [opSettings, setOpSettings] = useState(initialOpSettings);
  const [opParams, setOpParams] = useState(initialParams);
  const [saveStatus, setSaveStatus] = useState<Record<Vertical, boolean>>({
    'Financeiro I': false,
    'Financeiro II': false,
    'Governo': false,
    'Agro/Corp': false,
  });

  const handleSaveVertical = (vertical: Vertical) => {
    setSaveStatus(prev => ({ ...prev, [vertical]: true }));
    setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, [vertical]: false }));
    }, 2000);
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

  const updateOpSetting = (vertical: Vertical, field: keyof OperationalSettings, rawValue: number) => {
    // Snap to 25, 50, 75, 100
    const snaps = [25, 50, 75, 100];
    const value = snaps.reduce((prev, curr) => Math.abs(curr - rawValue) < Math.abs(prev - rawValue) ? curr : prev);

    setOpSettings(prev => ({
      ...prev,
      [vertical]: { ...prev[vertical], [field]: value }
    }));
  };

  const updateOpParam = (vertical: Vertical, field: keyof VerticalOperationalParams, value: number) => {
    setOpParams(prev => ({
      ...prev,
      [vertical]: { ...prev[vertical], [field]: value }
    }));
  };

  const renderExecutiveDashboard = () => (
    <div className="flex flex-col flex-1 space-y-6 min-h-0">
      <header className="flex justify-between items-center bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white mb-1">Visão Analítica Global</h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.15em] flex items-center">
            <Info className="w-4 h-4 mr-2 text-sky-400" />
            Portfólio Consolidado • Q2 2026
          </p>
        </div>
        <div className="flex space-x-1.5 bg-slate-950 p-1 rounded-2xl border border-white/5 shadow-inner">
          {(['Tudo', ...Object.keys(VERTICAL_COLORS)] as any).map((v: any) => (
            <button
              key={v}
              onClick={() => setSelectedVertical(v)}
              className={cn(
                "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                selectedVertical === v 
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" 
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-4 gap-4 shrink-0">
        {[
          { icon: Users, label: 'Clientes Ativos', value: formatNumber(data.totalClients), color: 'text-sky-400' },
          { icon: Monitor, label: 'Usuários Totais', value: formatNumber(data.totalUsers), color: 'text-indigo-400' },
          { icon: DollarSign, label: 'Revenue (MRR)', value: formatCurrency(data.totalRevenue), color: 'text-emerald-400' },
          { icon: Target, label: 'Ticket Médio', value: formatCurrency(data.averageTicket), color: 'text-amber-400' },
        ].map((item, i) => (
          <div key={i} className="bg-slate-900 border border-white/5 rounded-2xl p-4 flex flex-col shadow-xl transition-transform hover:scale-[1.01]">
            <div className="flex justify-between items-start mb-3">
              <div className={cn("p-2 rounded-lg bg-slate-950 border border-white/10", item.color)}>
                <item.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">{item.label}</p>
            <p className="text-xl font-black text-white tracking-tighter">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">
        <div className="col-span-8 flex flex-col space-y-4 min-h-0">
          <div className="grid grid-cols-2 gap-4 h-[40%] shrink-0">
            <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 flex flex-col shadow-xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center">
                <BarChart3 className="w-3.5 h-3.5 mr-2 text-sky-400" />
                Faturamento por Vertical
              </h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" hide />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', padding: '8px' }}
                      itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={16}>
                      {barData.map((entry, index) => (
                        <Cell key={index} fill={VERTICAL_COLORS[entry.name as Vertical]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 flex flex-col shadow-xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center">
                <PieIcon className="w-3.5 h-3.5 mr-2 text-indigo-400" />
                Distribuição de Receita
              </h3>
              <div className="flex-1 flex items-center justify-center">
                <PieChart width={160} height={160}>
                  <Pie
                    data={barData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={6}
                    dataKey="revenue"
                    stroke="none"
                  >
                    {barData.map((entry, index) => (
                      <Cell key={index} fill={VERTICAL_COLORS[entry.name as Vertical]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', padding: '8px' }}
                    itemStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#fff' }}
                    formatter={(value: number, name: string) => [
                      `${((value / data.totalRevenue) * 100).toFixed(1)}%`,
                      name
                    ]}
                  />
                </PieChart>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-slate-900 border border-white/5 rounded-2xl p-5 flex flex-col min-h-0 shadow-xl overflow-hidden">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-2 text-emerald-400" />
              Performance Comparativa
            </h3>
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-[11px] text-left border-separate border-spacing-y-1.5">
                <thead className="text-slate-500 font-black uppercase text-[9px] tracking-widest sticky top-0 bg-slate-900 z-20">
                  <tr>
                    <th className="px-4 py-2 cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('vertical')}>Vertical</th>
                    <th className="px-4 py-2">Clientes</th>
                    <th className="px-4 py-2">Usuários</th>
                    <th className="px-4 py-2">Faturamento</th>
                    <th className="px-4 py-2 text-right">U/C</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {sortedVerticals.map((v: any) => (
                    <tr key={v.vertical} className="group hover:bg-white/[0.02] transition-all rounded-xl">
                      <td className="px-4 py-3 first:rounded-l-xl">
                        <div className="flex items-center font-bold text-white whitespace-nowrap text-xs">
                          <div className="w-2 h-2 rounded-full mr-2.5" style={{ backgroundColor: VERTICAL_COLORS[v.vertical as Vertical] }} />
                          {v.vertical}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-[10px] font-medium">{formatNumber(v.totalClients)}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-[10px] font-medium">{formatNumber(v.totalUsers)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col min-w-[100px]">
                          <span className="font-mono text-sky-400 font-bold whitespace-nowrap text-[10px]">{formatCurrency(v.totalRevenue)}</span>
                          <div className="h-1 bg-slate-950 rounded-full mt-1.5 overflow-hidden shadow-inner">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(v.totalRevenue / maxRevenue) * 100}%` }} className="h-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.3)]" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 last:rounded-r-xl text-right">
                        <span className="text-emerald-400 font-bold font-mono text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{v.usersPerClient.toFixed(1)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-span-4 flex flex-col min-h-0 bg-slate-900 border border-white/5 rounded-2xl shadow-xl overflow-hidden relative">
          <div className="p-5 border-b border-white/5 bg-slate-950/20">
            <h3 className="text-xs font-black text-white flex items-center uppercase tracking-wider">Top 20 Institucional</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Ranking por Receita Direta</p>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-[10px] text-left border-collapse">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10 border-b border-white/5">
                <tr className="text-slate-500">
                  <th className="px-5 py-3 font-black uppercase text-[8px] tracking-widest whitespace-nowrap">Inst.</th>
                  <th className="px-5 py-3 font-black uppercase text-[8px] tracking-widest text-right whitespace-nowrap">Volume (MRR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {topClients.map((client, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] group transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center">
                        <span className={cn("mr-3 font-mono text-[9px] w-5 text-center py-0.5 rounded", idx < 3 ? "bg-amber-500/10 text-amber-400 font-black border border-amber-500/20" : "text-slate-600")}>{(idx + 1)}</span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-slate-200 font-bold group-hover:text-white truncate max-w-[120px]">{client.name}</span>
                          <span className="text-[7px] text-slate-500 font-black uppercase tracking-tight mt-0.5">{client.vertical}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right"><span className="font-mono text-sky-400 font-black tracking-tighter text-[11px]">{formatCurrency(client.revenue)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderExecutiveOperational = () => (
    <div className="flex flex-col flex-1 space-y-6 min-h-0">
      <header className="flex justify-between items-center bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">
            Dimensionamento CS
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Gestão de Headcount • Planejamento Operacional</p>
        </div>
        <div className="flex items-center space-x-3 bg-slate-950 p-2 rounded-2xl border border-white/5 shadow-inner">
           <Info className="w-4 h-4 text-slate-600 ml-2" />
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Calibração Ativa</span>
        </div>
      </header>

      <div className="flex-1 overflow-auto custom-scrollbar space-y-8 pb-10">
        {(Object.keys(opSettings) as Vertical[]).map((v) => {
          const stats = data.verticals.find(vs => vs.vertical === v);
                  const userCountNonAccessible = Math.round((stats.totalUsers * opParams[v].percentNaoAcessiveis) / 100);
          const activePortfolio = stats.totalUsers - userCountNonAccessible;
          const userCountRemotos = Math.round((stats.totalUsers * opParams[v].percentRemotos) / 100);
          const userCountInDesuso = Math.round((stats.totalUsers * opParams[v].percentDesuso) / 100);
          
          const usersForVisitas = Math.max(0, activePortfolio - userCountRemotos);
          const totalVisitasNecessarias = usersForVisitas * opParams[v].visitasAno;
          const totalRemotosNecessarios = userCountRemotos * opParams[v].contatosRemotosAno;

          // Headcount FTE = (Totais / (Capacidade Mes * 12))
          const fteVisitas = totalVisitasNecessarias / (opParams[v].capacidadeVisitasMes * 12);
          const fteRemotos = totalRemotosNecessarios / (opParams[v].capacidadeRemotosMes * 12);
          const headcountEstimado = (fteVisitas + fteRemotos).toFixed(1);

          return (
            <motion.div 
              key={v}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative"
            >
              <div className="bg-slate-950/50 px-8 py-5 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: VERTICAL_COLORS[v], color: VERTICAL_COLORS[v] }} />
                  <h2 className="text-xl font-black tracking-tighter text-white uppercase">{v}</h2>
                </div>
                <div className="flex items-center space-x-4">
                   <div className="flex items-center space-x-4 px-6 py-2 bg-slate-900/50 border border-white/5 rounded-xl shadow-inner">
                      <div className="text-center">
                        <p className="text-[7px] text-slate-500 font-black uppercase tracking-widest mb-0.5">Usuários</p>
                        <p className="text-xs font-black text-white">{formatNumber(stats.totalUsers)}</p>
                      </div>
                      <div className="w-px h-6 bg-white/5" />
                      <div className="text-center">
                        <p className="text-[7px] text-slate-500 font-black uppercase tracking-widest mb-0.5">MRR</p>
                        <p className="text-xs font-black text-sky-400">{formatCurrency(stats.totalRevenue)}</p>
                      </div>
                   </div>
                   <button 
                    onClick={() => handleSaveVertical(v)}
                    className={cn(
                      "flex items-center px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                      saveStatus[v] 
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" 
                        : "bg-white text-slate-950 hover:bg-slate-200 shadow-lg"
                    )}
                   >
                     {saveStatus[v] ? <ShieldCheck className="w-4 h-4 mr-1.5" /> : <Settings2 className="w-4 h-4 mr-1.5" />}
                     {saveStatus[v] ? 'SALVO' : 'GRAVAR'}
                   </button>
                </div>
              </div>

              <div className="p-8 grid grid-cols-12 gap-8">
                <div className="col-span-4 space-y-8">
                  <div className="space-y-5">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Calibração</h3>
                    <div className="space-y-5">
                      {[
                        { key: 'suporteTreinamento', label: 'Suporte / Treinamento', color: 'text-sky-400' },
                        { key: 'relacionamento', label: 'Relacionamento', color: 'text-indigo-400' },
                        { key: 'gestaoContratual', label: 'Gestão Contratual', color: 'text-amber-400' }
                      ].map((item) => (
                        <div key={item.key} className="space-y-3">
                          <div className="flex justify-between items-center text-[9px] font-black uppercase">
                            <span className="text-slate-500 tracking-tight">{item.label}</span>
                            <span className={cn("px-1.5 py-0.5 rounded bg-slate-950 border border-white/5", item.color)}>
                              {EFFORT_LABELS[(opSettings[v] as any)[item.key]] || 'Médio'}
                            </span>
                          </div>
                          <input 
                            type="range" min="25" max="100" step="25"
                            value={(opSettings[v] as any)[item.key]}
                            onChange={(e) => updateOpSetting(v, item.key as any, parseInt(e.target.value))}
                            className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-white"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {(() => {
                    const profile = getRecommendedProfile(opSettings[v]);
                    return (
                      <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 relative overflow-hidden group">
                        <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3">Perfil CS Indicado</h4>
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-white/10 text-white font-black text-lg shadow-2xl transition-transform">
                            {profile.title.charAt(profile.title.lastIndexOf(' ') + 1)}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-black text-white uppercase tracking-tight leading-none mb-1">{profile.title}</p>
                            <p className="text-[9px] text-slate-500 font-medium leading-relaxed">{profile.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="col-span-4 space-y-8 border-x border-white/5 px-8">
                  <div className="space-y-6">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Metas Cobertura</h3>
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-slate-950/50 px-3 py-2 rounded-xl border border-white/5 text-[9px] font-black uppercase">
                          <span className="text-slate-500">Visitas / user / ano</span>
                          <span className="text-white bg-slate-900 px-2 py-0.5 rounded shadow-inner border border-white/5">{opParams[v].visitasAno}x</span>
                        </div>
                        <div className="relative px-1">
                          <input 
                            type="range" step="0.5" min="0.5" max="2" 
                            value={opParams[v].visitasAno}
                            onChange={(e) => updateOpParam(v, 'visitasAno', parseFloat(e.target.value))}
                            className="w-full accent-emerald-400 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-slate-950/50 px-3 py-2 rounded-xl border border-white/5 text-[9px] font-black uppercase">
                          <span className="text-slate-500">Remotos / user / ano</span>
                          <span className="text-white bg-slate-900 px-2 py-0.5 rounded shadow-inner border border-white/5">{opParams[v].contatosRemotosAno}x</span>
                        </div>
                        <div className="relative px-1">
                          <input 
                            type="range" step="0.5" min="0.5" max="3" 
                            value={opParams[v].contatosRemotosAno}
                            onChange={(e) => updateOpParam(v, 'contatosRemotosAno', parseFloat(e.target.value))}
                            className="w-full accent-sky-400 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-3">
                        <div className="space-y-2">
                           <p className="text-[8px] font-black text-slate-500 uppercase text-center">Capacidade Visitas/Mês</p>
                           <input 
                            type="number"
                            value={opParams[v].capacidadeVisitasMes}
                            onChange={(e) => updateOpParam(v, 'capacidadeVisitasMes', parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1.5 text-center text-xs font-black text-white focus:border-emerald-500 outline-none transition-colors"
                           />
                        </div>
                        <div className="space-y-2">
                           <p className="text-[8px] font-black text-slate-500 uppercase text-center">Capacidade Remotos/Mês</p>
                           <input 
                            type="number"
                            value={opParams[v].capacidadeRemotosMes}
                            onChange={(e) => updateOpParam(v, 'capacidadeRemotosMes', parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1.5 text-center text-xs font-black text-white focus:border-sky-500 outline-none transition-colors"
                           />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-6">
                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Classificação Base</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { key: 'percentDesuso', label: 'Em Desuso', color: 'text-rose-400', bg: 'bg-rose-500/5 border-rose-500/10' },
                        { key: 'percentRemotos', label: 'Remotos', color: 'text-amber-400', bg: 'bg-amber-500/5 border-amber-500/10' },
                        { key: 'percentNaoAcessiveis', label: 'N-Acessíveis', color: 'text-slate-400', bg: 'bg-slate-500/5 border-slate-500/10' },
                      ].map((item) => (
                        <div key={item.key} className={cn("p-2.5 rounded-xl border flex items-center justify-between transition-colors", item.bg)}>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase text-slate-500 mb-0.5">{item.label}</span>
                            <span className={cn("text-xs font-black text-white")}>{formatNumber(Math.round((stats.totalUsers * (opParams[v] as any)[item.key]) / 100))}</span>
                          </div>
                          <div className="flex items-center bg-slate-950/40 border border-white/10 rounded-lg px-2 py-0.5 shadow-inner">
                             <input 
                                type="number" 
                                value={(opParams[v] as any)[item.key]}
                                onChange={(e) => updateOpParam(v, item.key as any, Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                                className="bg-transparent text-[11px] font-bold text-white w-6 outline-none text-right"
                              />
                              <span className="text-[8px] font-black text-slate-600 ml-1">%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="col-span-4 flex flex-col space-y-6">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Headcount FTE</h3>
                  <div className="space-y-4">
                    <div className="p-6 bg-slate-950 rounded-2xl text-white shadow-2xl relative overflow-hidden border border-white/5">
                       <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center">
                          <Target className="w-3 h-3 mr-2 text-emerald-400" />
                          Headcount Projetado
                       </p>
                       <div className="flex items-baseline space-x-2 relative z-10">
                          <span className="text-6xl font-black tracking-tighter text-emerald-400 leading-none drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">{headcountEstimado}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FTE</span>
                      </div>
                      <Users className="absolute -right-3 -bottom-3 w-20 h-20 text-white/[0.02]" />
                    </div>

                    <div className="grid grid-cols-1 gap-2 pt-2">
                      <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-xl flex justify-between items-center group">
                        <span className="text-[9px] font-black text-rose-400 uppercase">Em Desuso (Foco CS)</span>
                        <div className="flex flex-col items-end">
                           <span className="text-base font-black text-white">{formatNumber(userCountInDesuso)}</span>
                        </div>
                      </div>
                      
                      <div className="bg-sky-500/5 border border-sky-500/10 p-4 rounded-xl flex justify-between items-center">
                        <span className="text-[9px] font-black text-sky-400 uppercase">Visitas / Ano</span>
                        <div className="flex flex-col items-end">
                           <span className="text-base font-black text-white">{formatNumber(Math.round(totalVisitasNecessarias))}</span>
                        </div>
                      </div>

                      <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-xl flex justify-between items-center">
                        <span className="text-[9px] font-black text-indigo-400 uppercase">Contatos / Ano</span>
                        <div className="flex flex-col items-end">
                           <span className="text-base font-black text-white">{formatNumber(Math.round(totalRemotosNecessarios))}</span>
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
    <div className="flex h-screen w-full bg-[#020617] text-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar - Remains darker for contrast */}
      <aside className="w-68 flex flex-col bg-[#050b1a] border-r border-white/5 shrink-0 z-50 shadow-2xl">
        <div className="p-8 pb-10">
          <div className="flex items-center px-1 mb-10">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20 mr-4 text-white">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase leading-none mb-1">Cortex</span>
              <span className="text-lg font-black text-white tracking-tighter leading-none">BI PLATFORM</span>
            </div>
          </div>

          <nav className="space-y-1.5">
            {[
              { id: 'dashboard', label: 'Dashboard Analítico', icon: LayoutDashboard },
              { id: 'operational', label: 'Capacidade CS', icon: ShieldCheck },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as View)}
                className={cn(
                  "w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all group",
                  currentView === item.id 
                    ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" 
                    : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
                )}
              >
                <item.icon className={cn("w-5 h-5 mr-3", currentView === item.id ? "text-white" : "text-slate-500")} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 pt-0">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
            <div className="flex items-center mb-4">
              <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center mr-3 border border-white/10">
                <Users className="w-5 h-5 text-slate-400" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[11px] font-bold text-white truncate uppercase tracking-tight">Bruno Chayb</span>
                <span className="text-[9px] text-slate-500 font-bold tracking-widest uppercase truncate">Enterprise Lead</span>
              </div>
            </div>
            <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] bg-slate-950/50 p-2.5 rounded-lg text-center border border-white/5 cursor-pointer hover:bg-white/10 transition-all">
              Log out
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 p-8 relative bg-[#020617] overflow-hidden">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {renderExecutiveDashboard()}
            </motion.div>
          ) : (
            <motion.div 
              key="operational"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {renderExecutiveOperational()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
