import { useMemo, useState, useEffect, useCallback, useRef, FormEvent } from 'react';
import { rawSalesData, SalesClient } from './services/salesData';
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
  ChevronLeft,
  Briefcase,
  Save,
  LogIn,
  LogOut,
  ChevronDown as ChevronDownIcon,
  Globe
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
import { verticalDataService, globalSettingsService } from './services/firebaseService';
import { auth, signInWithGoogle } from './lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';

const InfoTooltip = ({ text }: { text: string }) => (
  <span className="group relative inline-block ml-1.5 align-middle">
    <Info className="w-3 h-3 text-slate-500 cursor-help transition-colors group-hover:text-sky-400 opacity-60 group-hover:opacity-100" />
    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
      <motion.span 
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-slate-950 text-white text-[10px] py-1.5 px-3 rounded-lg border border-white/10 shadow-2xl whitespace-nowrap font-bold uppercase tracking-tight block"
      >
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 border-4 border-transparent border-t-slate-950 block" />
      </motion.span>
    </span>
  </span>
);

const VERTICAL_COLORS: Record<Vertical, string> = {
  'Financeiro I': '#0ea5e9',   // Blue
  'Financeiro II': '#10b981',  // Green
  'Governo': '#f59e0b',        // Amber/Yellow
  'Agro/Corp': '#ef4444',      // Red/Orange focus
};

type View = 'dashboard' | 'operational' | 'executivos' | 'organograma';

