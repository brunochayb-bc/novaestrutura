import { useMemo, useState, useEffect, useCallback, useRef, FormEvent, Fragment } from 'react';
import { rawSalesData, SalesClient } from './services/salesData';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Target, 
  ChevronRight, 
  BarChart3, 
  Star, 
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
  ArrowUpRight,
  Undo,
  Check,
  Info,
  Menu,
  ChevronLeft,
  Briefcase,
  Save,
  LogIn,
  LogOut,
  ChevronDown as ChevronDownIcon,
  Globe,
  Zap,
  CheckCircle2,
  MessageSquare,
  Timer,
  Scale,
  Eye,
  EyeOff,
  Home,
  Network
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
import { getDashboardData, customers } from './data';
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
  'Clientes PF': '#d946ef',    // Fuchsia
};

interface CSIndicator {
  id: string;
  name: string;
  weight: number;
  target: number;
  realized: number;
}

type View = 'premissas' | 'dashboard' | 'estrutura_ideal' | 'operational' | 'executivos' | 'low_touch' | 'organograma' | 'tres_papeis' | 'performance_cs' | 'plano_a';

export default function App() {
  const data = useMemo(() => getDashboardData(), []);
  const [currentView, setCurrentView] = useState<View>('premissas');
  const [csIndicators, setCsIndicators] = useState<CSIndicator[]>(() => {
    try {
      const saved = localStorage.getItem('cs_indicators');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [
      { id: 'engajamento', name: 'Engajamento (DAU/MAU)', weight: 0.25, target: 80, realized: 75 },
      { id: 'features', name: 'Adoção features (DAU/MAU)', weight: 0.25, target: 60, realized: 52 },
      { id: 'nao_uso', name: 'Não-uso (NAU)', weight: 0.25, target: 90, realized: 85 },
      { id: 'nps', name: 'NPS Operacional', weight: 0.20, target: 50, realized: 42 },
    ];
  });
  const [isSizingExpanded, setIsSizingExpanded] = useState(true);
  const [isOrganogramaExpanded, setIsOrganogramaExpanded] = useState(true);
  const [salesHCState, setSalesHCState] = useState<Record<string, { gr: number; ev: number; gc: number }>>(() => {
    try {
      const saved = localStorage.getItem('sales_hc_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        const enriched = { ...parsed };
        Object.keys(enriched).forEach(k => {
          if (enriched[k] && typeof enriched[k] === 'object') {
            if (enriched[k].gr === undefined) enriched[k].gr = 0.0;
          }
        });
        return enriched;
      }
    } catch (_) {}
    return {
      'FINANCEIRO I': { gr: 0.0, ev: 0.5, gc: 2.0 },
      'FINANCEIRO II': { gr: 0.0, ev: 0.4, gc: 1.0 },
      'GOVERNO': { gr: 0.0, ev: 0.2, gc: 1.0 },
      'AGRO/CORP': { gr: 0.0, ev: 0.2, gc: 1.0 }
    };
  });

  const updateSalesHC = (v: string, role: 'gr' | 'ev' | 'gc', value: number) => {
    const nextState = {
      ...salesHCState,
      [v]: {
        ...salesHCState[v],
        [role]: Math.max(0, value)
      }
    };
    setSalesHCState(nextState);
    localStorage.setItem('sales_hc_state', JSON.stringify(nextState));
    if (user) {
      globalSettingsService.saveGlobalSettings({
        sales_hc_state: JSON.stringify(nextState)
      }).catch(console.error);
    }
  };
  const [selectedVerticals, setSelectedVerticals] = useState<Vertical[]>([
    'Financeiro I',
    'Financeiro II',
    'Governo',
    'Agro/Corp',
    'Clientes PF'
  ]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isTopClientsVisible, setIsTopClientsVisible] = useState<boolean>(() => {
    return localStorage.getItem('isTopClientsVisible') === 'true';
  });
  const [expandedDetailVerticals, setExpandedDetailVerticals] = useState<Record<string, boolean>>({});

  const toggleTopClientsVisible = () => {
    setIsTopClientsVisible(prev => {
      const next = !prev;
      localStorage.setItem('isTopClientsVisible', String(next));
      return next;
    });
  };

  const toggleDetailVertical = (v: string) => {
    setExpandedDetailVerticals(prev => ({
      ...prev,
      [v]: !prev[v]
    }));
  };

  const isAllSelected = selectedVerticals.length === 5;

  const toggleVerticalSelection = (v: Vertical) => {
    setSelectedVerticals((prev) => {
      if (prev.includes(v)) {
        if (prev.length === 1) return prev; // Do not empty
        return prev.filter((item) => item !== v);
      } else {
        return [...prev, v];
      }
    });
  };

  const selectAllVerticals = () => {
    setSelectedVerticals(['Financeiro I', 'Financeiro II', 'Governo', 'Agro/Corp', 'Clientes PF']);
  };

  const [hcOperational, setHcOperational] = useState<string>(() => {
    return localStorage.getItem('hc_operational') || '0';
  });
  const [isHcOperationalSaving, setIsHcOperationalSaving] = useState(false);

   const [hcVendas, setHcVendas] = useState<string>(() => {
    return localStorage.getItem('hc_vendas') || '0';
  });
  const [isHcVendasSaving, setIsHcVendasSaving] = useState(false);

  const [hcLiderVertical, setHcLiderVertical] = useState<string>(() => {
    return localStorage.getItem('hc_lider_vertical') || '5.0';
  });
  const [isHcLiderVerticalSaving, setIsHcLiderVerticalSaving] = useState(false);

  const [hcLowTouch, setHcLowTouch] = useState<string>(() => {
    return localStorage.getItem('hc_low_touch') || '1.0';
  });
  const [isHcLowTouchSaving, setIsHcLowTouchSaving] = useState(false);

  const [hcLowTouchAtual, setHcLowTouchAtual] = useState<string>(() => {
    return localStorage.getItem('hc_low_touch_atual') || '1.0';
  });
  const [isHcLowTouchAtualSaving, setIsHcLowTouchAtualSaving] = useState(false);

  const saveHcLowTouch = async (val?: string) => {
    const targetVal = val !== undefined ? val : hcLowTouch;
    setIsHcLowTouchSaving(true);
    localStorage.setItem('hc_low_touch', targetVal);
    try {
      if (user) {
        await globalSettingsService.saveGlobalSettings({ hc_low_touch: targetVal });
      }
    } catch (err) {
      console.error('Error saving hc_low_touch to Firestore:', err);
    } finally {
      setTimeout(() => {
        setIsHcLowTouchSaving(false);
      }, 1000);
    }
  };

  const saveHcLowTouchAtual = async (val?: string) => {
    const targetVal = val !== undefined ? val : hcLowTouchAtual;
    setIsHcLowTouchAtualSaving(true);
    localStorage.setItem('hc_low_touch_atual', targetVal);
    try {
      if (user) {
        await globalSettingsService.saveGlobalSettings({ hc_low_touch_atual: targetVal });
      }
    } catch (err) {
      console.error('Error saving hc_low_touch_atual to Firestore:', err);
    } finally {
      setTimeout(() => {
        setIsHcLowTouchAtualSaving(false);
      }, 1000);
    }
  };

  const [planoAHcHelpDesk, setPlanoAHcHelpDesk] = useState<string>(() => {
    return localStorage.getItem('planoa_hc_helpdesk') || '3.0';
  });
  const [isPlanoAHcHelpDeskSaving, setIsPlanoAHcHelpDeskSaving] = useState(false);

  const [planoAHcSdrBdr, setPlanoAHcSdrBdr] = useState<string>(() => {
    return localStorage.getItem('planoa_hc_sdr_bdr') || '4.0';
  });
  const [isPlanoAHcSdrBdrSaving, setIsPlanoAHcSdrBdrSaving] = useState(false);

  const [planoAHcAtendimentoLeader, setPlanoAHcAtendimentoLeader] = useState<string>(() => {
    return localStorage.getItem('planoa_hc_atendimento_leader') || '1.0';
  });
  const [isPlanoAHcAtendimentoLeaderSaving, setIsPlanoAHcAtendimentoLeaderSaving] = useState(false);

  const savePlanoAHcHelpDesk = async (val?: string) => {
    const targetVal = val !== undefined ? val : planoAHcHelpDesk;
    setIsPlanoAHcHelpDeskSaving(true);
    localStorage.setItem('planoa_hc_helpdesk', targetVal);
    try {
      if (user) {
        await globalSettingsService.saveGlobalSettings({ planoa_hc_helpdesk: targetVal });
      }
    } catch (err) {
      console.error('Error saving planoa_hc_helpdesk to Firestore:', err);
    } finally {
      setTimeout(() => {
        setIsPlanoAHcHelpDeskSaving(false);
      }, 1000);
    }
  };

  const savePlanoAHcSdrBdr = async (val?: string) => {
    const targetVal = val !== undefined ? val : planoAHcSdrBdr;
    setIsPlanoAHcSdrBdrSaving(true);
    localStorage.setItem('planoa_hc_sdr_bdr', targetVal);
    try {
      if (user) {
        await globalSettingsService.saveGlobalSettings({ planoa_hc_sdr_bdr: targetVal });
      }
    } catch (err) {
      console.error('Error saving planoa_hc_sdr_bdr to Firestore:', err);
    } finally {
      setTimeout(() => {
        setIsPlanoAHcSdrBdrSaving(false);
      }, 1000);
    }
  };

  const savePlanoAHcAtendimentoLeader = async (val?: string) => {
    const targetVal = val !== undefined ? val : planoAHcAtendimentoLeader;
    setIsPlanoAHcAtendimentoLeaderSaving(true);
    localStorage.setItem('planoa_hc_atendimento_leader', targetVal);
    try {
      if (user) {
        await globalSettingsService.saveGlobalSettings({ planoa_hc_atendimento_leader: targetVal });
      }
    } catch (err) {
      console.error('Error saving planoa_hc_atendimento_leader to Firestore:', err);
    } finally {
      setTimeout(() => {
        setIsPlanoAHcAtendimentoLeaderSaving(false);
      }, 1000);
    }
  };

  const [planoAState, setPlanoAState] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem('planoa_state');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [isPlanoAStateSaving, setIsPlanoAStateSaving] = useState(false);

  const savePlanoAState = async (newState: Record<string, string>) => {
    setIsPlanoAStateSaving(true);
    localStorage.setItem('planoa_state', JSON.stringify(newState));
    try {
      if (user) {
        await globalSettingsService.saveGlobalSettings({ planoa_state: JSON.stringify(newState) });
      }
    } catch (err) {
      console.error('Error saving planoa_state to Firestore:', err);
    } finally {
      setTimeout(() => {
        setIsPlanoAStateSaving(false);
      }, 800);
    }
  };

  const saveHcOperational = async () => {
    setIsHcOperationalSaving(true);
    localStorage.setItem('hc_operational', hcOperational);
    try {
      if (user) {
        await globalSettingsService.saveGlobalSettings({ hc_operational: hcOperational });
      }
    } catch (err) {
      console.error('Error saving hc_operational to Firestore:', err);
    } finally {
      setTimeout(() => {
        setIsHcOperationalSaving(false);
      }, 1000);
    }
  };

  const saveHcLiderVertical = async (val?: string) => {
    const targetVal = val !== undefined ? val : hcLiderVertical;
    setIsHcLiderVerticalSaving(true);
    localStorage.setItem('hc_lider_vertical', targetVal);
    try {
      if (user) {
        await globalSettingsService.saveGlobalSettings({ hc_lider_vertical: targetVal });
      }
    } catch (err) {
      console.error('Error saving hc_lider_vertical to Firestore:', err);
    } finally {
      setTimeout(() => {
        setIsHcLiderVerticalSaving(false);
      }, 1000);
    }
  };

  const saveHcVendas = async () => {
    setIsHcVendasSaving(true);
    localStorage.setItem('hc_vendas', hcVendas);
    try {
      if (user) {
        await globalSettingsService.saveGlobalSettings({ hc_vendas: hcVendas });
      }
    } catch (err) {
      console.error('Error saving hc_vendas to Firestore:', err);
    } finally {
      setTimeout(() => {
        setIsHcVendasSaving(false);
      }, 1000);
    }
  };

  useEffect(() => {
    if (currentView === 'operational' || currentView === 'executivos' || currentView === 'low_touch') {
      setIsSizingExpanded(true);
    }
  }, [currentView]);
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
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
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
        uid: 'session-' + Math.random().toString(36).substr(2, 9)
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
    'Clientes PF': { suporteTreinamento: 1, relacionamento: 2, gestaoContratual: 1, capacidadeVisitasPresenciaisMes: 0, capacidadeContatosRemotosMes: 0, execCapacity: 30 },
  };

  const initialParams: Record<Vertical, VerticalOperationalParams> = {
    'Financeiro I': { visitasAno: 1, contatosRemotosAno: 1, percentDesuso: 15, percentRemotos: 60, percentNaoAcessiveis: 5 },
    'Financeiro II': { visitasAno: 0.5, contatosRemotosAno: 2, percentDesuso: 20, percentRemotos: 70, percentNaoAcessiveis: 10 },
    'Governo': { visitasAno: 1.5, contatosRemotosAno: 1, percentDesuso: 10, percentRemotos: 30, percentNaoAcessiveis: 20 },
    'Agro/Corp': { visitasAno: 1, contatosRemotosAno: 1.5, percentDesuso: 25, percentRemotos: 80, percentNaoAcessiveis: 15 },
    'Clientes PF': { visitasAno: 0, contatosRemotosAno: 0, percentDesuso: 0, percentRemotos: 0, percentNaoAcessiveis: 0 },
  };

  const [opSettings, setOpSettings] = useState<Record<Vertical, OperationalSettings>>(() => {
    try {
      const saved = localStorage.getItem('op_settings');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return initialOpSettings;
  });
  const [opParams, setOpParams] = useState<Record<Vertical, VerticalOperationalParams>>(() => {
    try {
      const saved = localStorage.getItem('op_params');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return initialParams;
  });

  // Helper utility to uniquely identify customers without generic auto-increment IDs
  const getClientKey = (client: { name: string; vertical?: string; revenue: number }) => {
    return `${client.vertical || ''}_____${client.name}_____${client.revenue}`;
  };

  const [promotedLowTouchKeys, setPromotedLowTouchKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('promoted_low_touch_keys');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleTogglePromotion = async (client: { name: string; vertical?: string; revenue: number }) => {
    const clientKey = getClientKey(client);
    let updatedKeys: string[];
    if (promotedLowTouchKeys.includes(clientKey)) {
      updatedKeys = promotedLowTouchKeys.filter(k => k !== clientKey);
    } else {
      updatedKeys = [...promotedLowTouchKeys, clientKey];
    }
    setPromotedLowTouchKeys(updatedKeys);
    localStorage.setItem('promoted_low_touch_keys', JSON.stringify(updatedKeys));
    
    // Sync with Firebase if user is logged in
    if (user) {
      try {
        await globalSettingsService.saveGlobalSettings({
          promoted_low_touch: JSON.stringify(updatedKeys)
        });
      } catch (err) {
        console.error('Error saving promoted_low_touch to Firestore:', err);
      }
    }
  };

  // Firestore Loading Effect with Real-Time Synchronization
  useEffect(() => {
    if (!user) return;

    setIsSyncing(true);
    let loadedVerticals = false;
    let loadedGlobal = false;

    const checkFirstLoadComplete = () => {
      if (loadedVerticals && loadedGlobal) {
        setIsSyncing(false);
      }
    };

    // Real-time listener for Vertical Data
    const unsubVerticals = verticalDataService.subscribeAll(
      (vData) => {
        if (Object.keys(vData).length > 0) {
          const newOpSettings = { ...initialOpSettings };
          const newOpParams = { ...initialParams };

          (Object.keys(vData) as Vertical[]).forEach((v) => {
            if (vData[v].settings) newOpSettings[v] = vData[v].settings;
            if (vData[v].params) newOpParams[v] = vData[v].params;
          });

          setOpSettings(prev => {
            // Only update if there has actual changes to avoid losing local typing state focus unnecessary
            if (JSON.stringify(prev) !== JSON.stringify(newOpSettings)) {
              localStorage.setItem('op_settings', JSON.stringify(newOpSettings));
              return newOpSettings;
            }
            return prev;
          });

          setOpParams(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(newOpParams)) {
              localStorage.setItem('op_params', JSON.stringify(newOpParams));
              return newOpParams;
            }
            return prev;
          });
        }
        loadedVerticals = true;
        checkFirstLoadComplete();
      },
      (error) => {
        console.error('Failed to subscribe to verticalData:', error);
        loadedVerticals = true;
        checkFirstLoadComplete();
      }
    );

    // Real-time listener for Global Settings
    const unsubGlobal = globalSettingsService.subscribeGlobalSettings(
      (gSettings) => {
        if (gSettings) {
          if (gSettings.hc_operational !== undefined) {
            setHcOperational((prev) => {
              if (prev !== gSettings.hc_operational) {
                localStorage.setItem('hc_operational', gSettings.hc_operational);
                return gSettings.hc_operational;
              }
              return prev;
            });
          }
          if (gSettings.hc_vendas !== undefined) {
            setHcVendas((prev) => {
              if (prev !== gSettings.hc_vendas) {
                localStorage.setItem('hc_vendas', gSettings.hc_vendas);
                return gSettings.hc_vendas;
              }
              return prev;
            });
          }
          if (gSettings.hc_lider_vertical !== undefined) {
            setHcLiderVertical((prev) => {
              if (prev !== gSettings.hc_lider_vertical) {
                localStorage.setItem('hc_lider_vertical', gSettings.hc_lider_vertical);
                return gSettings.hc_lider_vertical;
              }
              return prev;
            });
          }
          if (gSettings.hc_low_touch !== undefined) {
            setHcLowTouch((prev) => {
              if (prev !== gSettings.hc_low_touch) {
                localStorage.setItem('hc_low_touch', gSettings.hc_low_touch);
                return gSettings.hc_low_touch;
              }
              return prev;
            });
          }
          if (gSettings.hc_low_touch_atual !== undefined) {
            setHcLowTouchAtual((prev) => {
              if (prev !== gSettings.hc_low_touch_atual) {
                localStorage.setItem('hc_low_touch_atual', gSettings.hc_low_touch_atual);
                return gSettings.hc_low_touch_atual;
              }
              return prev;
            });
          }
          if (gSettings.promoted_low_touch !== undefined) {
            try {
              const parsedKeys = JSON.parse(gSettings.promoted_low_touch);
              if (Array.isArray(parsedKeys)) {
                setPromotedLowTouchKeys((prev) => {
                  if (JSON.stringify(prev) !== JSON.stringify(parsedKeys)) {
                    localStorage.setItem('promoted_low_touch_keys', gSettings.promoted_low_touch);
                    return parsedKeys;
                  }
                  return prev;
                });
              }
            } catch (e) {
              console.error('Failed to parse promoted_low_touch:', e);
            }
          }
          if (gSettings.sales_hc_state !== undefined) {
            try {
              const parsedSalesHC = JSON.parse(gSettings.sales_hc_state);
              if (parsedSalesHC && typeof parsedSalesHC === 'object') {
                const enriched = { ...parsedSalesHC };
                Object.keys(enriched).forEach((k) => {
                  if (enriched[k] && typeof enriched[k] === 'object') {
                    if (enriched[k].gr === undefined) enriched[k].gr = 0.0;
                  }
                });
                setSalesHCState((prev) => {
                  if (JSON.stringify(prev) !== JSON.stringify(enriched)) {
                    localStorage.setItem('sales_hc_state', JSON.stringify(enriched));
                    return enriched;
                  }
                  return prev;
                });
              }
            } catch (e) {
              console.error('Failed to parse sales_hc_state:', e);
            }
          }
          if (gSettings.cs_indicators !== undefined) {
            try {
              const parsedCSIndicators = JSON.parse(gSettings.cs_indicators);
              if (Array.isArray(parsedCSIndicators)) {
                setCsIndicators((prev) => {
                  if (JSON.stringify(prev) !== JSON.stringify(parsedCSIndicators)) {
                    localStorage.setItem('cs_indicators', gSettings.cs_indicators);
                    return parsedCSIndicators;
                  }
                  return prev;
                });
              }
            } catch (e) {
              console.error('Failed to parse cs_indicators:', e);
            }
          }
          if (gSettings.planoa_hc_helpdesk !== undefined) {
            setPlanoAHcHelpDesk((prev) => {
              if (prev !== gSettings.planoa_hc_helpdesk) {
                localStorage.setItem('planoa_hc_helpdesk', gSettings.planoa_hc_helpdesk);
                return gSettings.planoa_hc_helpdesk;
              }
              return prev;
            });
          }
          if (gSettings.planoa_hc_sdr_bdr !== undefined) {
            setPlanoAHcSdrBdr((prev) => {
              if (prev !== gSettings.planoa_hc_sdr_bdr) {
                localStorage.setItem('planoa_hc_sdr_bdr', gSettings.planoa_hc_sdr_bdr);
                return gSettings.planoa_hc_sdr_bdr;
              }
              return prev;
            });
          }
          if (gSettings.planoa_hc_atendimento_leader !== undefined) {
            setPlanoAHcAtendimentoLeader((prev) => {
              if (prev !== gSettings.planoa_hc_atendimento_leader) {
                localStorage.setItem('planoa_hc_atendimento_leader', gSettings.planoa_hc_atendimento_leader);
                return gSettings.planoa_hc_atendimento_leader;
              }
              return prev;
            });
          }
          if (gSettings.planoa_state !== undefined) {
            try {
              const parsed = JSON.parse(gSettings.planoa_state);
              if (parsed && typeof parsed === 'object') {
                setPlanoAState((prev) => {
                  if (JSON.stringify(prev) !== JSON.stringify(parsed)) {
                    localStorage.setItem('planoa_state', gSettings.planoa_state);
                    return parsed;
                  }
                  return prev;
                });
              }
            } catch (e) {
              console.error('Failed to parse planoa_state:', e);
            }
          }
        }
        loadedGlobal = true;
        checkFirstLoadComplete();
      },
      (error) => {
        console.error('Failed to subscribe to global settings:', error);
        loadedGlobal = true;
        checkFirstLoadComplete();
      }
    );

    return () => {
      if (unsubVerticals) unsubVerticals();
      if (unsubGlobal) unsubGlobal();
    };
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

  const [expandedVerticals, setExpandedVerticals] = useState<Record<Vertical, boolean>>({
    'Financeiro I': false,
    'Financeiro II': false,
    'Governo': false,
    'Agro/Corp': false,
    'Clientes PF': false,
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
      variableHC: number,
      gr: number,
      ev: number,
      gc: number
    }> = {};

    const verticalMap: Record<string, Vertical> = {
      'FINANCEIRO I': 'Financeiro I',
      'FINANCEIRO II': 'Financeiro II',
      'GOVERNO': 'Governo',
      'AGRO/CORP': 'Agro/Corp'
    };

    verticals.forEach(v => {
      let clients = customers.filter(c => (c.vertical || '').toUpperCase().trim() === v);
      // Inclui contas com MRR > 10k OU contas promovidas manualmente do low-touch
      clients = clients.filter(c => c.revenue > 10000 || promotedLowTouchKeys.includes(getClientKey(c)));
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
      
      // GR, EV and GC default if state does not have it, otherwise from state
      const gr = salesHCState[v]?.gr !== undefined ? salesHCState[v].gr : 0.0;
      const ev = salesHCState[v]?.ev !== undefined ? salesHCState[v].ev : variableHC;
      const gc = salesHCState[v]?.gc !== undefined ? salesHCState[v].gc : fixedHC;

      // "A soma de GR, EV e GC, por vertical, reflete no total HC de cada vertical."
      const headcount = gr + ev + gc;

      result[v] = {
        clients: clients as any, // Cast for compatibility with SalesClient type
        totalRevenue,
        headcount,
        fixedHC,
        variableHC,
        gr,
        ev,
        gc
      };
    });

    return result;
  }, [opSettings, salesHCState, promotedLowTouchKeys]);

  const salesTotals = useMemo(() => {
    const values = Object.values(filteredSalesData) as Array<{ 
      clients: SalesClient[], 
      totalRevenue: number, 
      headcount: number 
    }>;
    const totalClients = values.reduce((sum, v) => sum + v.clients.length, 0);
    const totalRevenue = values.reduce((sum, v) => sum + v.totalRevenue, 0);
    const totalHeadcount = values.reduce((sum, v) => sum + v.headcount, 0);
    
    // Percentages based on actual dataset reference (excluindo a carteira PF)
    const grandTotalAccounts = 1419;
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

  const [expandedLowTouchVerticals, setExpandedLowTouchVerticals] = useState<Record<string, boolean>>({
    'FINANCEIRO I': false,
    'FINANCEIRO II': false,
    'GOVERNO': false,
    'AGRO/CORP': false,
    'CLIENTES PF': false,
  });

  const [expandedPromotedList, setExpandedPromotedList] = useState(true);

  const toggleLowTouchVertical = (v: string) => {
    setExpandedLowTouchVerticals(prev => ({ ...prev, [v]: !prev[v] }));
  };

  const renderLowTouch = () => {
    const allLowTouchClients = customers
      .filter(client => client.revenue <= 10000.01) // Handle threshold precisely
      .sort((a, b) => b.revenue - a.revenue);

    const lowTouchClients = allLowTouchClients.filter(client => !promotedLowTouchKeys.includes(getClientKey(client)));
    const promotedClients = allLowTouchClients.filter(client => promotedLowTouchKeys.includes(getClientKey(client)));

    const groupedClients: Record<string, any[]> = {
      'FINANCEIRO I': [],
      'FINANCEIRO II': [],
      'GOVERNO': [],
      'AGRO/CORP': [],
      'CLIENTES PF': []
    };

    lowTouchClients.forEach(client => {
      const v = (client.vertical || '').toUpperCase().trim();
      if (groupedClients[v]) {
        groupedClients[v].push(client);
      }
    });

    const verticalOrder = ['FINANCEIRO I', 'FINANCEIRO II', 'GOVERNO', 'AGRO/CORP', 'CLIENTES PF'];

    const totalLowTouchRevenue = lowTouchClients.reduce((acc, c) => acc + c.revenue, 0);
    const totalLowTouchUsers = lowTouchClients.reduce((acc, c) => acc + c.users, 0);

    // Separando o que é PJ e o que é Cliente PF
    const pjClients = lowTouchClients.filter(client => {
      const v = (client.vertical || '').toUpperCase().trim();
      return v === 'FINANCEIRO I' || v === 'FINANCEIRO II' || v === 'GOVERNO' || v === 'AGRO/CORP';
    });
    
    const pfClients = lowTouchClients.filter(client => {
      const v = (client.vertical || '').toUpperCase().trim();
      return v === 'CLIENTES PF';
    });

    const pjCount = pjClients.length;
    const pjRevenue = pjClients.reduce((acc, c) => acc + c.revenue, 0);
    const pjUsers = pjClients.reduce((acc, c) => acc + c.users, 0);

    const pfCount = pfClients.length;
    const pfRevenue = pfClients.reduce((acc, c) => acc + c.revenue, 0);
    const pfUsers = pfClients.reduce((acc, c) => acc + c.users, 0);

    return (
      <div className="flex flex-col flex-1 space-y-6 min-h-0 overflow-hidden">
        <header className="flex justify-between items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-6 shrink-0 shadow-2xl">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black uppercase tracking-tighter bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              Carteira Low-Touch (MRR R$ 10k)
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
              <span className="text-yellow-400 font-black bg-yellow-400/10 px-2 py-1 rounded-[6px] border border-yellow-400/20 inline-block">
                {formatNumber(lowTouchClients.length)} Clientes identificados com MRR abaixo de R$ 10.000,00
              </span>
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => {
                const allExpanded = Object.values(expandedLowTouchVerticals).every(v => v);
                const newState = { ...expandedLowTouchVerticals };
                Object.keys(newState).forEach(k => newState[k] = !allExpanded);
                setExpandedLowTouchVerticals(newState);
              }}
              className="bg-slate-800/50 hover:bg-slate-800 px-4 py-2 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center"
            >
              {Object.values(expandedLowTouchVerticals).every(v => v) ? (
                <>
                  <ChevronUp className="w-3 h-3 mr-2" />
                  Recolher Tudo
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 mr-2" />
                  Expandir Tudo
                </>
              )}
            </button>
            <div className="bg-slate-900/50 px-4 py-2 rounded-xl border border-white/5">
              <span className="text-[10px] font-bold text-slate-500 uppercase block leading-none mb-1">Total Clientes</span>
              <span className="text-xl font-black text-white">{formatNumber(lowTouchClients.length)}</span>
            </div>
            <div className="bg-slate-900/50 px-4 py-2 rounded-xl border border-white/5">
              <span className="text-[10px] font-bold text-slate-500 uppercase block leading-none mb-1">Total MRR</span>
              <span className="text-xl font-black text-emerald-400">{formatCurrency(totalLowTouchRevenue)}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto custom-scrollbar pr-2 pb-6 scroll-smooth space-y-6">
          
          {/* QUADRO "CONSOLIDADO LOW-TOUCH" TRAZIDO PARA O TOPO */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-white/10 rounded-[2rem] p-6 md:p-8 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none rotate-12">
              <BarChart3 className="w-60 h-60 text-white" />
            </div>
            
            <div className="relative z-10 space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-5">
                <div className="flex flex-col space-y-2 text-left">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Consolidado Low-Touch</h3>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">
                    Métricas acumuladas com divisão detalhada entre Pessoa Jurídica (PJ) e Clientes PF.
                  </p>
                </div>
                
                <div className="flex items-center bg-slate-950/80 rounded-xl border border-white/5 p-2 px-6 shadow-xl space-x-6">
                  <div className="flex flex-col border-r border-white/5 pr-6 py-1 text-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Ticket Médio Geral</span>
                    <span className="text-sm font-mono font-black text-white">
                      {formatCurrency(lowTouchClients.length > 0 ? totalLowTouchRevenue / lowTouchClients.length : 0)}
                    </span>
                  </div>
                  <div className="flex flex-col pl-6 py-1 text-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Usuários / Cliente</span>
                    <span className="text-sm font-mono font-black text-white">
                      {(lowTouchClients.length > 0 ? totalLowTouchUsers / lowTouchClients.length : 0).toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Headcount Configuration for Low-Touch */}
              <div className="bg-slate-950/65 rounded-2xl border border-white/5 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-inner">
                <div className="space-y-1 max-w-xl">
                  <h4 className="text-sm font-black text-white uppercase tracking-tight flex items-center">
                    <Users className="w-4 h-4 text-sky-400 mr-2" />
                    Sizing de Headcount dedicado p/ Low-Touch
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                    Ajuste o headcount necessário estrutural para o atendimento destas contas low-touch. Esse valor atualiza dinamicamente o organograma consolidado e a calculadora de estrutura de contratação/sizing ideal.
                  </p>
                </div>
                
                <div className="flex items-center space-x-3 shrink-0 bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Headcount Necessário:</span>
                  <div className="inline-flex items-center space-x-1 border border-white/5 bg-slate-950 rounded-lg p-0.5 shadow-inner">
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseFloat(hcLowTouch || '0');
                        const next = Math.max(0, current - 0.5);
                        setHcLowTouch(next.toFixed(1));
                        saveHcLowTouch(next.toFixed(1));
                      }}
                      className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 text-xs font-black transition-all border border-white/5 flex items-center justify-center hover:text-white"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={hcLowTouch}
                      onChange={(e) => {
                        setHcLowTouch(e.target.value);
                        saveHcLowTouch(e.target.value);
                      }}
                      className="w-12 h-6 text-center bg-transparent text-white font-mono text-xs font-black outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseFloat(hcLowTouch || '0');
                        const next = current + 0.5;
                        setHcLowTouch(next.toFixed(1));
                        saveHcLowTouch(next.toFixed(1));
                      }}
                      className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 text-xs font-black transition-all border border-white/5 flex items-center justify-center hover:text-white"
                    >
                      +
                    </button>
                  </div>
                  {isHcLowTouchSaving && (
                    <span className="text-[9px] font-black uppercase text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded animate-pulse">
                      Salvando...
                    </span>
                  )}
                </div>
              </div>

              {/* Grid de Divisão PJ vs PF */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Card 1: Geral Consolidado */}
                <div className="bg-slate-900/40 p-6 rounded-2xl border border-white/5 flex flex-col justify-between text-left shadow-lg animate-none">
                  <div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Total Consolidado</span>
                    <h4 className="text-lg font-black text-white uppercase tracking-tight">Carteira Geral</h4>
                  </div>
                  <div className="mt-5 space-y-3">
                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <span className="text-xs text-slate-400 font-semibold">Volume de Contas</span>
                      <span className="text-sm font-mono font-black text-white">{formatNumber(lowTouchClients.length)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <span className="text-xs text-slate-400 font-semibold">Volume MRR</span>
                      <span className="text-sm font-mono font-black text-emerald-400">{formatCurrency(totalLowTouchRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-xs text-slate-400 font-semibold">Total Usuários</span>
                      <span className="text-sm font-mono font-black text-indigo-400">{formatNumber(totalLowTouchUsers)}</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Pessoa Jurídica (PJ) */}
                <div className="bg-sky-950/20 p-6 rounded-2xl border border-sky-500/10 flex flex-col justify-between text-left shadow-lg animate-none">
                  <div>
                    <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest block mb-1">Pessoa Jurídica (PJ)</span>
                    <h4 className="text-lg font-black text-white uppercase tracking-tight">04 Verticais</h4>
                  </div>
                  <div className="mt-5 space-y-3">
                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <span className="text-xs text-slate-400 font-semibold">Contas PJ</span>
                      <span className="text-sm font-mono font-black text-white">{formatNumber(pjCount)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <span className="text-xs text-slate-400 font-semibold">Faturamento MRR</span>
                      <span className="text-sm font-mono font-black text-sky-400">{formatCurrency(pjRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-xs text-slate-400 font-semibold">Ticket Médio PJ</span>
                      <span className="text-sm font-mono font-black text-slate-300">
                        {formatCurrency(pjCount > 0 ? pjRevenue / pjCount : 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Clientes PF */}
                <div className="bg-purple-950/20 p-6 rounded-2xl border border-purple-500/10 flex flex-col justify-between text-left shadow-lg animate-none">
                  <div>
                    <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest block mb-1">Pessoa Física (PF)</span>
                    <h4 className="text-lg font-black text-white uppercase tracking-tight">Carteira Pessoa Física</h4>
                  </div>
                  <div className="mt-5 space-y-3">
                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <span className="text-xs text-slate-400 font-semibold">Contas PF</span>
                      <span className="text-sm font-mono font-black text-white">{formatNumber(pfCount)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <span className="text-xs text-slate-400 font-semibold">Faturamento MRR</span>
                      <span className="text-sm font-mono font-black text-purple-400">{formatCurrency(pfRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-xs text-slate-400 font-semibold">Ticket Médio PF</span>
                      <span className="text-sm font-mono font-black text-slate-300">
                        {`R$ ${(pfCount > 0 ? (pfRevenue / pfCount) / 1000 : 0).toFixed(1).replace('.', ',')}K`}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>

          {/* LISTA DAS VERTICAIS LOGO ABAIXO COM A QUINTA VERTICAL INCLUÍDA */}
          <div className="grid grid-cols-1 gap-6">
            {verticalOrder.map(vName => {
              const clients = groupedClients[vName] || [];
              if (clients.length === 0) return null;
              const isExpanded = expandedLowTouchVerticals[vName];

              return (
                <motion.div 
                  key={vName} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden flex flex-col shadow-xl"
                >
                  <button 
                    onClick={() => toggleLowTouchVertical(vName)}
                    className="bg-slate-950/50 p-6 border-b border-white/5 flex items-center justify-between w-full hover:bg-slate-950/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        vName === 'CLIENTES PF' ? "bg-purple-500/10" : "bg-sky-500/10"
                      )}>
                        <Users className={cn("w-5 h-5", vName === 'CLIENTES PF' ? "text-purple-400" : "text-sky-400")} />
                      </div>
                      <div className="text-left">
                        <h2 className="text-lg font-black text-white uppercase tracking-tight">{vName}</h2>
                        <div className="flex items-center space-x-3 mt-0.5">
                          <p className="text-[10px] font-bold text-sky-500 uppercase tracking-widest">{clients.length} Contas</p>
                          <span className="text-slate-700 font-black text-[10px]">•</span>
                          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{formatCurrency(clients.reduce((acc, c) => acc + c.revenue, 0))}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 group-hover:border-white/10 transition-colors">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isExpanded ? 'Recolher' : 'Expandir'}</span>
                      <div className={cn("transition-transform duration-300", isExpanded && "rotate-180")}>
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="p-0 overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                              <tr className="bg-slate-950/30">
                                <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 w-12 text-center">#</th>
                                <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">Cliente</th>
                                <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 text-right text-sky-400">MRR</th>
                                <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 text-right">Usuários</th>
                                <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 text-center w-40">Direcionamento</th>
                              </tr>
                            </thead>
                            <tbody>
                              {clients.map((client, idx) => (
                                <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                                  <td className="px-6 py-3 border-b border-white/5 text-center text-[10px] font-black text-slate-600">
                                    {idx + 1}
                                  </td>
                                  <td className="px-6 py-3 border-b border-white/5">
                                    <span className="text-xs font-black text-white uppercase group-hover:text-sky-400 transition-colors block truncate max-w-md">
                                      {client.name}
                                    </span>
                                  </td>
                                  <td className="px-6 py-3 border-b border-white/5 text-right font-mono text-xs font-bold text-slate-300">
                                    {formatCurrency(client.revenue)}
                                  </td>
                                  <td className="px-6 py-3 border-b border-white/5 text-right font-mono text-xs font-bold text-slate-400">
                                    {formatNumber(client.users)}
                                  </td>
                                  <td className="px-6 py-3 border-b border-white/5 text-center">
                                    {vName !== 'CLIENTES PF' ? (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleTogglePromotion(client);
                                        }}
                                        className="h-7 px-2.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/25 text-sky-400 border border-sky-500/20 text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center mx-auto hover:scale-105 active:scale-95 cursor-pointer"
                                        title="Mover conta para o dimensionamento de vendas (EV/GC)"
                                      >
                                        <ArrowUpRight className="w-3 w-3 mr-1 shrink-0" />
                                        Mover Vendas
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-slate-600 font-bold uppercase select-none">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* CLIENTES PROMOVIDOS INTEGRADOS */}
          {promotedClients.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/25 border border-indigo-500/20 rounded-3xl overflow-hidden flex flex-col shadow-xl mt-6 relative"
            >
              <div className="absolute top-0 right-0 p-6 opacity-[0.05] pointer-events-none">
                <ShieldCheck className="w-24 h-24 text-indigo-400" />
              </div>

              <button 
                onClick={() => setExpandedPromotedList(!expandedPromotedList)}
                className="bg-indigo-950/20 p-6 border-b border-indigo-500/20 flex items-center justify-between w-full hover:bg-indigo-950/30 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <TrendingUp className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-indigo-300 uppercase tracking-tight">Clientes Promovidos para o Time de Vendas</h2>
                    <div className="flex items-center space-x-3 mt-0.5">
                      <p className="text-[10px] font-bold text-indigo-450 uppercase tracking-widest">{promotedClients.length} Contas Promovidas</p>
                      <span className="text-indigo-800 font-black text-[10px]">•</span>
                      <p className="text-[10px] font-bold text-emerald-450 uppercase tracking-widest">
                        {formatCurrency(promotedClients.reduce((acc, c) => acc + c.revenue, 0))} Total Abatido
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors">
                  <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">{expandedPromotedList ? 'Ocultar' : 'Visualizar'}</span>
                  <div className={cn("transition-transform duration-350", expandedPromotedList && "rotate-180")}>
                    <ChevronDown className="w-4 h-4 text-indigo-400" />
                  </div>
                </div>
              </button>

              <AnimatePresence>
                {expandedPromotedList && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 space-y-4">
                      <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                        Estes clientes de perfil Low-Touch foram promovidos manualmente. Suas receitas e contas foram **abatidas dos totais do Low-Touch** e **somadas nas respectivas verticais** da aba de **Time de Vendas (EV/GC)**, recalculando dinamicamente o faturamento e o headcount necessário das equipes corporativas.
                      </p>
                      
                      <div className="overflow-x-auto border border-white/5 rounded-2xl bg-slate-950/40">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                          <thead>
                            <tr className="bg-slate-950/40">
                              <th className="px-6 py-4 text-[9px] font-black text-indigo-400 uppercase tracking-widest border-b border-white/5 w-12 text-center">#</th>
                              <th className="px-6 py-4 text-[9px] font-black text-indigo-400 uppercase tracking-widest border-b border-white/5">Vertical Origem</th>
                              <th className="px-6 py-4 text-[9px] font-black text-indigo-400 uppercase tracking-widest border-b border-white/5">Cliente</th>
                              <th className="px-6 py-4 text-[9px] font-black text-indigo-400 uppercase tracking-widest border-b border-white/5 text-right text-emerald-400">MRR</th>
                              <th className="px-6 py-4 text-[9px] font-black text-indigo-400 uppercase tracking-widest border-b border-white/5 text-right">Usuários</th>
                              <th className="px-6 py-4 text-[9px] font-black text-indigo-400 uppercase tracking-widest border-b border-white/5 text-center w-40">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {promotedClients.map((client, idx) => (
                              <tr key={idx} className="group hover:bg-indigo-500/[0.03] transition-colors border-b border-white/5 last:border-0">
                                <td className="px-6 py-3 text-center text-[10px] font-black text-indigo-500">
                                  {idx + 1}
                                </td>
                                <td className="px-6 py-3">
                                  <span className="text-[10px] font-black bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-indigo-300 block w-fit uppercase">
                                    {client.vertical}
                                  </span>
                                </td>
                                <td className="px-6 py-3">
                                  <span className="text-xs font-black text-white uppercase transition-colors block truncate max-w-xs font-semibold">
                                    {client.name}
                                  </span>
                                </td>
                                <td className="px-6 py-3 text-right font-mono text-xs font-bold text-slate-300">
                                  {formatCurrency(client.revenue)}
                                </td>
                                <td className="px-6 py-3 text-right font-mono text-xs font-bold text-slate-400">
                                  {formatNumber(client.users)}
                                </td>
                                <td className="px-6 py-3 text-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTogglePromotion(client);
                                    }}
                                    className="h-7 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center mx-auto hover:scale-105 active:scale-95 cursor-pointer"
                                    title="Retornar cliente para o Low-Touch"
                                  >
                                    <Undo className="w-3 w-3 mr-1 shrink-0" />
                                    Devolver Low-Touch
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

        </div>
      </div>
    );
  };

  const renderPremissas = () => {
    return (
      <div className="flex flex-col flex-1 space-y-6 min-h-0 overflow-hidden">
        {/* Header Hero Banner */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950 p-6 md:p-8 border border-white/10 rounded-2xl shrink-0 shadow-2xl relative overflow-hidden">
          {/* Subtle Ambient Background Light */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full filter blur-[100px] -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full filter blur-[100px] -ml-20 -mb-20 pointer-events-none" />
          
          <div className="relative z-10 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full inline-block">
              Diretrizes Corporativas
            </span>
            <h1 className="text-3xl font-black uppercase tracking-tighter bg-gradient-to-r from-sky-400 via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              Premissas de Negócio e Organização
            </h1>
            <p className="text-slate-400 text-xs md:text-sm max-w-2xl font-semibold leading-relaxed">
              Consolidação das diretrizes táticas, focos operacionais e estratégias de cobertura comercial para reestruturação das equipes, expansão da receita e retenção do portfólio.
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 relative z-10 shrink-0 flex items-center bg-slate-950/60 p-4 border border-white/5 rounded-2xl space-x-4">
            <div className="text-left">
              <span className="text-[8px] font-bold text-slate-500 block uppercase font-mono">Início Previsto</span>
              <span className="text-xs font-black text-emerald-400 block mt-0.5 uppercase tracking-wide flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                julho/2026
              </span>
            </div>
            <div className="h-8 w-[1px] bg-white/10" />
            <button
              onClick={() => setCurrentView('dashboard')}
              className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 text-slate-950 hover:from-sky-400 hover:to-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-sky-500/20 active:scale-95 flex items-center space-x-2 animate-pulse"
            >
              <span>Ir para o Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Bento Grid highlighting the cards */}
        <div className="flex-1 overflow-auto custom-scrollbar pr-2 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Card 1: Modelo Baseado em Ataque e Defesa */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-slate-905/70 hover:bg-slate-900/95 border border-white/5 hover:border-sky-500/20 transition-all rounded-3xl p-6 shadow-xl flex flex-col justify-between group relative overflow-hidden"
              style={{ background: 'rgba(15, 23, 42, 0.6)' }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full filter blur-2xl group-hover:bg-sky-500/10 transition-colors pointer-events-none" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow-inner group-hover:scale-110 transition-transform">
                    <Target className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#0ea5e9] bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 px-2.5 py-0.5 rounded-full">
                    Ataque & Defesa
                  </span>
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-white group-hover:text-sky-400 transition-colors uppercase tracking-tight leading-none text-left">
                    Modelo baseado em ataque e defesa
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide text-left">
                    Atuação Tática e Separação de Esforços
                  </p>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed font-semibold text-left">
                  Bifuracação estratégica da força de vendas para expansão e retenção da base instalada.
                </p>

                <div className="border-t border-white/5 pt-4 space-y-2.5 text-left">
                  <div className="flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 mr-2.5 shrink-0" />
                    <div>
                      <span className="text-white text-xs font-black block">Força de Ataque</span>
                      <span className="text-slate-500 text-[11px] font-semibold">Incentivo absoluto para exploração de novas receitas e novos contratos – incluindo upsell, cross-sell, novos clientes.</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 mr-2.5 shrink-0" />
                    <div>
                      <span className="text-white text-xs font-black block">Estrutura de Defesa</span>
                      <span className="text-slate-500 text-[11px] font-semibold">Controle rigorosa de churn, gestão contratual, renovações/reajustes, suspensões e identificação de leads potenciais.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 text-left">
                <button
                  onClick={() => setCurrentView('tres_papeis')}
                  className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/15 hover:shadow-sky-500/25 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2 border border-sky-500/20"
                >
                  <span>Conheça os 03 papéis de Vendas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>

            {/* Card 2: Executivo de Vendas + Gerente de Contas (AM) */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-905/70 hover:bg-slate-900/95 border border-white/5 hover:border-indigo-500/20 transition-all rounded-3xl p-6 shadow-xl flex flex-col justify-between group relative overflow-hidden"
              style={{ background: 'rgba(15, 23, 42, 0.6)' }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full filter blur-2xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 px-2.5 py-0.5 rounded-full">
                    Parceria no Campo
                  </span>
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight leading-none text-left">
                    Executivo de Vendas + Gerente de Contas (AM)
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide text-left">
                    Complementaridade Executiva e Técnica
                  </p>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed font-semibold text-left">
                  Complementação operacional onde o Executivo de Vendas e o Account Manager atuam de forma coordenada para maximizar o ciclo de faturamento e expansão.
                </p>

                <div className="border-t border-white/5 pt-4 space-y-2.5 text-left">
                  <div className="flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 mr-2.5 shrink-0" />
                    <div>
                      <span className="text-white text-xs font-black block">Executivo de Vendas (EV)</span>
                      <span className="text-slate-500 text-[11px] font-semibold">Responsável por novas vendas, identificação de novas oportunidades, desenvolvimento e fechamento de novos negócios (incluindo upsell e cross-sell).</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 mt-2 mr-2.5 shrink-0" />
                    <div>
                      <span className="text-white text-xs font-black block">Gerente de Contas (AM / Farmer)</span>
                      <span className="text-slate-500 text-[11px] font-semibold">Gestão da carteira de clientes, renovações e reajustes contratuais, reversão de cancelamentos, inadimplência, suspensões e identificação de oportunidades para upsell e cross-sell.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 text-left">
                <button
                  onClick={() => setCurrentView('executivos')}
                  className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/15 hover:shadow-sky-500/25 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2 border border-sky-500/20"
                >
                  <span>Analisar Sizing de Vendas (EV/GC)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>

            {/* Card 3: Customer Success Estratégico */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-slate-905/70 hover:bg-slate-900/95 border border-white/5 hover:border-amber-500/20 transition-all rounded-3xl p-6 shadow-xl flex flex-col justify-between group relative overflow-hidden"
              style={{ background: 'rgba(15, 23, 42, 0.6)' }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full filter blur-2xl group-hover:bg-amber-500/10 transition-colors pointer-events-none" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner group-hover:scale-110 transition-transform">
                    <Zap className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/20 px-2.5 py-0.5 rounded-full">
                    Atendimento Estratégico
                  </span>
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-white group-hover:text-amber-400 transition-colors uppercase tracking-tight leading-none text-left">
                    Customer Success Estratégico
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide text-left">
                    Foco e estratégia
                  </p>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed font-semibold text-left">
                  Apoio e suporte total a operação de gestão da carteira de clientes, com direcionamento conforme vertical de atuação e saúde das contas administradas.
                </p>

                <div className="border-t border-white/5 pt-4 space-y-2 text-left">
                  <div className="flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 mr-2.5 shrink-0" />
                    <span className="text-white text-xs font-black">Foco e direcionamento estratégico:</span>
                  </div>
                  <div className="flex items-start pl-4">
                    <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 mr-2 shrink-0" />
                    <span className="text-slate-400 text-[11px] font-semibold">Aumentar engajamento</span>
                  </div>
                  <div className="flex items-start pl-4">
                    <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 mr-2 shrink-0" />
                    <span className="text-slate-400 text-[11px] font-semibold">Combate ao churn</span>
                  </div>
                  <div className="flex items-start pl-4">
                    <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 mr-2 shrink-0" />
                    <span className="text-slate-400 text-[11px] font-semibold">Identificação de leads comerciais</span>
                  </div>
                  <div className="flex items-start pl-4">
                    <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 mr-2 shrink-0" />
                    <span className="text-slate-400 text-[11px] font-semibold">Migração do terminal.</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 space-y-2 text-left">
                <button
                  onClick={() => setCurrentView('performance_cs')}
                  className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/15 hover:shadow-sky-500/25 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2 border border-sky-500/20"
                >
                  <span>Como Calcular Performance CS</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>

            {/* Card 4: Definição de Métricas por Vertical */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-905/70 hover:bg-slate-900/95 border border-white/5 hover:border-emerald-500/20 transition-all rounded-3xl p-6 shadow-xl flex flex-col justify-between group relative overflow-hidden"
              style={{ background: 'rgba(15, 23, 42, 0.6)' }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full filter blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner group-hover:scale-110 transition-transform">
                    <Scale className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/20 px-2.5 py-0.5 rounded-full">
                    Cobertura Comercial
                  </span>
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight leading-none text-left">
                    Definição de Métricas por Vertical
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide text-left">
                    Cobertura comercial baseada no perfil dos clientes
                  </p>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed font-semibold text-left">
                  Visitas presenciais e contatos remotos como premissa para manutenção e abertura de novas frentes comerciais
                </p>

                <div className="border-t border-white/5 pt-4 space-y-2.5 text-left">
                  <div className="flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 mr-2.5 shrink-0" />
                    <div>
                      <span className="text-slate-300 text-xs font-semibold leading-relaxed">Definição do sizing e perfil do time comercial pelo perfil da carteira de clientes.</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 mr-2.5 shrink-0" />
                    <div>
                      <span className="text-slate-300 text-xs font-semibold leading-relaxed">Calibração do modelo ideal vs. Modelo possível, a partir do tamanho do time</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 text-left">
                <button
                  onClick={() => setCurrentView('operational')}
                  className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/15 hover:shadow-sky-500/25 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2 border border-sky-500/20"
                >
                  <span>Analisar Sizing de CS</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>

            {/* Card 5: Revisão do Modelo de RV */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-slate-905/70 hover:bg-slate-900/95 border border-white/5 hover:border-fuchsia-500/20 transition-all rounded-3xl p-6 shadow-xl flex flex-col justify-between group relative overflow-hidden"
              style={{ background: 'rgba(15, 23, 42, 0.6)' }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/5 rounded-full filter blur-2xl group-hover:bg-fuchsia-500/10 transition-colors pointer-events-none" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 shadow-inner group-hover:scale-110 transition-transform">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#d946ef] bg-[#d946ef]/10 border border-[#d946ef]/20 px-2.5 py-0.5 rounded-full">
                    Remuneração Dinâmica
                  </span>
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-white group-hover:text-fuchsia-400 transition-colors uppercase tracking-tight leading-none text-left">
                    Adequação do Modelo de Remuneração Variável
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide text-left">
                    Modelo mais aderente ao negócio (ataque x defesa)
                  </p>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed font-semibold text-left">
                  Novo modelo mais justo, participativo e como incentivo para toda a estrutura de Vendas, respeitando a saúde financeira da companhia.
                </p>

                <div className="border-t border-white/5 pt-4 space-y-2.5 text-left">
                  <div className="flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 mt-2 mr-2.5 shrink-0" />
                    <div>
                      <span className="text-white text-xs font-bold block">Pisos flexíveis como incentivo</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 mr-2.5 shrink-0" />
                    <div>
                      <span className="text-white text-xs font-bold block">Aceleradores para incentivar antecipação de receita</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-2 mr-2.5 shrink-0" />
                    <div>
                      <span className="text-white text-xs font-bold block">Modelo de ataque, defesa e para garantir a saúde da base</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400 mt-2 mr-2.5 shrink-0" />
                    <div>
                      <span className="text-white text-xs font-bold block">Possibilidade de pagamento de bônus por negociação fechada</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 text-left">
                <a
                  href="https://rv-comercial-framework.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/15 hover:shadow-sky-500/25 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2 border border-sky-500/20 text-center"
                >
                  <span>Novo Modelo RV</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </motion.div>

            {/* Card 6: Canal de Clientes Low-Touch */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-slate-905/70 hover:bg-slate-900/95 border border-white/5 hover:border-violet-500/20 transition-all rounded-3xl p-6 shadow-xl flex flex-col justify-between group relative overflow-hidden md:col-span-2 lg:col-span-1"
              style={{ background: 'rgba(15, 23, 42, 0.6)' }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full filter blur-2xl group-hover:bg-violet-500/10 transition-colors pointer-events-none" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-inner group-hover:scale-110 transition-transform">
                    <Monitor className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 rounded-full">
                    Atendimento Massificado
                  </span>
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-white group-hover:text-violet-400 transition-colors uppercase tracking-tight leading-none text-left">
                    Canal de Clientes Low-Touch
                  </h3>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed font-semibold text-left">
                  Garantia de atendimento e monitoramento remoto e inteligente das contas de baixo ticker (low-touch), aliando ferramentas remotas e automoção – direcionando alocação de esforços para as contas estratégicas da companhia.
                </p>

                <div className="border-t border-white/5 pt-4 text-left">
                  <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                    Atualmente, cerca de 1.500 contas, 2.400 usuários, tem faturamento próximo de R$ 3,8MM (23% da base).
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 text-left">
                <button
                  onClick={() => setCurrentView('low_touch')}
                  className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/15 hover:shadow-sky-500/25 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2 border border-sky-500/20"
                >
                  <span>Analisar Clientes Low-Touch (≤ 10k)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    );
  };

  const renderOrganograma = () => {
    // Calculate total headcount of all roles on the page
    const fixedHeadsCount = 1.0; // 1.0 for Customer Success Leader
    const directorCount = 1.0; // 1.0 for Diretor Comercial
    const sumGRAll = ['FINANCEIRO I', 'FINANCEIRO II', 'GOVERNO', 'AGRO/CORP'].reduce((acc, key) => acc + (salesHCState[key]?.gr || 0), 0);
    const sumEVAll = ['FINANCEIRO I', 'FINANCEIRO II', 'GOVERNO', 'AGRO/CORP'].reduce((acc, key) => acc + (salesHCState[key]?.ev || 0), 0);
    const sumGCAll = ['FINANCEIRO I', 'FINANCEIRO II', 'GOVERNO', 'AGRO/CORP'].reduce((acc, key) => acc + (salesHCState[key]?.gc || 0), 0);
    const csSpecialistsCount = opStatsSummary.totalHC;
    const hcLowTouchVal = parseFloat(hcLowTouch || '0');
    const totalOrganogramaHC = directorCount + fixedHeadsCount + sumGRAll + sumEVAll + sumGCAll + csSpecialistsCount + hcLowTouchVal;

    return (
      <div className="flex flex-col flex-1 space-y-4 min-h-0 overflow-hidden">
        <header className="flex justify-between items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 shrink-0 shadow-2xl">
          <h1 className="text-2xl font-black uppercase tracking-tighter bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent">
            Estrutura Organizacional Ideal
          </h1>
          <div className="flex items-center space-x-3 bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Headcount Total:</span>
            <span className="text-lg font-mono font-black text-amber-400">{totalOrganogramaHC.toFixed(1)} HC</span>
          </div>
        </header>

        <div className="flex-1 bg-slate-950/40 border border-white/5 rounded-3xl p-4 md:p-12 overflow-auto custom-scrollbar relative scroll-smooth">
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
                  <div className="mt-1.5 flex justify-center">
                    <span className="text-xs font-mono font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded">
                      1.0 HC
                    </span>
                  </div>
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
                          <div className="mt-2 flex flex-col gap-1 items-center">
                            <span className="text-[9px] font-extrabold uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                              Líder Vertical: {v.isCS ? '1.0' : (salesHCState[v.name === 'Agro/Corp' ? 'AGRO/CORP' : v.name.toUpperCase()]?.gr || 0).toFixed(1)} HC
                            </span>
                          </div>
                          {!v.isCS && (
                            <p className="text-[10px] font-black text-slate-400 mt-1.5">
                              {formatNumber(data.verticals.find(vs => vs.vertical === v.name)?.totalClients || 0)} CONTAS
                            </p>
                          )}
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
 
                    {/* Level 2: Especialistas CS or Executivo de Vendas */}
                    {v.isCS ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                        className={cn(
                          "px-4 py-3 text-center min-w-[160px] border rounded-xl bg-indigo-500/10 border-indigo-500/20 shadow-[0_0_15px_-5px_rgba(99,102,241,0.2)]"
                        )}
                      >
                        <div className="flex -space-x-1 justify-center mb-2">
                          {[1, 2].map(j => <Users key={j} className="w-3 h-3 text-indigo-400" />)}
                        </div>
                        <p className="text-[10px] font-black text-white uppercase tracking-tighter">Especialistas CS</p>
                        <p className="text-xs font-mono font-black text-indigo-400 mt-1">
                          {csSpecialistsCount.toFixed(1)} HC
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                        className="relative"
                      >
                        <div className="px-4 py-3 text-center min-w-[160px] border rounded-xl bg-slate-900/50 border-white/5">
                          <Briefcase className={cn("w-4 h-4 mx-auto mb-2 opacity-50", v.iconColor)} />
                          <p className="text-[10px] font-black text-white uppercase tracking-tighter">Executivo de Vendas</p>
                          {(() => {
                            const verticalKey = v.name === 'Agro/Corp' ? 'AGRO/CORP' : v.name.toUpperCase();
                            const evValue = salesHCState[verticalKey]?.ev || 0;
                            return (
                              <p className={cn("text-xs font-mono font-black mt-1", v.iconColor)}>
                                {evValue.toFixed(1)} HC
                              </p>
                            );
                          })()}
                        </div>
                      </motion.div>
                    )}
 
                    {/* Level 3: Clientes Low-Touch for CS OR Gerente de Contas for verticals */}
                    {v.isCS ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="relative flex flex-col items-center"
                      >
                        {/* Connection to Specialists */}
                        <div className="absolute top-0 left-1/2 w-px h-12 bg-white/10 -translate-x-1/2 -translate-y-full" />
                        
                        <div className="bg-slate-900 border border-indigo-500/20 px-4 py-3 text-center min-w-[160px] rounded-xl shadow-lg">
                          <Monitor className="w-3 h-3 text-slate-400 mx-auto mb-2" />
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Clientes Low-Touch</p>
                          <p className="text-xs font-mono font-black text-indigo-400 mt-1">
                            {parseFloat(hcLowTouch || '0').toFixed(1)} HC
                          </p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="relative flex flex-col items-center"
                      >
                        {/* Connection to Executivo de Vendas */}
                        <div className="absolute top-0 left-1/2 w-px h-12 bg-white/10 -translate-x-1/2 -translate-y-full" />
                        
                        <div className="bg-slate-900 border border-white/5 hover:border-slate-700/50 transition-colors px-4 py-3 text-center min-w-[160px] rounded-xl shadow-lg">
                          <Users className={cn("w-3.5 h-3.5 mx-auto mb-2 opacity-50", v.iconColor)} />
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Gerente de Contas</p>
                          {(() => {
                            const verticalKey = v.name === 'Agro/Corp' ? 'AGRO/CORP' : v.name.toUpperCase();
                            const gcValue = salesHCState[verticalKey]?.gc || 0;
                            return (
                              <p className={cn("text-xs font-mono font-black mt-1", v.iconColor)}>
                                {gcValue.toFixed(1)} HC
                              </p>
                            );
                          })()}
                        </div>
                      </motion.div>
                    )}
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
          <div className="flex items-center space-x-12">
            <div className="flex items-center space-x-8 px-6 py-3 bg-slate-900/50 border border-white/5 rounded-full backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-px bg-white/20" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Reporte Hierárquico</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-px border-t border-dashed border-white/40" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Direcionamento Funcional</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Apoio Estratégico CS</span>
            </div>
          </div>

          {/* Matrix: Strategic Support */}
          <div className="w-full max-w-4xl mt-12 bg-slate-900/40 border border-white/5 rounded-3xl p-8 backdrop-blur-md">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-black text-white uppercase">Matriz de Apoio Estratégico</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Interação da unidade CS com Verticais de Negócio</p>
              </div>
              <ShieldCheck className="w-6 h-6 text-indigo-400 opacity-50" />
            </div>

            <div className="grid grid-cols-5 gap-6">
              <div className="col-span-1 space-y-4">
                <div className="h-12 flex items-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Pilar de Apoio</span>
                </div>
                {[
                  { label: 'Retenção & Churn', icon: Timer },
                  { label: 'Expansão (Upsell)', icon: TrendingUp },
                  { label: 'Adopção de Produto', icon: CheckCircle2 },
                  { label: 'Voz do Cliente', icon: MessageSquare }
                ].map(p => (
                  <div key={p.label} className="h-16 flex items-center space-x-3 group">
                    <p.icon className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                    <span className="text-[11px] font-black text-white uppercase leading-tight group-hover:text-indigo-400 transition-colors">{p.label}</span>
                  </div>
                ))}
              </div>

              {[
                { name: 'Financeiro I', color: 'border-sky-500/20 hover:bg-sky-500/5' },
                { name: 'Financeiro II', color: 'border-emerald-500/20 hover:bg-emerald-500/5' },
                { name: 'Governo', color: 'border-amber-500/20 hover:bg-amber-500/5' },
                { name: 'Agro/Corp', color: 'border-rose-500/20 hover:bg-rose-500/5' },
              ].map(v => (
                <div key={v.name} className="col-span-1 space-y-4">
                  <div className="h-12 flex items-center justify-center bg-slate-950/80 rounded-xl border border-white/5">
                    <span className="text-[10px] font-black text-white uppercase truncate px-2">{v.name}</span>
                  </div>
                  {[1, 2, 3, 4].map(idx => (
                    <div key={idx} className={cn("h-16 rounded-2xl border flex items-center justify-center transition-all group cursor-default", v.color)}>
                      <div className="w-2 h-2 rounded-full bg-indigo-500/40 group-hover:bg-indigo-400 group-hover:scale-125 transition-all shadow-[0_0_15px_rgba(99,102,241,0)] group-hover:shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-white/5 flex justify-center text-center">
              <p className="text-[9px] text-slate-500 italic max-w-xl font-medium">
                * A unidade de Customer Success atua como parceira estratégica transversal, garantindo a maximização do Valor Vitalício (LTV) através de metodologias padronizadas de sucesso aplicadas às especificidades de cada vertical.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

  const renderPlanoA = () => {
    // 1. Calculate dynamic defaults
    const defFinLeader = (salesHCState['FINANCEIRO I']?.gr || 0) + (salesHCState['FINANCEIRO II']?.gr || 0);
    const defAgroLeader = salesHCState['AGRO/CORP']?.gr || 0;
    const defGovLeader = salesHCState['GOVERNO']?.gr || 0;
    const defAtendLeader = 1.0;
    
    const defFinEV = (salesHCState['FINANCEIRO I']?.ev || 0) + (salesHCState['FINANCEIRO II']?.ev || 0);
    const defFinGC = (salesHCState['FINANCEIRO I']?.gc || 0) + (salesHCState['FINANCEIRO II']?.gc || 0);
    
    const defAgroEV = salesHCState['AGRO/CORP']?.ev || 0;
    const defAgroGC = salesHCState['AGRO/CORP']?.gc || 0;
    
    const defGovEV = salesHCState['GOVERNO']?.ev || 0;
    const defGovGC = salesHCState['GOVERNO']?.gc || 0;
    
    const defCs = opStatsSummary.totalHC;
    const defHelpdesk = 3.0;
    const defSdrbdr = 4.0;

    // Helper to get active headcount
    const getVal = (key: string, def: number): number => {
      const valStr = planoAState[key];
      if (valStr === undefined || valStr === '') return def;
      const parsed = parseFloat(valStr);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Current headcount values
    const currentDirector = getVal('director', 1.0);
    const currentFinLeader = getVal('finLeader', defFinLeader);
    const currentFinEV = getVal('finEV', defFinEV);
    const currentFinGC = getVal('finGC', defFinGC);
    const currentAgroLeader = getVal('agroLeader', defAgroLeader);
    const currentAgroEV = getVal('agroEV', defAgroEV);
    const currentAgroGC = getVal('agroGC', defAgroGC);
    const currentGovLeader = getVal('govLeader', defGovLeader);
    const currentGovEV = getVal('govEV', defGovEV);
    const currentGovGC = getVal('govGC', defGovGC);
    const currentAtendLeader = getVal('atendLeader', defAtendLeader);
    const currentCs = getVal('cs', defCs);
    const currentHelpdesk = getVal('helpdesk', defHelpdesk);
    const currentSdrbdr = getVal('sdrbdr', defSdrbdr);

    const totalPlanoAHC = 
      currentDirector +
      currentFinLeader + currentFinEV + currentFinGC +
      currentAgroLeader + currentAgroEV + currentAgroGC +
      currentGovLeader + currentGovEV + currentGovGC +
      currentAtendLeader + currentCs + currentHelpdesk + currentSdrbdr;

    const savedStateStr = localStorage.getItem('planoa_state') || '{}';
    const hasUnsavedChanges = JSON.stringify(planoAState) !== savedStateStr;

    const handleValueChange = (key: string, value: string) => {
      const nextState = {
        ...planoAState,
        [key]: value
      };
      setPlanoAState(nextState);
    };

    // Helper render editable headcount input inside boxes
    const renderEditableHC = (key: string, defVal: number, textColorClass: string = "text-sky-450") => {
      const valStr = planoAState[key] !== undefined ? planoAState[key] : defVal.toFixed(1);
      return (
        <div className="flex items-center justify-center space-x-1 mt-1.5 mx-auto bg-slate-950/60 rounded px-2 py-0.5 border border-white/5 focus-within:border-sky-400/30 transition-all w-20">
          <input
            type="number"
            step="0.1"
            min="0"
            value={valStr}
            onChange={(e) => handleValueChange(key, e.target.value)}
            className={cn(
              "w-10 text-center bg-transparent font-mono text-[11px] font-black outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              textColorClass
            )}
          />
          <span className="text-[9px] text-slate-500 font-bold uppercase">HC</span>
        </div>
      );
    };

    return (
      <div className="flex flex-col flex-1 space-y-4 min-h-0 overflow-hidden text-left">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 shrink-0 shadow-2xl">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
              Organograma — 3Q2026
            </h1>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed mt-0.5">
              Estrutura comercial com CSM integrado e headcounts de 3Q2026 100% editáveis de forma isolada.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Reset Button */}
            <button
              onClick={() => {
                if (confirm("Deseja redefinir os headcounts personalizados do 3Q2026 para os valores padrão do restante do aplicativo?")) {
                  setPlanoAState({});
                  localStorage.removeItem('planoa_state');
                  globalSettingsService.saveGlobalSettings({ planoa_state: "" }).catch(console.error);
                }
              }}
              className="flex items-center space-x-1.5 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold px-3 py-2 rounded-xl border border-white/5 transition-all"
              title="Restaurar de acordes com as outras páginas"
            >
              <Undo className="w-3.5 h-3.5" />
              <span>Limpar Ajustes</span>
            </button>

            {/* Save Button */}
            <button
              onClick={() => savePlanoAState(planoAState)}
              disabled={isPlanoAStateSaving}
              className={cn(
                "flex items-center space-x-2 text-xs font-black uppercase tracking-tight px-4 py-2 rounded-xl border transition-all duration-300",
                hasUnsavedChanges
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-400/30 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02]"
                  : "bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-white/10 shadow-lg hover:opacity-90"
              )}
            >
              {isPlanoAStateSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{hasUnsavedChanges ? "Salvar Alterações *" : "Salvar 3Q2026"}</span>
                </>
              )}
            </button>

            {/* Total Headcount display */}
            <div className="flex items-center space-x-2 bg-slate-900 border border-white/10 rounded-xl px-4 py-2 shadow-inner">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total:</span>
              <span className="text-base font-mono font-black text-sky-400">{totalPlanoAHC.toFixed(1)} HC</span>
            </div>
          </div>
        </header>

        <div className="flex-1 bg-slate-950/40 border border-white/5 rounded-3xl p-4 md:p-8 overflow-auto custom-scrollbar relative scroll-smooth">
          
          {/* Main Relative Container for background visual lines */}
          <div className="min-w-[1360px] flex flex-col items-center space-y-12 relative p-4 pb-12">

            {/* Level 0: Diretoria Comercial */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative z-10"
            >
              <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-sky-500 p-[2px] rounded-2xl shadow-[0_0_40px_-5px_rgba(99,102,241,0.35)]">
                <div className="bg-slate-950 rounded-[14px] px-14 py-5 border border-white/10 text-center min-w-[260px]">
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1 font-mono">C-Level Direção</p>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Diretoria Comercial</h3>
                  {renderEditableHC('director', 1.0, "text-sky-400")}
                </div>
              </div>
              {/* Stem down to the horizontal line */}
              <div className="absolute left-1/2 bottom-0 w-px h-12 bg-white/20 -translate-x-1/2 translate-y-full" />
            </motion.div>

            {/* Horizontal level connector row */}
            <div className="relative w-full z-10">
              <div className="flex flex-row space-x-6 items-start justify-center relative pt-12">
                {/* Centered vertical connector from Director downwards into horizontal plane */}
                <div className="absolute top-0 left-1/2 w-px h-12 bg-white/20 -translate-x-1/2" />
                
                {/* COLUMN 1: FINANCEIRO */}
                <div className="w-[220px] shrink-0 flex flex-col items-center relative">
                  {/* Segment of horizontal tree line */}
                  <div className="absolute top-0 left-1/2 right-[-12px] h-px bg-white/20" />
                  {/* Vertical stem down to the card */}
                  <div className="w-px h-6 bg-white/20" />

                  {/* Leader Box */}
                  <div className="w-full h-[110px] bg-slate-900 border border-indigo-500/20 rounded-2xl p-4 text-center relative hover:border-indigo-500/40 transition-all flex flex-col justify-center">
                    <h4 className="text-sm font-black text-white uppercase truncate">Financeiro</h4>
                    {renderEditableHC('finLeader', defFinLeader, "text-indigo-400")}
                    
                    {/* Stem down to EV */}
                    <div className="absolute left-1/2 bottom-0 w-px h-10 bg-white/20 -translate-x-1/2 translate-y-full" />
                  </div>

                  {/* Vertically separate layout */}
                  <div className="h-10 shrink-0" />

                  {/* EV Box */}
                  <div className="w-full h-[120px] bg-slate-900/90 hover:bg-slate-900 border border-indigo-500/20 rounded-2xl p-4 text-center flex flex-col justify-center relative transition-all duration-300">
                    {/* Tag "Ataque" */}
                    <span className="absolute top-2 right-2 text-[8px] font-black uppercase tracking-wider text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded border border-red-500/20 shadow-sm">Ataque</span>
                    <Briefcase className="w-4 h-4 mx-auto mb-1 text-indigo-400 opacity-80" />
                    <p className="text-[10px] font-black text-white uppercase tracking-tighter">Executivos de Vendas</p>
                    {renderEditableHC('finEV', defFinEV, "text-indigo-400")}

                    {/* Stem down to GC */}
                    <div className="absolute left-1/2 bottom-0 w-px h-10 bg-white/20 -translate-x-1/2 translate-y-full" />
                  </div>

                  <div className="h-10 shrink-0" />

                  {/* GC Box */}
                  <div className="w-full h-[120px] bg-slate-900/90 hover:bg-slate-900 border border-indigo-500/20 rounded-2xl p-4 text-center flex flex-col justify-center relative transition-all duration-300">
                    {/* Tag "Defesa" */}
                    <span className="absolute top-2 right-2 text-[8px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shadow-sm">Defesa</span>
                    <Users className="w-4 h-4 mx-auto mb-1 text-indigo-400 opacity-80" />
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Gerentes de Contas</p>
                    {renderEditableHC('finGC', defFinGC, "text-indigo-400")}
                  </div>
                </div>


                {/* COLUMN 2: AGRO/CORP */}
                <div className="w-[220px] shrink-0 flex flex-col items-center relative">
                  {/* Segment of horizontal tree line */}
                  <div className="absolute top-0 left-[-12px] right-[-12px] h-px bg-white/20" />
                  {/* Vertical stem down to the card */}
                  <div className="w-px h-6 bg-white/20" />

                  {/* Leader Box */}
                  <div className="w-full h-[110px] bg-slate-900 border border-rose-500/20 rounded-2xl p-4 text-center relative hover:border-rose-500/40 transition-all flex flex-col justify-center">
                    <h4 className="text-sm font-black text-white uppercase truncate">Agro/Corp</h4>
                    {renderEditableHC('agroLeader', defAgroLeader, "text-rose-400")}
                    
                    {/* Stem down to EV */}
                    <div className="absolute left-1/2 bottom-0 w-px h-10 bg-white/20 -translate-x-1/2 translate-y-full" />
                  </div>

                  {/* Spacer */}
                  <div className="h-10 shrink-0" />

                  {/* EV Box */}
                  <div className="w-full h-[120px] bg-slate-900/90 hover:bg-slate-900 border border-rose-500/20 rounded-2xl p-4 text-center flex flex-col justify-center relative transition-all duration-300">
                    {/* Tag "Ataque" */}
                    <span className="absolute top-2 right-2 text-[8px] font-black uppercase tracking-wider text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded border border-red-500/20 shadow-sm">Ataque</span>
                    <Briefcase className="w-4 h-4 mx-auto mb-1 text-rose-400 opacity-80" />
                    <p className="text-[10px] font-black text-white uppercase tracking-tighter">Executivos de Vendas</p>
                    {renderEditableHC('agroEV', defAgroEV, "text-rose-400")}

                    {/* Stem down to GC */}
                    <div className="absolute left-1/2 bottom-0 w-px h-10 bg-white/20 -translate-x-1/2 translate-y-full" />
                  </div>

                  <div className="h-10 shrink-0" />

                  {/* GC Box */}
                  <div className="w-full h-[120px] bg-slate-900/90 hover:bg-slate-900 border border-rose-500/20 rounded-2xl p-4 text-center flex flex-col justify-center relative transition-all duration-300">
                    {/* Tag "Defesa" */}
                    <span className="absolute top-2 right-2 text-[8px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shadow-sm">Defesa</span>
                    <Users className="w-4 h-4 mx-auto mb-1 text-rose-400 opacity-80" />
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Gerentes de Contas</p>
                    {renderEditableHC('agroGC', defAgroGC, "text-rose-400")}
                  </div>
                </div>


                {/* COLUMN 3: GOVERNO */}
                <div className="w-[220px] shrink-0 flex flex-col items-center relative">
                  {/* Segment of horizontal tree line */}
                  <div className="absolute top-0 left-[-12px] right-[-12px] h-px bg-white/20" />
                  {/* Vertical stem down to the card */}
                  <div className="w-px h-6 bg-white/20" />

                  {/* Leader Box */}
                  <div className="w-full h-[110px] bg-slate-900 border border-amber-500/20 rounded-2xl p-4 text-center relative hover:border-amber-500/40 transition-all flex flex-col justify-center">
                    <h4 className="text-sm font-black text-white uppercase truncate">Governo</h4>
                    {renderEditableHC('govLeader', defGovLeader, "text-amber-400")}
                    
                    {/* Stem down to EV */}
                    <div className="absolute left-1/2 bottom-0 w-px h-10 bg-white/20 -translate-x-1/2 translate-y-full" />
                  </div>

                  {/* Spacer */}
                  <div className="h-10 shrink-0" />

                  {/* EV Box */}
                  <div className="w-full h-[120px] bg-slate-900/90 hover:bg-slate-900 border border-amber-500/20 rounded-2xl p-4 text-center flex flex-col justify-center relative transition-all duration-300">
                    {/* Tag "Ataque" */}
                    <span className="absolute top-2 right-2 text-[8px] font-black uppercase tracking-wider text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded border border-red-500/20 shadow-sm">Ataque</span>
                    <Briefcase className="w-4 h-4 mx-auto mb-1 text-amber-400 opacity-80" />
                    <p className="text-[10px] font-black text-white uppercase tracking-tighter">Executivos de Vendas</p>
                    {renderEditableHC('govEV', defGovEV, "text-amber-400")}

                    {/* Stem down to GC */}
                    <div className="absolute left-1/2 bottom-0 w-px h-10 bg-white/20 -translate-x-1/2 translate-y-full" />
                  </div>

                  <div className="h-10 shrink-0" />

                  {/* GC Box */}
                  <div className="w-full h-[120px] bg-slate-900/90 hover:bg-slate-900 border border-amber-500/20 rounded-2xl p-4 text-center flex flex-col justify-center relative transition-all duration-300">
                    {/* Tag "Defesa" */}
                    <span className="absolute top-2 right-2 text-[8px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shadow-sm">Defesa</span>
                    <Users className="w-4 h-4 mx-auto mb-1 text-amber-400 opacity-80" />
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Gerentes de Contas</p>
                    {renderEditableHC('govGC', defGovGC, "text-amber-400")}
                  </div>
                </div>


                {/* COLUMN 4: CUSTOMER SUCCESS MANAGEMENT (THREE SUBCOLUMNS SIDE-BY-SIDE!) */}
                <div className="w-[680px] shrink-0 flex flex-col items-center relative">
                  {/* Segment of horizontal tree line */}
                  <div className="absolute top-0 left-[-12px] right-1/2 h-px bg-white/20" />
                  {/* Vertical stem down to the leader card */}
                  <div className="w-px h-6 bg-white/20" />

                  {/* CSM Leader Card (Centered above the 3 subcolumns) */}
                  <div className="w-[220px] h-[110px] bg-slate-900 border border-emerald-500/20 rounded-2xl p-4 text-center relative hover:border-emerald-500/40 transition-all flex flex-col justify-center">
                    <h4 className="text-sm font-black text-white uppercase truncate">CSM</h4>
                    {renderEditableHC('atendLeader', defAtendLeader, "text-emerald-400")}
                    
                    {/* Stem down to the horizontal branching bar */}
                    <div className="absolute left-1/2 bottom-0 w-px h-10 bg-white/20 -translate-x-1/2 translate-y-full" />
                  </div>

                  {/* Spacer representing branching bar area */}
                  <div className="h-10 w-full relative flex items-center justify-center shrink-0">
                    {/* Stem coming down from Leader */}
                    <div className="absolute left-1/2 top-0 w-px h-5 bg-white/20 -translate-x-1/2" />

                    {/* Horizontal bar stretching from center of CS card to center of Low-Touch card */}
                    <div className="absolute top-1/2 left-[105px] right-[105px] h-px bg-white/20 -translate-y-1/2" />
                    
                    {/* Vertical stem down to center column (Help Desk) */}
                    <div className="absolute left-1/2 bottom-0 w-px h-5 bg-white/20 -translate-x-1/2" />
                    
                    {/* Vertical stems down for outer columns (CS and Low-Touch) */}
                    <div className="absolute left-[105px] bottom-0 w-px h-5 bg-white/20 -translate-x-1/2" />
                    <div className="absolute right-[105px] bottom-0 w-px h-5 bg-white/20 -translate-x-1/2" />
                  </div>

                  {/* Row of 3 subcolumns side-by-side (same high hierarchical level as EVs!) */}
                  <div className="grid grid-cols-3 gap-6 w-full">
                    
                    {/* SUBCOLUMN 1: Customer Success (Closest side to sales!) */}
                    <div className="flex flex-col items-center">
                      <div className="w-full h-[120px] bg-slate-900 border border-emerald-500/20 rounded-2xl p-4 text-center flex flex-col justify-center hover:border-emerald-500/40 transition-all">
                        <ShieldCheck className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                        <p className="text-[10px] font-black text-white uppercase tracking-tighter">Customer Success</p>
                        {renderEditableHC('cs', defCs, "text-emerald-400")}
                      </div>
                    </div>

                    {/* SUBCOLUMN 2: Help Desk */}
                    <div className="flex flex-col items-center">
                      <div className="w-full h-[120px] bg-slate-900 border border-emerald-500/20 rounded-2xl p-4 text-center flex flex-col justify-center hover:border-emerald-500/40 transition-all">
                        <Monitor className="w-4 h-4 mx-auto mb-1 text-emerald-400 opacity-80" />
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Help Desk</p>
                        {renderEditableHC('helpdesk', defHelpdesk, "text-emerald-400")}
                      </div>
                    </div>

                    {/* SUBCOLUMN 3: Low-Touch */}
                    <div className="flex flex-col items-center">
                      <div className="w-full h-[120px] bg-slate-900 border border-emerald-500/20 rounded-2xl p-4 text-center flex flex-col justify-center hover:border-emerald-500/40 transition-all">
                        <Target className="w-4 h-4 mx-auto mb-1 text-emerald-400 opacity-80" />
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Low-Touch</p>
                        {renderEditableHC('sdrbdr', defSdrbdr, "text-emerald-400")}
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  const renderTresPapeis = () => (
    <div className="flex flex-col flex-1 space-y-6 min-h-0 overflow-hidden">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-5 shrink-0 shadow-2xl text-left">
        <div className="space-y-1">
          <h1 className="text-2xl font-black uppercase tracking-tighter bg-gradient-to-r from-red-400 via-emerald-400 to-indigo-400 bg-clip-text text-transparent">
            Os Três Papéis de Vendas
          </h1>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed">
            EV com meta financeira (ataque) · GC e CS com meta de defesa · CS com indicadores de saúde.
          </p>
        </div>
      </header>

      <div className="flex-1 bg-slate-950/40 border border-white/5 rounded-3xl p-6 md:p-8 overflow-auto custom-scrollbar relative scroll-smooth">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          
          {/* Card 1: Executivo de Vendas (EV) - ATAQUE */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-905/70 hover:bg-slate-900/90 border border-red-500/10 hover:border-red-500/30 transition-all rounded-3xl p-6 shadow-xl flex flex-col justify-between group relative overflow-hidden"
            style={{ background: 'rgba(15, 23, 42, 0.6)' }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full filter blur-2xl group-hover:bg-red-500/10 transition-colors pointer-events-none" />
            
            <div className="space-y-6">
              {/* Badge & Label Container */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-white bg-red-650 bg-red-650 bg-red-600 px-3 py-1 rounded-full shadow-lg shadow-red-600/20">
                  Ataque
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Foco Expansão
                </span>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1.5 text-left">
                <h3 className="text-xl font-black text-white group-hover:text-red-400 transition-colors uppercase tracking-tight leading-tight">
                  Executivo de vendas (EV)
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">
                  Novas receitas — novos CNPJs
                </p>
              </div>

              {/* Internal Badge */}
              <div className="text-left">
                <span className="inline-block text-[11px] font-bold tracking-wide text-sky-400 bg-sky-400/10 border border-sky-400/20 px-3 py-1 rounded-lg">
                  Meta 100% financeira
                </span>
              </div>

              {/* Content Description */}
              <p className="text-xs text-slate-300 leading-relaxed font-semibold text-left border-t border-white/5 pt-4">
                Cota de ARR novo (novas vendas, expansão das carteiras, novos CNPJs). Meta 100% financeira – sem indicadores de processo no primeiro momento.
              </p>
            </div>

            {/* Bottom Section */}
            <div className="mt-8 pt-4 border-t border-white/5 text-left flex justify-between items-center">
              <span className="text-slate-500 text-[10px] uppercase font-black tracking-wider">Múltiplo de Desempenho</span>
              <span className="font-mono text-xs font-black text-red-400 bg-red-400/10 px-2.5 py-1 rounded-md border border-red-400/20">
                Múltiplo RV: <span className="text-white text-sm">3.0x</span> / tri
              </span>
            </div>
          </motion.div>

          {/* Card 2: Gerente de Contas (GC) - DEFESA */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-905/70 hover:bg-slate-900/90 border border-emerald-500/10 hover:border-emerald-500/30 transition-all rounded-3xl p-6 shadow-xl flex flex-col justify-between group relative overflow-hidden"
            style={{ background: 'rgba(15, 23, 42, 0.6)' }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full filter blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
            
            <div className="space-y-6">
              {/* Badge & Label Container */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                  Defesa
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Foco Retenção
                </span>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1.5 text-left">
                <h3 className="text-xl font-black text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight leading-tight">
                  Gerente de contas (GC)
                </h3>
                <p className="text-xs text-emerald-400/85 font-bold uppercase tracking-wide">
                  Retenção + upsell na carteira
                </p>
              </div>

              {/* Internal Badge */}
              <div className="text-left">
                <span className="inline-block text-[11px] font-bold tracking-wide text-sky-400 bg-sky-400/10 border border-sky-400/20 px-3 py-1 rounded-lg">
                  Meta 100% financeira
                </span>
              </div>

              {/* Content Description */}
              <p className="text-xs text-slate-300 leading-relaxed font-semibold text-left border-t border-white/5 pt-4">
                Cota de NRR (Net Revenue Retention). Meta 100% financeira — o NRR já captura expansão, RETENÇÃO, churn, renovações e reajustes contratuais num único número auditável.
              </p>
            </div>

            {/* Bottom Section */}
            <div className="mt-8 pt-4 border-t border-white/5 text-left flex justify-between items-center">
              <span className="text-slate-500 text-[10px] uppercase font-black tracking-wider">Múltiplo de Desempenho</span>
              <span className="font-mono text-xs font-black text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-md border border-emerald-400/20">
                Múltiplo RV: <span className="text-white text-sm">2.1x</span> / tri
              </span>
            </div>
          </motion.div>

          {/* Card 3: Customer Success (CS) - DEFESA */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-905/70 hover:bg-slate-900/90 border border-indigo-500/10 hover:border-indigo-500/30 transition-all rounded-3xl p-6 shadow-xl flex flex-col justify-between group relative overflow-hidden"
            style={{ background: 'rgba(15, 23, 42, 0.6)' }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full filter blur-2xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
            
            <div className="space-y-6">
              {/* Badge & Label Container */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
                  Defesa
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Foco Saúde
                </span>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1.5 text-left">
                <h3 className="text-xl font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight leading-tight">
                  Customer success (CS)
                </h3>
                <p className="text-xs text-indigo-400/80 font-bold uppercase tracking-wide">
                  Saúde e engajamento da base
                </p>
              </div>

              {/* Internal Badge */}
              <div className="text-left">
                <span className="inline-block text-[11px] font-bold tracking-wide text-indigo-400 bg-indigo-400/10 border border-indigo-400/20 px-3 py-1 rounded-lg">
                  Meta por indicadores
                </span>
              </div>

              {/* Content Description */}
              <p className="text-xs text-slate-300 leading-relaxed font-semibold text-left border-t border-white/5 pt-4">
                Sem cota financeira direta. RV calculado sobre atingimento de indicadores de saúde — cada indicador tem um peso e um alvo definido no início do trimestre.
              </p>

              {/* Indicators Checklist */}
              <div className="space-y-2.5 border-t border-white/5 pt-4 text-left">
                {[
                  { name: 'Engajamento (DAU/MAU)', pct: '25%', bg: 'bg-indigo-500' },
                  { name: 'Não-uso (NAU)', pct: '25%', bg: 'bg-indigo-400' },
                  { name: 'Indicações p/ upsell', pct: '30%', bg: 'bg-emerald-500' },
                  { name: 'NPS Operacional', pct: '20%', bg: 'bg-purple-500' },
                ].map((ind, i) => (
                  <div key={i} className="flex flex-col space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400 font-bold">{ind.name}</span>
                      <span className="font-mono text-white font-black">{ind.pct}</span>
                    </div>
                    <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-1000", ind.bg)} style={{ width: ind.pct }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Section */}
            <div className="mt-8 pt-4 border-t border-white/5 text-left flex justify-between items-center">
              <span className="text-slate-500 text-[10px] uppercase font-black tracking-wider">Múltiplo de Desempenho</span>
              <span className="font-mono text-xs font-black text-indigo-400 bg-indigo-400/10 px-2.5 py-1 rounded-md border border-indigo-400/20">
                Múltiplo RV: <span className="text-white text-sm">1.2x</span> / tri
              </span>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );

  const renderEstruturaIdeal = () => {
    const sumGRAll = ['FINANCEIRO I', 'FINANCEIRO II', 'GOVERNO', 'AGRO/CORP'].reduce((acc, key) => acc + (salesHCState[key]?.gr || 0), 0);
    const hcNecessarioLiderVertical = 1.0 + sumGRAll; // 1.0 for CS leader and sumGRAll for Sales leaders
    const hcNecessarioCS = opStatsSummary.totalHC;
    const hcNecessarioVendas = salesTotals.totalHeadcount - sumGRAll; // EV/GC lines
    const hcNecessarioLowTouch = parseFloat(hcLowTouch || '0');
    const hcNecessarioTotal = hcNecessarioLiderVertical + hcNecessarioCS + hcNecessarioVendas + hcNecessarioLowTouch;

    const hcAtualLiderVertical = parseFloat(hcLiderVertical || '0');
    const hcAtualCS = parseFloat(hcOperational || '0');
    const hcAtualVendas = parseFloat(hcVendas || '0');
    const hcAtualLowTouch = parseFloat(hcLowTouchAtual || '0');
    const hcAtualTotal = hcAtualLiderVertical + hcAtualCS + hcAtualVendas + hcAtualLowTouch;

    const gapLiderVertical = hcNecessarioLiderVertical - hcAtualLiderVertical;
    const gapCS = hcNecessarioCS - hcAtualCS;
    const gapVendas = hcNecessarioVendas - hcAtualVendas;
    const gapLowTouch = hcNecessarioLowTouch - hcAtualLowTouch;
    const gapTotal = hcNecessarioTotal - hcAtualTotal;

    return (
      <div className="flex flex-col flex-1 space-y-6 min-h-0 overflow-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-5 shrink-0 shadow-2xl text-left">
          <div className="space-y-1">
            <h1 className="text-2xl font-black uppercase tracking-tighter bg-gradient-to-r from-teal-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
              Estrutura Ideal de Headcount
            </h1>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
              Painel consolidado comparando a força de trabalho atual com o headcount necessário projetado por sizing de Customer Success e Vendas.
            </p>
          </div>
        </header>

        <div className="flex-1 bg-slate-950/40 border border-white/5 rounded-3xl p-6 md:p-8 overflow-auto custom-scrollbar relative">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Headcount Necessário */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/60 border border-emerald-500/10 rounded-2xl p-6 shadow-xl relative text-left"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/25">
                    <Target className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Sizing</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Headcount Necessário</span>
                <span className="text-4xl font-black text-white font-mono leading-none">{hcNecessarioTotal.toFixed(1)}</span>
                <p className="text-[10px] text-slate-500 font-bold mt-2.5 pt-2 border-t border-white/5">
                  Líderes ({hcNecessarioLiderVertical.toFixed(1)}) + CS ({hcNecessarioCS.toFixed(1)}) + Vendas ({hcNecessarioVendas.toFixed(1)}) + Low-Touch ({hcNecessarioLowTouch.toFixed(1)})
                </p>
              </motion.div>

              {/* Card 2: Headcount Atual */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-slate-900/60 border border-sky-500/10 rounded-2xl p-6 shadow-xl relative text-left"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center border border-sky-500/25">
                    <Users className="w-5 h-5 text-sky-400" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">Atual</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Headcount Atual</span>
                <span className="text-4xl font-black text-white font-mono leading-none">{hcAtualTotal.toFixed(1)}</span>
                <p className="text-[10px] text-slate-500 font-bold mt-2.5 pt-2 border-t border-white/5">
                  Líderes ({hcAtualLiderVertical.toFixed(1)}) + CS ({hcAtualCS.toFixed(1)}) + Vendas ({hcAtualVendas.toFixed(1)}) + Low-Touch ({hcAtualLowTouch.toFixed(1)})
                </p>
              </motion.div>

              {/* Card 3: GAP */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={cn(
                  "border rounded-2xl p-6 shadow-xl relative text-left",
                  gapTotal > 0 
                    ? "bg-slate-900/60 border-amber-500/10" 
                    : "bg-slate-900/60 border-emerald-500/10"
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center border",
                    gapTotal > 0 ? "bg-amber-500/10 border-amber-500/25" : "bg-emerald-500/10 border-emerald-500/25"
                  )}>
                    <Scale className={cn("w-5 h-5", gapTotal > 0 ? "text-amber-400" : "text-emerald-400")} />
                  </div>
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border",
                    gapTotal > 0 ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  )}>
                    {gapTotal > 0 ? 'Déficit' : 'Alinhado'}
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">GAP Total</span>
                <span className={cn("text-4xl font-black font-mono leading-none", gapTotal > 0 ? "text-amber-400" : "text-emerald-400")}>
                  {gapTotal > 0 ? `+${gapTotal.toFixed(1)}` : gapTotal.toFixed(1)}
                </span>
                <p className="text-[10px] text-slate-500 font-bold mt-2.5 pt-2 border-t border-white/5">
                  {gapTotal > 0 ? 'Profissionais a contratar' : 'Headcount suficiente'}
                </p>
              </motion.div>

            </div>

            {/* Visual Progress Bar Section */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 text-left"
            >
              <h3 className="text-sm font-black text-white uppercase tracking-tight mb-4">Aderência aos Objetivos de Headcount</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-400">Progresso do Preenchimento de Vagas</span>
                    <span className="text-white font-mono font-bold">
                      {hcNecessarioTotal > 0 ? Math.round((hcAtualTotal / hcNecessarioTotal) * 100) : 100}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950/80 rounded-full h-3.5 p-0.5 border border-white/5">
                    <div 
                      className="bg-gradient-to-r from-sky-500 to-emerald-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, hcNecessarioTotal > 0 ? (hcAtualTotal / hcNecessarioTotal) * 100 : 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Detailed Table & Control Center */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 md:p-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 text-left">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Detalhamento Comparativo</span>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">Divisão por frente de negócio</h2>
                </div>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 pb-2 text-[10px] text-slate-500 uppercase font-black tracking-wider text-center">
                      <th className="text-left pb-4 font-black">Área de Sizing</th>
                      <th className="pb-4 font-black">Headcount Necessário</th>
                      <th className="pb-4 font-black">Headcount Atual</th>
                      <th className="pb-4 font-black">Ajustar Atual</th>
                      <th className="pb-4 font-black">GAP</th>
                      <th className="pb-4 font-black">Status de Cobertura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-center">
                    
                    {/* Líder Vertical Row */}
                    <tr className="group hover:bg-white/[0.01] transition-colors">
                      <td className="py-5 pr-4 text-left">
                        <div className="flex items-center space-x-3 text-left">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/15">
                            <Briefcase className="w-4 h-4 text-amber-400" />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-white block">Líder Vertical</span>
                            <span className="text-[10px] text-slate-500 font-semibold block uppercase">CS e Vendas (Liderança)</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 font-mono text-sm font-black text-white">
                        {hcNecessarioLiderVertical.toFixed(1)}
                      </td>
                      <td className="py-5 font-mono text-sm font-bold text-slate-400">
                        {hcAtualLiderVertical.toFixed(1)}
                      </td>
                      <td className="py-5">
                        <div className="inline-flex items-center space-x-1.5 bg-slate-950 rounded-lg p-0.5 border border-white/5">
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.max(0, hcAtualLiderVertical - 0.5);
                              setHcLiderVertical(next.toFixed(1));
                              saveHcLiderVertical(next.toFixed(1));
                            }}
                            className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 text-xs font-black transition-all border border-white/5 flex items-center justify-center"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={hcLiderVertical}
                            onChange={(e) => {
                              setHcLiderVertical(e.target.value);
                              saveHcLiderVertical(e.target.value);
                            }}
                            className="w-12 h-6 text-center bg-transparent text-white font-mono text-xs font-bold outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none animate-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = hcAtualLiderVertical + 0.5;
                              setHcLiderVertical(next.toFixed(1));
                              saveHcLiderVertical(next.toFixed(1));
                            }}
                            className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 text-xs font-black transition-all border border-white/5 flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-5">
                        <span className={cn(
                          "text-xs font-mono font-black px-2.5 py-1 rounded-md",
                          gapLiderVertical > 0 ? "text-amber-400 bg-amber-500/10" : "text-emerald-400 bg-emerald-500/10"
                        )}>
                          {gapLiderVertical > 0 ? `+${gapLiderVertical.toFixed(1)}` : gapLiderVertical.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-5">
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border",
                          gapLiderVertical > 0 ? "text-amber-400 border-amber-500/20 bg-amber-500/5" : "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
                        )}>
                          {gapLiderVertical > 0 ? 'Contratar' : 'Completo'}
                        </span>
                      </td>
                    </tr>

                    {/* CS Row */}
                    <tr className="group hover:bg-white/[0.01] transition-colors">
                      <td className="py-5 pr-4 text-left">
                        <div className="flex items-center space-x-3 text-left">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/15">
                            <ShieldCheck className="w-4 h-4 text-indigo-400" />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-white block">Customer Success</span>
                            <span className="text-[10px] text-slate-500 font-semibold block uppercase">Atendimento Operacional</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 font-mono text-sm font-black text-white">
                        {hcNecessarioCS.toFixed(1)}
                      </td>
                      <td className="py-5 font-mono text-sm font-bold text-slate-400">
                        {hcAtualCS.toFixed(1)}
                      </td>
                      <td className="py-5">
                        <div className="inline-flex items-center space-x-1.5 bg-slate-950 rounded-lg p-0.5 border border-white/5">
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.max(0, hcAtualCS - 0.5);
                              setHcOperational(next.toFixed(1));
                              localStorage.setItem('hc_operational', next.toFixed(1));
                              globalSettingsService.saveGlobalSettings({ hc_operational: next.toFixed(1) }).catch(console.error);
                            }}
                            className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 text-xs font-black transition-all border border-white/5 flex items-center justify-center"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={hcOperational}
                            onChange={(e) => {
                              setHcOperational(e.target.value);
                              localStorage.setItem('hc_operational', e.target.value);
                              globalSettingsService.saveGlobalSettings({ hc_operational: e.target.value }).catch(console.error);
                            }}
                            className="w-16 h-6 text-center bg-transparent text-white font-mono text-xs font-bold outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none animate-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = hcAtualCS + 0.5;
                              setHcOperational(next.toFixed(1));
                              localStorage.setItem('hc_operational', next.toFixed(1));
                              globalSettingsService.saveGlobalSettings({ hc_operational: next.toFixed(1) }).catch(console.error);
                            }}
                            className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 text-xs font-black transition-all border border-white/5 flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-5">
                        <span className={cn(
                          "text-xs font-mono font-black px-2.5 py-1 rounded-md",
                          gapCS > 0 ? "text-amber-400 bg-amber-500/10" : "text-emerald-400 bg-emerald-500/10"
                        )}>
                          {gapCS > 0 ? `+${gapCS.toFixed(1)}` : gapCS.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-5">
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border",
                          gapCS > 0 ? "text-amber-400 border-amber-500/20 bg-amber-500/5" : "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
                        )}>
                          {gapCS > 0 ? 'Contratar' : 'Completo'}
                        </span>
                      </td>
                    </tr>

                    {/* Vendas Row */}
                    <tr className="group hover:bg-white/[0.01] transition-colors">
                      <td className="py-5 pr-4 text-left">
                        <div className="flex items-center space-x-3 text-left">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/15">
                            <Users className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-white block">Time de Vendas (EV/GC)</span>
                            <span className="text-[10px] text-slate-500 font-semibold block uppercase">Canais e Verticais Comerciais</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 font-mono text-sm font-black text-white">
                        {hcNecessarioVendas.toFixed(1)}
                      </td>
                      <td className="py-5 font-mono text-sm font-bold text-slate-400">
                        {hcAtualVendas.toFixed(1)}
                      </td>
                      <td className="py-5">
                        <div className="inline-flex items-center space-x-1.5 bg-slate-950 rounded-lg p-0.5 border border-white/5">
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.max(0, hcAtualVendas - 0.5);
                              setHcVendas(next.toFixed(1));
                              localStorage.setItem('hc_vendas', next.toFixed(1));
                              globalSettingsService.saveGlobalSettings({ hc_vendas: next.toFixed(1) }).catch(console.error);
                            }}
                            className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 text-xs font-black transition-all border border-white/5 flex items-center justify-center"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={hcVendas}
                            onChange={(e) => {
                              setHcVendas(e.target.value);
                              localStorage.setItem('hc_vendas', e.target.value);
                              globalSettingsService.saveGlobalSettings({ hc_vendas: e.target.value }).catch(console.error);
                            }}
                            className="w-16 h-6 text-center bg-transparent text-white font-mono text-xs font-bold outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none animate-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = hcAtualVendas + 0.5;
                              setHcVendas(next.toFixed(1));
                              localStorage.setItem('hc_vendas', next.toFixed(1));
                              globalSettingsService.saveGlobalSettings({ hc_vendas: next.toFixed(1) }).catch(console.error);
                            }}
                            className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 text-xs font-black transition-all border border-white/5 flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-5">
                        <span className={cn(
                          "text-xs font-mono font-black px-2.5 py-1 rounded-md",
                          gapVendas > 0 ? "text-amber-400 bg-amber-500/10" : "text-emerald-400 bg-emerald-500/10"
                        )}>
                          {gapVendas > 0 ? `+${gapVendas.toFixed(1)}` : gapVendas.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-5">
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border",
                          gapVendas > 0 ? "text-amber-400 border-amber-500/20 bg-amber-500/5" : "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
                        )}>
                          {gapVendas > 0 ? 'Contratar' : 'Completo'}
                        </span>
                      </td>
                    </tr>

                    {/* Atendimento Clientes Low-Touch Row */}
                    <tr className="group hover:bg-white/[0.01] transition-colors">
                      <td className="py-5 pr-4 text-left">
                        <div className="flex items-center space-x-3 text-left">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/15">
                            <Monitor className="w-4 h-4 text-indigo-400" />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-white block">Atendimento Clientes Low-Touch</span>
                            <span className="text-[10px] text-slate-500 font-semibold block uppercase">CS Digital & Suporte Consolidado</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 font-mono text-sm font-black text-white">
                        {hcNecessarioLowTouch.toFixed(1)}
                      </td>
                      <td className="py-5 font-mono text-sm font-bold text-slate-400">
                        {hcAtualLowTouch.toFixed(1)}
                      </td>
                      <td className="py-5">
                        <div className="inline-flex items-center space-x-1.5 bg-slate-950 rounded-lg p-0.5 border border-white/5">
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.max(0, hcAtualLowTouch - 0.5);
                              setHcLowTouchAtual(next.toFixed(1));
                              localStorage.setItem('hc_low_touch_atual', next.toFixed(1));
                              globalSettingsService.saveGlobalSettings({ hc_low_touch_atual: next.toFixed(1) }).catch(console.error);
                            }}
                            className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 text-xs font-black transition-all border border-white/5 flex items-center justify-center"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={hcLowTouchAtual}
                            onChange={(e) => {
                              setHcLowTouchAtual(e.target.value);
                              localStorage.setItem('hc_low_touch_atual', e.target.value);
                              globalSettingsService.saveGlobalSettings({ hc_low_touch_atual: e.target.value }).catch(console.error);
                            }}
                            className="w-12 h-6 text-center bg-transparent text-white font-mono text-xs font-bold outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none animate-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = hcAtualLowTouch + 0.5;
                              setHcLowTouchAtual(next.toFixed(1));
                              localStorage.setItem('hc_low_touch_atual', next.toFixed(1));
                              globalSettingsService.saveGlobalSettings({ hc_low_touch_atual: next.toFixed(1) }).catch(console.error);
                            }}
                            className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 text-xs font-black transition-all border border-white/5 flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-5">
                        <span className={cn(
                          "text-xs font-mono font-black px-2.5 py-1 rounded-md",
                          gapLowTouch > 0 ? "text-amber-400 bg-amber-500/10" : "text-emerald-400 bg-emerald-500/10"
                        )}>
                          {gapLowTouch > 0 ? `+${gapLowTouch.toFixed(1)}` : gapLowTouch.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-5">
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border",
                          gapLowTouch > 0 ? "text-amber-400 border-amber-500/20 bg-amber-500/5" : "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
                        )}>
                          {gapLowTouch > 0 ? 'Contratar' : 'Completo'}
                        </span>
                      </td>
                    </tr>

                    {/* Total Row */}
                    <tr className="bg-indigo-950/10 font-bold">
                      <td className="py-5 text-left pl-4">
                        <span className="text-sm font-black text-white uppercase tracking-tight">TOTAL CONSOLIDADO</span>
                      </td>
                      <td className="py-5 font-mono text-base font-black text-white">
                        {hcNecessarioTotal.toFixed(1)}
                      </td>
                      <td className="py-5 font-mono text-base font-bold text-slate-400">
                        {hcAtualTotal.toFixed(1)}
                      </td>
                      <td className="py-5">
                        <span className="text-xs text-slate-500 font-bold">-</span>
                      </td>
                      <td className="py-5">
                        <span className={cn(
                          "text-sm font-mono font-black px-2.5 py-1 rounded-md",
                          gapTotal > 0 ? "text-amber-400 bg-amber-500/20" : "text-emerald-400 bg-emerald-500/20"
                        )}>
                          {gapTotal > 0 ? `+${gapTotal.toFixed(1)}` : gapTotal.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-5">
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border",
                          gapTotal > 0 ? "text-amber-400 border-amber-500/30 bg-amber-500/10" : "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                        )}>
                          {gapTotal > 0 ? 'Déficit Geral' : 'Cobertura Ideal'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </motion.div>

          </div>
        </div>
      </div>
    );
  };

  const renderPerformanceCS = () => {
    const handleRealizedChange = (id: string, value: string) => {
      const numericValue = parseFloat(value) || 0;
      const nextIndicators = csIndicators.map(ind => 
        ind.id === id 
          ? { ...ind, realized: parseFloat(value) === 0 ? 0 : numericValue } 
          : ind
      );
      setCsIndicators(nextIndicators);
      localStorage.setItem('cs_indicators', JSON.stringify(nextIndicators));
      if (user) {
        globalSettingsService.saveGlobalSettings({
          cs_indicators: JSON.stringify(nextIndicators)
        }).catch(console.error);
      }
    };

    // Calculations
    const calculatedIndicators = csIndicators.map(ind => {
      const atingimento = ind.target > 0 ? ind.realized / ind.target : 0;
      const contrib_raw = atingimento * ind.weight;
      return {
        ...ind,
        atingimento,
        contrib_raw,
      };
    });

    const atingimentoPonderadoTotal = calculatedIndicators.reduce((acc, curr) => acc + curr.contrib_raw, 0);
    
    // Formula matching (50%, 30%) to (100%, 100%):
    // 0.3 + ((achievement - 0.5) / 0.5) * 0.7
    const calculateStepFactor = (achievement: number) => {
      if (achievement < 0.5) return 0;
      return 0.3 + ((achievement - 0.5) / 0.5) * 0.7;
    };

    const stepFactor = calculateStepFactor(atingimentoPonderadoTotal);

    return (
      <div className="flex flex-col flex-1 space-y-6 min-h-0 overflow-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-5 shrink-0 shadow-2xl text-left">
          <div className="space-y-1">
            <h1 className="text-2xl font-black uppercase tracking-tighter bg-gradient-to-r from-purple-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent">
              Cálculo de Performance - CS
            </h1>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
              Demonstração detalhada de como calcular e simular a comissão e atingimento de metas do Customer Success.
            </p>
          </div>
        </header>

        <div className="flex-1 bg-slate-950/40 border border-white/5 rounded-3xl p-6 md:p-8 overflow-auto custom-scrollbar relative">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Main Interactive Box */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden text-left"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none" />

              {/* Title Section inside card */}
              <div className="space-y-1 mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Modelo Operacional</span>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">Como calcular o atingimento do CS</h2>
              </div>

              {/* Purple Description Alert */}
              <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-4 md:p-5 mb-8">
                <p className="text-xs text-indigo-300 font-semibold leading-relaxed">
                  O CS não tem cota financeira. O atingimento trimestral é calculado como média ponderada dos indicadores — esse número entra na curva de degraus exatamente como o atingimento financeiro do EV e do GA.
                </p>
              </div>

              {/* Responsive Table Card layout */}
              <div className="overflow-x-auto w-full">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 pb-2 text-[10px] text-slate-500 uppercase font-black tracking-wider text-center">
                      <th className="text-left pb-4 font-black">Indicador</th>
                      <th className="pb-4 font-black">Peso</th>
                      <th className="pb-4 font-black">Alvo do Trimestre</th>
                      <th className="pb-4 font-black">Realizado</th>
                      <th className="pb-4 font-black">Atingimento</th>
                      <th className="pb-4 font-black">Contribuição</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {calculatedIndicators.map((ind) => (
                      <tr key={ind.id} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 pr-4 text-left">
                          <span className="text-sm font-bold text-white block">{ind.name}</span>
                        </td>
                        <td className="py-4 text-center">
                          <span className="text-sm font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                            {(ind.weight * 100)}%
                          </span>
                        </td>
                        <td className="py-4 text-center font-mono text-sm font-semibold text-slate-400">
                          {ind.target}
                        </td>
                        <td className="py-4 text-center">
                          <input 
                            type="number"
                            min="0"
                            step="1"
                            value={ind.realized === 0 ? '' : ind.realized}
                            placeholder="0"
                            onChange={(e) => handleRealizedChange(ind.id, e.target.value)}
                            className="w-20 px-2 py-1 text-center bg-slate-950/60 hover:bg-slate-950/90 focus:bg-slate-950 border border-white/10 focus:border-indigo-500/80 rounded-lg text-white font-mono text-sm font-bold transition-all outline-none"
                          />
                        </td>
                        <td className="py-4 text-center">
                          <span className="text-xs font-black text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md">
                            {Math.round(ind.atingimento * 100)}%
                          </span>
                        </td>
                        <td className="py-4 text-center font-mono text-sm font-bold text-indigo-400">
                          {(ind.contrib_raw * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="bg-indigo-950/10 font-bold">
                      <td colSpan={5} className="py-5 text-left pl-2">
                        <span className="text-sm font-black text-white uppercase tracking-tight">Atingimento ponderado total</span>
                      </td>
                      <td className="py-5 text-center font-mono text-lg font-black text-indigo-400">
                        {(atingimentoPonderadoTotal * 100).toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>



            </motion.div>

          </div>
        </div>
      </div>
    );
  };

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
            Dimensionamento Time de Vendas
          </h1>
          <div className="mt-1">
            <span className="text-[10px] text-yellow-500 font-extrabold uppercase tracking-wide bg-yellow-500/10 px-2.5 py-1 rounded-[6px] border border-yellow-500/20 inline-block shadow-[0_2px_10px_rgba(234,179,8,0.05)]">
              A lista/ranking abaixo, considera as contas com faturamento acima de R$ 10k/mês + contas selecionadas por critérios específicos pelo time de Vendas
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400">Headcount Atual:</span>
          <input
            type="number"
            min="0"
            value={hcVendas}
            onChange={(e) => {
              const val = e.target.value;
              setHcVendas(val);
              localStorage.setItem('hc_vendas', val);
              if (user) {
                globalSettingsService.saveGlobalSettings({ hc_vendas: val }).catch(console.error);
              }
            }}
            className="w-24 bg-slate-950/80 border border-white/10 rounded-lg px-3 py-1 text-center font-mono font-bold text-sm text-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
          />
          <button
            onClick={saveHcVendas}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              isHcVendasSaving
                ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20"
                : "bg-slate-800 text-slate-300 border border-white/5 hover:bg-slate-700 active:scale-95"
            )}
          >
            {isHcVendasSaving ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-4 shrink-0">
        {[
          { 
            label: 'Aderência Contas (Top)', 
            value: salesTotals.totalClients, 
            sub: `${salesTotals.accountPercentage.toFixed(1)}% do total (${salesTotals.grandTotalAccounts})`,
            icon: Briefcase, color: 'text-sky-400', barColor: 'bg-sky-500' 
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
          { 
            label: 'Headcount Necessário', 
            value: salesTotals.totalHeadcount.toFixed(1), 
            sub: 'Sizing total consolidado',
            icon: Users, color: 'text-emerald-400', barColor: 'bg-emerald-500',
            extra: (() => {
              const actualSalesHC = parseFloat(hcVendas || '0');
              const gapSales = salesTotals.totalHeadcount - actualSalesHC;
              return (
                <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-col">
                  <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">GAP (vs Atual {actualSalesHC.toFixed(1)}):</span>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-wider mt-1 px-2 py-0.5 rounded border inline-block w-fit font-mono",
                    gapSales > 0 
                      ? "bg-amber-400/10 text-amber-400 border-amber-400/20" 
                      : gapSales < 0 
                      ? "bg-sky-400/10 text-sky-400 border-sky-400/20" 
                      : "bg-slate-800 text-slate-400 border-white/5"
                  )}>
                    {gapSales > 0 ? `+${gapSales.toFixed(1)} necessário` : gapSales < 0 ? `${gapSales.toFixed(1)} excedente` : '0.0 (Alinhado)'}
                  </span>
                </div>
              );
            })()
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
            {'extra' in stat && stat.extra}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar space-y-6 pb-10 scroll-smooth">
        <div className="grid grid-cols-4 gap-6 items-start">
          {(Object.entries(filteredSalesData) as Array<[string, { 
            clients: SalesClient[], 
            totalRevenue: number, 
            headcount: number,
            fixedHC: number,
            variableHC: number,
            gr: number,
            ev: number,
            gc: number
          }]>).map(([v, data]) => {
            const revenueParticipation = (data.totalRevenue / salesTotals.totalRevenue) * 100;

            return (
              <div key={v} className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden flex flex-col h-fit">
                <div className="bg-slate-950/50 p-6 border-b border-white/5 flex flex-col min-h-[480px]">
                  <div className="flex flex-col space-y-4 mb-6">
                    <div className="flex justify-end">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const vPascal = verticalMap[v];
                          const hasErrors = Object.keys(validationErrors).some(key => key.startsWith(vPascal));
                          if (unsavedVerticals.has(vPascal) && !isSyncing && !hasErrors) handleSave(vPascal);
                        }}
                        className={cn(
                          "flex items-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
                          unsavedVerticals.has(verticalMap[v]) && !Object.keys(validationErrors).some(key => key.startsWith(verticalMap[v]))
                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:scale-95" 
                            : "bg-slate-800/50 text-slate-600 border border-white/5 cursor-not-allowed",
                          isSyncing && "opacity-50 cursor-wait"
                        )}
                        disabled={isSyncing || !unsavedVerticals.has(verticalMap[v]) || Object.keys(validationErrors).some(key => key.startsWith(verticalMap[v]))}
                      >
                        {isSyncing ? (
                          <div className="w-3.5 h-3.5 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5 mr-2" />
                        )}
                        {unsavedVerticals.has(verticalMap[v]) ? 'Gravar' : 'Gravado'}
                      </button>
                    </div>
                    
                    <div className="flex flex-col space-y-1.5 pt-4 border-t border-white/5">
                      <h2 className="text-xl font-black text-white uppercase tracking-tight leading-none">{v}</h2>
                      <p className="text-[10px] font-black text-sky-500 uppercase tracking-[0.15em] opacity-80">{data.clients.length} Contas em carteira</p>
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

                    {/* Sizing inputs for Líder, EV and GC */}
                    <div className="bg-slate-950/35 p-3.5 rounded-2xl border border-white/5 space-y-3 shadow-inner">
                      {/* Líder Vertical Selection row */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] font-black uppercase text-slate-300">Líder Vertical</span>
                          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Liderança / Vertical</span>
                        </div>
                        <div className="flex items-center space-x-1.5 bg-slate-950 rounded-lg p-0.5 border border-white/5">
                          <button
                            type="button"
                            onClick={() => updateSalesHC(v, 'gr', parseFloat(Math.max(0, data.gr - 0.5).toFixed(1)))}
                            className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 text-xs font-black transition-all border border-white/5 flex items-center justify-center"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={data.gr}
                            onChange={(e) => updateSalesHC(v, 'gr', parseFloat(e.target.value) || 0)}
                            className="w-11 h-6 text-center bg-transparent text-white font-mono text-xs font-bold outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateSalesHC(v, 'gr', parseFloat((data.gr + 0.5).toFixed(1)))}
                            className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 text-xs font-black transition-all border border-white/5 flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* EV Selection row */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-white/5">
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] font-black uppercase text-slate-300">Executivo de Vendas (EV)</span>
                          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Ataque / Proporcional</span>
                        </div>
                        <div className="flex items-center space-x-1.5 bg-slate-950 rounded-lg p-0.5 border border-white/5">
                          <button
                            type="button"
                            onClick={() => updateSalesHC(v, 'ev', parseFloat(Math.max(0, data.ev - 0.5).toFixed(1)))}
                            className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 text-xs font-black transition-all border border-white/5 flex items-center justify-center"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={data.ev}
                            onChange={(e) => updateSalesHC(v, 'ev', parseFloat(e.target.value) || 0)}
                            className="w-11 h-6 text-center bg-transparent text-white font-mono text-xs font-bold outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateSalesHC(v, 'ev', parseFloat((data.ev + 0.5).toFixed(1)))}
                            className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 text-xs font-black transition-all border border-white/5 flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* GC Selection row */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-white/5">
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] font-black uppercase text-slate-300">Gerente de Contas (GC)</span>
                          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Defesa / Dedicado</span>
                        </div>
                        <div className="flex items-center space-x-1.5 bg-slate-950 rounded-lg p-0.5 border border-white/5">
                          <button
                            type="button"
                            onClick={() => updateSalesHC(v, 'gc', parseFloat(Math.max(0, data.gc - 0.5).toFixed(1)))}
                            className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 text-xs font-black transition-all border border-white/5 flex items-center justify-center"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={data.gc}
                            onChange={(e) => updateSalesHC(v, 'gc', parseFloat(e.target.value) || 0)}
                            className="w-11 h-6 text-center bg-transparent text-white font-mono text-xs font-bold outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateSalesHC(v, 'gc', parseFloat((data.gc + 0.5).toFixed(1)))}
                            className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 text-xs font-black transition-all border border-white/5 flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4 flex-1">
                      <div className="space-y-3">
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
                      <div className="p-4 space-y-2 h-full overflow-auto custom-scrollbar scroll-smooth">
                        {data.clients.map((c, idx) => {
                          const isKeyAccount = ['BRADESCO', 'ITAU UNIBANCO', 'SANTANDER BRASIL', 'BANCO DO BRASIL'].includes(c.name.toUpperCase());
                          const isPromotedLowTouch = c.revenue <= 10000.01;
                          return (
                            <div key={idx} className={cn(
                              "border rounded-xl p-3 flex justify-between items-center group transition-colors relative",
                              isKeyAccount 
                                ? "bg-amber-500/20 border-amber-500/40 hover:bg-amber-500/30 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]" 
                                : isPromotedLowTouch 
                                ? "bg-indigo-950/20 border-indigo-500/30 hover:bg-indigo-900/30 shadow-[0_2px_15px_rgba(99,102,241,0.1)]"
                                : "bg-white/5 border-white/5 hover:bg-white/10"
                            )}>
                              <div className="flex items-center space-x-3 min-w-0">
                                <span className={cn(
                                  "text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shrink-0",
                                  isKeyAccount ? "bg-amber-500/30 text-amber-400" : isPromotedLowTouch ? "bg-indigo-500/30 text-indigo-300" : "bg-white/5 text-slate-500"
                                )}>
                                  {idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <p className={cn("text-xs font-black truncate", isKeyAccount ? "text-amber-300" : "text-white")} title={c.name}>{c.name}</p>
                                    {isPromotedLowTouch && (
                                      <span className="text-[7px] font-black uppercase bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded tracking-wide shrink-0">
                                        Low-Touch Promovido
                                      </span>
                                    )}
                                  </div>
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
    const list = data.verticals
      .filter(v => selectedVerticals.includes(v.vertical))
      .flatMap(v => v.topClients);
    return [...list].sort((a, b) => b.revenue - a.revenue).slice(0, 20);
  }, [data, selectedVerticals]);

  const barData = useMemo(() => {
    const activeVerticals = data.verticals.filter(v => selectedVerticals.includes(v.vertical));
    const totalActiveRevenue = activeVerticals.reduce((sum, v) => sum + v.totalRevenue, 0);
    
    return activeVerticals.map(v => ({
      name: v.vertical,
      revenue: v.totalRevenue,
      clients: v.totalClients,
      users: v.totalUsers,
      ticket: v.averageTicket,
      fill: VERTICAL_COLORS[v.vertical],
      participation: totalActiveRevenue > 0 ? (v.totalRevenue / totalActiveRevenue) * 100 : 0
    })).sort((a, b) => b.revenue - a.revenue);
  }, [data, selectedVerticals]);

  const totals = useMemo(() => {
    const activeVerticals = data.verticals.filter(v => selectedVerticals.includes(v.vertical));
    const clients = activeVerticals.reduce((sum, v) => sum + v.totalClients, 0);
    const users = activeVerticals.reduce((sum, v) => sum + v.totalUsers, 0);
    const revenue = activeVerticals.reduce((sum, v) => sum + v.totalRevenue, 0);
    return {
      totalClients: clients,
      totalUsers: users,
      totalRevenue: revenue,
      averageTicket: clients > 0 ? revenue / clients : 0,
      usersPerClient: clients > 0 ? users / clients : 0
    };
  }, [data, selectedVerticals]);

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
    setOpSettings(prev => {
      const next = {
        ...prev,
        [vertical]: {
          ...prev[vertical],
          [field]: value
        }
      };
      localStorage.setItem('op_settings', JSON.stringify(next));
      if (user && !error) {
        verticalDataService.saveVertical(vertical, next[vertical], opParams[vertical]).catch(console.error);
      }
      return next;
    });
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
    setOpParams(prev => {
      const next = {
        ...prev,
        [vertical]: { ...prev[vertical], [field]: value }
      };
      localStorage.setItem('op_params', JSON.stringify(next));
      if (user && !error) {
        verticalDataService.saveVertical(vertical, opSettings[vertical], next[vertical]).catch(console.error);
      }
      return next;
    });
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
          <div className="flex bg-slate-950/50 p-1 rounded-xl border border-white/5 space-x-1">
            <button
              onClick={selectAllVerticals}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap border",
                isAllSelected 
                  ? "bg-sky-500/20 text-sky-400 border-sky-500/30 shadow-[0_0_20px_rgba(14,165,233,0.1)]" 
                  : "text-slate-500 border-transparent hover:text-slate-300"
              )}
            >
              Tudo
            </button>
            {(['Financeiro I', 'Financeiro II', 'Governo', 'Agro/Corp', 'Clientes PF'] as Vertical[]).map((v) => (
              <button
                key={v}
                onClick={() => toggleVerticalSelection(v)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap border flex items-center",
                  selectedVerticals.includes(v)
                    ? "bg-slate-900 text-white border-white/10 shadow-md"
                    : "text-slate-600 border-transparent hover:text-slate-550"
                )}
                style={{
                  borderLeftColor: selectedVerticals.includes(v) ? VERTICAL_COLORS[v] : undefined,
                  borderLeftWidth: selectedVerticals.includes(v) ? '3px' : undefined,
                }}
              >
                {v}
              </button>
            ))}
          </div>

          <button
            onClick={toggleTopClientsVisible}
            className={cn(
              "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all whitespace-nowrap border flex items-center space-x-1.5 shadow-lg",
              isTopClientsVisible 
                ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 shadow-[0_0_25px_rgba(99,102,241,0.15)]" 
                : "bg-slate-950/40 text-slate-500 border-white/5 hover:text-slate-300 hover:bg-slate-950/60"
            )}
            title={isTopClientsVisible ? "Ocultar classificação do Top 20" : "Exibir classificação do Top 20"}
          >
            {isTopClientsVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Top 20 Clientes</span>
          </button>
        </div>
      </header>

      {/* Stats Grid - High Contrast */}
      <div className="grid grid-cols-4 gap-4 h-24 shrink-0">
        {[
          { label: 'Total de Clientes', value: formatNumber(totals.totalClients), icon: Users, sub: isAllSelected ? `${data.verticals.length} Verticais` : `${selectedVerticals.length} de ${data.verticals.length} Selecionadas`, color: 'bg-indigo-500', tooltip: 'Volume de empresas com contratos ativos' },
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

      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden relative">
        {/* Main Dashboard Panel: Grows to 100% when Top 20 is collapsed */}
        <motion.div 
          layout
          className="flex-1 flex flex-col space-y-4 min-h-0 min-w-0"
        >
          <div className="grid grid-cols-2 gap-4 h-[40%] shrink-0">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 flex flex-col relative z-10 hover:z-30 focus-within:z-30 transition-all duration-300"
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
                      wrapperStyle={{ zIndex: 1000 }}
                      allowEscapeViewBox={{ x: true, y: true }}
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
              className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 flex flex-col relative z-10 hover:z-30 focus-within:z-30 transition-all duration-300"
            >
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center">
                <PieIcon className="w-3.5 h-3.5 mr-2 text-indigo-500" />
                Share de Faturamento
                <InfoTooltip text="Proporção do faturamento total gerado por cada pilar" />
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
                        wrapperStyle={{ zIndex: 1000 }}
                        allowEscapeViewBox={{ x: true, y: true }}
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
            <div className="flex-1 overflow-auto custom-scrollbar scroll-smooth">
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
                  {sortedVerticals.map((v: any, idx: number) => {
                    const isExpanded = !!expandedDetailVerticals[v.vertical];
                    return (
                      <Fragment key={v.vertical}>
                        <motion.tr 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          onClick={() => toggleVerticalSelection(v.vertical)}
                          className={cn(
                            "group cursor-pointer transition-all rounded-xl",
                            selectedVerticals.includes(v.vertical) 
                              ? isExpanded 
                                ? "bg-sky-500/15 border-sky-500/20" 
                                : "bg-sky-500/10 border-sky-500/10" 
                              : "bg-slate-950/5 border-transparent opacity-40 hover:opacity-75"
                          )}
                        >
                          <td className="px-4 py-3 first:rounded-l-xl border-y border-l border-white/5 group-hover:border-white/10">
                            <div className="flex items-center font-black text-white whitespace-nowrap">
                              <div 
                                className={cn(
                                  "w-3.5 h-3.5 rounded border mr-3 flex items-center justify-center transition-all shrink-0",
                                  selectedVerticals.includes(v.vertical)
                                    ? "border-sky-500 bg-sky-500 text-slate-950"
                                    : "border-slate-600 bg-transparent"
                                )}
                              >
                                {selectedVerticals.includes(v.vertical) && (
                                  <svg className="w-2 h-2 text-slate-950 fill-none stroke-current stroke-3" viewBox="0 0 24 24">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </div>
                              <div className="w-2 h-2 rounded-full mr-2 shrink-0" style={{ backgroundColor: VERTICAL_COLORS[v.vertical as Vertical] }} />
                              <span className="truncate mr-2 max-w-[120px]" title={v.vertical}>{v.vertical}</span>
                              
                              {/* Sleek expandable details trigger button */}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleDetailVertical(v.vertical);
                                }}
                                className={cn(
                                  "p-1 ml-auto rounded-lg transition-all border shrink-0 flex items-center justify-center",
                                  isExpanded
                                    ? "bg-sky-500/25 text-sky-400 border-sky-500/40 shadow-[0_0_10px_rgba(14,165,233,0.15)]"
                                    : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white"
                                )}
                                title={isExpanded ? "Recolher detalhes" : "Visualizar detalhamento por vertical"}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
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

                        {/* Collapsing sub-row with elegant modular metrics bento grid */}
                        {isExpanded && (
                          <tr className="bg-slate-950/40 border-x border-b border-white/5">
                            <td colSpan={6} className="px-4 py-4 rounded-b-xl">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden space-y-4"
                              >
                                <div className="grid grid-cols-12 gap-6 items-stretch text-left">
                                  {/* User-size categorization */}
                                  <div className="col-span-7 bg-slate-950/60 p-4 border border-white/5 rounded-2xl flex flex-col space-y-3 shadow-inner">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center shrink-0">
                                      <PieIcon className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                                      Clientes por Volume de Usuários (Tamanho)
                                    </h4>
                                    <div className="grid grid-cols-4 gap-2 flex-1 items-center">
                                      {[
                                        { label: 'Grande (51+)', count: v.sizeDistribution.grande, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
                                        { label: 'Médio (11-50)', count: v.sizeDistribution.medio, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                                        { label: 'Pequeno (3-10)', count: v.sizeDistribution.pequeno, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                                        { label: 'Micro (1-2)', count: v.sizeDistribution.micro, color: 'text-slate-400', bg: 'bg-slate-500/10 border-white/5' }
                                      ].map((porte) => (
                                        <div key={porte.label} className={cn("p-2.5 rounded-xl border flex flex-col justify-between items-center text-center h-full", porte.bg)}>
                                          <span className="text-[8px] font-black uppercase tracking-tight text-slate-500 leading-tight">
                                            {porte.label}
                                          </span>
                                          <span className={cn("text-lg font-black mt-1 leading-none", porte.color)}>
                                            {porte.count}
                                          </span>
                                          <span className="text-[8px] font-bold text-slate-600 mt-1 uppercase font-mono">
                                            {v.totalClients > 0 ? `${((porte.count / v.totalClients) * 100).toFixed(0)}%` : '0%'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* CS Active Settings Summary */}
                                  <div className="col-span-5 bg-slate-950/60 p-4 border border-white/5 rounded-2xl flex flex-col space-y-3 shadow-inner justify-between">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center">
                                      <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
                                      Atendimento de Sucesso (CS)
                                    </h4>
                                    <div className="grid grid-cols-3 gap-2">
                                      <div className="p-2 rounded-xl border border-white/5 bg-slate-900/50 flex flex-col justify-center text-center">
                                        <span className="text-[8px] font-bold text-slate-500 block uppercase">Visitas/Ano</span>
                                        <span className="text-sm font-black text-slate-200 block mt-0.5 font-mono">
                                          {opParams[v.vertical as Vertical]?.visitasAno ?? '0'}x
                                        </span>
                                      </div>
                                      <div className="p-2 rounded-xl border border-white/5 bg-slate-900/50 flex flex-col justify-center text-center">
                                        <span className="text-[8px] font-bold text-slate-500 block uppercase font-mono">Contatos/Ano</span>
                                        <span className="text-sm font-black text-slate-200 block mt-0.5">
                                          {opParams[v.vertical as Vertical]?.contatosRemotosAno ?? '0'}x
                                        </span>
                                      </div>
                                      <div className="p-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 flex flex-col justify-center text-center">
                                        <span className="text-[8px] font-bold text-indigo-400 block uppercase">Perfil</span>
                                        <span className="text-[10px] font-black text-white block mt-0.5 truncate uppercase">
                                          {getRecommendedProfile(opSettings[v.vertical as Vertical] || { suporteTreinamento: 0, relacionamento: 0, gestaoContratual: 0, capacidadeVisitasPresenciaisMes: 0, capacidadeContatosRemotosMes: 0, execCapacity: 0 })}
                                        </span>
                                      </div>
                                    </div>
                                    <p className="text-[8.5px] text-slate-500 italic text-center uppercase tracking-tighter leading-none mt-1">
                                      Calibração operacional vinculada à vertical
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
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
        </motion.div>

        {/* Top 20 Slider Panel: Slides smoothly from right to left */}
        <AnimatePresence>
          {isTopClientsVisible && (
            <motion.div
              layout
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="w-[380px] shrink-0 flex flex-col min-h-0 bg-slate-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 to-indigo-500" />
              <div className="p-5 border-b border-white/5 flex items-center justify-between bg-slate-950/20 shrink-0">
                <div className="flex flex-col space-y-1">
                  <h3 className="text-sm font-black text-white flex items-center uppercase tracking-wider">
                    Top 20 Clientes {!isAllSelected && `(${selectedVerticals.length} Sel.)`}
                  </h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    Ordenado por Volume (MRR)
                  </p>
                </div>
                {/* Compact Collapse Indicator */}
                <button
                  onClick={toggleTopClientsVisible}
                  className="p-1 px-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all text-[8.5px] font-bold uppercase tracking-wider flex items-center space-x-1 border border-white/5 active:scale-95"
                  title="Recolher classificação"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>Ocultar</span>
                </button>
              </div>
              <div className="flex-1 overflow-auto custom-scrollbar scroll-smooth">
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
            </motion.div>
          )}
        </AnimatePresence>
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
          Dimensionamento Customer Success
        </h1>

        <div className="flex items-center space-x-3 bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400">Headcount Atual:</span>
          <input
            type="number"
            min="0"
            value={hcOperational}
            onChange={(e) => {
              const val = e.target.value;
              setHcOperational(val);
              localStorage.setItem('hc_operational', val);
              if (user) {
                globalSettingsService.saveGlobalSettings({ hc_operational: val }).catch(console.error);
              }
            }}
            className="w-24 bg-slate-950/80 border border-white/10 rounded-lg px-3 py-1 text-center font-mono font-bold text-sm text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
          <button
            onClick={saveHcOperational}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              isHcOperationalSaving
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                : "bg-slate-800 text-slate-300 border border-white/5 hover:bg-slate-700 active:scale-95"
            )}
          >
            {isHcOperationalSaving ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto custom-scrollbar space-y-6 pb-10 scroll-smooth">
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
                  Headcount Total Necessário
                  <InfoTooltip text="Projeção de força de trabalho consolidada" />
                </div>
                <div className="flex items-baseline space-x-2">
                  <p className="text-5xl font-black text-emerald-400 tracking-tighter">{opStatsSummary.totalHC.toFixed(1)}</p>
                </div>

                {/* Highlighted GAP for Customer Success */}
                {(() => {
                  const actualCSHC = parseFloat(hcOperational || '0');
                  const gapCS = opStatsSummary.totalHC - actualCSHC;
                  return (
                    <div className="mt-3">
                      <div className={cn(
                        "px-3 py-2 rounded-xl border flex flex-col",
                        gapCS > 0 
                          ? "bg-amber-400/10 border-amber-400/20" 
                          : gapCS < 0 
                          ? "bg-sky-400/10 border-sky-400/20" 
                          : "bg-slate-800/50 border-white/5"
                      )}>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">GAP (vs Atual {actualCSHC.toFixed(1)}):</span>
                        <span className={cn(
                          "text-xs font-black font-mono mt-0.5",
                          gapCS > 0 ? "text-amber-400" : gapCS < 0 ? "text-sky-400" : "text-slate-400"
                        )}>
                          {gapCS > 0 ? `+${gapCS.toFixed(1)} necessário` : gapCS < 0 ? `${gapCS.toFixed(1)} excedente` : '0.0 (Alinhado)'}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <p className="text-[9px] text-slate-500 font-medium mt-3 leading-relaxed">
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
                Nova Estrutura Vendas 2026
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
          <div 
            onClick={() => setCurrentView('premissas')}
            className="flex items-center px-1 mb-10 overflow-hidden cursor-pointer hover:opacity-80 transition-all"
            title="Voltar para Premissas"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20 mr-4 shrink-0">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col"
              >
                <span className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase leading-none mb-1">Nova Estrutura</span>
                <span className="text-lg font-black text-white tracking-tighter leading-none whitespace-nowrap uppercase">Vendas 2026</span>
              </motion.div>
            )}
          </div>

          <nav className="space-y-1 relative">
            {/* Premissas (Home/Strategic assumptions) */}
            <button
              onClick={() => setCurrentView('premissas')}
              className={cn(
                "w-full flex items-center px-4 py-3 rounded-xl transition-all duration-300 group relative",
                currentView === 'premissas'
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}
            >
              {currentView === 'premissas' && (
                <motion.div 
                  layoutId="activeNavBg"
                  className="absolute inset-0 bg-white/10 rounded-xl shadow-lg shadow-black/20"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                />
              )}
              <Home className={cn(
                "w-5 h-5 mr-4 transition-all duration-300 shrink-0 z-10",
                currentView === 'premissas' ? "text-sky-400" : "group-hover:text-slate-400"
              )} />
              {!isSidebarCollapsed && (
                <span className="text-sm font-black uppercase tracking-tighter transition-opacity whitespace-nowrap z-10">Premissas</span>
              )}
              {currentView === 'premissas' && (
                <motion.div 
                  layoutId="activeNavStripe"
                  className="absolute left-0 w-1 h-6 bg-sky-400 rounded-r-full z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>

            {/* Visão Geral (Dashboard) */}
            <button
              onClick={() => setCurrentView('dashboard')}
              className={cn(
                "w-full flex items-center px-4 py-3 rounded-xl transition-all duration-300 group relative",
                currentView === 'dashboard'
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}
            >
              {currentView === 'dashboard' && (
                <motion.div 
                  layoutId="activeNavBg"
                  className="absolute inset-0 bg-white/10 rounded-xl shadow-lg shadow-black/20"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                />
              )}
              <LayoutDashboard className={cn(
                "w-5 h-5 mr-4 transition-all duration-300 shrink-0 z-10",
                currentView === 'dashboard' ? "text-sky-400" : "group-hover:text-slate-400"
              )} />
              {!isSidebarCollapsed && (
                <span className="text-sm font-black uppercase tracking-tighter transition-opacity whitespace-nowrap z-10">Visão Geral</span>
              )}
              {currentView === 'dashboard' && (
                <motion.div 
                  layoutId="activeNavStripe"
                  className="absolute left-0 w-1 h-6 bg-sky-400 rounded-r-full z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>

            {/* Estrutura Ideal */}
            <button
              onClick={() => setCurrentView('estrutura_ideal')}
              className={cn(
                "w-full flex items-center px-4 py-3 rounded-xl transition-all duration-300 group relative",
                currentView === 'estrutura_ideal'
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}
            >
              {currentView === 'estrutura_ideal' && (
                <motion.div 
                  layoutId="activeNavBg"
                  className="absolute inset-0 bg-white/10 rounded-xl shadow-lg shadow-black/20"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                />
              )}
              <Briefcase className={cn(
                "w-5 h-5 mr-4 transition-all duration-300 shrink-0 z-10",
                currentView === 'estrutura_ideal' ? "text-sky-400" : "group-hover:text-slate-400"
              )} />
              {!isSidebarCollapsed && (
                <span className="text-sm font-black uppercase tracking-tighter transition-opacity whitespace-nowrap z-10">Estrutura Ideal</span>
              )}
              {currentView === 'estrutura_ideal' && (
                <motion.div 
                  layoutId="activeNavStripe"
                  className="absolute left-0 w-1 h-6 bg-sky-400 rounded-r-full z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>

            {/* Organograma */}
            <button
              onClick={() => setCurrentView('organograma')}
              className={cn(
                "w-full flex items-center px-4 py-3 rounded-xl transition-all duration-300 group relative",
                currentView === 'organograma'
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}
            >
              {currentView === 'organograma' && (
                <motion.div 
                  layoutId="activeNavBg"
                  className="absolute inset-0 bg-white/10 rounded-xl shadow-lg shadow-black/20"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                />
              )}
              <BarChart3 className={cn(
                "w-5 h-5 mr-4 transition-all duration-300 shrink-0 z-10",
                currentView === 'organograma' ? "text-sky-400" : "group-hover:text-slate-400"
              )} />
              {!isSidebarCollapsed && (
                <span className="text-sm font-black uppercase tracking-tighter transition-opacity whitespace-nowrap z-10">Organograma</span>
              )}
              {currentView === 'organograma' && (
                <motion.div 
                  layoutId="activeNavStripe"
                  className="absolute left-0 w-1 h-6 bg-sky-400 rounded-r-full z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>

            {/* Os Três Papéis */}
            <button
              onClick={() => setCurrentView('tres_papeis')}
              className={cn(
                "w-full flex items-center px-4 py-3 rounded-xl transition-all duration-300 group relative",
                currentView === 'tres_papeis'
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}
            >
              {currentView === 'tres_papeis' && (
                <motion.div 
                  layoutId="activeNavBg"
                  className="absolute inset-0 bg-white/10 rounded-xl shadow-lg shadow-black/20"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                />
              )}
              <Target className={cn(
                "w-5 h-5 mr-4 transition-all duration-300 shrink-0 z-10",
                currentView === 'tres_papeis' ? "text-sky-400" : "group-hover:text-slate-400"
              )} />
              {!isSidebarCollapsed && (
                <span className="text-sm font-black uppercase tracking-tighter transition-opacity whitespace-nowrap z-10">Os Três Papéis</span>
              )}
              {currentView === 'tres_papeis' && (
                <motion.div 
                  layoutId="activeNavStripe"
                  className="absolute left-0 w-1 h-6 bg-sky-400 rounded-r-full z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>

            {/* SIZING Accordion */}
            <div className="space-y-1">
              <button
                onClick={() => setIsSizingExpanded(!isSizingExpanded)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group relative",
                  (currentView === 'operational' || currentView === 'executivos' || currentView === 'low_touch')
                    ? "text-slate-200 bg-white/5"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                )}
              >
                <div className="flex items-center">
                  <Scale className={cn(
                    "w-5 h-5 mr-4 transition-all duration-300 shrink-0 z-10",
                    (currentView === 'operational' || currentView === 'executivos' || currentView === 'low_touch')
                      ? "text-sky-400"
                      : "group-hover:text-slate-400"
                  )} />
                  {!isSidebarCollapsed && (
                    <span className="text-sm font-black uppercase tracking-tighter transition-opacity whitespace-nowrap z-10">Sizing</span>
                  )}
                </div>
                {!isSidebarCollapsed && (
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform duration-300 text-slate-500 group-hover:text-slate-300 z-10",
                    isSizingExpanded ? "rotate-180" : ""
                  )} />
                )}
              </button>

              {/* Sub-items */}
              {isSizingExpanded && (
                <div className={cn("space-y-1 relative", !isSidebarCollapsed && "pl-4 ml-6 border-l border-white/10")}>
                  {[
                    { id: 'operational', label: 'Customer Success', icon: ShieldCheck },
                    { id: 'executivos', label: 'Time de Vendas (EV/GC)', icon: Users },
                    { id: 'low_touch', label: 'Clientes Low-touch', icon: Zap },
                  ].map((subItem) => (
                    <button
                      key={subItem.id}
                      onClick={() => setCurrentView(subItem.id as View)}
                      className={cn(
                        "w-full flex items-center px-4 py-2.5 rounded-xl transition-all duration-300 group relative",
                        currentView === subItem.id 
                          ? "text-white" 
                          : "text-slate-300 hover:text-slate-100 hover:bg-white/5"
                      )}
                    >
                      {currentView === subItem.id && (
                        <motion.div 
                          layoutId="activeNavBg"
                          className="absolute inset-0 bg-white/10 rounded-xl shadow-lg shadow-black/20"
                          transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                        />
                      )}
                      
                      <subItem.icon className={cn(
                        "w-4 h-4 mr-3 transition-all duration-300 shrink-0 z-10",
                        currentView === subItem.id ? "text-sky-400" : "group-hover:text-slate-200"
                      )} />
                      {!isSidebarCollapsed && (
                        <span className="text-xs font-black uppercase tracking-tighter transition-opacity whitespace-nowrap z-10">{subItem.label}</span>
                      )}
                      
                      {currentView === subItem.id && (
                        <motion.div 
                          layoutId="activeNavStripe"
                          className="absolute left-0 w-1 h-5 bg-sky-400 rounded-r-full z-10"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Performance CS */}
            <button
              onClick={() => setCurrentView('performance_cs')}
              className={cn(
                "w-full flex items-center px-4 py-3 rounded-xl transition-all duration-300 group relative",
                currentView === 'performance_cs'
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}
            >
              {currentView === 'performance_cs' && (
                <motion.div 
                  layoutId="activeNavBg"
                  className="absolute inset-0 bg-white/10 rounded-xl shadow-lg shadow-black/20"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                />
              )}
              <ShieldCheck className={cn(
                "w-5 h-5 mr-4 transition-all duration-300 shrink-0 z-10",
                currentView === 'performance_cs' ? "text-sky-400" : "group-hover:text-slate-400"
              )} />
              {!isSidebarCollapsed && (
                <span className="text-sm font-black uppercase tracking-tighter transition-opacity whitespace-nowrap z-10">Performance CS</span>
              )}
              {currentView === 'performance_cs' && (
                <motion.div 
                  layoutId="activeNavStripe"
                  className="absolute left-0 w-1 h-6 bg-sky-400 rounded-r-full z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>

            {/* 3Q2026 (Highlights in Yellow, Starred, Last Item) */}
            <button
              onClick={() => setCurrentView('plano_a')}
              className={cn(
                "w-full flex items-center px-4 py-3 rounded-xl transition-all duration-300 group relative border",
                currentView === 'plano_a'
                  ? "text-yellow-300 bg-yellow-500/15 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.15)]"
                  : "text-yellow-500/80 bg-yellow-500/5 border-yellow-500/15 hover:text-yellow-300 hover:bg-yellow-500/10"
              )}
            >
              {currentView === 'plano_a' && (
                <motion.div 
                  layoutId="activeNavBg"
                  className="absolute inset-0 bg-yellow-500/10 rounded-xl"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                />
              )}
              <Star className={cn(
                "w-5 h-5 mr-4 transition-all duration-300 shrink-0 z-10 fill-yellow-500/20",
                currentView === 'plano_a' ? "text-yellow-400 scale-110" : "text-yellow-500 group-hover:text-yellow-400"
              )} />
              {!isSidebarCollapsed && (
                <span className="text-sm font-black uppercase tracking-tighter transition-opacity whitespace-nowrap z-10 flex items-center gap-1.5">
                  3Q2026
                </span>
              )}
              {currentView === 'plano_a' && (
                <motion.div 
                  layoutId="activeNavStripe"
                  className="absolute left-0 w-1 h-6 bg-yellow-400 rounded-r-full z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
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
      <main className="flex-1 flex flex-col min-w-0 p-6 relative overflow-y-auto scroll-smooth">
        <AnimatePresence mode="wait">
          {currentView === 'premissas' ? (
            <motion.div 
              key="premissas"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex-1 flex flex-col min-h-0"
            >
              {renderPremissas()}
            </motion.div>
          ) : currentView === 'dashboard' ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex-1 flex flex-col min-h-0"
            >
              {renderDashboard()}
            </motion.div>
          ) : currentView === 'estrutura_ideal' ? (
            <motion.div 
              key="estrutura_ideal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex-1 flex flex-col min-h-0"
            >
              {renderEstruturaIdeal()}
            </motion.div>
          ) : currentView === 'operational' ? (
            <motion.div 
              key="operational"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex-1 flex flex-col min-h-0"
            >
              {renderOperational()}
            </motion.div>
          ) : currentView === 'executivos' ? (
            <motion.div 
              key="executivos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex-1 flex flex-col min-h-0"
            >
              {renderExecutivos()}
            </motion.div>
          ) : currentView === 'low_touch' ? (
            <motion.div 
              key="low_touch"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex-1 flex flex-col min-h-0"
            >
              {renderLowTouch()}
            </motion.div>
          ) : currentView === 'organograma' ? (
            <motion.div 
              key="organograma"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex-1 flex flex-col min-h-0"
            >
              {renderOrganograma()}
            </motion.div>
          ) : currentView === 'plano_a' ? (
            <motion.div 
              key="plano_a"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex-1 flex flex-col min-h-0"
            >
              {renderPlanoA()}
            </motion.div>
          ) : currentView === 'tres_papeis' ? (
            <motion.div 
              key="tres_papeis"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex-1 flex flex-col min-h-0"
            >
              {renderTresPapeis()}
            </motion.div>
          ) : (
            <motion.div 
              key="performance_cs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex-1 flex flex-col min-h-0"
            >
              {renderPerformanceCS()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
