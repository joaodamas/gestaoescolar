import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useAuth } from '../../context/AuthContext'
import {
  Users, TrendingUp, GraduationCap, BookCheck, UserCog, Wallet,
  AlertTriangle, RefreshCw, FileDown, FlaskConical, Heart, Users2,
  ArrowUpRight, BookOpen, BookMarked, ChevronRight, Calendar,
  ClipboardList, Activity, Target, Sparkles, Zap, ShieldAlert,
  PartyPopper, Coffee, CalendarCheck, RotateCcw
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine,
  RadialBarChart, RadialBar
} from 'recharts'
import { listarProjetosDashboard } from '../../services/projetos'
import { listarPendenciasDashboard } from '../../services/pendencias'
import { buscarConfiguracoes } from '../../services/configuracoes'
import { listarProximosEventos } from '../../services/calendario'
import { Card, CardHeader, Badge, Spinner } from '../../components/ui/Card'
import Button from '../../components/ui/Button'

const ANO_LETIVO = new Date().getFullYear()

const STATUS_PROJ = {
  planejado:    { label: 'Planejado',    variante: 'blue' },
  em_andamento: { label: 'Em andamento', variante: 'yellow' },
  concluido:    { label: 'Concluído',    variante: 'green' },
  cancelado:    { label: 'Cancelado',    variante: 'slate' },
}

const STATUS_PEND = {
  pendente:     { label: 'Pendente',    variante: 'red' },
  em_andamento: { label: 'Em andamento', variante: 'yellow' },
  planejado:    { label: 'Planejado',    variante: 'blue' },
  concluido:    { label: 'Concluído',    variante: 'green' },
}

const OCORRENCIAS_CONFIG = [
  { key: 'disciplinar',    label: 'Ocorrências disciplinares',     icon: ShieldAlert, cor: 'rose' },
  { key: 'medico',         label: 'Atendimentos médicos',          icon: Heart,       cor: 'red' },
  { key: 'encaminhamento', label: 'Encaminhamentos ao suporte',    icon: ArrowUpRight,cor: 'blue' },
  { key: 'reuniao',        label: 'Reuniões com responsáveis',     icon: Users2,      cor: 'purple' },
  { key: 'acidente',       label: 'Acidentes',                     icon: Zap,         cor: 'orange' },
]

const PROJETO_ICONES = [BookOpen, BookMarked, FlaskConical, Users2, Heart]

const EVENTOS_CONFIG = {
  feriado:   { label: 'Feriado',   variante: 'red',    icon: PartyPopper,  bg: 'bg-rose-50',    text: 'text-rose-600' },
  recesso:   { label: 'Recesso',   variante: 'yellow', icon: Coffee,       bg: 'bg-amber-50',   text: 'text-amber-600' },
  evento:    { label: 'Evento',    variante: 'blue',   icon: CalendarCheck,bg: 'bg-blue-50',    text: 'text-blue-600' },
  reposicao: { label: 'Reposição', variante: 'green',  icon: RotateCcw,    bg: 'bg-emerald-50', text: 'text-emerald-600' },
  aula:      { label: 'Aula',      variante: 'slate',  icon: BookOpen,     bg: 'bg-slate-50',   text: 'text-slate-600' },
}

