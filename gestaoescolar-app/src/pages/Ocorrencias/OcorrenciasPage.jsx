import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  listarOcorrencias,
  criarOcorrencia,
  marcarResolvida,
  buscarAlunos,
  contarPorTipo,
  TIPOS_OCORRENCIA,
} from '../../services/ocorrencias'
import {
  AlertTriangle,
  Stethoscope,
  Send,
  Users,
  Car,
  Plus,
  X,
  Search,
  Eye,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  Calendar,
  Filter,
  FileDown,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Constantes de domínio
// ---------------------------------------------------------------------------

const TIPOS_RESTRITOS_PROFESSOR = ['medico', 'acidente']

const TIPO_CONFIG = {
  disciplinar:    { label: 'Disciplinar',     icon: AlertTriangle, cor: 'amber' },
  medico:         { label: 'Médico',          icon: Stethoscope,   cor: 'red' },
  encaminhamento: { label: 'Encaminhamento',  icon: Send,          cor: 'blue' },
  reuniao:        { label: 'Reunião',         icon: Users,         cor: 'purple' },
  acidente:       { label: 'Acidente',        icon: Car,           cor: 'orange' },
}

const COR_ICONE = {
  amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-100 text-amber-600',  valor: 'text-amber-700'  },
  red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-600',      valor: 'text-red-700'    },
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',    valor: 'text-blue-700'   },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', valor: 'text-purple-700' },
  orange: { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-600', valor: 'text-orange-700' },
}

const GRAVIDADE_BADGE = {
  baixa: 'bg-green-100 text-green-700',
  media: 'bg-yellow-100 text-yellow-700',
  alta:  'bg-red-100 text-red-700',
}

const STATUS_BADGE = {
  aberta:        'bg-blue-100 text-blue-700',
  em_andamento:  'bg-orange-100 text-orange-700',
  resolvida:     'bg-slate-100 text-slate-500',
}

const STATUS_LABEL = {
  aberta:       'Aberta',
  em_andamento: 'Em andamento',
  resolvida:    'Resolvida',
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

function formatarData(valor) {
  if (!valor) return '—'
  // Suporta string ISO 'YYYY-MM-DD' e Timestamp Firestore
  const date = valor?.toDate ? valor.toDate() : new Date(valor + 'T12:00:00')
  return date.toLocaleDateString('pt-BR')
}

function hoje() {
  return new Date().toISOString().split('T')[0]
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function OcorrenciasPage() {
  const { user, perfil } = useAuth()
  const tipoPerfil = perfil?.perfil ?? ''
  const ehProfessor = tipoPerfil === 'professor'

  // --- contadores ---
  const [contagens, setContagens] = useState({
    disciplinar: 0, medico: 0, encaminhamento: 0, reuniao: 0, acidente: 0,
  })

  // --- lista ---
  const [ocorrencias, setOcorrencias] = useState([])
  const [carregando, setCarregando] = useState(true)

  // --- filtros ---
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroGravidade, setFiltroGravidade] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')

  // --- modais ---
  const [modalDetalhes, setModalDetalhes] = useState(null)   // ocorrência selecionada
  const [modalNova, setModalNova] = useState(false)
  const [resolvendo, setResolvendo] = useState(null)          // id em progresso

  // ---------------------------------------------------------------------------
  // Efeito: carregar contagens
  // ---------------------------------------------------------------------------
  useEffect(() => {
    contarPorTipo(tipoPerfil).then(setContagens).catch(console.error)
  }, [tipoPerfil])

  // ---------------------------------------------------------------------------
  // Efeito: carregar lista de ocorrências
  // ---------------------------------------------------------------------------
  const carregarLista = useCallback(async () => {
    setCarregando(true)
    try {
      const filtros = {
        tipo: filtroTipo || undefined,
        status: filtroStatus || undefined,
        gravidade: filtroGravidade || undefined,
        dataInicio: filtroDataInicio || undefined,
        dataFim: filtroDataFim || undefined,
      }
      const dados = await listarOcorrencias(tipoPerfil, filtros)
      setOcorrencias(dados)
    } catch (err) {
      console.error('Erro ao listar ocorrências:', err)
    } finally {
      setCarregando(false)
    }
  }, [tipoPerfil, filtroTipo, filtroStatus, filtroGravidade, filtroDataInicio, filtroDataFim])

  useEffect(() => {
    carregarLista()
  }, [carregarLista])

  // ---------------------------------------------------------------------------
  // Ação: marcar resolvida
  // ---------------------------------------------------------------------------
  async function handleMarcarResolvida(id) {
    setResolvendo(id)
    try {
      await marcarResolvida(id)
      // Atualiza localmente sem refetch completo
      setOcorrencias(prev =>
        prev.map(o => o.id === id ? { ...o, status: 'resolvida' } : o)
      )
      setContagens(prev => prev) // contagens são recarregadas na próxima visita
      if (modalDetalhes?.id === id) {
        setModalDetalhes(prev => ({ ...prev, status: 'resolvida' }))
      }
    } catch (err) {
      console.error('Erro ao marcar resolvida:', err)
    } finally {
      setResolvendo(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Callback: nova ocorrência criada com sucesso
  // ---------------------------------------------------------------------------
  function handleOcorrenciaCriada() {
    setModalNova(false)
    carregarLista()
    contarPorTipo(tipoPerfil).then(setContagens).catch(console.error)
  }

  // ---------------------------------------------------------------------------
  // Tipos visíveis conforme perfil
  // ---------------------------------------------------------------------------
  const tiposVisiveis = TIPOS_OCORRENCIA.filter(t =>
    !ehProfessor || !TIPOS_RESTRITOS_PROFESSOR.includes(t)
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ocorrências</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Registro e acompanhamento de ocorrências escolares
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 text-sm bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
            <FileDown size={15} />
            Exportar
          </button>
          <button
            onClick={() => setModalNova(true)}
            className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={15} />
            Nova Ocorrência
          </button>
        </div>
      </div>

      {/* ── Cards contadores por tipo ── */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {TIPOS_OCORRENCIA.map(tipo => {
          const cfg = TIPO_CONFIG[tipo]
          const c = COR_ICONE[cfg.cor]
          const Icon = cfg.icon
          const restrito = ehProfessor && TIPOS_RESTRITOS_PROFESSOR.includes(tipo)
          const valor = restrito ? 0 : (contagens[tipo] ?? 0)

          return (
            <div
              key={tipo}
              className={`${c.bg} rounded-2xl p-5 border border-white shadow-sm ${
                restrito ? 'opacity-40 cursor-not-allowed select-none' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-slate-600 leading-tight">{cfg.label}</p>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}>
                  <Icon size={16} />
                </div>
              </div>
              <p className={`text-3xl font-bold ${c.valor}`}>{valor}</p>
              {restrito && (
                <p className="text-xs text-slate-400 mt-1">Sem acesso</p>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-2 text-slate-400">
          <Filter size={15} />
          <span className="text-xs font-medium text-slate-500">Filtros</span>
        </div>

        {/* Tipo */}
        <div className="relative">
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            className="pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
          >
            <option value="">Todos os tipos</option>
            {tiposVisiveis.map(t => (
              <option key={t} value={t}>{TIPO_CONFIG[t].label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Status */}
        <div className="relative">
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            className="pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
          >
            <option value="">Todos os status</option>
            <option value="aberta">Aberta</option>
            <option value="em_andamento">Em andamento</option>
            <option value="resolvida">Resolvida</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Gravidade */}
        <div className="relative">
          <select
            value={filtroGravidade}
            onChange={e => setFiltroGravidade(e.target.value)}
            className="pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
          >
            <option value="">Qualquer gravidade</option>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Data início */}
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="date"
            value={filtroDataInicio}
            onChange={e => setFiltroDataInicio(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        {/* Data fim */}
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="date"
            value={filtroDataFim}
            onChange={e => setFiltroDataFim(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        {/* Limpar filtros */}
        {(filtroTipo || filtroStatus || filtroGravidade || filtroDataInicio || filtroDataFim) && (
          <button
            onClick={() => {
              setFiltroTipo('')
              setFiltroStatus('')
              setFiltroGravidade('')
              setFiltroDataInicio('')
              setFiltroDataFim('')
            }}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors px-2 py-2"
          >
            <X size={13} />
            Limpar
          </button>
        )}
      </div>

      {/* ── Tabela ── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {carregando ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : ocorrencias.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <AlertTriangle size={40} className="mb-3 text-slate-200" />
            <p className="text-sm">Nenhuma ocorrência encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3 whitespace-nowrap">Data</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">Aluno</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">Tipo</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">Gravidade</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">Registrado por</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ocorrencias.map(ocorrencia => {
                  const tipoCfg = TIPO_CONFIG[ocorrencia.tipo] ?? TIPO_CONFIG.disciplinar
                  const TipoIcon = tipoCfg.icon
                  return (
                    <tr key={ocorrencia.id} className="hover:bg-slate-50 transition-colors group">
                      {/* Data */}
                      <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {formatarData(ocorrencia.data_ocorrencia)}
                      </td>

                      {/* Aluno */}
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">
                          {ocorrencia.aluno_nome ?? ocorrencia.aluno_id ?? '—'}
                        </p>
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-sm text-slate-700">
                          <TipoIcon size={14} className="text-slate-400 shrink-0" />
                          {tipoCfg.label}
                        </span>
                      </td>

                      {/* Gravidade */}
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${GRAVIDADE_BADGE[ocorrencia.gravidade] ?? 'bg-slate-100 text-slate-500'}`}>
                          {ocorrencia.gravidade ?? '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_BADGE[ocorrencia.status] ?? 'bg-slate-100 text-slate-500'}`}>
                          {STATUS_LABEL[ocorrencia.status] ?? ocorrencia.status ?? '—'}
                        </span>
                      </td>

                      {/* Registrado por */}
                      <td className="px-4 py-3 text-sm text-slate-500 truncate max-w-[160px]">
                        {ocorrencia.registrado_por_nome ?? ocorrencia.registrado_por ?? '—'}
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setModalDetalhes(ocorrencia)}
                            title="Ver detalhes"
                            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors border border-slate-200 hover:border-blue-300 px-2.5 py-1.5 rounded-lg bg-white"
                          >
                            <Eye size={13} />
                            Detalhes
                          </button>
                          {ocorrencia.status !== 'resolvida' && (
                            <button
                              onClick={() => handleMarcarResolvida(ocorrencia.id)}
                              disabled={resolvendo === ocorrencia.id}
                              title="Marcar como resolvida"
                              className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 transition-colors border border-green-200 hover:border-green-400 px-2.5 py-1.5 rounded-lg bg-white disabled:opacity-50"
                            >
                              {resolvendo === ocorrencia.id ? (
                                <span className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <CheckCircle size={13} />
                              )}
                              Resolver
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Detalhes ── */}
      {modalDetalhes && (
        <ModalDetalhes
          ocorrencia={modalDetalhes}
          onClose={() => setModalDetalhes(null)}
          onResolver={handleMarcarResolvida}
          resolvendo={resolvendo}
        />
      )}

      {/* ── Modal Nova Ocorrência ── */}
      {modalNova && (
        <ModalNovaOcorrencia
          perfil={tipoPerfil}
          usuarioId={user?.uid}
          ehProfessor={ehProfessor}
          tiposVisiveis={tiposVisiveis}
          onClose={() => setModalNova(false)}
          onSucesso={handleOcorrenciaCriada}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modal: Ver Detalhes
// ---------------------------------------------------------------------------

function ModalDetalhes({ ocorrencia, onClose, onResolver, resolvendo }) {
  const tipoCfg = TIPO_CONFIG[ocorrencia.tipo] ?? TIPO_CONFIG.disciplinar
  const TipoIcon = tipoCfg.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <TipoIcon size={18} className="text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-800">Detalhes da Ocorrência</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <DetalheItem label="Data" valor={formatarData(ocorrencia.data_ocorrencia)} />
            <DetalheItem label="Tipo" valor={tipoCfg.label} />
            <DetalheItem label="Aluno" valor={ocorrencia.aluno_nome ?? ocorrencia.aluno_id ?? '—'} />
            <DetalheItem label="Registrado por" valor={ocorrencia.registrado_por_nome ?? ocorrencia.registrado_por ?? '—'} />
          </div>

          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Gravidade</p>
              <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${GRAVIDADE_BADGE[ocorrencia.gravidade] ?? 'bg-slate-100 text-slate-500'}`}>
                {ocorrencia.gravidade ?? '—'}
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Status</p>
              <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_BADGE[ocorrencia.status] ?? 'bg-slate-100 text-slate-500'}`}>
                {STATUS_LABEL[ocorrencia.status] ?? ocorrencia.status ?? '—'}
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Notif. responsável</p>
              <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${ocorrencia.notificado_responsavel ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {ocorrencia.notificado_responsavel ? 'Sim' : 'Não'}
              </span>
            </div>
          </div>

          {ocorrencia.descricao && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">Descrição</p>
              <p className="text-sm text-slate-700 bg-slate-50 rounded-xl px-4 py-3 leading-relaxed whitespace-pre-wrap">
                {ocorrencia.descricao}
              </p>
            </div>
          )}

          {ocorrencia.providencia && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">Providência tomada</p>
              <p className="text-sm text-slate-700 bg-slate-50 rounded-xl px-4 py-3 leading-relaxed whitespace-pre-wrap">
                {ocorrencia.providencia}
              </p>
            </div>
          )}
        </div>

        {/* Ações */}
        {ocorrencia.status !== 'resolvida' && (
          <div className="px-6 pb-5">
            <button
              onClick={() => onResolver(ocorrencia.id)}
              disabled={resolvendo === ocorrencia.id}
              className="w-full flex items-center justify-center gap-2 text-sm bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2.5 rounded-lg transition-colors"
            >
              {resolvendo === ocorrencia.id ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle size={16} />
              )}
              Marcar como Resolvida
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function DetalheItem({ label, valor }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm text-slate-800 font-medium">{valor}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modal: Nova Ocorrência
// ---------------------------------------------------------------------------

const FORM_INICIAL = {
  aluno_id: '',
  aluno_nome: '',
  tipo: 'disciplinar',
  gravidade: 'media',
  descricao: '',
  providencia: '',
  notificado_responsavel: false,
  data_ocorrencia: hoje(),
}

function ModalNovaOcorrencia({ perfil, usuarioId, ehProfessor, tiposVisiveis, onClose, onSucesso }) {
  const [form, setForm] = useState(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  // Busca de alunos com debounce
  const [termoBusca, setTermoBusca] = useState('')
  const [resultadosBusca, setResultadosBusca] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const debounceRef = useRef(null)
  const inputBuscaRef = useRef(null)

  // Garante que o tipo inicial é visível para o perfil
  useEffect(() => {
    if (ehProfessor && TIPOS_RESTRITOS_PROFESSOR.includes(form.tipo)) {
      setForm(f => ({ ...f, tipo: tiposVisiveis[0] ?? 'disciplinar' }))
    }
  }, [ehProfessor, tiposVisiveis, form.tipo])

  // Debounce na busca de alunos
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (termoBusca.trim().length < 2) {
      setResultadosBusca([])
      setDropdownAberto(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const resultados = await buscarAlunos(termoBusca)
        setResultadosBusca(resultados)
        setDropdownAberto(resultados.length > 0)
      } catch (err) {
        console.error('Erro na busca de alunos:', err)
      } finally {
        setBuscando(false)
      }
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [termoBusca])

  function selecionarAluno(aluno) {
    setForm(f => ({ ...f, aluno_id: aluno.id, aluno_nome: aluno.nome_completo }))
    setTermoBusca(aluno.nome_completo)
    setDropdownAberto(false)
    setResultadosBusca([])
  }

  function limparAluno() {
    setForm(f => ({ ...f, aluno_id: '', aluno_nome: '' }))
    setTermoBusca('')
    setDropdownAberto(false)
    setTimeout(() => inputBuscaRef.current?.focus(), 0)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')

    if (!form.aluno_id) {
      setErro('Selecione um aluno para registrar a ocorrência.')
      return
    }
    if (!form.descricao.trim()) {
      setErro('A descrição é obrigatória.')
      return
    }

    // Segurança: professor não pode registrar tipo restrito
    if (ehProfessor && TIPOS_RESTRITOS_PROFESSOR.includes(form.tipo)) {
      setErro('Tipo de ocorrência não permitido para este perfil.')
      return
    }

    setSalvando(true)
    try {
      await criarOcorrencia(
        {
          aluno_id: form.aluno_id,
          tipo: form.tipo,
          descricao: form.descricao.trim(),
          providencia: form.providencia.trim(),
          data_ocorrencia: form.data_ocorrencia,
          gravidade: form.gravidade,
          notificado_responsavel: form.notificado_responsavel,
        },
        usuarioId
      )
      onSucesso()
    } catch (err) {
      console.error('Erro ao criar ocorrência:', err)
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-slate-800">Nova Ocorrência</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Campo Aluno */}
          <CampoForm label="Aluno *">
            <div className="relative">
              {form.aluno_id ? (
                /* Aluno selecionado */
                <div className="flex items-center justify-between px-3 py-2.5 border border-slate-200 rounded-lg bg-blue-50">
                  <span className="text-sm font-medium text-blue-800">{form.aluno_nome}</span>
                  <button
                    type="button"
                    onClick={limparAluno}
                    className="text-slate-400 hover:text-red-500 transition-colors ml-2"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                /* Campo de busca */
                <>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      ref={inputBuscaRef}
                      type="text"
                      value={termoBusca}
                      onChange={e => setTermoBusca(e.target.value)}
                      onFocus={() => resultadosBusca.length > 0 && setDropdownAberto(true)}
                      placeholder="Digite o nome do aluno..."
                      className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      autoComplete="off"
                    />
                    {buscando && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        <span className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
                      </span>
                    )}
                  </div>

                  {/* Dropdown de resultados */}
                  {dropdownAberto && resultadosBusca.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                      {resultadosBusca.map(aluno => (
                        <button
                          key={aluno.id}
                          type="button"
                          onClick={() => selecionarAluno(aluno)}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors text-sm text-slate-800"
                        >
                          <span className="font-medium">{aluno.nome_completo}</span>
                          {aluno.data_nascimento && (
                            <span className="text-xs text-slate-400 ml-2">
                              · {formatarData(aluno.data_nascimento)}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {termoBusca.trim().length >= 2 && !buscando && resultadosBusca.length === 0 && (
                    <p className="text-xs text-slate-400 mt-1.5 px-1">Nenhum aluno encontrado para "{termoBusca}".</p>
                  )}
                </>
              )}
            </div>
          </CampoForm>

          {/* Tipo e Gravidade */}
          <div className="grid grid-cols-2 gap-3">
            <CampoForm label="Tipo *">
              <div className="relative">
                <select
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  className="w-full pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
                >
                  {tiposVisiveis.map(t => (
                    <option key={t} value={t}>{TIPO_CONFIG[t].label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </CampoForm>

            <CampoForm label="Gravidade *">
              <div className="relative">
                <select
                  value={form.gravidade}
                  onChange={e => setForm(f => ({ ...f, gravidade: e.target.value }))}
                  className="w-full pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </CampoForm>
          </div>

          {/* Data da ocorrência */}
          <CampoForm label="Data da ocorrência *">
            <input
              type="date"
              value={form.data_ocorrencia}
              max={hoje()}
              onChange={e => setForm(f => ({ ...f, data_ocorrencia: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            />
          </CampoForm>

          {/* Descrição */}
          <CampoForm label="Descrição *">
            <textarea
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Descreva detalhadamente o ocorrido..."
              rows={4}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-y"
              required
            />
          </CampoForm>

          {/* Providência */}
          <CampoForm label="Providência tomada">
            <textarea
              value={form.providencia}
              onChange={e => setForm(f => ({ ...f, providencia: e.target.value }))}
              placeholder="Descreva as ações tomadas (opcional)..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-y"
            />
          </CampoForm>

          {/* Notificar responsável */}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.notificado_responsavel}
              onChange={e => setForm(f => ({ ...f, notificado_responsavel: e.target.checked }))}
              className="accent-blue-600 mt-0.5 w-4 h-4 shrink-0"
            />
            <div>
              <span className="text-sm font-medium text-slate-700">Notificar responsável</span>
              <p className="text-xs text-slate-400 mt-0.5">
                Marca a ocorrência para envio de notificação ao responsável pelo aluno.
              </p>
            </div>
          </label>

          {/* Erro */}
          {erro && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              <AlertCircle size={15} className="shrink-0" />
              {erro}
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-sm border border-slate-200 text-slate-600 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="flex-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {salvando && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {salvando ? 'Registrando...' : 'Registrar Ocorrência'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CampoForm({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