export default function App() {
  const data = useMemo(() => getDashboardData(), []);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedVertical, setSelectedVertical] = useState<Vertical | 'Tudo'>('Tudo');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ 
    key: 'totalRevenue', 
    direction: 'desc' 
  });

  // Auth State
  const [user, setUser] = useState<{ email: string; uid: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [password, setPassword] = useState('');

  const MASTER_PASSWORD = "270420262345";

  // Auth Effect - Simple Local Storage session
  useEffect(() => {
    const savedUser = localStorage.getItem('dashboard_session');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('dashboard_session');
      }
    }
    setAuthLoading(false);
  }, []);

  const handleLogin = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setLoginError(null);
    
    if (password === MASTER_PASSWORD) {
      const mockUser = { 
        email: 'acesso@broadcast.com.br', 
        uid: 'master-user-id' 
      };
      setUser(mockUser);
      localStorage.setItem('dashboard_session', JSON.stringify(mockUser));
      setPassword('');
    } else {
      setLoginError('Senha incorreta. Por favor, tente novamente.');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('dashboard_session');
    signOut(auth); // Still sign out from firebase just in case
  };

  // Firebase Sync State
  const [isSyncing, setIsSyncing] = useState(false);

  // Operational Settings State
  const initialOpSettings: Record<Vertical, OperationalSettings> = {
    'Financeiro I': { suporteTreinamento: 1, relacionamento: 2, gestaoContratual: 1, capacidadeVisitasPresenciaisMes: 4, capacidadeContatosRemotosMes: 40, execCapacity: 30 },
    'Financeiro II': { suporteTreinamento: 1, relacionamento: 2, gestaoContratual: 1, capacidadeVisitasPresenciaisMes: 2, capacidadeContatosRemotosMes: 60, execCapacity: 30 },
    'Governo': { suporteTreinamento: 1, relacionamento: 2, gestaoContratual: 1, capacidadeVisitasPresenciaisMes: 6, capacidadeContatosRemotosMes: 20, execCapacity: 30 },
    'Agro/Corp': { suporteTreinamento: 1, relacionamento: 2, gestaoContratual: 1, capacidadeVisitasPresenciaisMes: 4, capacidadeContatosRemotosMes: 50, execCapacity: 30 },
  };

  const initialParams: Record<Vertical, VerticalOperationalParams> = {
    'Financeiro I': { visitasAno: 1, contatosRemotosAno: 1, percentDesuso: 15, percentRemotos: 60, percentNaoAcessiveis: 5 },
    'Financeiro II': { visitasAno: 0.5, contatosRemotosAno: 2, percentDesuso: 20, percentRemotos: 70, percentNaoAcessiveis: 10 },
    'Governo': { visitasAno: 1.5, contatosRemotosAno: 1, percentDesuso: 10, percentRemotos: 30, percentNaoAcessiveis: 20 },
    'Agro/Corp': { visitasAno: 1, contatosRemotosAno: 1.5, percentDesuso: 25, percentRemotos: 80, percentNaoAcessiveis: 15 },
  };

  const [opSettings, setOpSettings] = useState<Record<Vertical, OperationalSettings>>(initialOpSettings);
  const [opParams, setOpParams] = useState<Record<Vertical, VerticalOperationalParams>>(initialParams);
  const isInitialMount = useRef(true);

  // Firestore Loading Effect
  useEffect(() => {
    if (!user) return;

    const loadFirestoreData = async () => {
      setIsSyncing(true);
      try {
        const vData = await verticalDataService.getAll();

        if (Object.keys(vData).length > 0) {
          const newOpSettings = { ...initialOpSettings };
          const newOpParams = { ...initialParams };

          (Object.keys(vData) as Vertical[]).forEach(v => {
            if (vData[v].settings) newOpSettings[v] = vData[v].settings;
            if (vData[v].params) newOpParams[v] = vData[v].params;
          });

          setOpSettings(newOpSettings);
          setOpParams(newOpParams);
        }
      } catch (error) {
        console.error('Failed to load Firestore data:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    loadFirestoreData();
  }, [user]);

  const handleSave = async (vertical: Vertical) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      await verticalDataService.saveVertical(vertical, opSettings[vertical], opParams[vertical]);
      setUnsavedVerticals(prev => {
        const next = new Set(prev);
        next.delete(vertical);
        return next;
      });
    } catch (error) {
      console.error('Failed to save to Firestore:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const [unsavedVerticals, setUnsavedVerticals] = useState<Set<Vertical>>(new Set());

  // Debounced auto-save for operational data (Verticals)
  useEffect(() => {
    if (!user) return;
    
    const timers: NodeJS.Timeout[] = [];
    
    unsavedVerticals.forEach(v => {
      const timer = setTimeout(() => {
        handleSave(v);
      }, 2000);
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, [opSettings, opParams, user, unsavedVerticals]);

  const [expandedVerticals, setExpandedVerticals] = useState<Record<Vertical, boolean>>({
    'Financeiro I': false,
    'Financeiro II': false,
    'Governo': false,
    'Agro/Corp': false,
  });
  const [expandedSalesVerticals, setExpandedSalesVerticals] = useState<Record<string, boolean>>({
    'FINANCEIRO I': false,
    'FINANCEIRO II': false,
    'GOVERNO': false,
    'AGRO/CORP': false,
  });

  const filteredSalesData = useMemo(() => {
    const verticals = ['FINANCEIRO I', 'FINANCEIRO II', 'GOVERNO', 'AGRO/CORP'];
    const result: Record<string, { 
      clients: SalesClient[], 
      totalRevenue: number, 
      headcount: number,
      fixedHC: number,
      variableHC: number
    }> = {};

    const verticalMap: Record<string, Vertical> = {
      'FINANCEIRO I': 'Financeiro I',
      'FINANCEIRO II': 'Financeiro II',
      'GOVERNO': 'Governo',
      'AGRO/CORP': 'Agro/Corp'
    };

    verticals.forEach(v => {
      let clients = rawSalesData.filter(c => c.vertical === v);
      clients = clients.filter(c => c.revenue > 10000);
      clients.sort((a, b) => b.revenue - a.revenue);
      
      const totalRevenue = clients.reduce((sum, c) => sum + c.revenue, 0);
      
      let fixedHC = 0;
      let variableCount = clients.length;
      
      if (v === 'FINANCEIRO I') {
        const specialAccounts = clients.filter(c => ['BRADESCO', 'ITAU UNIBANCO'].includes(c.name.toUpperCase()));
        fixedHC = specialAccounts.length; 
        variableCount = clients.length - fixedHC;
      } else if (v === 'GOVERNO') {
        const specialAccounts = clients.filter(c => ['BANCO DO BRASIL'].includes(c.name.toUpperCase()));
        fixedHC = specialAccounts.length;
        variableCount = clients.length - fixedHC;
      }

      const vPascal = verticalMap[v];
      const vExecCapacity = opSettings[vPascal]?.execCapacity || 30;

      const variableHC = variableCount / vExecCapacity;
      const headcount = fixedHC + variableHC;

      result[v] = {
        clients,
        totalRevenue,
        headcount,
        fixedHC,
        variableHC
      };
    });

    return result;
  }, [opSettings]);

  const salesTotals = useMemo(() => {
    const values = Object.values(filteredSalesData) as Array<{ 
      clients: SalesClient[], 
      totalRevenue: number, 
      headcount: number 
    }>;
    const totalClients = values.reduce((sum, v) => sum + v.clients.length, 0);
    const totalRevenue = values.reduce((sum, v) => sum + v.totalRevenue, 0);
    const totalHeadcount = values.reduce((sum, v) => sum + v.headcount, 0);
    
    // Percentages based on user provided reference: 1.422 accounts
    // Total revenue from getDashboardData() defaults to targets sum if not calculated from raw
    const grandTotalAccounts = 1422;
    const grandTotalRevenue = data.totalRevenue;

    const accountPercentage = (totalClients / grandTotalAccounts) * 100;
    const revenuePercentage = (totalRevenue / grandTotalRevenue) * 100;

    return { 
      totalClients, 
      totalRevenue, 
      totalHeadcount, 
      accountPercentage, 
      revenuePercentage,
      grandTotalAccounts,
      grandTotalRevenue
    };
  }, [filteredSalesData, data.totalRevenue]);

  const renderOrganograma = () => (
    <div className="flex flex-col flex-1 space-y-4 min-h-0 overflow-hidden">
      <header className="flex justify-between items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 shrink-0 shadow-2xl">
        <h1 className="text-2xl font-black uppercase tracking-tighter bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent">
          Estrutura Organizacional
        </h1>
      </header>

      <div className="flex-1 bg-slate-950/40 border border-white/5 rounded-3xl p-4 md:p-12 overflow-auto custom-scrollbar relative">
        <div className="min-w-[1000px] flex flex-col items-center space-y-16">
          
          {/* Top Level: Diretor Comercial */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            <div className="bg-gradient-to-br from-rose-500 to-amber-500 p-[2px] rounded-2xl shadow-[0_0_30px_-5px_rgba(244,63,94,0.3)]">
              <div className="bg-slate-950 rounded-[14px] px-10 py-6 border border-white/10 text-center">
                <h3 className="text-xl font-black text-white uppercase">Diretor Comercial</h3>
              </div>
            </div>
            {/* Main trunk down */}
            <div className="absolute left-1/2 bottom-0 w-px h-16 bg-white/10 -translate-x-1/2 translate-y-full" />
          </motion.div>

          {/* Level 1: Verticals & CS */}
          <div className="relative w-full">
            {/* Horizontal connection line for all reporting units (Verticals + CS) */}
            <div className="absolute top-0 left-[10%] right-[10%] h-px bg-white/10" />
            
            <div className="grid grid-cols-5 gap-8">
              {/* Verticals */}
              {[
                { name: 'Financeiro I', color: 'from-sky-500 to-indigo-500', iconColor: 'text-sky-400' },
                { name: 'Financeiro II', color: 'from-emerald-500 to-teal-500', iconColor: 'text-emerald-400' },
                { name: 'Governo', color: 'from-amber-500 to-orange-500', iconColor: 'text-amber-400' },
                { name: 'Agro/Corp', color: 'from-rose-500 to-pink-500', iconColor: 'text-rose-400' },
                { name: 'Customer Success', color: 'from-indigo-500 to-purple-600', iconColor: 'text-indigo-400', isCS: true },
              ].map((v, i) => (
                <div key={v.name} className="flex flex-col items-center space-y-12">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + i * 0.1 }}
                    className="relative group"
                  >
                    {/* Connection to top trunk */}
                    <div className="absolute left-1/2 top-0 w-px h-8 bg-white/10 -translate-x-1/2 -translate-y-full" />
                    
                    <div className={cn("bg-gradient-to-br p-[1px] rounded-xl shadow-lg transition-all group-hover:scale-105", v.color)}>
                      <div className="bg-slate-900 rounded-[11px] px-6 py-4 text-center min-w-[180px]">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{v.isCS ? 'Unidade' : 'Vertical'}</p>
                        <h4 className="text-sm font-black text-white uppercase truncate">{v.name}</h4>
                        {v.isCS && (
                          <div className="mt-2 pt-2 border-t border-white/5">
                            <p className="text-[8px] text-indigo-400 font-bold uppercase leading-none">Direcionamento Funcional</p>
                            <p className="text-[7px] text-slate-500 font-bold uppercase mt-1">Das Verticais</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Stem down */}
                    <div className="absolute left-1/2 bottom-0 w-px h-12 bg-white/10 -translate-x-1/2 translate-y-full" />
                  </motion.div>

                  {/* Sub-level (Executivo or Specialists) */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className={cn(
                      "px-4 py-3 text-center min-w-[160px] border rounded-xl",
                      v.isCS ? "bg-indigo-500/10 border-indigo-500/20 shadow-[0_0_15px_-5px_rgba(99,102,241,0.2)]" : "bg-slate-900/50 border-white/5"
                    )}
                  >
                    {v.isCS ? (
                      <>
                        <div className="flex -space-x-1 justify-center mb-2">
                          {[1, 2].map(j => <Users key={j} className="w-3 h-3 text-indigo-400" />)}
                        </div>
                        <p className="text-[10px] font-black text-white uppercase tracking-tighter">Especialistas CS</p>
                      </>
                    ) : (
                      <>
                        <Briefcase className={cn("w-4 h-4 mx-auto mb-2 opacity-50", v.iconColor)} />
                        <p className="text-[10px] font-black text-white uppercase tracking-tighter">Executivo de Vendas</p>
                      </>
                    )}
                  </motion.div>
                </div>
              ))}
            </div>

            {/* Matrix Direction Line: Functional guidance from Vertical Heads to CS */}
            <div className="absolute top-[68px] left-[10%] right-[10%] h-px border-t border-dashed border-indigo-500/30 pointer-events-none" />
            <div className="absolute top-[68px] right-[9.5%] w-2 h-2 border-t border-r border-indigo-500/40 rotate-45 -translate-y-1/2 pointer-events-none" />
            <div className="absolute top-[64px] left-[10%] right-[30%] flex justify-between pointer-events-none opacity-40">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-indigo-500/20 border border-indigo-500/30" />
              ))}
            </div>
          </div>

          {/* Legend / Info */}
          <div className="mt-12 flex items-center space-x-8 px-6 py-3 bg-slate-900/50 border border-white/5 rounded-full backdrop-blur-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-px bg-white/20" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Reporte Hierárquico</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-px border-t border-dashed border-white/40" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Direcionamento Funcional</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderExecutivos = () => {
    const verticalMap: Record<string, Vertical> = {
      'FINANCEIRO I': 'Financeiro I',
      'FINANCEIRO II': 'Financeiro II',
      'GOVERNO': 'Governo',
      'AGRO/CORP': 'Agro/Corp'
    };

    return (
    <div className="flex flex-col flex-1 space-y-4 min-h-0 overflow-hidden">
      <header className="flex justify-between items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 shrink-0 shadow-2xl">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black uppercase tracking-tighter bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
            Dimensionamento Executivos Vendas
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-1">
            A lista/ranking abaixo, considera as contas com faturamento acima de R$ 10k/mês
          </p>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-4 h-28 shrink-0">
        {[
          { 
            label: 'Aderência Contas (Top)', 
            value: salesTotals.totalClients, 
            sub: `${salesTotals.accountPercentage.toFixed(1)}% do total (${salesTotals.grandTotalAccounts})`,
            icon: Briefcase, color: 'text-sky-400', barColor: 'bg-sky-500' 
          },
          { 
            label: 'Headcount Necessário', 
            value: salesTotals.totalHeadcount.toFixed(1), 
            sub: 'Sizing total consolidado',
            icon: Users, color: 'text-emerald-400', barColor: 'bg-emerald-500' 
          },
          { 
            label: 'Aderência Receita', 
            value: formatCurrency(salesTotals.totalRevenue), 
            sub: `${salesTotals.revenuePercentage.toFixed(1)}% da receita total`,
            icon: DollarSign, color: 'text-indigo-400', barColor: 'bg-indigo-500' 
          },
          { 
            label: 'Ticket Médio (Filtro)', 
            value: formatCurrency(salesTotals.totalClients > 0 ? salesTotals.totalRevenue / salesTotals.totalClients : 0), 
            sub: 'Baseado em contas > 10k',
            icon: Target, color: 'text-amber-400', barColor: 'bg-amber-500' 
          },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-950 border border-white/10 rounded-2xl p-5 flex flex-col justify-center relative overflow-hidden group shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all hover:border-white/20">
            <div className={cn("absolute right-0 top-0 w-1 h-full", stat.barColor)} />
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{stat.label}</p>
              <stat.icon className={cn("w-4 h-4 opacity-50", stat.color)} />
            </div>
            <p className={cn("text-3xl font-black tracking-tight leading-none mb-1", stat.color)}>{stat.value}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar space-y-6 pb-10">
        <div className="grid grid-cols-4 gap-6 items-start">
          {(Object.entries(filteredSalesData) as Array<[string, { 
            clients: SalesClient[], 
            totalRevenue: number, 
            headcount: number,
            fixedHC: number,
            variableHC: number
          }]>).map(([v, data]) => {
            const revenueParticipation = (data.totalRevenue / salesTotals.totalRevenue) * 100;

            return (
              <div key={v} className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden flex flex-col h-fit">
                <div className="bg-slate-950/50 p-6 border-b border-white/5 flex flex-col min-h-[480px]">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-black text-white uppercase tracking-tight">{v}</h2>
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const vPascal = verticalMap[v];
                          if (unsavedVerticals.has(vPascal) && !isSyncing) handleSave(vPascal);
                        }}
                        className={cn(
                          "flex items-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
                          unsavedVerticals.has(verticalMap[v])
                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:scale-95" 
                            : "bg-slate-800/50 text-slate-600 border border-white/5 cursor-not-allowed",
                          isSyncing && "opacity-50 cursor-wait"
                        )}
                        disabled={isSyncing || !unsavedVerticals.has(verticalMap[v])}
                      >
                        {isSyncing ? (
                          <div className="w-3.5 h-3.5 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5 mr-2" />
                        )}
                        {unsavedVerticals.has(verticalMap[v]) ? 'Gravar' : 'Gravado'}
                      </button>
                      <span className="px-2 py-1 bg-sky-500/10 text-sky-400 rounded text-[10px] font-black">{data.clients.length} Contas</span>
                    </div>
                  </div>
                  
                  <div className="space-y-6 flex-1 flex flex-col">
                    <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-4">
                      <div>
                        <p className="text-[9px] text-slate-500 font-bold uppercase mb-1 flex items-center">
                          MRR 
                          <span className="ml-2 text-[8px] text-emerald-500/80 font-black">({revenueParticipation.toFixed(1)}%)</span>
                        </p>
                        <p className="text-base font-black text-white">{formatCurrency(data.totalRevenue)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Total HC</p>
                        <p className="text-base font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-lg inline-block border border-emerald-500/20">{data.headcount.toFixed(1)}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4 flex-1">
                      <div className="space-y-3">
                        {data.fixedHC > 0 ? (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex flex-col justify-center">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[9px] font-black text-amber-500 uppercase flex items-center">
                                <ShieldCheck className="w-3 h-3 mr-1" />
                                Fixed Headcount
                              </span>
                              <span className="text-[11px] font-black text-amber-400">{data.fixedHC.toFixed(1)}</span>
                            </div>
                            <p className="text-[9px] text-slate-500 font-medium leading-tight">
                              {v === 'FINANCEIRO I' ? 'Bradesco e Itaú' : 'Banco do Brasil'} possuem HC dedicado.
                            </p>
                          </div>
                        ) : (
                          <div className="h-[60px] flex items-center justify-center border border-dashed border-white/5 rounded-xl opacity-20">
                            <span className="text-[8px] font-bold uppercase text-slate-500">Sem Headcount Fixo</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 px-1 pt-1 opacity-80">
                          <span className="flex items-center">
                            <Users className="w-3 h-3 mr-1 opacity-50" />
                            Contas Proporcionais ({data.clients.length - data.fixedHC})
                          </span>
                          <span className="text-white">{data.variableHC.toFixed(1)}</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/5 bg-slate-900/40 p-4 rounded-2xl space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                            Capacidade de Atendimento
                          </label>
                          <span className="text-xs font-black text-sky-400">{opSettings[verticalMap[v]].execCapacity} contas/head</span>
                        </div>
                        <input 
                          type="range" min="1" max={data.clients.length} step="1" 
                          value={opSettings[verticalMap[v]].execCapacity}
                          onChange={(e) => updateOpSetting(verticalMap[v], 'execCapacity', parseInt(e.target.value))}
                          className="w-full accent-emerald-500"
                        />
                        <div className="flex justify-between text-[7px] font-black text-slate-700 uppercase tracking-tighter px-0.5">
                          <span>Alta Complexidade (1)</span>
                          <span>Capacidade Máxima ({data.clients.length})</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => toggleSalesVertical(v)}
                      className={cn(
                        "mt-auto w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-center space-x-2",
                        expandedSalesVerticals[v] 
                          ? "bg-white/10 border-white/20 text-white shadow-inner" 
                          : "bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20 shadow-lg shadow-sky-500/5"
                      )}
                    >
                      <span>{expandedSalesVerticals[v] ? 'Recolher Clientes' : 'Ver relação de clientes'}</span>
                      {expandedSalesVerticals[v] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <AnimatePresence>
                  {expandedSalesVerticals[v] && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 400, opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden bg-slate-950/30 border-t border-white/5"
                    >
                      <div className="p-4 space-y-2 h-full overflow-auto custom-scrollbar">
                        {data.clients.map((c, idx) => {
                          const isKeyAccount = ['BRADESCO', 'ITAU UNIBANCO', 'SANTANDER BRASIL', 'BANCO DO BRASIL'].includes(c.name.toUpperCase());
                          return (
                            <div key={idx} className={cn(
                              "border rounded-xl p-3 flex justify-between items-center group transition-colors relative",
                              isKeyAccount 
                                ? "bg-amber-500/20 border-amber-500/40 hover:bg-amber-500/30 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]" 
                                : "bg-white/5 border-white/5 hover:bg-white/10"
                            )}>
                              <div className="flex items-center space-x-3 min-w-0">
                                <span className={cn(
                                  "text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shrink-0",
                                  isKeyAccount ? "bg-amber-500/30 text-amber-400" : "bg-white/5 text-slate-500"
                                )}>
                                  {idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className={cn("text-xs font-black truncate", isKeyAccount ? "text-amber-300" : "text-white")} title={c.name}>{c.name}</p>
                                  <p className="text-[9px] text-slate-500 font-bold uppercase">{formatNumber(c.users)} usuários</p>
                                </div>
                              </div>
                              <span className={cn("text-[10px] font-mono font-black ml-2 whitespace-nowrap", isKeyAccount ? "text-amber-400" : "text-emerald-400")}>{formatCurrency(c.revenue)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
  };

  const toggleVertical = (v: Vertical) => {
    setExpandedVerticals(prev => ({ ...prev, [v]: !prev[v] }));
  };

  const toggleSalesVertical = (v: string) => {
    setExpandedSalesVerticals(prev => ({ ...prev, [v]: !prev[v] }));
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

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateValue = (field: string, value: number): string | null => {
    if (value < 0) return 'Mínimo 0';
    if (['percentDesuso', 'percentRemotos', 'percentNaoAcessiveis'].includes(field)) {
      if (value > 100) return 'Máximo 100%';
    }
    return null;
  };

  const updateOpSetting = (vertical: Vertical, field: keyof OperationalSettings, value: number) => {
    const error = validateValue(field, value);
    const errorKey = `${vertical}-${field}`;
    
    setValidationErrors(prev => {
      const next = { ...prev };
      if (error) next[errorKey] = error;
      else delete next[errorKey];
      return next;
    });

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
    const error = validateValue(field, value);
    const errorKey = `${vertical}-${field}`;
    
    setValidationErrors(prev => {
      const next = { ...prev };
      if (error) next[errorKey] = error;
      else delete next[errorKey];
      return next;
    });

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
          { label: 'Total de Clientes', value: formatNumber(totals.totalClients), icon: Users, sub: selectedVertical === 'Tudo' ? `${data.verticals.length} Verticais` : 'Vertical Selecionada', color: 'bg-indigo-500', tooltip: 'Volume de empresas com contratos ativos' },
          { label: 'Total de usuários', value: formatNumber(totals.totalUsers), icon: Monitor, sub: `${(totals.totalUsers / totals.totalClients || 0).toFixed(1)} usuários/cliente`, color: 'bg-emerald-500', tooltip: 'Soma de licenças distribuídas' },
          { label: 'Total MRR', value: formatCurrency(totals.totalRevenue), icon: DollarSign, sub: 'Faturamento Mensal', accent: true, color: 'bg-sky-500', tooltip: 'Receita Mensal Recorrente projetada' },
          { label: 'Ticket Médio', value: formatCurrency(totals.averageTicket), icon: Target, color: 'bg-amber-500', tooltip: 'Faturamento médio por conta' },
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
            <div className="flex items-center mb-1">
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none">{stat.label}</p>
              <InfoTooltip text={stat.tooltip} />
            </div>
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
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 flex flex-col"
            >
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center">
                <BarChart3 className="w-3.5 h-3.5 mr-2 text-sky-500" />
                Receita por Vertical
                <InfoTooltip text="Visão segregada do MRR por segmento de negócio" />
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
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 flex flex-col"
            >
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center">
                <PieIcon className="w-3.5 h-3.5 mr-2 text-indigo-500" />
                Participação de Mercado
                <InfoTooltip text="Proporção da receita total gerada por cada pilar" />
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
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex-1 bg-slate-900/60 border border-white/10 rounded-2xl p-5 flex flex-col min-h-0 shadow-inner overflow-hidden"
          >
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
                      <div className="flex items-center">Clientes <InfoTooltip text="Número de contas únicas" /> {sortConfig.key === 'totalClients' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}</div>
                    </th>
                    <th className="px-4 py-2 cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('totalUsers')}>
                      <div className="flex items-center">Usuários <InfoTooltip text="Total de logins habilitados" /> {sortConfig.key === 'totalUsers' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}</div>
                    </th>
                    <th className="px-4 py-2 cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('totalRevenue')}>
                      <div className="flex items-center">Faturamento <InfoTooltip text="MRR consolidado da vertical" /> {sortConfig.key === 'totalRevenue' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}</div>
                    </th>
                    <th className="px-4 py-2 cursor-pointer hover:text-white transition-colors" onClick={() => requestSort('averageTicket')}>
                      <div className="flex items-center">Ticket Médio <InfoTooltip text="Faturamento dividido por clientes" /> {sortConfig.key === 'averageTicket' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}</div>
                    </th>
                    <th className="px-4 py-2 cursor-pointer hover:text-white transition-colors text-right" onClick={() => requestSort('usersPerClient')}>
                      <div className="flex items-center justify-end">Usuários/Cli <InfoTooltip text="Média de penetração por conta" /> {sortConfig.key === 'usersPerClient' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />)}</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y-0">
                  {sortedVerticals.map((v: any, idx: number) => (
                    <motion.tr 
                      key={v.vertical} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
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
                    </motion.tr>
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
          </motion.div>
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
                  <motion.tr 
                    key={idx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-sky-500/5 group transition-colors"
                  >
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
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const opStatsSummary = useMemo(() => {
    let totalHC = 0;
    const profiles = { 'Júnior': 0, 'Pleno': 0, 'Sênior': 0 };

    (Object.keys(opSettings) as Vertical[]).forEach((v) => {
      const stats = data.verticals.find(vs => vs.vertical === v);
      if (!stats) return;

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
      const hc = capPerYear > 0 ? (totalDemand / capPerYear) : 0;

      totalHC += hc;
      const profile = getRecommendedProfile(opSettings[v]);
      profiles[profile as keyof typeof profiles]++;
    });

    return { totalHC, profiles };
  }, [opSettings, opParams, data]);

  const renderOperational = () => (
    <div className="flex flex-col flex-1 space-y-4 min-h-0 overflow-hidden">
      <header className="flex justify-between items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 shrink-0 shadow-2xl">
        <h1 className="text-2xl font-black uppercase tracking-tighter bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">
          Customer Success
        </h1>
      </header>

      <div className="flex-1 overflow-auto custom-scrollbar space-y-6 pb-10">
        {/* Visão Geral Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/60 border border-emerald-500/20 rounded-3xl p-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <ShieldCheck className="w-24 h-24 text-emerald-500" />
          </div>
          
          <div className="relative z-10">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500 mb-6 flex items-center">
              <span className="w-8 h-px bg-emerald-500/30 mr-3" />
              Visão Geral Consolidada
            </h3>

            <div className="grid grid-cols-4 gap-8">
              <div className="col-span-1 border-r border-white/10 pr-8">
                <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">
                  Headcount Total
                  <InfoTooltip text="Projeção de força de trabalho consolidada" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <p className="text-5xl font-black text-emerald-400 tracking-tighter">{opStatsSummary.totalHC.toFixed(1)}</p>
                </div>
                <p className="text-[10px] text-slate-500 font-medium mt-2 leading-relaxed">
                  Soma do headcount necessário across todas as verticais.
                </p>
              </div>

              <div className="col-span-3 grid grid-cols-3 gap-6 pl-4">
                {[
                  { label: 'Perfil Júnior', count: opStatsSummary.profiles['Júnior'], color: 'text-sky-400', bg: 'bg-sky-500/10' },
                  { label: 'Perfil Pleno', count: opStatsSummary.profiles['Pleno'], color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { label: 'Perfil Sênior', count: opStatsSummary.profiles['Sênior'], color: 'text-amber-400', bg: 'bg-amber-500/10' },
                ].map((profile, idx) => (
                  <motion.div 
                    key={profile.label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + (idx * 0.05) }}
                    className={cn("p-4 rounded-2xl border border-white/5 flex flex-col justify-center", profile.bg)}
                  >
                    <p className="text-[9px] font-black uppercase text-slate-500 mb-2 tracking-widest">{profile.label}</p>
                    <div className="flex items-center justify-between">
                      <span className={cn("text-2xl font-black", profile.color)}>{profile.count}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Verticais</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
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
                      <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Clientes <InfoTooltip text="Total de contas únicas" /></div>
                      <p className="text-sm font-black text-white">{formatNumber(stats.totalClients)}</p>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Usuários <InfoTooltip text="Faturamento dividido por clientes" /></div>
                      <p className="text-sm font-black text-white">{formatNumber(stats.totalUsers)}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const hasErrors = Object.keys(validationErrors).some(key => key.startsWith(v));
                      if (unsavedVerticals.has(v) && !isSyncing && !hasErrors) handleSave(v);
                    }}
                    className={cn(
                      "flex items-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
                      unsavedVerticals.has(v) && !Object.keys(validationErrors).some(key => key.startsWith(v))
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:scale-95" 
                        : "bg-slate-800/50 text-slate-600 border border-white/5 cursor-not-allowed",
                      isSyncing && "opacity-50 cursor-wait"
                    )}
                    disabled={isSyncing || Object.keys(validationErrors).some(key => key.startsWith(v))}
                  >
                    {isSyncing ? (
                      <div className="w-3.5 h-3.5 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5 mr-2" />
                    )}
                    {unsavedVerticals.has(v) ? 'Gravar' : 'Gravado'}
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
                            <InfoTooltip text="Nível de atenção demandado pela operação" />
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
                                className="w-full accent-sky-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
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
                            <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                              Capacidade Visitas/Mês
                              <InfoTooltip text="Média de visitas físicas comportada por 1 CS/mês" />
                            </label>
                            <input 
                              type="number"
                              value={opSettings[v].capacidadeVisitasPresenciaisMes}
                              onChange={(e) => updateOpSetting(v, 'capacidadeVisitasPresenciaisMes', parseInt(e.target.value) || 0)}
                              className={cn(
                                "w-full bg-slate-950 border rounded-xl px-4 py-2 text-sm font-bold text-white outline-none transition-colors",
                                validationErrors[`${v}-capacidadeVisitasPresenciaisMes`] ? "border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.2)]" : "border-white/10 focus:border-sky-500"
                              )}
                            />
                            {validationErrors[`${v}-capacidadeVisitasPresenciaisMes`] && (
                              <p className="text-[8px] font-black text-rose-500 uppercase tracking-tighter mt-1">{validationErrors[`${v}-capacidadeVisitasPresenciaisMes`]}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                              Capacidade Contatos/Mês
                              <InfoTooltip text="Média de interações remotas comportada por 1 CS/mês" />
                            </label>
                            <input 
                              type="number"
                              value={opSettings[v].capacidadeContatosRemotosMes}
                              onChange={(e) => updateOpSetting(v, 'capacidadeContatosRemotosMes', parseInt(e.target.value) || 0)}
                              className={cn(
                                "w-full bg-slate-950 border rounded-xl px-4 py-2 text-sm font-bold text-white outline-none transition-colors",
                                validationErrors[`${v}-capacidadeContatosRemotosMes`] ? "border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.2)]" : "border-white/10 focus:border-sky-500"
                              )}
                            />
                            {validationErrors[`${v}-capacidadeContatosRemotosMes`] && (
                              <p className="text-[8px] font-black text-rose-500 uppercase tracking-tighter mt-1">{validationErrors[`${v}-capacidadeContatosRemotosMes`]}</p>
                            )}
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
                        <InfoTooltip text="Frequência desejada de atendimento por usuário" />
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
                            className="w-full accent-sky-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
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
                            className="w-full accent-emerald-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
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
                      <InfoTooltip text="Saúde e acessibilidade da carteira de usuários" />
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
                          <div key={item.key} className={cn(
                            "p-4 rounded-2xl border transition-all", 
                            validationErrors[`${v}-${item.key}`] ? "border-rose-500 bg-rose-500/5 ring-1 ring-rose-500/20" : "border-white/5",
                            item.bg
                          )}>
                            <p className="text-[9px] font-black uppercase text-slate-400 mb-2 leading-tight h-5">{item.label}</p>
                            <div className="flex items-center space-x-2">
                              <input 
                                type="number" 
                                value={percentage}
                                onChange={(e) => updateOpParam(v, item.key as any, parseInt(e.target.value) || 0)}
                                className={cn(
                                  "bg-transparent text-xl font-black w-12 outline-none",
                                  validationErrors[`${v}-${item.key}`] ? "text-rose-400" : "text-white"
                                )}
                              />
                              <span className="text-xs font-bold text-slate-500">%</span>
                            </div>
                            {validationErrors[`${v}-${item.key}`] && (
                              <p className="text-[8px] font-black text-rose-500 uppercase tracking-tighter mt-1">{validationErrors[`${v}-${item.key}`]}</p>
                            )}
                            <p className="text-[10px] font-bold text-slate-500 mt-1">
                              {formatNumber(absoluteValue)} usuários
                            </p>
                            <div className="h-1 bg-white/10 rounded-full mt-3 overflow-hidden">
                              <div className="h-full bg-current opacity-60" style={{ width: `${Math.min(100, Math.max(0, percentage))}%`, color: 'inherit' }} />
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
                      <InfoTooltip text="Volumetria total de atendimentos projetados/ano" />
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
                        <div className="space-y-6">
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
                              </p>
                            </div>
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin mb-4" />
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Sincronizando Sessão...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Glow Effects */}
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-sky-500/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[120px]" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md text-center space-y-12"
        >
          {/* Logo Section */}
          <div className="flex flex-col items-center space-y-6">
            <div className="w-24 h-24 bg-gradient-to-br from-sky-400 via-sky-500 to-indigo-600 rounded-[2rem] flex items-center justify-center shadow-[0_20px_50px_rgba(14,165,233,0.3)] transform -rotate-3 hover:rotate-0 transition-transform duration-500">
              <TrendingUp className="w-12 h-12 text-white" />
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">
                Dashboard Vendas
              </h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">BROADCAST</p>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl space-y-8">
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              Dimensionamento e Calibração Operacional para adequação de estrutura de Vendas
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative group">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
                <input 
                  type="password"
                  placeholder="INSIRA A SENHA DE ACESSO"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-5 bg-slate-950/50 border border-white/5 rounded-2xl text-white font-mono text-center tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all placeholder:text-slate-700 placeholder:text-[10px] placeholder:font-black placeholder:tracking-[0.2em]"
                  autoFocus
                />
              </div>

              <button 
                type="submit"
                className="w-full flex items-center justify-center px-8 py-5 bg-white text-slate-950 rounded-2xl font-black uppercase text-xs tracking-[0.1em] hover:bg-sky-50 transition-all duration-300 shadow-[0_10px_30px_rgba(255,255,255,0.1)] active:scale-95 group"
              >
                <LogIn className="w-4 h-4 mr-3 text-sky-500 group-hover:translate-x-1 transition-transform" />
                Acessar Dashboard
              </button>
            </form>

            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
              Acesso Restrito - Equipe de Vendas Broadcast
            </p>

            {loginError && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[10px] text-rose-400 font-bold uppercase tracking-tight text-center"
              >
                {loginError}
              </motion.div>
            )}
          </div>

          {/* Footer Branding */}
          <div className="flex items-center justify-center space-x-6 pt-8 opacity-20 grayscale brightness-200">
            <span className="text-[12px] font-black uppercase tracking-widest text-white">Broadcast</span>
          </div>
        </motion.div>

        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#0f172a] text-slate-100 overflow-hidden font-sans"
         style={{ backgroundImage: 'radial-gradient(at 0% 0%, rgba(56, 189, 248, 0.05) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(139, 92, 246, 0.05) 0px, transparent 50%)' }}>
      
      {/* Sidebar */}
      <aside className={cn(
        "flex flex-col bg-slate-950/40 border-r border-white/10 shrink-0 z-50 transition-all duration-300 relative",
        isSidebarCollapsed ? "w-20" : "w-72"
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
                <span className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase leading-none mb-1">Dashboard</span>
                <span className="text-lg font-black text-white tracking-tighter leading-none whitespace-nowrap uppercase">Vendas</span>
              </motion.div>
            )}
          </div>

          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
              { id: 'operational', label: 'Customer Success', icon: ShieldCheck },
              { id: 'executivos', label: 'Executivos Vendas', icon: Users },
              { id: 'organograma', label: 'Organograma', icon: BarChart3 },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as View)}
                className={cn(
                  "w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group relative",
                  currentView === item.id 
                    ? "bg-white/10 text-white shadow-lg shadow-black/20" 
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 mr-4 transition-all duration-200 shrink-0",
                  currentView === item.id ? "text-sky-400" : "group-hover:text-slate-400"
                )} />
                {!isSidebarCollapsed && (
                  <span className="text-sm font-black uppercase tracking-tighter transition-opacity whitespace-nowrap">{item.label}</span>
                )}
                {currentView === item.id && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute left-0 w-1 h-6 bg-sky-400 rounded-r-full"
                  />
                )}
              </button>
            ))}
          </nav>

          {/* Sync Status */}
          <div className="mt-10 pt-10 border-t border-white/5 space-y-4">
            {isSyncing && !isSidebarCollapsed && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center px-4 space-x-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest"
              >
                <div className="w-2 h-2 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                <span>Sincronizando...</span>
              </motion.div>
            )}
          </div>

          {/* Logout Section */}
          <div className="mt-10 pt-10 border-t border-white/5">
            <button 
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center px-4 py-3 rounded-xl bg-slate-900 border border-white/5 text-slate-500 hover:text-white hover:border-white/10 transition-all group",
                isSidebarCollapsed && "justify-center"
              )}
            >
              <LogOut className={cn("w-5 h-5 shrink-0 group-hover:-translate-x-1 transition-transform", !isSidebarCollapsed && "mr-4")} />
              {!isSidebarCollapsed && <span className="text-sm font-black uppercase tracking-tighter">Sair</span>}
            </button>
          </div>
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
          ) : currentView === 'operational' ? (
            <motion.div 
              key="operational"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {renderOperational()}
            </motion.div>
          ) : currentView === 'executivos' ? (
            <motion.div 
              key="executivos"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {renderExecutivos()}
            </motion.div>
          ) : (
            <motion.div 
              key="organograma"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {renderOrganograma()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
