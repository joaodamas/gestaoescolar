import { useEffect, useMemo, useState } from 'react'
import {
  Calendar, Plus, ChevronLeft, ChevronRight, AlertCircle,
  BookOpen, PartyPopper, Coffee, CalendarCheck, RotateCcw,
  Pencil, Trash2, CalendarDays
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  listarCalendario, criarEvento, atualizarEvento, removerEvento,
  contarDiasLetivos
} from '../../services/calendario'
import { listarTodasTurmas } from '../../services/turmas'
import PageHeader from '../../components/ui/PageHeader'
import { Card, CardHeader, Badge, EmptyState, Spinner } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'

const ANO_ATUAL = new Date().getFullYear()

const TIPOS = [
  { id: 'aula',      label: 'Aula',      icon: BookOpen,      variante: 'slate',
    cell: 'bg-white text-slate-700', cor: 'bg-white' },
  { id: 'feriado',   label: 'Feriado',   icon: PartyPopper,   variante: 'red',
    cell: 'bg-rose-100 text-rose-700' },
  { id: 'recesso',   label: 'Recesso',   icon: Coffee,        variante: 'yellow',
    cell: 'bg-amber-100 text-amber-700' },
  { id: 'evento',    label: 'Evento',    icon: CalendarCheck, variante: 'blue',
    cell: 'bg-blue-100 text-blue-700' },
  { id: 'reposicao', label: 'Reposição', icon: RotateCcw,     variante: 'green',
    cell: 'bg-emerald-100 text-emerald-700' },
]