export default function DashboardPage() {
  const { perfil } = useAuth()
  const [indicadores, setIndicadores] = useState(null)
  const [config, setConfig] = useState(null)
  const [projetos, setProjetos] = useState([])
  const [pendencias, setPendencias] = useState([])
  const [eventos, setEventos] = useState([])
  const [erroQuery, setErroQuery] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const ref = doc(db, 'indicadores', String(ANO_LETIVO))
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setIndicadores(snap.exists() ? snap.data() : null)
        setCarregando(false)
      },
      (err) => {
        console.error('Erro ao observar indicadores:', err)
        setErroQuery('Erro ao carregar indicadores. Verifique permissões ou conexão.')
        setIndicadores(null)
        setCarregando(false)
      }
    )
    return unsub
  }, [])

  useEffect(() => {
    buscarConfiguracoes().then(setConfig)
    listarProjetosDashboard(5).then(setProjetos).catch(() => setProjetos([]))
    listarPendenciasDashboard(5).then(setPendencias).catch(() => setPendencias([]))
    listarProximosEventos(5, ANO_LETIVO).then(setEventos).catch(() => setEventos([]))
  }, [])

  const presencaPct = +(indicadores?.presenca_media ?? 0)
  const ausenciaPct = +(indicadores?.ausencia_media ?? 0)
  const justificadosPct = +(indicadores?.justificados_media ?? 0)

  const presentesCt = indicadores?.presentes_count ?? 0
  const ausentesCt  = indicadores?.ausentes_count ?? 0
  const justifCt    = indicadores?.justificados_count ?? 0

  const execucaoPct = indicadores?.orcamento_previsto
    ? +((indicadores.orcamento_executado / indicadores.orcamento_previsto) * 100).toFixed(1)
    : 0

  const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = indicadores?.updated_at
    ? new Date(indicadores.updated_at.toDate()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '—'

  // SAEB histórico
  const saebHistorico = indicadores?.saeb_historico ?? config?.saeb_historico ?? {}
  const anos = Object.keys(saebHistorico).sort().slice(-4)
  const saebData = anos.length > 0
    ? anos.map(ano => ({ ano, nota: saebHistorico[ano], atual: Number(ano) === ANO_LETIVO }))
    : [
        { ano: '2021', nota: 5.4 },
        { ano: '2022', nota: 5.8 },
        { ano: '2023', nota: 6.1 },
        { ano: '2024', nota: 6.3, atual: true },
      ]
  const metaSaeb = config?.meta_saeb ?? 6.0

  const dadosPresenca = [
    { name: 'Presentes',    value: presencaPct, count: presentesCt, fill: '#10b981' },
    { name: 'Ausentes',     value: ausenciaPct, count: ausentesCt,  fill: '#f59e0b' },
    { name: 'Justificados', value: justificadosPct, count: justifCt, fill: '#ef4444' },
  ]

  if (carregando) {
    return (
      <div className="flex justify-center py-32">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* HEADER em destaque — estilo da referência */}
      {erroQuery && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-800 flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{erroQuery}</span>
        </div>
      )}

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative flex flex-wrap items-center justify-between gap-6 p-6 lg:p-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 backdrop-blur ring-1 ring-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <GraduationCap size={26} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                {config?.nome_escola ?? 'GESTÃO ESCOLAR'}
                <span className="block text-blue-300 text-base font-normal mt-0.5">À VISTA · Ano letivo {ANO_LETIVO}</span>
              </h1>
              <p className="text-sm text-slate-300 mt-1 italic">
                {config?.slogan ?? 'Informação que orienta. Gestão que transforma.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-xl px-4 py-2.5 flex items-center gap-2.5">
              <Calendar size={15} className="text-blue-300" />
              <div>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Data</p>
                <p className="text-sm font-semibold">{dataAtual}</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-xl px-4 py-2.5 flex items-center gap-2.5">
              <RefreshCw size={15} className="text-blue-300" />
              <div>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Atualizado</p>
                <p className="text-sm font-semibold">{hora}</p>
              </div>
            </div>
            <Button variante="secondary" icon={FileDown} className="hidden lg:inline-flex">PDF</Button>
          </div>
        </div>
      </div>

      {/* INDICADORES PRINCIPAIS — 6 KPIs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Activity size={13} /> Indicadores Principais
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <KpiCircle icon={Users}        cor="blue"    valor={indicadores?.total_alunos ?? 0}    label="Alunos Matriculados" descricao="100% do previsto" />
          <KpiCircle icon={TrendingUp}   cor="green"   valor={`${presencaPct}%`}                  label="Presença Média"      descricao={`Meta: ${config?.meta_presenca ?? 90}%`} ok={presencaPct >= (config?.meta_presenca ?? 90)} />
          <KpiCircle icon={GraduationCap} cor="purple" valor={(indicadores?.media_saeb ?? metaSaeb).toFixed(1).replace('.', ',')} label="Desempenho Médio (SAEB)" descricao={`Meta: ${metaSaeb.toFixed(1).replace('.', ',')}`} ok={(indicadores?.media_saeb ?? 0) >= metaSaeb} />
          <KpiCircle icon={BookCheck}    cor="orange"  valor={`${Math.round(indicadores?.taxa_aprovacao ?? 0)}%`} label="Taxa de Aprovação"   descricao={`Meta: ${config?.meta_aprovacao ?? 90}%`} ok={(indicadores?.taxa_aprovacao ?? 0) >= (config?.meta_aprovacao ?? 90)} />
          <KpiCircle icon={UserCog}      cor="teal"    valor={indicadores?.total_colaboradores ?? 0} label="Colaboradores"        descricao="100% do previsto" />
          <KpiCircle icon={Wallet}       cor="emerald" valor={`${execucaoPct}%`}                  label="Execução Orçamentária" descricao="do orçamento previsto" />
        </div>
      </div>

      {/* LINHA: Presença + SAEB + Financeiro */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* DONUT PRESENÇA — 3 categorias */}
        <Card>
          <CardHeader titulo="PRESENÇA DOS ALUNOS" descricao={`Meta: ${config?.meta_presenca ?? 90}%`} />
          <div className="p-5 flex items-center gap-4">
            <div className="relative shrink-0">
              <ResponsiveContainer width={170} height={170}>
                <PieChart>
                  <Pie data={dadosPresenca} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={78} stroke="none" startAngle={90} endAngle={-270}>
                    {dadosPresenca.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v, _, p) => [`${v}% (${p.payload.count})`, p.payload.name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-bold text-slate-900">{presencaPct}%</p>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Presença</p>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {dadosPresenca.map(d => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.fill }} />
                    <span className="text-slate-700 font-medium">{d.name}</span>
                  </span>
                  <span className="text-slate-500 text-xs font-mono">
                    <span className="font-bold text-slate-700">{d.value}%</span> ({d.count})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* SAEB — Bar chart histórico */}
        <Card>
          <CardHeader titulo="DESEMPENHO ACADÊMICO (SAEB)" descricao={`Escala: 0 a 10 · Meta: ${metaSaeb.toFixed(1)}`} />
          <div className="p-5">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={saebData} margin={{ top: 18, right: 5, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="ano" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <ReferenceLine y={metaSaeb} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `Meta ${metaSaeb}`, position: 'right', fill: '#dc2626', fontSize: 10, fontWeight: 600 }} />
                <Bar dataKey="nota" radius={[8, 8, 0, 0]} maxBarSize={42}>
                  {saebData.map((e, i) => <Cell key={i} fill={e.atual ? '#7c3aed' : '#3b82f6'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* SITUAÇÃO FINANCEIRA — Gauge radial */}
        <Card>
          <CardHeader titulo="SITUAÇÃO FINANCEIRA" descricao="Execução do orçamento anual" />
          <div className="p-5 flex items-center gap-4">
            <div className="relative shrink-0">
              <ResponsiveContainer width={170} height={170}>
                <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name: 'exec', value: execucaoPct, fill: '#10b981' }]} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#e2e8f0' }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-bold text-slate-900">{execucaoPct}%</p>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Executado</p>
              </div>
            </div>
            <div className="flex-1 space-y-2.5">
              <FinanceRow label="Orçamento Previsto" valor={indicadores?.orcamento_previsto ?? 0} cor="text-blue-700" dot="#3b82f6" />
              <FinanceRow label="Executado"          valor={indicadores?.orcamento_executado ?? 0} cor="text-emerald-700" dot="#10b981" />
              <FinanceRow label="Saldo Disponível"   valor={Math.max(0, (indicadores?.orcamento_previsto ?? 0) - (indicadores?.orcamento_executado ?? 0))} cor="text-slate-700" dot="#94a3b8" />
            </div>
          </div>
        </Card>
      </div>

      {/* LINHA: Projetos + Eventos + Ocorrências + Pendências */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* PROJETOS E AÇÕES */}
        <Card>
          <CardHeader titulo="PROJETOS E AÇÕES" descricao={`${projetos.length} em destaque`} />
          <div className="px-5 pb-4">
            {projetos.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Sparkles size={24} className="mx-auto mb-2 text-slate-300" />
                Nenhum projeto cadastrado
              </div>
            ) : (
              <div className="space-y-1">
                {projetos.map((p, i) => {
                  const Icon = PROJETO_ICONES[i % PROJETO_ICONES.length]
                  const status = STATUS_PROJ[p.status] ?? { label: p.status, variante: 'slate' }
                  return (
                    <div key={p.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                        <Icon size={14} className="text-slate-600" />
                      </div>
                      <p className="text-sm text-slate-700 flex-1 truncate font-medium">{p.nome}</p>
                      <Badge variante={status.variante}>{status.label}</Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>

        {/* PRÓXIMOS EVENTOS */}
        <Card>
          <CardHeader titulo="PRÓXIMOS EVENTOS" descricao={`${eventos.length} no calendário`} />
          <div className="px-5 pb-4">
            {eventos.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Calendar size={24} className="mx-auto mb-2 text-slate-300" />
                Nenhum evento futuro cadastrado
              </div>
            ) : (
              <div className="space-y-1">
                {eventos.map(ev => {
                  const cfg = EVENTOS_CONFIG[ev.tipo] ?? EVENTOS_CONFIG.evento
                  const Icon = cfg.icon
                  const dataFmt = ev.data ? new Date(`${ev.data}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'
                  return (
                    <div key={ev.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                      <div className={`w-8 h-8 ${cfg.bg} rounded-lg flex items-center justify-center shrink-0`}>
                        <Icon size={14} className={cfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 font-medium truncate">
                          {ev.descricao || cfg.label}
                        </p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar size={10} /> {dataFmt}
                        </p>
                      </div>
                      <Badge variante={cfg.variante}>{cfg.label}</Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>

        {/* OCORRÊNCIAS */}
        <Card>
          <CardHeader titulo="OCORRÊNCIAS" descricao="Total registrado no ano" />
          <div className="px-5 pb-4">
            <div className="space-y-1">
              {OCORRENCIAS_CONFIG.map(({ key, label, icon: Icon, cor }) => {
                const total = indicadores?.total_ocorrencias?.[key] ?? 0
                const cores = {
                  rose:   { bg: 'bg-rose-50',   text: 'text-rose-600',   ring: 'ring-rose-200' },
                  red:    { bg: 'bg-red-50',    text: 'text-red-600',    ring: 'ring-red-200' },
                  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   ring: 'ring-blue-200' },
                  purple: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-200' },
                  orange: { bg: 'bg-orange-50', text: 'text-orange-600', ring: 'ring-orange-200' },
                }
                const c = cores[cor]
                return (
                  <div key={key} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                    <div className={`w-9 h-9 ${c.bg} ring-1 ${c.ring} rounded-full flex items-center justify-center shrink-0`}>
                      <span className={`text-sm font-bold ${c.text}`}>{total}</span>
                    </div>
                    <Icon size={14} className="text-slate-400 shrink-0" />
                    <p className="text-sm text-slate-700 flex-1 truncate">{label}</p>
                  </div>
                )
              })}
            </div>
            <button className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
              Ver todas as ocorrências
              <ChevronRight size={12} />
            </button>
          </div>
        </Card>

        {/* PENDÊNCIAS E PRAZOS */}
        <Card>
          <CardHeader titulo="PENDÊNCIAS E PRAZOS" descricao={`${pendencias.length} próximas`} />
          <div className="px-5 pb-4">
            {pendencias.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <ClipboardList size={24} className="mx-auto mb-2 text-slate-300" />
                Sem pendências cadastradas
              </div>
            ) : (
              <div className="space-y-1">
                {pendencias.map(p => {
                  const status = STATUS_PEND[p.status] ?? { label: p.status, variante: 'slate' }
                  const dataFmt = p.data_prazo ? new Date(p.data_prazo).toLocaleDateString('pt-BR') : '—'
                  return (
                    <div key={p.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                        <ClipboardList size={13} className="text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 font-medium truncate">{p.titulo}</p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar size={10} /> {dataFmt}
                        </p>
                      </div>
                      <Badge variante={status.variante}>{status.label}</Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* MISSÃO E VALORES — Footer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-2">
        <Card className="lg:col-span-2 bg-gradient-to-br from-blue-50 via-white to-blue-50 border-blue-100">
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-500/10 ring-1 ring-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                <Target size={18} className="text-blue-700" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-1">Nossa Missão</p>
                <p className="text-sm text-slate-700 leading-relaxed">{config?.missao ?? 'Garantir aprendizagens significativas e formar cidadãos para a vida.'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-500/10 ring-1 ring-purple-500/20 rounded-xl flex items-center justify-center shrink-0">
                <Sparkles size={18} className="text-purple-700" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-purple-700 uppercase tracking-widest mb-1">Nossos Valores</p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {(config?.valores ?? ['Respeito','Responsabilidade','Colaboração','Excelência','Equidade']).join(' · ')}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-slate-700">
          <div className="p-5 flex items-center gap-3 h-full">
            <div className="w-12 h-12 bg-white/10 ring-1 ring-white/20 rounded-xl flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight">Juntos, fazemos a diferença!</p>
              <p className="text-xs text-slate-400 mt-0.5">Equipe pedagógica, administrativa e familiar trabalhando em conjunto.</p>
            </div>
          </div>
        </Card>
      </div>

      {!indicadores && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-amber-800 text-sm flex items-center gap-3">
          <AlertTriangle size={18} />
          <div>
            <p className="font-semibold">Indicadores ainda não calculados</p>
            <p className="text-xs text-amber-700 mt-0.5">A Cloud Function `recalcularIndicadores` precisa rodar para popular esta tela. Execute manualmente ou aguarde 15 min.</p>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCircle({ icon: Icon, cor, valor, label, descricao, ok }) {
  const cores = {
    blue:    { circle: 'bg-blue-500 text-white',       text: 'text-blue-600' },
    green:   { circle: 'bg-emerald-500 text-white',    text: 'text-emerald-600' },
    purple:  { circle: 'bg-purple-500 text-white',     text: 'text-purple-600' },
    orange:  { circle: 'bg-orange-500 text-white',     text: 'text-orange-600' },
    teal:    { circle: 'bg-teal-500 text-white',       text: 'text-teal-600' },
    emerald: { circle: 'bg-slate-700 text-white',      text: 'text-slate-700' },
  }
  const c = cores[cor]
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:shadow-md hover:border-slate-300 transition-all group">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 ${c.circle} rounded-full flex items-center justify-center shadow-sm`}>
          <Icon size={17} strokeWidth={2.5} />
        </div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight flex-1">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${c.text} tracking-tight`}>{valor}</p>
      <p className="text-[11px] text-slate-500 mt-1">{descricao}</p>
    </div>
  )
}

function FinanceRow({ label, valor, cor, dot }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-xs text-slate-500">
        <span className="w-2 h-2 rounded-full" style={{ background: dot }} />
        {label}
      </span>
      <span className={`text-sm font-bold ${cor} font-mono`}>
        R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  )
}
