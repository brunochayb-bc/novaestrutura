import { useState, useEffect } from 'react';
import { 
  Briefcase, 
  ShieldCheck, 
  Globe, 
  Zap, 
  Check, 
  Info, 
  TrendingUp, 
  Target, 
  Clock, 
  Plus, 
  Minus, 
  ChevronRight, 
  Percent, 
  Building2, 
  AlertTriangle,
  ArrowUpRight,
  Database
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell 
} from 'recharts';
import { cn } from '../lib/utils';

interface PlanoVendasProps {
  subView: 'resumo' | 'organograma' | 'financeiro' | 'agro_corp' | 'governo' | 'low_touch';
  setSubView: (view: 'resumo' | 'organograma' | 'financeiro' | 'agro_corp' | 'governo' | 'low_touch') => void;
}

export default function PlanoVendasVertical({ subView, setSubView }: PlanoVendasProps) {
  // Checklist State loaded from localStorage
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('plano_vendas_checklist');
      return stored ? JSON.parse(stored) : {
        step1: false,
        step2: false,
        step3: false,
        step4: false,
        step5: false,
      };
    } catch {
      return {
        step1: false,
        step2: false,
        step3: false,
        step4: false,
        step5: false,
      };
    }
  });

  const toggleChecklist = (id: string) => {
    const updated = { ...checklist, [id]: !checklist[id] };
    setChecklist(updated);
    localStorage.setItem('plano_vendas_checklist', JSON.stringify(updated));
  };

  // Directives table state
  const [searchTerm, setSearchTerm] = useState('');
  const [pillarFilter, setPillarFilter] = useState<'todos' | 'defesa' | 'ataque'>('todos');

  // Financeiro Simulator State
  const [finBaseARR, setFinBaseARR] = useState(12000000);
  const [finCurrentChurn, setFinCurrentChurn] = useState(12);
  const [finPipeline, setFinPipeline] = useState(28000000);
  const [finNewSaaS, setFinNewSaaS] = useState(1500000);

  // Agro/Corp Simulator State
  const [agroBaseARR, setAgroBaseARR] = useState(8000000);
  const [agroTargetLogos, setAgroTargetLogos] = useState(40);
  const [agroRealizedLogos, setAgroRealizedLogos] = useState(15);
  const [agroPipeline, setAgroPipeline] = useState(18000000);
  const [agroCurrentWinRate, setAgroCurrentWinRate] = useState(18);
  const [agroTargetWinRate, setAgroTargetWinRate] = useState(25);

  // Governo Simulator State
  const [govBaseARR, setGovBaseARR] = useState(5000000);
  const [govMappedBids, setGovMappedBids] = useState(8);
  const [govAvgBidSize, setGovAvgBidSize] = useState(800000);
  const [govBidWinRate, setGovBidWinRate] = useState(30);
  const [govRenewalRate, setGovRenewalRate] = useState(85);
  const [govPipeline, setGovPipeline] = useState(12000000);

  // Low-Touch Simulator State
  const [ltBaseARR, setLtBaseARR] = useState(2500000);
  const [ltTraffic, setLtTraffic] = useState(60000);
  const [ltConversion, setLtConversion] = useState(2.2);
  const [ltTicket, setLtTicket] = useState(280);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const getValueStyle = (val: string) => {
    if (!val) return "";
    if (val === 'Sim') return "text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20";
    if (val.includes('−30%') || val.includes('Redução') || val.includes('Mínimo')) {
      return "text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20";
    }
    if (val === '3×' || val === '2×') {
      return "text-sky-400 font-mono font-black bg-sky-500/10 px-2.5 py-0.5 rounded-lg border border-sky-500/20";
    }
    if (val === 'Alta prioridade' || val === 'Elevar' || val === 'Alta prioridade (Corp)') {
      return "text-orange-400 font-bold bg-orange-500/10 px-2.5 py-0.5 rounded-lg border border-orange-500/20";
    }
    if (val === 'Seletivo' || val === 'Padrão') {
      return "text-slate-400 bg-slate-850/60 px-2.5 py-0.5 rounded-lg border border-white/5";
    }
    return "text-slate-300 bg-slate-900/40 px-2 py-0.5 rounded-lg border border-white/5";
  };

  const renderEffortBadgeMini = (defesa: number, ataque: number) => {
    return (
      <div className="flex flex-col space-y-1 mt-1 text-left shrink-0">
        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block">
          Esforço Calibrado 3Q
        </span>
        <div className="flex items-center space-x-2.5">
          <div className="w-32 h-2.5 bg-slate-950 rounded-full p-0.5 border border-white/10 flex overflow-hidden">
            <div 
              style={{ width: `${defesa}%` }} 
              className="h-full bg-emerald-500 rounded-l-full transition-all duration-500" 
            />
            <div 
              style={{ width: `${ataque}%` }} 
              className="h-full bg-orange-500 rounded-r-full transition-all duration-500" 
            />
          </div>
          <div className="flex items-center space-x-1.5 text-[10px] font-black font-mono">
            <span className="text-emerald-400">{defesa}% Def</span>
            <span className="text-slate-600">|</span>
            <span className="text-orange-400">{ataque}% Atq</span>
          </div>
        </div>
      </div>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-white/10 rounded-xl p-3 shadow-2xl backdrop-blur-md">
          <p className="text-xs font-black text-white uppercase tracking-wider mb-2">
            {payload[0].payload.name}
          </p>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between space-x-6">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Defesa da Base:
              </span>
              <span className="font-mono font-bold text-emerald-400">
                {payload[0].value}%
              </span>
            </div>
            <div className="flex items-center justify-between space-x-6">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                Ataque / Expansão:
              </span>
              <span className="font-mono font-bold text-orange-400">
                {payload[1].value}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // 1. Resumo Executivo rendering helper
  const renderResumo = () => {
    const chartData = [
      { name: 'Agro / Corp', Defesa: 80, Ataque: 20 },
      { name: 'Financeiro', Defesa: 70, Ataque: 30 },
      { name: 'Governo', Defesa: 35, Ataque: 65 },
      { name: 'Low-Touch', Defesa: 0, Ataque: 100 },
    ];

    const directives = [
      { id: '1', dir: 'Cobertura de pipeline', fin: '3×', agro: '2×', gov: '2×', pilar: 'Ataque' },
      { id: '2', dir: 'Novos CNPJs (expansão base)', fin: 'Seletivo', agro: 'Alta prioridade', gov: 'Alta prioridade', pilar: 'Ataque' },
      { id: '3', dir: 'Win rate de novos produtos', fin: 'Elevar', agro: 'Alta prioridade', gov: 'Alta prioridade', pilar: 'Ataque' },
      { id: '4', dir: 'Redução de churn', fin: 'Redução de 20%', agro: 'Redução de 30%', gov: 'Redução de 10%', pilar: 'Defesa' },
      { id: '5', dir: 'Mapeamento de risco + NAU', fin: 'Prioritário', agro: 'Sim', gov: 'Sim', pilar: 'Defesa' },
      { id: '6', dir: 'Gestão de renovações contratuais', fin: 'Padrão', agro: 'Alta prioridade (Corp)', gov: 'Alta prioridade', pilar: 'Defesa' },
      { id: '7', dir: 'Diversificação SaaS no tier 1', fin: 'Prioritária', agro: 'Sim', gov: 'Sim', pilar: 'Ataque' },
      { id: '9', dir: 'Relacionamento C-level (tier 1 e 2)', fin: 'Prioritário', agro: 'Sim', gov: 'Sim', pilar: 'Ambos' },
    ];

    const filteredDirectives = directives.filter(d => {
      const matchSearch = d.dir.toLowerCase().includes(searchTerm.toLowerCase());
      const matchFilter = 
        pillarFilter === 'todos' || 
        d.pilar.toLowerCase() === pillarFilter || 
        (pillarFilter === 'todos') ||
        (d.pilar === 'Ambos');
      return matchSearch && matchFilter;
    });

    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Sumário Executivo Intro */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900/65 border border-white/10 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center space-x-2 text-yellow-500 text-xs font-black uppercase tracking-wider mb-2">
                <Briefcase className="w-4 h-4 text-yellow-400 animate-pulse" />
                <span>1. Sumário Executivo</span>
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4">
                Reestruturação Comercial por Vertical — Produtividade e Eficiência
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed space-y-2">
                Este plano comercial fundamenta a reestruturação da nossa operação de vendas em torno de três verticais — <strong className="text-white">Financeiro, Agro/Corp e Governo</strong>. Cada uma operando sob um modelo robusto de dois pilares: <strong className="text-emerald-400 font-bold uppercase tracking-wide">Defesa</strong> (da base instalada) e <strong className="text-orange-400 font-bold uppercase tracking-wide">Ataque</strong> (de novos mercados e expansão).
              </p>
              <p className="text-sm text-slate-400 leading-relaxed mt-3">
                Os pesos são calibrados de acordo com a maturidade e o potencial de caça de cada segmento de mercado. Reduziremos o vazamento de receita e reativaremos o não-uso (NAU) de nossos produtos.
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/5 mt-6">
              <div className="text-left bg-slate-950/60 p-3 rounded-xl border border-white/5 shadow-inner">
                <span className="text-[10px] text-slate-500 font-black uppercase block">Cobertura Pipeline</span>
                <span className="text-base font-black text-sky-400 font-mono">2× a 3×</span>
              </div>
              <div className="text-left bg-slate-950/60 p-3 rounded-xl border border-white/5 shadow-inner">
                <span className="text-[10px] text-slate-500 font-black uppercase block">Meta Redução Churn</span>
                <span className="text-base font-black text-emerald-400 font-mono">-30%</span>
              </div>
              <div className="text-left bg-slate-950/60 p-3 rounded-xl border border-white/5 shadow-inner">
                <span className="text-[10px] text-slate-500 font-black uppercase block">Foco Clientes</span>
                <span className="text-base font-black text-indigo-400 font-mono">Tier 1 & 2</span>
              </div>
              <div className="text-left bg-slate-950/60 p-3 rounded-xl border border-white/5 shadow-inner">
                <span className="text-[10px] text-slate-500 font-black uppercase block">Aumentar Win-Rate</span>
                <span className="text-xs font-black text-orange-500 uppercase block tracking-tight mt-1">Novas Soluções (SaaS)</span>
              </div>
            </div>
          </div>
 
          <div className="bg-slate-900/65 border border-white/10 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center space-x-2 text-yellow-500 text-xs font-black uppercase tracking-wider mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>2. Alocação de Esforço por Vertical</span>
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-2">
                Balizamento de Esforço
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Distribuição de prioridades calibrada conforme o volume de ARR e maturidade da base de cada área.
              </p>
            </div>
 
            <div className="h-44 w-full my-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
                  <XAxis type="number" stroke="#64748b" fontSize={10} domain={[0, 100]} unit="%" />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={80} tickLine={false} axisLine={false} className="font-bold text-white" />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                  <Bar dataKey="Defesa" stackId="a" fill="#10b981" name="Defesa (%)" radius={[4, 0, 0, 4]} />
                  <Bar dataKey="Ataque" stackId="a" fill="#f97316" name="Ataque (%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
 
            <div className="flex items-center justify-between text-xs pt-3 mt-2 border-t border-white/5">
              <div className="flex items-center space-x-2 bg-emerald-950/20 px-2.5 py-1 rounded-lg border border-emerald-500/10">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm shrink-0" />
                <span className="text-emerald-400 font-bold text-[10px] uppercase">Defesa da Base</span>
              </div>
              <div className="flex items-center space-x-2 bg-orange-950/20 px-2.5 py-1 rounded-lg border border-orange-500/10">
                <div className="w-2.5 h-2.5 bg-orange-500 rounded-sm shrink-0" />
                <span className="text-orange-400 font-bold text-[10px] uppercase">Ataque / Expansão</span>
              </div>
            </div>
          </div>
        </div>

        {/* Por que mudar a estrutura */}
        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6">
          <div className="flex items-center space-x-2 text-yellow-500 text-xs font-black uppercase tracking-wider mb-2">
            <Info className="w-4 h-4" />
            <span>3. Por que Mudar a Estrutura Comercial</span>
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4">
            Alavancas Estruturais de Mudança
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            A operação anterior aplicava modelo comercial homogêneo, gerando ineficiência: a receita recorrente madura estava exposta ao churn e desuso (NAU), enquanto o potencial de expansão e upsell estava sub-capturado. A reestruturação corrige isso através de 3 eixos:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-950/50 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-amber-400 font-mono text-sm font-black block mb-2">01. ESPECIALIZAÇÃO</span>
                <h4 className="text-sm font-black text-white uppercase mb-2">Pilar e Vertical Dedicados</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Times e rituais separados para Defesa (mitigação de riscos, retenção de NAU, renovações contratuais) e Ataque (novos CNPJs, upsell e cross-sell, win rate de novos módulos SaaS).
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 text-[10px] font-black text-amber-500">
                MÁXIMO ENGAJAMENTO POR PAPEL
              </div>
            </div>

            <div className="bg-slate-950/50 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-yellow-400 font-mono text-sm font-black block mb-2">02. EFICIÊNCIA E PRODUTIVIDADE</span>
                <h4 className="text-sm font-black text-white uppercase mb-2">Prospecção Acelerada</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Explorar oportunidades de crescimento e expansão de receita aumentando a cobertura do pipeline e maximizando o tempo para prospecção e novos negócios.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 text-[10px] font-black text-yellow-500">
                ALINHAMENTO COM DECISORES
              </div>
            </div>

            <div className="bg-slate-950/50 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-amber-500 font-mono text-sm font-black block mb-2">03. FORTALECER DEFESA</span>
                <h4 className="text-sm font-black text-white uppercase mb-2">Blindagem de Base</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  defender a base, identificar riscos, gerir renovações contratuais com foco em otimização e identificação de novas oportunidades para upsell e cross-sell.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 text-[10px] font-black text-amber-500">
                SCORE COMBINADO E AUDITORIA
              </div>
            </div>
          </div>
        </div>

        {/* Diretrizes Consolidadas e Matriz de Ação */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center space-x-2 text-yellow-500 text-xs font-black uppercase tracking-wider mb-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>4. Diretrizes Transversais por Pilar</span>
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                Matriz Consolidada de Diretrizes
              </h2>
            </div>
 
            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3">
              <input 
                type="text" 
                placeholder="Pesquisar diretriz..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950/70 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-500/40 w-44 transition-all"
              />
              <div className="flex bg-slate-950/50 rounded-xl p-0.5 border border-white/10">
                {(['todos', 'defesa', 'ataque'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setPillarFilter(filter)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all",
                      pillFilterIsActive(filter) 
                        ? filter === 'defesa'
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                          : filter === 'ataque'
                            ? "bg-orange-500/20 text-orange-400 border border-orange-500/20"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/20"
                        : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>
 
          {/* Table Container */}
          <div className="overflow-x-auto rounded-xl border border-white/5 shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/65 font-mono text-[10px] font-bold text-slate-400 uppercase border-b border-white/15">
                  <th className="py-3.5 px-4 w-1/3">Diretriz Transversal</th>
                  <th className="py-3.5 px-4">Financeiro</th>
                  <th className="py-3.5 px-4">Agro / Corp</th>
                  <th className="py-3.5 px-4">Governo</th>
                  <th className="py-3.5 px-4 text-right">Pilar Operacional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {filteredDirectives.length > 0 ? (
                  filteredDirectives.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-950/30 transition-all font-medium">
                      <td className="py-3.5 px-4 text-white font-semibold flex items-center gap-2">
                        <span className={cn(
                          "w-2 h-2 rounded-full shrink-0 shadow-sm",
                          row.pilar === 'Defesa' ? "bg-emerald-500 shadow-emerald-550/50" :
                          row.pilar === 'Ataque' ? "bg-orange-500 shadow-orange-500/50" :
                          "bg-sky-400 shadow-sky-450/50"
                        )} />
                        {row.dir}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={getValueStyle(row.fin)}>{row.fin}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={getValueStyle(row.agro)}>{row.agro}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={getValueStyle(row.gov)}>{row.gov}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={cn(
                          "text-[9px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider font-mono border",
                          row.pilar === 'Defesa' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                          row.pilar === 'Ataque' ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                          "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                        )}>
                          {row.pilar}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500 font-bold">Nenhuma diretriz coincide com sua pesquisa.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Roadmap de Próximos Passos */}
        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6">
          <div className="flex items-center space-x-2 text-yellow-500 text-xs font-black uppercase tracking-wider mb-2">
            <Clock className="w-4 h-4" />
            <span>5. Próximos Passos e Governança</span>
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4">
            Plano de Ação de Governança
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            As metas são acompanhadas via rituais semanais de forecast, focado na cobertura do pipeline, e revisões mensais de progresso de score combinado. Clique nas ações abaixo para gerenciar o progresso do plano de reestruturação:
          </p>

          <div className="space-y-3">
            {[
              { id: 'step1', title: 'Validar os pesos de defesa/ataque', subtitle: 'Especificamente alinhar os 35/65 de Governo e os 60/40 de Agro/Corp com lideranças comerciais.' },
              { id: 'step2', title: 'Definir a linha de base de churn por vertical', subtitle: 'Calcular a linha de partida real de churn de seats para poder auditorar a meta de redução de 30%.' },
              { id: 'step3', title: 'Popular o dashboard com a baseline real', subtitle: 'Atualizar todo o sistema com taxas reais de cobertura, NRR, churn, win rates e usuários não-ativos (NAU).' },
              { id: 'step4', title: 'Nomear responsáveis por iniciativa', subtitle: 'Atribuir donos de projeto por vertical e classificar as contas prioritárias (Tiers 1 e 2) por donos de defesa e ataque.' },
              { id: 'step5', title: 'Instrumentar o acompanhamento de NAU', subtitle: 'Configurar queries ou scripts automatizados para notificar sobre o desuso recorrente de licenças em grandes clientes.' },
            ].map((step, idx) => {
              const checked = checklist[step.id];
              return (
                <div 
                  key={step.id}
                  onClick={() => toggleChecklist(step.id)}
                  className={cn(
                    "flex items-start space-x-4 p-3.5 rounded-xl cursor-pointer transition-all border",
                    checked 
                      ? "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/25" 
                      : "bg-slate-950/40 hover:bg-slate-950/60 border-white/5"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded flex items-center justify-center text-xs mt-0.5 border shrink-0 transition-all",
                    checked 
                      ? "bg-emerald-550 border-emerald-400 text-white" 
                      : "bg-slate-900 border-white/10 text-transparent hover:border-yellow-500/40"
                  )}>
                    <Check className="w-3.5 h-3.5 stroke-[3px]" />
                  </div>
                  <div>
                    <h4 className={cn(
                      "text-sm font-bold uppercase tracking-tight",
                      checked ? "text-emerald-400 line-through" : "text-white"
                    )}>
                      {idx + 1}. {step.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{step.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const pillFilterIsActive = (filter: 'todos' | 'defesa' | 'ataque') => {
    return pillarFilter === filter;
  };

  // 2. Financeiro Vertical rendering helper
  const renderFinanceiro = () => {
    // Calculator variables
    const targetChurnRate = finCurrentChurn * 0.7; // 30% reduction
    const churnDifference = finCurrentChurn - targetChurnRate;
    const baseChurnLoss = finBaseARR * (finCurrentChurn / 100);
    const targetChurnLoss = finBaseARR * (targetChurnRate / 100);
    const moneySaved = baseChurnLoss - targetChurnLoss;
    const coverageRatio = finPipeline / finBaseARR;
    const targetCoverageRatio = 3.0;
    const coverageRatioMeetsGoal = coverageRatio >= targetCoverageRatio;

    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Top Header Card */}
        <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-slate-900/60 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              {renderEffortBadgeMini(70, 30)}
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                Vertical Financeiro comercial
              </h2>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Mercado maduro, competitivo e altamente crítico. O foco principal é a <strong className="text-white">defesa agressiva</strong> contra vazamento de receita e churn no Tier 1, com expansão capturada via módulos adicionais de SaaS de alto valor.
              </p>
            </div>

            <div className="flex gap-4">
              <div className="bg-slate-950/60 border border-white/5 p-4 rounded-xl text-center min-w-[120px]">
                <span className="text-[10px] text-slate-500 font-black uppercase block mb-1">Âncora Defesa</span>
                <span className="text-xs font-bold text-indigo-400 uppercase">NRR da Base</span>
              </div>
              <div className="bg-slate-950/60 border border-white/5 p-4 rounded-xl text-center min-w-[120px]">
                <span className="text-[10px] text-slate-500 font-black uppercase block mb-1">Âncora Ataque</span>
                <span className="text-xs font-bold text-yellow-400 uppercase">Expansão SaaS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Diagnosis and Metrics Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
            <div className="space-y-4 text-left">
              <h3 className="text-md font-black text-white uppercase tracking-tight pb-3 border-b border-white/5 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-400" />
                Diagnóstico & Abordagem
              </h3>
              <p className="text-xs text-slate-350 leading-relaxed">
                Base de clientes ampla, recorrente e altamente disputada. O risco principal reside no vazamento por desuso recorrente de seats (NAU). 
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                A expansão de receita (Up-sell) ocorre preferencialmente promovendo cross-sell direcionado de novas ferramentas SaaS e de feeds de dados exclusivos nas contas Tier 1 e 2.
              </p>
            </div>
            <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-xl p-3 mt-4 text-xs">
              <span className="font-bold text-indigo-300 block mb-0.5">Foco de Atuação</span>
              <span className="text-slate-400">Tratamento institucional C-level e squad de proteção extrema contra concorrência.</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-md font-black text-white uppercase tracking-tight pb-3 border-b border-white/5 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-indigo-400" />
                Metas Operacionais
              </h3>
              
              <div className="space-y-3 pt-1">
                {[
                  { kpi: "Cobertura de Pipeline", value: "3× ARR", desc: "Força de vendas focada em manter funil robusto." },
                  { kpi: "Redução de Churn", value: "−30% Churn", desc: "Prioridade total em combater desistência de seats." },
                  { kpi: "Gestão de Clientes", value: "Health Score", desc: "Checkups dinâmicos nas ferramentas ativas." },
                  { kpi: "SaaS Cross-Sell", value: "Expansão Tier 1", desc: "Módulos integrados diretamente ao workflow do cliente." },
                ].map((m, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                    <div>
                      <span className="text-xs font-bold text-white block">{m.kpi}</span>
                      <span className="text-[10px] text-slate-400 block">{m.desc}</span>
                    </div>
                    <span className="text-xs font-black text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded">
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dinâmicos Calculators / Simulators */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6">
            <h3 className="text-md font-black text-white uppercase tracking-tight pb-3 border-b border-white/5 flex items-center gap-1.5 mb-4">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              Simulador Financeiro Inteligente
            </h3>

            <div className="space-y-4 text-xs font-medium">
              <div>
                <label className="text-slate-400 block mb-1">Base de Receita Recorrente (ARR)</label>
                <div className="flex items-center bg-slate-950 p-2 rounded-xl border border-white/10">
                  <span className="text-slate-500 font-mono mr-2">R$</span>
                  <input
                    type="number"
                    value={finBaseARR}
                    onChange={(e) => setFinBaseARR(Math.max(0, parseInt(e.target.value) || 0))}
                    className="bg-transparent text-white font-mono outline-none border-none w-full p-0 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-450 text-slate-400 block mb-1">Churn Atual (%)</label>
                  <div className="flex items-center bg-slate-950 p-2 rounded-xl border border-white/10">
                    <input
                      type="number"
                      value={finCurrentChurn}
                      onChange={(e) => setFinCurrentChurn(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="bg-transparent text-white font-mono outline-none border-none w-full p-0 font-bold"
                    />
                    <span className="text-slate-500 font-mono">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Volume de Pipeline</label>
                  <div className="flex items-center bg-slate-950 p-2 rounded-xl border border-white/10">
                    <span className="text-slate-500 font-mono mr-1">R$</span>
                    <input
                      type="number"
                      value={finPipeline}
                      onChange={(e) => setFinPipeline(Math.max(0, parseInt(e.target.value) || 0))}
                      className="bg-transparent text-white font-mono outline-none border-none w-full p-0 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic calculations results */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-indigo-500/20 space-y-3 mt-4">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400">Churn Meta (-30%):</span>
                  <span className="text-emerald-400 font-mono font-bold">{targetChurnRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400">Economia Anualizada:</span>
                  <span className="text-emerald-400 font-mono font-black">{formatBRL(moneySaved)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Cobertura Real / Meta:</span>
                  <div className="text-right">
                    <span className={cn(
                      "font-mono font-black px-2 py-0.5 rounded text-[11px]",
                      coverageRatioMeetsGoal ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    )}>
                      {coverageRatio.toFixed(1)}x / 3.0x
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Structural Initiatives & KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6">
            <h3 className="text-md font-black text-white uppercase tracking-tight mb-4 text-left">
              Iniciativas Estruturais
            </h3>
            <div className="space-y-4">
              {[
                { title: "Mapeamento Rígido de Risco & NAU", desc: "Criar score de saúde automático. Contas em desuso de seats serão enviadas imediatamente ao squad de retenção prioritário da base." },
                { title: "Trilha de Cross-Sell Automatizada", desc: "Mapeamento de workflow por atuação das áreas do cliente para impulsionar novos módulos de SaaS integrados com alto valor agregado." },
                { title: "QBRs Sistemáticos de Relacionamento C-Level", desc: "Garantir reuniões periódicas de feedback estruturado nas contas Tier 1 e Tier 2 para blindagem prévia de concorrência." },
                { title: "Baseline de Churn Consolidada", desc: "Definição formal de indicadores retroativos para garantir auditoria transparente do resultado de redução de perdas do pilar de defesa." },
              ].map((ini, i) => (
                <div key={i} className="flex gap-3 text-left">
                  <div className="w-5 h-5 bg-indigo-500/15 border border-indigo-500/30 rounded flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase">{ini.title}</h4>
                    <p className="text-xs text-slate-450 text-slate-400 mt-1">{ini.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6">
            <h3 className="text-md font-black text-white uppercase tracking-tight mb-4 text-left">
              Indicadores de Acompanhamento (Checklist)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {[
                { kpi: "Nível de Rentabilidade (NRR)", desc: "Sustentado por ativação de NAU" },
                { kpi: "Percentual Renovado (GRR)", desc: "Taxa bruta de base defendida" },
                { kpi: "Churn de Seats (-30%)", desc: "Queda programada de perdas" },
                { kpi: "Seats Reativados", desc: "Combate ao desuso (NAU)" },
                { kpi: "Expansão de SaaS", desc: "Venda de produtos de ecossistema" },
                { kpi: "Multiplicação de Pipeline (3x)", desc: "Funil de vendas monitorado" },
                { kpi: "Taxa de Win Rate", desc: "Conversão de novos módulos" },
              ].map((ind, i) => (
                <div key={i} className="bg-slate-950/40 border border-white/5 p-3.5 rounded-xl flex flex-col justify-between">
                  <span className="text-xs font-black text-white uppercase">{ind.kpi}</span>
                  <p className="text-[10px] text-slate-400 mt-1">{ind.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 3. Agro/Corp Vertical rendering helper
  const renderAgroCorp = () => {
    const closedLogosIsActive = agroRealizedLogos >= agroTargetLogos;
    const agroCoverageRatio = agroPipeline / agroBaseARR;
    const targetAgroCoverage = 2.0;

    // Projected win rate revenue impact
    const marginOfImprovement = agroTargetWinRate - agroCurrentWinRate;
    const additionalPotentialLift = (agroPipeline * (marginOfImprovement / 100));

    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Top Header Card */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900/60 to-slate-900/60 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full filter blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              {renderEffortBadgeMini(60, 40)}
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                Vertical Agro / Corp comercial
              </h2>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Grande potencial de caça e mercados sub-penetitados. O plano comercial foca em <strong className="text-white">equilíbrio ágil</strong>: manter a sólida base atual de clientes enquanto impulsionamos aquisições proativas de novos CNPJs por agricultura de safras e cross-sell SaaS corporativo.
              </p>
            </div>

            <div className="flex gap-4">
              <div className="bg-slate-950/60 border border-white/5 p-4 rounded-xl text-center min-w-[120px]">
                <span className="text-[10px] text-slate-500 font-black uppercase block mb-1">Âncora Defesa</span>
                <span className="text-xs font-bold text-emerald-400 uppercase">NRR da Base</span>
              </div>
              <div className="bg-slate-950/60 border border-white/5 p-4 rounded-xl text-center min-w-[120px]">
                <span className="text-[10px] text-slate-500 font-black uppercase block mb-1">Âncora Ataque</span>
                <span className="text-xs font-bold text-yellow-400 uppercase">ACV Novo (SaaS)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Diagnosis and Metrics Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
            <div className="space-y-4 text-left">
              <h3 className="text-md font-black text-white uppercase tracking-tight pb-3 border-b border-white/5 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-400" />
                Diagnóstico & Abordagem
              </h3>
              <p className="text-xs text-slate-350 leading-relaxed">
                Mercados com TAM (Total Addressable Market) de Agro e Corporate ainda vastas e sem saturação total. Nossas soluções de software possuem diferenciais nítidos em relação à concorrência regional.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Exige um mecanismo agressivo de caça baseada em geolocalização e produtividade agrícola, sem descuidar da blindagem de contratos corporate de grande escala que representam alta fatia do ARR geral.
              </p>
            </div>
            <div className="bg-emerald-950/20 border border-emerald-500/10 rounded-xl p-3 mt-4 text-xs">
              <span className="font-bold text-emerald-300 block mb-0.5">Foco de Atuação</span>
              <span className="text-slate-400">Prospecção direcionada regional combinada a rituais de renovação de contratos Corporate estruturada.</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-md font-black text-white uppercase tracking-tight pb-3 border-b border-white/5 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-400" />
                Metas Operacionais
              </h3>
              
              <div className="space-y-3 pt-1">
                {[
                  { kpi: "Expansão de Base", value: "Novos CNPJs", desc: "Prioridade em cadastrar novas logos no funil." },
                  { kpi: "Elevar Conversão", value: "+Win Rate", desc: "Processo estruturado de conversão de novidades." },
                  { kpi: "Redução de Churn", value: "-30% Churn", desc: "Manter índice de evasão sob controle no Agro." },
                  { kpi: "Controle de Funil", value: "2× Cobertura", desc: "Pipeline sempre no duplo do valor anualizado." },
                ].map((m, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                    <div>
                      <span className="text-xs font-bold text-white block">{m.kpi}</span>
                      <span className="text-[10px] text-slate-400 block">{m.desc}</span>
                    </div>
                    <span className="text-xs font-black text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded">
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dinâmicos Calculators / Simulators */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6">
            <h3 className="text-md font-black text-white uppercase tracking-tight pb-3 border-b border-white/5 flex items-center gap-1.5 mb-4">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Simulador de Conversão Agro / Corp
            </h3>

            <div className="space-y-4 text-xs font-medium">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Novos CNPJs Meta</label>
                  <div className="flex items-center bg-slate-950 p-2 rounded-xl border border-white/10">
                    <input
                      type="number"
                      value={agroTargetLogos}
                      onChange={(e) => setAgroTargetLogos(Math.max(1, parseInt(e.target.value) || 1))}
                      className="bg-transparent text-white font-mono outline-none border-none w-full p-0 font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">CNPJs Fechados</label>
                  <div className="flex items-center bg-slate-950 p-2 rounded-xl border border-white/10">
                    <input
                      type="number"
                      value={agroRealizedLogos}
                      onChange={(e) => setAgroRealizedLogos(Math.max(0, parseInt(e.target.value) || 0))}
                      className="bg-transparent text-white font-mono outline-none border-none w-full p-0 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-450 text-slate-405 text-slate-400 block mb-1">Win Rate Atual (%)</label>
                  <div className="flex items-center bg-slate-950 p-2 rounded-xl border border-white/10">
                    <input
                      type="number"
                      value={agroCurrentWinRate}
                      onChange={(e) => setAgroCurrentWinRate(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="bg-transparent text-white font-mono outline-none border-none w-full p-0 font-bold"
                    />
                    <span className="text-slate-500 font-mono">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-slate-450 text-slate-400 block mb-1">Win Rate Meta (%)</label>
                  <div className="flex items-center bg-slate-950 p-2 rounded-xl border border-white/10">
                    <input
                      type="number"
                      value={agroTargetWinRate}
                      onChange={(e) => setAgroTargetWinRate(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="bg-transparent text-white font-mono outline-none border-none w-full p-0 font-bold"
                    />
                    <span className="text-slate-500 font-mono">%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Volume de Pipeline Cadastrado</label>
                <div className="flex items-center bg-slate-950 p-2 rounded-xl border border-white/10">
                  <span className="text-slate-500 font-mono mr-2">R$</span>
                  <input
                    type="number"
                    value={agroPipeline}
                    onChange={(e) => setAgroPipeline(Math.max(0, parseInt(e.target.value) || 0))}
                    className="bg-transparent text-white font-mono outline-none border-none w-full p-0 font-bold"
                  />
                </div>
              </div>

              {/* Dynamic calculations results */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-emerald-500/20 space-y-3 mt-4">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400">Progresso Executado:</span>
                  <span className={cn(
                    "font-mono font-bold",
                    closedLogosIsActive ? "text-emerald-400" : "text-yellow-400"
                  )}>
                    {((agroRealizedLogos / agroTargetLogos) * 100).toFixed(0)}% concluído
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400">Impacto Melhora Win Rate:</span>
                  <span className="text-emerald-400 font-mono font-black">{formatBRL(additionalPotentialLift)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Cobertura Real / Meta:</span>
                  <span className={cn(
                    "font-mono font-black px-2 py-0.5 rounded text-[11px]",
                    agroCoverageRatio >= targetAgroCoverage ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                  )}>
                    {agroCoverageRatio.toFixed(1)}x / 2.0x
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Structural Initiatives & KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6">
            <h3 className="text-md font-black text-white uppercase tracking-tight mb-4 text-left">
              Iniciativas Estruturais
            </h3>
            <div className="space-y-4">
              {[
                { title: "Motor Ativo de Prospecção Regional", desc: "Análise geográfica de safras e polo de negócios industriais para alimentar o pipeline de vendas de forma territorial pré-programada." },
                { title: "Trilha Técnica de Capacitação Comercial", desc: "Habilitar nossos gerentes de conta com argumentos competitivos para multiplicar o win rate de novas soluções agro S&OP." },
                { title: "Média de Gestão de Renovação Corporate", desc: "Acompanhamento em alto toque das contas corporativas para gerenciar vencimentos futuros com antecedência e mapear riscos." },
                { title: "Estratégia de Diversificação SaaS", desc: "Disseminar novos produtos de automação de fluxo de vendas nas contas onde o core business atual já está integrado e rodando estavelmente." },
              ].map((ini, i) => (
                <div key={i} className="flex gap-3 text-left">
                  <div className="w-5 h-5 bg-emerald-500/15 border border-emerald-500/30 rounded flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase">{ini.title}</h4>
                    <p className="text-xs text-slate-450 text-slate-400 mt-1">{ini.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6">
            <h3 className="text-md font-black text-white uppercase tracking-tight mb-4 text-left">
              Indicadores de Acompanhamento (Checklist)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {[
                { kpi: "Nível Rentabilidade (NRR)", desc: "Estabilidade de contas correntes" },
                { kpi: "Novos Logos (CNPJs)", desc: "Controle trimestral de decolagem" },
                { kpi: "Win Rate de Novos Produtos", desc: "Eficiência de conversão" },
                { kpi: "Redução de Churn (-30%)", desc: "Proteção da base consolidada" },
                { kpi: "Gestão de Renovações", desc: "Taxa de renovação no vencimento" },
                { kpi: "Reativação de NAU", desc: "Combate ao não-uso em clientes" },
                { kpi: "Cobertura de Pipeline (2x)", desc: "Múltiplo de segurança do funil" },
              ].map((ind, i) => (
                <div key={i} className="bg-slate-950/40 border border-white/5 p-3.5 rounded-xl flex flex-col justify-between">
                  <span className="text-xs font-black text-white uppercase">{ind.kpi}</span>
                  <p className="text-[10px] text-slate-555 text-slate-455 text-slate-400 mt-1">{ind.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 4. Governo Vertical rendering helper
  const renderGoverno = () => {
    // Calculator variables
    const projectedBidsWin = govMappedBids * (govBidWinRate / 100);
    const projectedNewACV = projectedBidsWin * govAvgBidSize;
    
    const potentialRetainedBase = govBaseARR * (govRenewalRate / 100);
    const totalProjectedNextYearGov = potentialRetainedBase + projectedNewACV;
    
    const govCoverageRatio = govPipeline / govBaseARR;
    const targetGovCoverage = 2.0;

    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Top Header Card */}
        <div className="bg-gradient-to-br from-rose-950/40 via-slate-900/60 to-slate-900/60 border border-rose-500/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full filter blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              {renderEffortBadgeMini(35, 65)}
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                Vertical Governo comercial
              </h2>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Máximo foco em <strong className="text-white">Ataque e Licitações</strong>. Manter contratos de longo prazo é indispensável, mas os saltos de crescimento da vertical se originam de editais amplos, penetração de órgãos inativos e captação plurianual estratégica.
              </p>
            </div>

            <div className="flex gap-4">
              <div className="bg-slate-950/60 border border-white/5 p-4 rounded-xl text-center min-w-[120px]">
                <span className="text-[10px] text-slate-500 font-black uppercase block mb-1">Âncora Defesa</span>
                <span className="text-xs font-bold text-rose-400 uppercase">Renovação / Prorr.</span>
              </div>
              <div className="bg-slate-950/60 border border-white/5 p-4 rounded-xl text-center min-w-[120px]">
                <span className="text-[10px] text-slate-500 font-black uppercase block mb-1">Âncora Ataque</span>
                <span className="text-xs font-bold text-yellow-400 uppercase">ACV Plur. Novo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Diagnosis and Metrics Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
            <div className="space-y-4 text-left">
              <h3 className="text-md font-black text-white uppercase tracking-tight pb-3 border-b border-white/5 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-rose-400" />
                Diagnóstico & Abordagem
              </h3>
              <p className="text-xs text-slate-350 leading-relaxed">
                Concentração alta de receitas em contratos jurídicos de escopo fixo com vigência plurianual pré-determinada. Editais públicos regulam todo o ciclo de contratação governamental.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Requer precisão meticulosa na identificação prévia de editais (antes da publicação!) para auxiliar na formatação técnica ideal do escopo e acompanhamento estrito das exigências legais para habilitação concorrencial.
              </p>
            </div>
            <div className="bg-rose-950/20 border border-rose-500/10 rounded-xl p-3 mt-4 text-xs">
              <span className="font-bold text-rose-300 block mb-0.5">Foco de Atuação</span>
              <span className="text-slate-400">Funil técnico de editais públicos com acompanhamento burocrático e lobby institucional.</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-md font-black text-white uppercase tracking-tight pb-3 border-b border-white/5 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-rose-400" />
                Metas Operacionais
              </h3>
              
              <div className="space-y-3 pt-1">
                {[
                  { kpi: "Novos CNPJs / Orgãos", value: "Alta Prioridade", desc: "Cadastrar novos ministérios e autarquias." },
                  { kpi: "Prorrogação Efativa", value: "Gestão Rígida", desc: "Monitorar prazos legais de prorrogação." },
                  { kpi: "Win Rate de Produtos", value: "Conversão Elevada", desc: "Conversão de novos módulos SaaS adicionados." },
                  { kpi: "Cobertura de Pipeline", value: "2× ARR", desc: "Injetar oportunidades ativas em órgãos públicos." },
                ].map((m, i) => (
                  <div key={i} className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                    <div>
                      <span className="text-xs font-bold text-white block">{m.kpi}</span>
                      <span className="text-[10px] text-slate-400 block">{m.desc}</span>
                    </div>
                    <span className="text-xs font-black text-rose-400 font-mono bg-rose-500/10 px-2 py-0.5 rounded">
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dinâmicos Calculators / Simulators */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6">
            <h3 className="text-md font-black text-white uppercase tracking-tight pb-3 border-b border-white/5 flex items-center gap-1.5 mb-4">
              <TrendingUp className="w-4 h-4 text-rose-400" />
              Simulador de Funil de Editais Públicos
            </h3>

            <div className="space-y-4 text-xs font-medium">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Editais Mapeados</label>
                  <div className="flex items-center bg-slate-950 p-2 rounded-xl border border-white/10">
                    <input
                      type="number"
                      value={govMappedBids}
                      onChange={(e) => setGovMappedBids(Math.max(0, parseInt(e.target.value) || 0))}
                      className="bg-transparent text-white font-mono outline-none border-none w-full p-0 font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Média de R$/Edital</label>
                  <div className="flex items-center bg-slate-950 p-2 rounded-xl border border-white/10">
                    <span className="text-slate-500 font-mono mr-1">R$</span>
                    <input
                      type="number"
                      value={govAvgBidSize}
                      onChange={(e) => setGovAvgBidSize(Math.max(0, parseInt(e.target.value) || 0))}
                      className="bg-transparent text-white font-mono outline-none border-none w-full p-0 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Taxa Win Rate (%)</label>
                  <div className="flex items-center bg-slate-950 p-2 rounded-xl border border-white/10">
                    <input
                      type="number"
                      value={govBidWinRate}
                      onChange={(e) => setGovBidWinRate(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="bg-transparent text-white font-mono outline-none border-none w-full p-0 font-bold"
                    />
                    <span className="text-slate-500 font-mono">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Taxa Renovação (%)</label>
                  <div className="flex items-center bg-slate-950 p-2 rounded-xl border border-white/10">
                    <input
                      type="number"
                      value={govRenewalRate}
                      onChange={(e) => setGovRenewalRate(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="bg-transparent text-white font-mono outline-none border-none w-full p-0 font-bold"
                    />
                    <span className="text-slate-500 font-mono">%</span>
                  </div>
                </div>
              </div>

              {/* Dynamic calculations results */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-rose-500/20 space-y-3 mt-4">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400">Novo ACV Corrente Estimado:</span>
                  <span className="text-emerald-400 font-mono font-black">{formatBRL(projectedNewACV)}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400">Total Projetado (Novo + Renovado):</span>
                  <span className="text-emerald-400 font-mono font-black">{formatBRL(totalProjectedNextYearGov)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Cobertura Real / Meta:</span>
                  <span className={cn(
                    "font-mono font-black px-2 py-0.5 rounded text-[11px]",
                    govCoverageRatio >= targetGovCoverage ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                  )}>
                    {govCoverageRatio.toFixed(1)}x / 2.0x
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Structural Initiatives & KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6">
            <h3 className="text-md font-black text-white uppercase tracking-tight mb-4 text-left">
              Iniciativas Estruturais
            </h3>
            <div className="space-y-4">
              {[
                { title: "Mapeamento e Influência Técnica Pré-Publicação", desc: "Acompanhamento legislativo de editais reguladores para focar na engenharia técnica ideal de valor antes do prelo do edital." },
                { title: "Controle de Exigências Burocráticas", desc: "Checklist estrito de habilitação jurídica para anular riscos de desclassificação por detalhes burocráticos menores nos certames públicos." },
                { title: "Rotina de Expansão de Escopo", desc: "Mapeamento ativo de aditivos contratuais autorizados por lei (limites de acréscimo) em órgãos públicos ativamente atendidos pela ferramenta." },
                { title: "Blindagem & Combate ativo ao Desuso (NAU)", desc: "Envio de relatórios corporativos de valor para chefes de departamento a fim de justificar prorrogações automáticas sem resistência governamental." },
              ].map((ini, i) => (
                <div key={i} className="flex gap-3 text-left">
                  <div className="w-5 h-5 bg-rose-500/15 border border-rose-500/30 rounded flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-rose-450 text-rose-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase">{ini.title}</h4>
                    <p className="text-xs text-slate-450 text-slate-400 mt-1">{ini.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6">
            <h3 className="text-md font-black text-white uppercase tracking-tight mb-4 text-left">
              Indicadores de Acompanhamento (Checklist)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {[
                { kpi: "Taxa de Prorrogação", desc: "Garantia de segurança jurídica" },
                { kpi: "ACV Plurianual Novo", desc: "Novos contratos adicionados" },
                { kpi: "Habilidade Prévio", desc: "Win Rate global em licitações" },
                { kpi: "Novas Fontes / Orgãos", desc: "Volume de novas autarquias" },
                { kpi: "Win Rate de Modulagem SaaS", desc: "Adição de licenças novas" },
                { kpi: "Nível Desuso Geral (NAU)", desc: "Uso do software nos órgãos" },
                { kpi: "Multiplicador de Funil 2x", desc: "Segurança de editais mapeados" },
              ].map((ind, i) => (
                <div key={i} className="bg-slate-950/40 border border-white/5 p-3.5 rounded-xl flex flex-col justify-between">
                  <span className="text-xs font-black text-white uppercase">{ind.kpi}</span>
                  <p className="text-[10px] text-slate-555 text-slate-455 text-slate-400 mt-1">{ind.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLowTouch = () => {
    const monthlyNewCustomers = Math.round(ltTraffic * (ltConversion / 100));
    const monthlyAddedMRR = monthlyNewCustomers * ltTicket;
    const annualizedAddedARR = monthlyAddedMRR * 12;
    const finalARR = ltBaseARR + annualizedAddedARR;

    return (
      <div className="space-y-8 animate-fadeIn text-left">
        {/* Top Header Card */}
        <div className="bg-gradient-to-br from-purple-950/40 via-slate-900/60 to-slate-900/60 border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full filter blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              {renderEffortBadgeMini(0, 100)}
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                Vertical Low-Touch Comercial
              </h2>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Foco integral em <strong className="text-white">Ataque, Volume e Escala Digital</strong>. Operando de forma 100% automatizada e self-service, este modelo elimina o atrito de vendas manuais, alavancando campanhas digitais e fluxos onboarding otimizados.
              </p>
            </div>

            <div className="flex gap-4">
              <div className="bg-slate-950/60 border border-white/5 p-4 rounded-xl text-center min-w-[120px]">
                <span className="text-[10px] text-slate-500 font-black uppercase block mb-1">Âncora Defesa</span>
                <span className="text-xs font-bold text-slate-400 uppercase">Self-Service</span>
              </div>
              <div className="bg-slate-950/60 border border-white/5 p-4 rounded-xl text-center min-w-[120px]">
                <span className="text-[10px] text-slate-500 font-black uppercase block mb-1">Âncora Ataque</span>
                <span className="text-xs font-bold text-fuchsia-400 uppercase">Funil de Trial</span>
              </div>
            </div>
          </div>
        </div>

        {/* Diagnosis and Metrics Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
            <div className="space-y-4 text-left">
              <h3 className="text-md font-black text-white uppercase tracking-tight pb-3 border-b border-white/5 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-purple-400" />
                Diagnóstico & Abordagem
              </h3>
              <p className="text-xs text-slate-350 leading-relaxed font-semibold">
                Nicho com alto volume de leads de tamanho pequeno-médio (SMB) onde uma venda institucional tradicional é inviável financeiramente (CAC alto).
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Toda a jornada de experimentação, simulação jurídica-financeira e ativação da conta ocorre sem contato humano direto, por meio de nossa plataforma web. A eficiência operacional depende de automação de faturamento e canais de ajuda integrados.
              </p>
            </div>
            <div className="bg-purple-950/20 border border-purple-500/10 rounded-xl p-3 mt-4 text-xs">
              <span className="font-bold text-purple-300 block mb-0.5">Foco de Atuação</span>
              <span className="text-slate-400">Marketing de produto (PLG), fluxos interativos de trial guiado e checkout simplificado.</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-md font-black text-white uppercase tracking-tight pb-3 border-b border-white/5 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-purple-400" />
                Metas Operacionais
              </h3>
              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <span className="text-slate-400 font-semibold">Volume de Visitantes (Mês):</span>
                  <span className="font-bold text-white font-mono">{ltTraffic.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <span className="text-slate-400 font-semibold">Conversão de Onboarding:</span>
                  <span className="font-bold text-emerald-400 font-mono">35%</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <span className="text-slate-400 font-semibold">Taxa de Conversão Paywall:</span>
                  <span className="font-bold text-white font-mono">{ltConversion}%</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <span className="text-slate-400 font-semibold">Churn Mensal Limite:</span>
                  <span className="font-bold text-emerald-400 font-mono">&lt; 3.0%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">CAC Médio Alvo:</span>
                  <span className="font-bold text-white font-mono">{formatBRL(350)}</span>
                </div>
              </div>
            </div>
            <div className="border border-white/5 bg-slate-950/40 rounded-xl p-3 mt-4 text-[11px] text-slate-400">
              <span className="font-semibold text-white block mb-0.5">Indicador Alvo 3Q</span>
              Multiplicar volume de tráfego orgânico/pago qualificável para manter CAC abaixo do LTV.
            </div>
          </div>

          {/* Interactive Simulator */}
          <div className="bg-slate-900/65 border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-md font-black text-white uppercase tracking-tight pb-3 border-b border-white/5 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-purple-400" />
                Simulador Low-Touch
              </h3>
              
              {/* Sliders */}
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-400">Tráfego Mensal (Visitantes):</span>
                    <span className="text-purple-400 font-mono font-bold">{ltTraffic.toLocaleString('pt-BR')}</span>
                  </div>
                  <input 
                    type="range" 
                    min={10000} 
                    max={200000} 
                    step={5000}
                    value={ltTraffic} 
                    onChange={(e) => setLtTraffic(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-400">Taxa de Conversão (%):</span>
                    <span className="text-purple-400 font-mono font-bold">{ltConversion}%</span>
                  </div>
                  <input 
                    type="range" 
                    min={0.5} 
                    max={8} 
                    step={0.1}
                    value={ltConversion} 
                    onChange={(e) => setLtConversion(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-400">Ticket Médio Mensal (SaaS):</span>
                    <span className="text-purple-400 font-mono font-bold">{formatBRL(ltTicket)}</span>
                  </div>
                  <input 
                    type="range" 
                    min={99} 
                    max={1500} 
                    step={10}
                    value={ltTicket} 
                    onChange={(e) => setLtTicket(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Calculations Panel */}
            <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3 mt-4">
              <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                <span className="text-slate-400 font-semibold">Novos Clientes / Mês:</span>
                <span className="font-bold text-white font-mono">{monthlyNewCustomers.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                <span className="text-slate-400 font-semibold">MRR Adicionado:</span>
                <span className="font-bold text-emerald-400 font-mono">{formatBRL(monthlyAddedMRR)}/mês</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                <span className="text-slate-400 font-semibold">ARR Anualizado Adicionado:</span>
                <span className="font-bold text-emerald-400 font-mono">{formatBRL(annualizedAddedARR)}/ano</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-350 font-black uppercase">Arr Final Projetado:</span>
                <span className="text-sm font-black text-fuchsia-400 font-mono">{formatBRL(finalARR)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard KPIs section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6">
            <h3 className="text-md font-black text-white uppercase tracking-tight mb-4 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-400" />
              Cronograma de Implementação Digital
            </h3>
            <div className="space-y-4">
              {[
                { phase: "Fase 1: Configuração Tech (Semanas 1-3)", progress: "0%", status: "Não Iniciado", action: "Desenvolver Landing Page focada e configurar checkout Stripe automático.", border: "border-slate-800/60" },
                { phase: "Fase 2: Playbook Trial Guiado (Semanas 4-6)", progress: "0%", status: "Não Iniciado", action: "Desenhar fluxos interativos de produto (onboarding virtual por dentro do sistema).", border: "border-slate-800/60" },
                { phase: "Fase 3: Lançamento de Tráfego Pago (Semanas 7-12)", progress: "0%", status: "Não Iniciado", action: "Acionar campanhas de rede de pesquisa e retargeting com controle rígido de CAC.", border: "border-slate-800/60" },
              ].map((step, idx) => (
                <div key={idx} className={cn("p-4 rounded-xl border bg-slate-950/20 text-xs text-left", step.border)}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-200 uppercase tracking-tight">{step.phase}</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-850/60 text-slate-450 border border-white/5">{step.status}</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed font-medium">{step.action}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6">
            <h3 className="text-md font-black text-white uppercase tracking-tight mb-4 text-left">
              Indicadores de Acompanhamento (Checklist)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {[
                { kpi: "Custo por Lead (CPL)", desc: "Métrica-raiz de eficiência" },
                { kpi: "Conversão Trial para Pago", desc: "Força de onboarding" },
                { kpi: "CAC x LTV Ratio", desc: "Saúde financeira de expansão" },
                { kpi: "Taxa de Churn de Checkout", desc: "Gargalos técnicos fiscais" },
                { kpi: "NPS de Onboarding Self", desc: "Facilidade de adoção" },
                { kpi: "MRR Novos Signups", desc: "Tração de aquisição" },
                { kpi: "Bounce Rate Landing", desc: "Aderência da copy e chamados" },
              ].map((ind, i) => (
                <div key={i} className="bg-slate-950/40 border border-white/5 p-3.5 rounded-xl flex flex-col justify-between animate-fadeIn">
                  <span className="text-xs font-black text-white uppercase">{ind.kpi}</span>
                  <p className="text-[10px] text-slate-400 mt-1">{ind.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 mt-4">
      {subView === 'resumo' && renderResumo()}
      {subView === 'financeiro' && renderFinanceiro()}
      {subView === 'agro_corp' && renderAgroCorp()}
      {subView === 'governo' && renderGoverno()}
      {subView === 'low_touch' && renderLowTouch()}
    </div>
  );
}