const TIPO_MAP = TIPOS.reduce((acc, t) => { acc[t.id] = t; return acc }, {})

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Helpers — formato YYYY-MM-DD sempre tratado como local (evita fuso horário)
function toIsoDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function parseIsoDate(iso) {
  // Constrói Date local sem deslocar por fuso (usa T00:00:00)
  return new Date(iso + 'T00:00:00')
}
function formatarDataBr(iso) {
  return parseIsoDate(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}
function hojeIso() {
  const d = new Date()
  return toIsoDate(d.getFullYear(), d.getMonth(), d.getDate())
}

const FORM_VAZIO = {
  data: '',
  tipo: 'feriado',
  descricao: '',
  turma_id: '',
  ano_letivo: ANO_ATUAL,
}

export default function CalendarioPage() {
  const { user, perfil, escolaId, unidadeAtualId } = useAuth()
  const podeGerenciar = ['diretor', 'admin'].includes(perfil?.perfil)
  const escopo = useMemo(() => ({ escolaId, unidadeAtualId, perfil }), [escolaId, unidadeAtualId, perfil])

  const [eventos, setEventos]     = useState([])
  const [turmas, setTurmas]       = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erroQuery, setErroQuery] = useState('')

  const [aba, setAba] = useState('mes') // 'mes' | 'lista'

  // Calendário visual
  const [mesAtual, setMesAtual] = useState(() => {
    const d = new Date()
    return { ano: d.getFullYear(), mes: d.getMonth() }
  })

  // Estatísticas
  const [diasLetivos, setDiasLetivos] = useState(0)

  // Filtros da lista
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroAno, setFiltroAno]   = useState(ANO_ATUAL)

  // Modal
  const [modalAberto, setModalAberto] = useState(false)
  const [editandoId, setEditandoId]   = useState(null)
  const [form, setForm]               = useState(FORM_VAZIO)
  const [salvando, setSalvando]       = useState(false)
  const [erroForm, setErroForm]       = useState('')

  async function carregar(ano = filtroAno) {
    setCarregando(true)
    setErroQuery('')
    try {
      const [lista, total, ts] = await Promise.all([
        listarCalendario(ano, escopo),
        contarDiasLetivos(ano, escopo),
        listarTodasTurmas(ano, escopo).catch(() => []),
      ])
      setEventos(lista)
      setDiasLetivos(total)
      setTurmas(ts)
    } catch (err) {
      console.error(err)
      setErroQuery('Não foi possível carregar o calendário. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar(filtroAno) }, [filtroAno, escopo])

  // Mapa { 'YYYY-MM-DD': evento } — primeiro evento da data (em geral só um)
  const eventosPorData = useMemo(() => {
    const map = new Map()
    for (const ev of eventos) if (ev.data && !map.has(ev.data)) map.set(ev.data, ev)
    return map
  }, [eventos])

  const feriadosCount = useMemo(
    () => eventos.filter(e => e.tipo === 'feriado').length,
    [eventos]
  )

  const proximoEvento = useMemo(() => {
    const hoje = hojeIso()
    return eventos
      .filter(e => e.data >= hoje && (e.tipo === 'feriado' || e.tipo === 'evento' || e.tipo === 'recesso'))
      .sort((a, b) => a.data.localeCompare(b.data))[0] ?? null
  }, [eventos])

  // ===== Navegação do mês =====
  function mesAnterior() {
    setMesAtual(m => {
      const nm = m.mes - 1
      return nm < 0 ? { ano: m.ano - 1, mes: 11 } : { ano: m.ano, mes: nm }
    })
  }
  function mesSeguinte() {
    setMesAtual(m => {
      const nm = m.mes + 1
      return nm > 11 ? { ano: m.ano + 1, mes: 0 } : { ano: m.ano, mes: nm }
    })
  }

  // ===== Grade do mês =====
  // Date(y, m, 0).getDate() -> dias do mês anterior; Date(y, m+1, 0) -> último dia do mês atual
  // Trata corretamente fevereiro (28/29 dias) e meses com 30/31 dias.
  const gradeMes = useMemo(() => {
    const { ano, mes } = mesAtual
    const primeiroDia = new Date(ano, mes, 1).getDay()        // 0..6 (dom..sáb)
    const diasNoMes   = new Date(ano, mes + 1, 0).getDate()   // 28/29/30/31

    const celulas = []
    // espaços antes do dia 1
    for (let i = 0; i < primeiroDia; i++) celulas.push(null)
    for (let d = 1; d <= diasNoMes; d++) {
      const iso = toIsoDate(ano, mes, d)
      const ev = eventosPorData.get(iso) ?? null
      const diaSemana = new Date(ano, mes, d).getDay()
      celulas.push({ dia: d, iso, ev, diaSemana })
    }
    // completa a última linha (múltiplos de 7)
    while (celulas.length % 7 !== 0) celulas.push(null)
    return celulas
  }, [mesAtual, eventosPorData])

  // ===== Modal =====
  function abrirCriacao(dataIso = '') {
    setEditandoId(null)
    setForm({
      ...FORM_VAZIO,
      data: dataIso || hojeIso(),
      ano_letivo: filtroAno,
    })
    setErroForm('')
    setModalAberto(true)
  }

  function abrirEdicao(ev) {
    setEditandoId(ev.id)
    setForm({
      data: ev.data ?? '',
      tipo: ev.tipo ?? 'feriado',
      descricao: ev.descricao ?? '',
      turma_id: ev.turma_id ?? '',
      ano_letivo: ev.ano_letivo ?? ANO_ATUAL,
    })
    setErroForm('')
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setErroForm('')
  }

  async function salvar(e) {
    e?.preventDefault?.()
    if (!form.data) { setErroForm('Data é obrigatória.'); return }
    if (!form.tipo) { setErroForm('Tipo é obrigatório.'); return }
    if (form.tipo !== 'aula' && !form.descricao.trim()) {
      setErroForm('Descrição é obrigatória para este tipo.')
      return
    }

    const dados = {
      data: form.data,
      tipo: form.tipo,
      descricao: form.descricao.trim(),
      turma_id: form.turma_id || null,
      ano_letivo: Number(form.ano_letivo) || parseIsoDate(form.data).getFullYear(),
    }

    setSalvando(true)
    try {
      if (editandoId) {
        await atualizarEvento(editandoId, dados)
      } else {
        await criarEvento(dados, user.uid, escopo)
      }
      fecharModal()
      await carregar(filtroAno)
    } catch (err) {
      console.error(err)
      setErroForm('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  async function remover(ev) {
    if (!confirm(`Remover "${ev.descricao || ev.tipo}" de ${formatarDataBr(ev.data)}?`)) return
    try {
      await removerEvento(ev.id)
      await carregar(filtroAno)
    } catch (err) {
      console.error(err)
      alert('Erro ao remover evento.')
    }
  }

  // Click na célula do grid
  function onClickCelula(cel) {
    if (!cel) return
    if (cel.ev) { abrirEdicao(cel.ev); return }
    if (podeGerenciar) abrirCriacao(cel.iso)
  }

  // ===== Lista filtrada =====
  const listaFiltrada = useMemo(() => {
    return eventos
      .filter(e => !filtroTipo || e.tipo === filtroTipo)
      .sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''))
  }, [eventos, filtroTipo])

  const hojeStr = hojeIso()

  return (
    <div>
      <PageHeader
        titulo="Calendário Escolar"
        descricao={`${eventos.length} registros · Ano letivo ${filtroAno}`}
        icon={Calendar}
        acoes={
          podeGerenciar && (
            <Button variante="accent" icon={Plus} onClick={() => abrirCriacao()}>
              Novo Evento
            </Button>
          )
        }
      />

      {/* Banner de erro */}
      {erroQuery && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <p className="text-sm">{erroQuery}</p>
        </div>
      )}

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <BookOpen size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Dias letivos</p>
              <p className="text-xl font-bold text-slate-900">{diasLetivos}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Ano {filtroAno}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <PartyPopper size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Feriados</p>
              <p className="text-xl font-bold text-slate-900">{feriadosCount}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Cadastrados no ano</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <CalendarCheck size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Próximo evento</p>
              {proximoEvento ? (
                <>
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {proximoEvento.descricao || TIPO_MAP[proximoEvento.tipo]?.label}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{formatarDataBr(proximoEvento.data)}</p>
                </>
              ) : (
                <p className="text-sm font-medium text-slate-400 mt-1">Nenhum à frente</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setAba('mes')}
          className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
            aba === 'mes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Calendário mensal
        </button>
        <button
          onClick={() => setAba('lista')}
          className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
            aba === 'lista' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Lista de eventos
        </button>
      </div>

      {carregando ? (
        <div className="flex justify-center py-32"><Spinner size="lg" /></div>
      ) : aba === 'mes' ? (
        <Card>
          {/* Header do mês */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <button
                onClick={mesAnterior}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors"
                aria-label="Mês anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <h3 className="text-sm font-semibold text-slate-900 min-w-[160px] text-center">
                {MESES[mesAtual.mes]} {mesAtual.ano}
              </h3>
              <button
                onClick={mesSeguinte}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors"
                aria-label="Próximo mês"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Legenda */}
            <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-500">
              {TIPOS.filter(t => t.id !== 'aula').map(t => (
                <span key={t.id} className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded ${t.cell}`} />
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* Grade 7 colunas */}
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-500 py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {gradeMes.map((cel, idx) => {
                if (!cel) {
                  return <div key={idx} className="aspect-square rounded-lg bg-transparent" />
                }
                const ehHoje = cel.iso === hojeStr
                const fimDeSemana = cel.diaSemana === 0 || cel.diaSemana === 6
                const tipoCfg = cel.ev ? TIPO_MAP[cel.ev.tipo] : null
                const baseCor = tipoCfg
                  ? tipoCfg.cell
                  : fimDeSemana
                    ? 'bg-slate-50 text-slate-400'
                    : 'bg-white text-slate-700'
                const clicavel = cel.ev || podeGerenciar
                return (
                  <button
                    key={cel.iso}
                    onClick={() => onClickCelula(cel)}
                    disabled={!clicavel}
                    className={`
                      relative aspect-square rounded-lg border border-slate-200/70 p-1.5
                      text-left transition-all duration-150
                      ${baseCor}
                      ${clicavel ? 'hover:shadow-md hover:border-slate-300 cursor-pointer' : 'cursor-default'}
                      ${ehHoje ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                    `}
                    title={cel.ev?.descricao || (tipoCfg ? tipoCfg.label : '')}
                  >
                    <div className="flex items-start justify-between">
                      <span className={`text-xs font-bold ${ehHoje ? 'text-blue-700' : ''}`}>{cel.dia}</span>
                      {cel.ev && tipoCfg && (
                        <tipoCfg.icon size={11} className="opacity-70 shrink-0" />
                      )}
                    </div>
                    {cel.ev?.descricao && (
                      <p className="absolute bottom-1 left-1.5 right-1.5 text-[10px] font-medium leading-tight line-clamp-2">
                        {cel.ev.descricao}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </Card>
      ) : (
        // ===== Lista =====
        <Card>
          <div className="flex flex-wrap items-end gap-3 px-5 py-4 border-b border-slate-100">
            <Select
              label="Tipo"
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
              className="w-44"
            >
              <option value="">Todos</option>
              {TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
            <Select
              label="Ano letivo"
              value={filtroAno}
              onChange={e => setFiltroAno(Number(e.target.value))}
              className="w-36"
            >
              {[ANO_ATUAL - 1, ANO_ATUAL, ANO_ATUAL + 1].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </Select>
          </div>

          {listaFiltrada.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              titulo="Nenhum evento encontrado"
              descricao="Cadastre feriados, recessos e eventos do ano letivo para organizar a chamada."
              acao={podeGerenciar
                ? <Button variante="accent" icon={Plus} onClick={() => abrirCriacao()}>Novo Evento</Button>
                : null}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {listaFiltrada.map(ev => {
                const cfg = TIPO_MAP[ev.tipo] ?? TIPO_MAP.evento
                const TipoIcon = cfg.icon
                return (
                  <div key={ev.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.cell}`}>
                      <TipoIcon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {ev.descricao || cfg.label}
                        </p>
                        <Badge variante={cfg.variante}>{cfg.label}</Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        {formatarDataBr(ev.data)}
                        {ev.turma_id && ' · Turma específica'}
                        {!ev.turma_id && ' · Toda a escola'}
                      </p>
                    </div>
                    {podeGerenciar && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => abrirEdicao(ev)}
                          className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => remover(ev)}
                          className="w-8 h-8 rounded-lg hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors"
                          title="Remover"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* Modal — criar / editar */}
      <Modal
        aberto={modalAberto}
        onFechar={fecharModal}
        titulo={editandoId ? 'Editar evento' : 'Novo evento no calendário'}
        descricao="Feriados, recessos, eventos e reposições aparecem para todos os usuários."
        tamanho="lg"
        footer={
          <>
            <Button variante="ghost" onClick={fecharModal}>Cancelar</Button>
            <Button variante="accent" loading={salvando} onClick={salvar}>
              {editandoId ? 'Salvar alterações' : 'Criar evento'}
            </Button>
          </>
        }
      >
        <form onSubmit={salvar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Data *"
            type="date"
            required
            value={form.data}
            onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
          />
          <Select
            label="Tipo *"
            value={form.tipo}
            onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
          >
            {TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </Select>

          <Input
            label={`Descrição ${form.tipo === 'aula' ? '' : '*'}`}
            value={form.descricao}
            onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
            placeholder={form.tipo === 'feriado' ? 'Ex: Tiradentes' : 'Descreva o evento'}
            className="md:col-span-2"
          />

          <Select
            label="Turma (opcional)"
            value={form.turma_id}
            onChange={e => setForm(f => ({ ...f, turma_id: e.target.value }))}
          >
            <option value="">Toda a escola</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </Select>
          <Input
            label="Ano letivo"
            type="number"
            min={ANO_ATUAL - 5}
            max={ANO_ATUAL + 5}
            value={form.ano_letivo}
            onChange={e => setForm(f => ({ ...f, ano_letivo: e.target.value }))}
          />

          {erroForm && (
            <div className="md:col-span-2 flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <p className="text-sm">{erroForm}</p>
            </div>
          )}
        </form>
      </Modal>
    </div>
  )
}
