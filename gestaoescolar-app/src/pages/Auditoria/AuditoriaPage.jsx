import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { listarAuditoria, observarAuditoriaRecente } from '../../services/auditoria'
import { listarUsuarios } from '../../services/usuarios'
import {
  ShieldCheck, Search, Filter, RotateCcw, AlertCircle,
  User, Calendar, Activity, FileText, ChevronRight,
  BookOpen, Wallet, AlertTriangle, ClipboardList, Users as UsersIcon,
  Eye, Download
} from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { Card, Badge, EmptyState, Spinner } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import { exportarParaExcel, formatarParaExportacao } from '../../utils/exportExcel'

const ACOES_INFO = {
  // Notas
  NOTA_ALTERADA_POS_FECHAMENTO: { label: 'Nota alterada após fechamento', cor: 'red',    icon: BookOpen },
  BIMESTRE_FECHADO:              { label: 'Bimestre fechado',              cor: 'blue',   icon: BookOpen },
  BIMESTRE_REABERTO:             { label: 'Bimestre reaberto',             cor: 'yellow', icon: BookOpen },
  APROVADO_CONSELHO:             { label: 'Aprovado por conselho',         cor: 'purple', icon: BookOpen },

  // Presenças
  PRESENCA_EDITADA_APOS_48H:     { label: 'Presença editada após 48h',     cor: 'yellow', icon: ClipboardList },

  // Financeiro
  DESPESA_APROVADA:              { label: 'Despesa aprovada',              cor: 'green',  icon: Wallet },
  DESPESA_ACIMA_LIMITE:          { label: 'Despesa acima do limite',       cor: 'red',    icon: Wallet },

  // Alunos
  ALUNO_INATIVADO:               { label: 'Aluno inativado',               cor: 'slate',  icon: User },

  // Usuários
  PERFIL_USUARIO_ALTERADO:       { label: 'Perfil de usuário alterado',    cor: 'orange', icon: UsersIcon },

  // Ocorrências
  OCORRENCIA_MEDICA_LIDA:        { label: 'Ocorrência médica acessada',    cor: 'red',    icon: AlertTriangle },

  // Geral
  EXCLUSAO_LOGICA:               { label: 'Exclusão lógica',               cor: 'slate',  icon: AlertCircle },
}

const MODULOS = [
  { id: 'notas',         label: 'Notas',        icon: BookOpen },
  { id: 'presencas',     label: 'Presença',     icon: ClipboardList },
  { id: 'financeiro',    label: 'Financeiro',   icon: Wallet },
  { id: 'alunos',        label: 'Alunos',       icon: User },
  { id: 'usuarios',      label: 'Usuários',     icon: UsersIcon },
  { id: 'ocorrencias',   label: 'Ocorrências',  icon: AlertTriangle },
]

const CORES = {
  red:    { bg: 'bg-rose-50',    text: 'text-rose-700',    ring: 'ring-rose-200',    iconBg: 'bg-rose-100',    iconText: 'text-rose-600' },
  yellow: { bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200',   iconBg: 'bg-amber-100',   iconText: 'text-amber-600' },
  green:  { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600' },
  blue:   { bg: 'bg-blue-50',    text: 'text-blue-700',    ring: 'ring-blue-200',    iconBg: 'bg-blue-100',    iconText: 'text-blue-600' },
  purple: { bg: 'bg-purple-50',  text: 'text-purple-700',  ring: 'ring-purple-200',  iconBg: 'bg-purple-100',  iconText: 'text-purple-600' },
  orange: { bg: 'bg-orange-50',  text: 'text-orange-700',  ring: 'ring-orange-200',  iconBg: 'bg-orange-100',  iconText: 'text-orange-600' },
  slate:  { bg: 'bg-slate-50',   text: 'text-slate-700',   ring: 'ring-slate-200',   iconBg: 'bg-slate-100',   iconText: 'text-slate-600' },
}

function infoAcao(acao) {
  return ACOES_INFO[acao] ?? { label: acao, cor: 'slate', icon: Activity }
}

function formatarTimestamp(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function tempoRelativo(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  const seg = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seg < 60) return 'agora'
  if (seg < 3600) return `${Math.floor(seg / 60)}min atrás`
  if (seg < 86400) return `${Math.floor(seg / 3600)}h atrás`
  if (seg < 604800) return `${Math.floor(seg / 86400)}d atrás`
  return d.toLocaleDateString('pt-BR')
}

export default function AuditoriaPage() {
  const { perfil, escolaId, unidadeAtualId } = useAuth()
  const podeAcessar = ['diretor', 'admin'].includes(perfil?.perfil)
  const escopo = useMemo(() => ({ escolaId, unidadeAtualId, perfil }), [escolaId, unidadeAtualId, perfil])

  const [registros, setRegistros] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erroQuery, setErroQuery] = useState(null)
  const [detalhe, setDetalhe] = useState(null)

  const [filtros, setFiltros] = useState({
    modulo: '', usuario_id: '', acao: '', dataInicio: '', dataFim: '',
  })
  const [busca, setBusca] = useState('')

  useEffect(() => {
    if (!podeAcessar) return
    setCarregando(true)
    setErroQuery(null)

    listarAuditoria(filtros, 100)
      .then(setRegistros)
      .catch(err => {
        console.error('Erro ao listar auditoria:', err)
        setErroQuery(err.message)
      })
      .finally(() => setCarregando(false))
  }, [filtros, podeAcessar])

  useEffect(() => {
    if (!podeAcessar) return
    listarUsuarios(escopo).then(setUsuarios).catch(() => setUsuarios([]))
  }, [podeAcessar, escopo])

  const usuariosMap = useMemo(() => Object.fromEntries(usuarios.map(u => [u.id, u])), [usuarios])

  const registrosFiltrados = useMemo(() => {
    if (!busca.trim()) return registros
    const termo = busca.toLowerCase()
    return registros.filter(r => {
      const u = usuariosMap[r.usuario_id]
      return (
        r.acao?.toLowerCase().includes(termo) ||
        r.entidade?.toLowerCase().includes(termo) ||
        r.motivo?.toLowerCase().includes(termo) ||
        u?.nome?.toLowerCase().includes(termo) ||
        u?.email?.toLowerCase().includes(termo)
      )
    })
  }, [registros, busca, usuariosMap])

  const estatisticas = useMemo(() => {
    const porModulo = {}
    const porAcao = {}
    registros.forEach(r => {
      porModulo[r.modulo] = (porModulo[r.modulo] ?? 0) + 1
      porAcao[r.acao] = (porAcao[r.acao] ?? 0) + 1
    })
    const acaoMaisFrequente = Object.entries(porAcao).sort(([, a], [, b]) => b - a)[0]
    return {
      total: registros.length,
      modulos: Object.keys(porModulo).length,
      criticas: registros.filter(r => {
        const c = infoAcao(r.acao).cor
        return c === 'red'
      }).length,
      maisFrequente: acaoMaisFrequente?.[0] ?? null,
    }
  }, [registros])

  function exportarAuditoria() {
    const linhas = formatarParaExportacao(registrosFiltrados, {
      'Data/Hora': r => formatarTimestamp(r.created_at),
      'Ação': r => infoAcao(r.acao).label,
      'Código da ação': 'acao',
      'Módulo': 'modulo',
      'Usuário': r => usuariosMap[r.usuario_id]?.nome ?? r.usuario_id ?? '',
      'Email': r => usuariosMap[r.usuario_id]?.email ?? '',
      'Perfil': 'perfil',
      'Entidade': 'entidade',
      'ID entidade': 'entidade_id',
      'Motivo': 'motivo',
      'Valor anterior': r => r.valor_anterior ? JSON.stringify(r.valor_anterior) : '',
      'Valor novo': r => r.valor_novo ? JSON.stringify(r.valor_novo) : '',
      'IP': 'ip',
    })
    exportarParaExcel(linhas, `auditoria-${new Date().toISOString().slice(0, 10)}`, 'Auditoria')
  }

  if (!podeAcessar) {
    return (
      <div>
        <PageHeader titulo="Auditoria" icon={ShieldCheck} />
        <Card>
          <div className="p-12 text-center">
            <ShieldCheck size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-base font-semibold text-slate-700">Acesso restrito</p>
            <p className="text-sm text-slate-500 mt-1">A trilha de auditoria é visível apenas para Diretor e Admin.</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        titulo="Trilha de Auditoria"
        descricao="Registros imutáveis de todas as ações críticas do sistema"
        icon={ShieldCheck}
        acoes={<Button variante="secondary" icon={Download} onClick={exportarAuditoria}>Exportar Excel</Button>}
      />

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total de Registros" valor={estatisticas.total} icon={Activity} cor="blue" />
        <StatCard label="Módulos Auditados" valor={estatisticas.modulos} icon={Filter} cor="purple" />
        <StatCard label="Ações Críticas" valor={estatisticas.criticas} icon={AlertCircle} cor="red" />
        <StatCard
          label="Ação mais frequente"
          valor={estatisticas.maisFrequente ? infoAcao(estatisticas.maisFrequente).label : '—'}
          icon={RotateCcw}
          cor="orange"
          texto
        />
      </div>

      {/* Filtros */}
      <Card className="mb-4">
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <Input
              icon={Search}
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por ação, usuário, motivo..."
              className="flex-1 min-w-56"
            />
            <Select value={filtros.modulo} onChange={e => setFiltros(f => ({ ...f, modulo: e.target.value }))} className="min-w-40">
              <option value="">Todos os módulos</option>
              {MODULOS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </Select>
            <Select value={filtros.usuario_id} onChange={e => setFiltros(f => ({ ...f, usuario_id: e.target.value }))} className="min-w-48">
              <option value="">Todos os usuários</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </Select>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <Input
              type="date"
              label=""
              value={filtros.dataInicio}
              onChange={e => setFiltros(f => ({ ...f, dataInicio: e.target.value }))}
              className="min-w-44"
            />
            <span className="text-xs text-slate-400 pb-2.5">até</span>
            <Input
              type="date"
              label=""
              value={filtros.dataFim}
              onChange={e => setFiltros(f => ({ ...f, dataFim: e.target.value }))}
              className="min-w-44"
            />
            <Button
              variante="ghost"
              tamanho="sm"
              icon={RotateCcw}
              onClick={() => { setFiltros({ modulo: '', usuario_id: '', acao: '', dataInicio: '', dataFim: '' }); setBusca('') }}
            >
              Limpar filtros
            </Button>
          </div>
        </div>
      </Card>

      {erroQuery && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Erro ao carregar auditoria</p>
            <p className="text-xs text-rose-700 mt-0.5 break-words">{erroQuery}</p>
          </div>
        </div>
      )}

      {/* Timeline */}
      <Card>
        {carregando ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : registrosFiltrados.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            titulo={registros.length === 0 ? 'Sem registros de auditoria' : 'Nenhum resultado para os filtros'}
            descricao={registros.length === 0
              ? 'Os registros são criados automaticamente quando ações críticas acontecem (notas alteradas, despesas aprovadas, etc).'
              : 'Tente ajustar os filtros ou limpar a busca.'}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {registrosFiltrados.map(r => {
              const info = infoAcao(r.acao)
              const c = CORES[info.cor]
              const Icon = info.icon
              const usuario = usuariosMap[r.usuario_id]

              return (
                <button
                  key={r.id}
                  onClick={() => setDetalhe(r)}
                  className="w-full px-5 py-4 hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className="flex items-start gap-3">
                    {/* Ícone */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.iconBg}`}>
                      <Icon size={16} className={c.iconText} />
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold text-slate-900">{info.label}</p>
                        <Badge variante={info.cor === 'red' ? 'red' : info.cor === 'yellow' ? 'yellow' : info.cor === 'green' ? 'green' : 'slate'}>
                          {r.modulo}
                        </Badge>
                        {r.motivo && (
                          <Badge variante="purple">com justificativa</Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <User size={11} />
                          {usuario?.nome ?? 'Usuário'} <span className="text-slate-400">({r.perfil})</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {formatarTimestamp(r.created_at)} · {tempoRelativo(r.created_at)}
                        </span>
                        {r.entidade && (
                          <span className="flex items-center gap-1 font-mono">
                            <FileText size={11} />
                            {r.entidade}/{r.entidade_id?.slice(0, 8)}…
                          </span>
                        )}
                      </div>

                      {r.motivo && (
                        <p className="text-xs text-slate-600 mt-2 italic line-clamp-2">"{r.motivo}"</p>
                      )}
                    </div>

                    {/* Chevron */}
                    <Eye size={14} className="text-slate-300 group-hover:text-blue-600 transition-colors mt-1 shrink-0" />
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {registrosFiltrados.length >= 100 && (
          <div className="px-5 py-3 border-t border-slate-100 text-center text-xs text-slate-500">
            Exibindo os 100 registros mais recentes. Use os filtros para refinar.
          </div>
        )}
      </Card>

      {/* Modal de detalhes */}
      <DetalheModal
        registro={detalhe}
        usuario={detalhe ? usuariosMap[detalhe.usuario_id] : null}
        onFechar={() => setDetalhe(null)}
      />
    </div>
  )
}

function StatCard({ label, valor, icon: Icon, cor, texto }) {
  const cores = {
    blue:   { bg: 'bg-blue-50',    text: 'text-blue-700',    iconBg: 'bg-blue-100' },
    red:    { bg: 'bg-rose-50',    text: 'text-rose-700',    iconBg: 'bg-rose-100' },
    purple: { bg: 'bg-purple-50',  text: 'text-purple-700',  iconBg: 'bg-purple-100' },
    orange: { bg: 'bg-orange-50',  text: 'text-orange-700',  iconBg: 'bg-orange-100' },
  }
  const c = cores[cor]
  return (
    <div className={`${c.bg} rounded-2xl p-4 border border-white/60`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 ${c.iconBg} rounded-xl flex items-center justify-center`}>
          <Icon size={15} className={c.text} />
        </div>
      </div>
      <p className={`${texto ? 'text-sm' : 'text-2xl'} font-bold ${c.text} truncate`}>{valor}</p>
      <p className="text-[11px] font-medium text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

function DetalheModal({ registro, usuario, onFechar }) {
  if (!registro) return null
  const info = infoAcao(registro.acao)
  const c = CORES[info.cor]
  const Icon = info.icon

  return (
    <Modal aberto={!!registro} onFechar={onFechar} titulo={null} tamanho="xl">
      {/* Header */}
      <div className="-mx-6 -mt-5 mb-5 px-6 pb-4 pt-2 border-b border-slate-100">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 ${c.iconBg} rounded-2xl flex items-center justify-center shrink-0`}>
            <Icon size={20} className={c.iconText} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-900">{info.label}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {formatarTimestamp(registro.created_at)} · {tempoRelativo(registro.created_at)}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge variante={info.cor === 'red' ? 'red' : 'slate'}>{registro.modulo}</Badge>
              {registro.entidade && <Badge variante="blue">{registro.entidade}</Badge>}
              <Badge variante="slate">ID: {registro.id?.slice(0, 8)}…</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Quem fez */}
      <div className="mb-5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Autor</h3>
        <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0">
            {usuario?.nome?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{usuario?.nome ?? '—'}</p>
            <p className="text-xs text-slate-500 truncate">{usuario?.email ?? registro.usuario_id}</p>
          </div>
          <Badge variante="slate">{registro.perfil}</Badge>
        </div>
      </div>

      {/* Motivo */}
      {registro.motivo && (
        <div className="mb-5">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Justificativa</h3>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-900 italic">"{registro.motivo}"</p>
          </div>
        </div>
      )}

      {/* Antes vs Depois (diff) */}
      {(registro.valor_anterior || registro.valor_novo) && (
        <div className="mb-5">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Alteração</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-4">
              <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-2">Antes</p>
              <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono overflow-x-auto max-h-48">
                {registro.valor_anterior ? JSON.stringify(registro.valor_anterior, null, 2) : '—'}
              </pre>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4">
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2">Depois</p>
              <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono overflow-x-auto max-h-48">
                {registro.valor_novo ? JSON.stringify(registro.valor_novo, null, 2) : '—'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Metadados técnicos */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Metadados</h3>
        <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs">
          <Meta label="ID do Registro" valor={registro.id} mono />
          <Meta label="Ação" valor={registro.acao} mono />
          <Meta label="Entidade" valor={registro.entidade ?? '—'} mono />
          <Meta label="ID da Entidade" valor={registro.entidade_id ?? '—'} mono />
          {registro.ip && <Meta label="IP" valor={registro.ip} mono />}
          <Meta label="Timestamp" valor={formatarTimestamp(registro.created_at)} />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100">
        <ShieldCheck size={13} className="text-emerald-600" />
        <p className="text-[11px] text-slate-500">
          Registro imutável · Gerado por Cloud Function · Não pode ser editado ou excluído
        </p>
      </div>
    </Modal>
  )
}

function Meta({ label, valor, mono }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-slate-500 min-w-32">{label}</span>
      <span className={`text-slate-800 flex-1 break-all ${mono ? 'font-mono' : ''}`}>{valor}</span>
    </div>
  )
}
