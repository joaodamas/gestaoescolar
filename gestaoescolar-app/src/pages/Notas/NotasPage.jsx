import { useEffect, useState, useMemo, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { listarTurmas } from '../../services/turmas'
import { alunoResumoDaMatricula, listarMatriculasDaTurma } from '../../services/matriculas'
import {
  listarDisciplinasDaTurma,
  listarAvaliacoes,
  criarAvaliacao,
  listarNotas,
  salvarNota,
  calcularMediaBimestral,
  fecharBimestre,
} from '../../services/notas'
import { buscarConfiguracoes } from '../../services/configuracoes'
import {
  Plus,
  Save,
  Lock,
  Unlock,
  AlertCircle,
  BookOpen,
  ChevronDown,
  X,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'

const ANO_LETIVO = new Date().getFullYear()

const BIMESTRES = [1, 2, 3, 4]

const TIPOS_AVALIACAO = [
  { value: 'prova', label: 'Prova' },
  { value: 'trabalho', label: 'Trabalho' },
  { value: 'participacao', label: 'Participação' },
  { value: 'recuperacao', label: 'Recuperação' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcularSituacao(media, regras = {}) {
  if (media === null || media === undefined) return null
  const mediaAprovacao = Number(regras.media_aprovacao) || 6
  const mediaRecuperacao = Number(regras.media_recuperacao_minima) || 4
  if (media >= mediaAprovacao) return 'aprovado'
  if (media >= mediaRecuperacao) return 'recuperacao'
  return 'reprovado'
}

function BadgeSituacao({ situacao }) {
  if (!situacao) return <span className="text-slate-300 text-xs">—</span>

  const cfg = {
    aprovado:    { label: 'Aprovado',     cls: 'bg-green-100 text-green-700' },
    recuperacao: { label: 'Recuperação',  cls: 'bg-amber-100 text-amber-700' },
    reprovado:   { label: 'Reprovado',    cls: 'bg-red-100 text-red-700' },
  }[situacao]

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function Spinner({ size = 'md' }) {
  const dim = size === 'sm' ? 'w-4 h-4 border-2' : 'w-6 h-6 border-4'
  return (
    <div className={`${dim} border-blue-600 border-t-transparent rounded-full animate-spin`} />
  )
}

// ─── Modal Nova Avaliação ────────────────────────────────────────────────────

function ModalNovaAvaliacao({ onClose, onSalvar, salvando }) {
  const [form, setForm] = useState({
    tipo: 'prova',
    descricao: '',
    peso: '1.0',
    nota_maxima: '10',
    data_aplicacao: new Date().toISOString().split('T')[0],
  })
  const [erro, setErro] = useState('')

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function validar() {
    if (!form.descricao.trim()) return 'Informe uma descrição.'
    const peso = Number(form.peso)
    if (isNaN(peso) || peso <= 0 || peso > 1) return 'Peso deve ser entre 0.01 e 1.0.'
    const notaMax = Number(form.nota_maxima)
    if (isNaN(notaMax) || notaMax <= 0) return 'Nota máxima inválida.'
    if (!form.data_aplicacao) return 'Informe a data de aplicação.'
    return ''
  }

  function handleSubmit(e) {
    e.preventDefault()
    const msg = validar()
    if (msg) { setErro(msg); return }
    setErro('')
    onSalvar({
      tipo: form.tipo,
      descricao: form.descricao.trim(),
      peso: Number(form.peso),
      nota_maxima: Number(form.nota_maxima),
      data_aplicacao: form.data_aplicacao,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Nova Avaliação</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Tipo</label>
            <select
              value={form.tipo}
              onChange={e => set('tipo', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {TIPOS_AVALIACAO.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Descrição</label>
            <input
              type="text"
              value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
              placeholder="Ex: Prova Escrita Unidade 1"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Peso <span className="text-slate-400">(0.01 – 1.0)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="1"
                value={form.peso}
                onChange={e => set('peso', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Nota Máxima</label>
              <input
                type="number"
                step="0.5"
                min="1"
                value={form.nota_maxima}
                onChange={e => set('nota_maxima', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Data de Aplicação</label>
            <input
              type="date"
              value={form.data_aplicacao}
              onChange={e => set('data_aplicacao', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {erro && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={14} />
              {erro}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {salvando ? <Spinner size="sm" /> : <Plus size={14} />}
              {salvando ? 'Salvando...' : 'Criar Avaliação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function NotasPage() {
  const { user, perfil } = useAuth()

  const perfilTipo = perfil?.perfil ?? ''
  const isProfessor = perfilTipo === 'professor'
  const isGestor = ['diretor', 'coordenador', 'admin'].includes(perfilTipo)
  const podeAprovarConselho = ['diretor', 'coordenador'].includes(perfilTipo)

  // ── Filtros ────────────────────────────────────────────────────────────────
  const [turmas, setTurmas]           = useState([])
  const [turmaSel, setTurmaSel]       = useState('')
  const [disciplinas, setDisciplinas] = useState([])
  const [discSel, setDiscSel]         = useState('')
  const [bimestre, setBimestre]       = useState(1)

  // ── Dados ──────────────────────────────────────────────────────────────────
  const [alunos, setAlunos]           = useState([])
  const [avaliacoes, setAvaliacoes]   = useState([])
  const [regrasRecuperacao, setRegrasRecuperacao] = useState({
    media_aprovacao: 6,
    media_recuperacao_minima: 4,
    usar_maior_nota: true,
  })
  // { [alunoId_avaliacaoId]: { nota, id } }
  const [notasMap, setNotasMap]       = useState({})
  const [recuperacaoMap, setRecuperacaoMap] = useState({})
  const [conselhoMap, setConselhoMap] = useState({})

  // ── Estado UI ──────────────────────────────────────────────────────────────
  const [modoEdicao, setModoEdicao]   = useState(false)
  const [bimestreFechado, setBimestreFechado] = useState(false)
  const [carregandoAlunos, setCarregandoAlunos]       = useState(false)
  const [carregandoAvaliacoes, setCarregandoAvaliacoes] = useState(false)
  const [salvandoNota, setSalvandoNota]   = useState(false)
  const [salvandoRasc, setSalvandoRasc]   = useState(false)
  const [fechandoBim, setFechandoBim]     = useState(false)
  const [criandoAval, setCriandoAval]     = useState(false)
  const [showModal, setShowModal]         = useState(false)
  const [msgSucesso, setMsgSucesso]       = useState('')
  const [msgErro, setMsgErro]             = useState('')

  // Rascunho das notas editadas localmente antes de salvar
  const [rascunho, setRascunho] = useState({})
  const [rascunhoRecuperacao, setRascunhoRecuperacao] = useState({})
  const [rascunhoConselho, setRascunhoConselho] = useState({})

  // ── Carrega turmas ─────────────────────────────────────────────────────────
  useEffect(() => {
    listarTurmas(ANO_LETIVO).then(todas => {
      if (isGestor) {
        setTurmas(todas)
        return
      }
      const minhas = todas.filter(t => perfil?.turmas_ids?.includes(t.id))
      setTurmas(minhas)
      if (minhas.length === 1) setTurmaSel(minhas[0].id)
    }).catch(err => {
      console.error(err)
      setMsgErro('Erro ao carregar turmas. Verifique permissões/índices.')
    })
  }, [])

  useEffect(() => {
    buscarConfiguracoes()
      .then(cfg => {
        setRegrasRecuperacao({
          media_aprovacao: Number(cfg.regras_recuperacao_final?.media_aprovacao) || 6,
          media_recuperacao_minima: Number(cfg.regras_recuperacao_final?.media_recuperacao_minima) || 4,
          usar_maior_nota: cfg.regras_recuperacao_final?.usar_maior_nota ?? true,
        })
      })
      .catch(err => {
        console.error(err)
        setMsgErro('Erro ao carregar regras de recuperação. Usando configuração padrão.')
      })
  }, [])

  // ── Carrega disciplinas quando turma muda ──────────────────────────────────
  useEffect(() => {
    if (!turmaSel) { setDisciplinas([]); setDiscSel(''); return }
    listarDisciplinasDaTurma(turmaSel, ANO_LETIVO).then(lista => {
      setDisciplinas(lista)
      setDiscSel('')
    }).catch(err => {
      console.error(err)
      setDisciplinas([])
      setDiscSel('')
      setMsgErro('Erro ao carregar disciplinas. Verifique permissões/índices.')
    })
  }, [turmaSel])

  // ── Carrega alunos quando turma muda ──────────────────────────────────────
  useEffect(() => {
    if (!turmaSel) { setAlunos([]); return }
    setCarregandoAlunos(true)
    listarMatriculasDaTurma(turmaSel, ANO_LETIVO)
      .then(matriculas => {
        const lista = matriculas
          .map(alunoResumoDaMatricula)
          .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, 'pt-BR'))
        setAlunos(
          lista.filter(a => a.id)
        )
      })
      .catch(err => {
        console.error(err)
        setAlunos([])
        setMsgErro('Erro ao carregar alunos da turma. Verifique permissões/índices.')
      })
      .finally(() => setCarregandoAlunos(false))
  }, [turmaSel])

  // ── Carrega avaliações e notas quando filtros completos mudam ──────────────
  useEffect(() => {
    if (!turmaSel || !discSel) {
      setAvaliacoes([])
      setNotasMap({})
      setRascunho({})
      setBimestreFechado(false)
      return
    }

    setCarregandoAvaliacoes(true)
    setModoEdicao(false)
    setMsgSucesso('')
    setMsgErro('')

    async function carregar() {
      const [avals] = await Promise.all([
        listarAvaliacoes(turmaSel, discSel, bimestre, ANO_LETIVO),
      ])
      setAvaliacoes(avals)

      // Carrega notas de todas as avaliações em paralelo
      const todasNotas = (
        await Promise.all(avals.map(a => listarNotas(a.id)))
      ).flat()

      const mapa = {}
      const recuperacoes = {}
      const conselhos = {}
      let algumFechado = false
      todasNotas.forEach(n => {
        const chave = `${n.aluno_id}_${n.avaliacao_id}`
        mapa[chave] = { nota: n.nota, id: n.id, fechado: n.fechado }
        if (n.nota_recuperacao !== undefined && n.nota_recuperacao !== null) {
          recuperacoes[n.aluno_id] = n.nota_recuperacao
        }
        if (n.aprovado_conselho !== undefined) {
          conselhos[n.aluno_id] = !!n.aprovado_conselho
        }
        if (n.fechado) algumFechado = true
      })
      setNotasMap(mapa)
      setRecuperacaoMap(recuperacoes)
      setConselhoMap(conselhos)
      setRascunho({})
      setRascunhoRecuperacao({})
      setRascunhoConselho({})
      setBimestreFechado(algumFechado)
    }

    carregar().catch(err => {
      console.error(err)
      setAvaliacoes([])
      setNotasMap({})
      setRecuperacaoMap({})
      setConselhoMap({})
      setMsgErro('Erro ao carregar avaliações/notas. Verifique permissões/índices.')
    }).finally(() => setCarregandoAvaliacoes(false))
  }, [turmaSel, discSel, bimestre])

  // ── Permissão de edição ────────────────────────────────────────────────────
  const podeEditar = isGestor || (!bimestreFechado && isProfessor)
  const podeFEchar = isProfessor && !bimestreFechado && turmaSel && discSel

  // ── Valor exibido numa célula (rascunho tem prioridade) ───────────────────
  function valorCelula(alunoId, avalId) {
    const chaveRasc = `${alunoId}_${avalId}`
    if (chaveRasc in rascunho) return rascunho[chaveRasc]
    return notasMap[chaveRasc]?.nota ?? ''
  }

  function handleCelulaChange(alunoId, avalId, valor) {
    const chave = `${alunoId}_${avalId}`
    setRascunho(prev => ({ ...prev, [chave]: valor }))
  }

  function valorRecuperacao(alunoId) {
    if (alunoId in rascunhoRecuperacao) return rascunhoRecuperacao[alunoId]
    return recuperacaoMap[alunoId] ?? ''
  }

  function valorConselho(alunoId) {
    if (alunoId in rascunhoConselho) return rascunhoConselho[alunoId]
    return conselhoMap[alunoId] ?? false
  }

  // ── Médias calculadas em tempo real ───────────────────────────────────────
  const medias = useMemo(() => {
    const resultado = {}
    alunos.forEach(aluno => {
      const notasDoAluno = avaliacoes.map(av => {
        const chave = `${aluno.id}_${av.id}`
        const valor = chave in rascunho ? rascunho[chave] : (notasMap[chave]?.nota ?? '')
        return { avaliacao_id: av.id, nota: valor === '' ? null : Number(valor) }
      })
      const mediaBase = calcularMediaBimestral(notasDoAluno, avaliacoes)
      const recuperacaoBruta = valorRecuperacao(aluno.id)
      const recuperacao = recuperacaoBruta === '' ? null : Number(recuperacaoBruta)
      const mediaFinal = recuperacao !== null && !Number.isNaN(recuperacao)
        ? regrasRecuperacao.usar_maior_nota
          ? Math.max(mediaBase ?? recuperacao, recuperacao)
          : (((mediaBase ?? recuperacao) + recuperacao) / 2)
        : mediaBase
      const aprovadoConselho = valorConselho(aluno.id)
      resultado[aluno.id] = {
        base: mediaBase,
        recuperacao,
        final: aprovadoConselho && mediaFinal !== null && mediaFinal < regrasRecuperacao.media_aprovacao
          ? regrasRecuperacao.media_aprovacao
          : mediaFinal,
        aprovadoConselho,
      }
    })
    return resultado
  }, [alunos, avaliacoes, rascunho, notasMap, rascunhoRecuperacao, recuperacaoMap, rascunhoConselho, conselhoMap, regrasRecuperacao])

  // ── Salvar rascunho ───────────────────────────────────────────────────────
  async function salvarRascunho() {
    const temNotas = Object.keys(rascunho).length > 0
    const temRecuperacao = Object.keys(rascunhoRecuperacao).length > 0
    const temConselho = Object.keys(rascunhoConselho).length > 0

    if (!temNotas && !temRecuperacao && !temConselho) {
      setMsgSucesso('Nenhuma alteração para salvar.')
      return
    }
    setSalvandoRasc(true)
    setMsgErro('')
    try {
      const alunosAfetados = new Set([
        ...Object.keys(rascunho).map(chave => chave.split('_')[0]),
        ...Object.keys(rascunhoRecuperacao),
        ...Object.keys(rascunhoConselho),
      ])

      await Promise.all(
        Array.from(alunosAfetados).flatMap(alunoId => {
          const mediaInfo = medias[alunoId] ?? {}
          const extras = {
            media_bimestral: mediaInfo.base ?? null,
            nota_recuperacao: mediaInfo.recuperacao ?? null,
            media_final: mediaInfo.final ?? null,
            aprovado_conselho: !!mediaInfo.aprovadoConselho,
            situacao: calcularSituacao(mediaInfo.final, regrasRecuperacao),
          }

          return avaliacoes.map(avaliacao => {
            const chave = `${alunoId}_${avaliacao.id}`
            const valorBruto = chave in rascunho
              ? rascunho[chave]
              : (notasMap[chave]?.nota ?? null)
            const nota = valorBruto === '' ? null : Number(valorBruto)
            return salvarNota(
              alunoId,
              avaliacao.id,
              discSel,
              turmaSel,
              bimestre,
              ANO_LETIVO,
              nota,
              user.uid,
              extras
            )
          })
        })
      )

      // Atualiza notasMap local com o que foi salvo
      setNotasMap(prev => {
        const novo = { ...prev }
        Object.entries(rascunho).forEach(([chave, valorBruto]) => {
          novo[chave] = {
            ...(novo[chave] ?? {}),
            nota: valorBruto === '' ? null : Number(valorBruto),
          }
        })
        return novo
      })
      setRascunho({})
      setRecuperacaoMap(prev => ({ ...prev, ...rascunhoRecuperacao }))
      setConselhoMap(prev => ({ ...prev, ...rascunhoConselho }))
      setRascunhoRecuperacao({})
      setRascunhoConselho({})
      setMsgSucesso('Rascunho salvo com sucesso!')
      setTimeout(() => setMsgSucesso(''), 4000)
    } catch (err) {
      console.error(err)
      setMsgErro('Erro ao salvar rascunho. Tente novamente.')
    } finally {
      setSalvandoRasc(false)
    }
  }

  // ── Fechar bimestre ───────────────────────────────────────────────────────
  async function handleFecharBimestre() {
    const confirmado = window.confirm(
      `Fechar ${bimestre}° bimestre? Esta ação bloqueará a edição das notas para professores.`
    )
    if (!confirmado) return

    // Salva qualquer rascunho pendente antes de fechar
    if (
      Object.keys(rascunho).length > 0 ||
      Object.keys(rascunhoRecuperacao).length > 0 ||
      Object.keys(rascunhoConselho).length > 0
    ) await salvarRascunho()

    setFechandoBim(true)
    setMsgErro('')
    try {
      await fecharBimestre(turmaSel, discSel, bimestre, ANO_LETIVO, user.uid)
      setBimestreFechado(true)
      setModoEdicao(false)
      setMsgSucesso(`${bimestre}° bimestre fechado com sucesso.`)
      setTimeout(() => setMsgSucesso(''), 5000)
    } catch (err) {
      console.error(err)
      setMsgErro('Erro ao fechar bimestre. Tente novamente.')
    } finally {
      setFechandoBim(false)
    }
  }

  // ── Criar avaliação ───────────────────────────────────────────────────────
  async function handleCriarAvaliacao(dados) {
    setCriandoAval(true)
    try {
      await criarAvaliacao({
        ...dados,
        turma_id: turmaSel,
        disciplina_id: discSel,
        bimestre,
        ano_letivo: ANO_LETIVO,
      })
      // Recarrega avaliações
      const avals = await listarAvaliacoes(turmaSel, discSel, bimestre, ANO_LETIVO)
      setAvaliacoes(avals)
      setShowModal(false)
      setMsgSucesso('Avaliação criada com sucesso!')
      setTimeout(() => setMsgSucesso(''), 3000)
    } catch (err) {
      console.error(err)
      setMsgErro('Erro ao criar avaliação.')
    } finally {
      setCriandoAval(false)
    }
  }

  // ── Layout condicional ─────────────────────────────────────────────────────
  const filtroCompleto = turmaSel && discSel

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lançamento de Notas</h1>
          <p className="text-slate-500 text-sm mt-0.5">Ano letivo {ANO_LETIVO}</p>
        </div>
        {bimestreFechado && (
          <span className="flex items-center gap-1.5 bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
            <Lock size={12} />
            Bimestre Fechado
          </span>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-44">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Turma</label>
          <div className="relative">
            <select
              value={turmaSel}
              onChange={e => { setTurmaSel(e.target.value); setDiscSel('') }}
              className="w-full px-3 py-2 pr-8 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
            >
              <option value="">Selecione uma turma</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex-1 min-w-44">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Disciplina</label>
          <div className="relative">
            <select
              value={discSel}
              onChange={e => setDiscSel(e.target.value)}
              disabled={!turmaSel}
              className="w-full px-3 py-2 pr-8 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Selecione uma disciplina</option>
              {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Bimestre</label>
          <div className="flex gap-1">
            {BIMESTRES.map(b => (
              <button
                key={b}
                onClick={() => setBimestre(b)}
                className={`w-10 h-9 text-sm font-medium rounded-lg border transition-all ${
                  bimestre === b
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-slate-200 text-slate-600 hover:border-slate-400'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mensagens de feedback */}
      {msgSucesso && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
          <CheckCircle2 size={16} />
          {msgSucesso}
        </div>
      )}
      {msgErro && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={16} />
          {msgErro}
        </div>
      )}

      {/* Estado vazio — nenhum filtro selecionado */}
      {!filtroCompleto && (
        <div className="flex flex-col items-center justify-center h-64 text-slate-300">
          <BookOpen size={48} className="mb-3" />
          <p className="text-sm text-slate-400">Selecione turma, disciplina e bimestre para visualizar as notas</p>
        </div>
      )}

      {/* Conteúdo principal */}
      {filtroCompleto && (
        <>
          {/* Avaliações do bimestre */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">
                Avaliações do {bimestre}° Bimestre
              </h2>
              {podeEditar && !bimestreFechado && (
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus size={15} />
                  Nova Avaliação
                </button>
              )}
            </div>

            {carregandoAvaliacoes ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : avaliacoes.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                Nenhuma avaliação cadastrada neste bimestre.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {avaliacoes.map(av => (
                  <div
                    key={av.id}
                    className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-700">{av.descricao}</span>
                    <span className="text-slate-400 text-xs">
                      {TIPOS_AVALIACAO.find(t => t.value === av.tipo)?.label ?? av.tipo}
                    </span>
                    <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      peso {av.peso}
                    </span>
                    <span className="text-slate-400 text-xs">{av.data_aplicacao}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grade de notas */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Toolbar da grade */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-800">Grade de Notas</h2>
                {bimestreFechado && (
                  <span className="flex items-center gap-1 bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1 rounded-full">
                    <Lock size={11} />
                    Fechado
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Botão Editar/Bloquear */}
                {podeEditar && avaliacoes.length > 0 && (
                  <button
                    onClick={() => { setModoEdicao(prev => !prev); setRascunho({}) }}
                    className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${
                      modoEdicao
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {modoEdicao ? <Lock size={14} /> : <Unlock size={14} />}
                    {modoEdicao ? 'Bloquear Edição' : 'Editar Notas'}
                  </button>
                )}

                {/* Botão Salvar Rascunho */}
                {modoEdicao && (
                  <button
                    onClick={salvarRascunho}
                    disabled={salvandoRasc}
                    className="flex items-center gap-2 text-sm font-medium bg-white border border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
                  >
                    {salvandoRasc ? <Spinner size="sm" /> : <Save size={14} />}
                    {salvandoRasc ? 'Salvando...' : 'Salvar Rascunho'}
                  </button>
                )}

                {/* Botão Fechar Bimestre */}
                {podeFEchar && (
                  <button
                    onClick={handleFecharBimestre}
                    disabled={fechandoBim}
                    className="flex items-center gap-2 text-sm font-medium bg-slate-800 hover:bg-slate-900 disabled:bg-slate-500 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    {fechandoBim ? <Spinner size="sm" /> : <Lock size={14} />}
                    {fechandoBim ? 'Fechando...' : 'Fechar Bimestre'}
                  </button>
                )}

                {/* Solicitar reabertura (bimestre fechado) */}
                {bimestreFechado && (
                  <button
                    disabled
                    className="flex items-center gap-2 text-sm font-medium border border-slate-200 text-slate-400 px-4 py-2 rounded-lg cursor-not-allowed"
                    title="Funcionalidade em desenvolvimento"
                  >
                    <Unlock size={14} />
                    Solicitar Reabertura
                  </button>
                )}
              </div>
            </div>

            {/* Tabela */}
            {carregandoAlunos || carregandoAvaliacoes ? (
              <div className="flex justify-center items-center h-48">
                <Spinner />
              </div>
            ) : alunos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <p className="text-sm">Nenhum aluno matriculado nesta turma</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-5 py-3 font-medium text-slate-600 sticky left-0 bg-slate-50 z-10 min-w-52">
                        Aluno
                      </th>
                      {avaliacoes.map(av => (
                        <th
                          key={av.id}
                          className="text-center px-3 py-3 font-medium text-slate-600 min-w-28"
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="truncate max-w-24" title={av.descricao}>
                              {av.descricao}
                            </span>
                            <span className="text-xs text-slate-400 font-normal">
                              peso {av.peso}
                            </span>
                          </div>
                        </th>
                      ))}
                      <th className="text-center px-3 py-3 font-medium text-slate-600 min-w-32">
                        Recuperação
                      </th>
                      <th className="text-center px-3 py-3 font-medium text-slate-600 min-w-28">
                        Conselho
                      </th>
                      <th className="text-center px-3 py-3 font-medium text-slate-600 min-w-32">
                        Média Final
                      </th>
                      <th className="text-center px-3 py-3 font-medium text-slate-600 min-w-28">
                        Situação
                      </th>
                      <th className="text-center px-3 py-3 font-medium text-slate-600 min-w-24">
                        Boletim
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {alunos.map((aluno, idx) => {
                      const mediaInfo = medias[aluno.id] ?? {}
                      const media = mediaInfo.final
                      const situacao = calcularSituacao(media, regrasRecuperacao)
                      const emRisco = situacao && situacao !== 'aprovado'
                      const recuperacao = valorRecuperacao(aluno.id)
                      const aprovadoConselho = valorConselho(aluno.id)

                      return (
                        <tr
                          key={aluno.id}
                          className={`hover:bg-slate-50/60 transition-colors ${emRisco ? 'bg-red-50/30' : ''}`}
                        >
                          {/* Nome do aluno */}
                          <td className="px-5 py-3 sticky left-0 bg-white hover:bg-slate-50/60 z-10">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 text-xs w-5 text-right shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-medium text-slate-800 truncate">
                                {aluno.nome_completo}
                              </span>
                              {emRisco && (
                                <AlertTriangle size={13} className="text-red-500 shrink-0" />
                              )}
                            </div>
                          </td>

                          {/* Células de nota */}
                          {avaliacoes.map(av => {
                            const valor = valorCelula(aluno.id, av.id)
                            return (
                              <td key={av.id} className="px-3 py-2 text-center">
                                {modoEdicao && podeEditar ? (
                                  <input
                                    type="number"
                                    min={0}
                                    max={av.nota_maxima ?? 10}
                                    step={0.1}
                                    value={valor}
                                    onChange={e => handleCelulaChange(aluno.id, av.id, e.target.value)}
                                    className="w-20 text-center px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                                  />
                                ) : (
                                  <span className={`inline-block w-16 text-center py-1 rounded-lg text-sm font-medium ${
                                    valor === '' || valor === null || valor === undefined
                                      ? 'text-slate-300'
                                      : 'text-slate-700'
                                  }`}>
                                    {valor !== '' && valor !== null && valor !== undefined
                                      ? Number(valor).toFixed(1)
                                      : '—'}
                                  </span>
                                )}
                              </td>
                            )
                          })}

                          {/* Recuperação */}
                          <td className="px-3 py-2 text-center">
                            {modoEdicao && podeEditar ? (
                              <input
                                type="number"
                                min={0}
                                max={10}
                                step={0.1}
                                value={recuperacao}
                                onChange={e => setRascunhoRecuperacao(prev => ({ ...prev, [aluno.id]: e.target.value }))}
                                className="w-20 text-center px-2 py-1 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50"
                              />
                            ) : (
                              <span className="inline-block w-16 text-center py-1 rounded-lg text-sm font-medium text-slate-700">
                                {recuperacao !== '' && recuperacao !== null && recuperacao !== undefined
                                  ? Number(recuperacao).toFixed(1)
                                  : '—'}
                              </span>
                            )}
                          </td>

                          {/* Conselho */}
                          <td className="px-3 py-2 text-center">
                            {modoEdicao && podeAprovarConselho ? (
                              <label className="inline-flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={aprovadoConselho}
                                  onChange={e => setRascunhoConselho(prev => ({ ...prev, [aluno.id]: e.target.checked }))}
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                              </label>
                            ) : aprovadoConselho ? (
                              <BadgeSituacao situacao="aprovado" />
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>

                          {/* Média final */}
                          <td className="px-3 py-3 text-center">
                            {media !== null && media !== undefined ? (
                              <span className={`inline-block font-bold text-base ${
                                situacao === 'aprovado'
                                  ? 'text-green-600'
                                  : situacao === 'recuperacao'
                                  ? 'text-amber-600'
                                  : 'text-red-600'
                              }`}>
                                {media.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-sm">—</span>
                            )}
                          </td>

                          {/* Situação */}
                          <td className="px-3 py-3 text-center">
                            <BadgeSituacao situacao={situacao} />
                          </td>

                          {/* Boletim */}
                          <td className="px-3 py-3 text-center">
                            <button
                              title="Ver Boletim (em breve)"
                              disabled
                              className="flex items-center gap-1 text-xs text-slate-400 border border-slate-200 px-2.5 py-1 rounded-lg mx-auto cursor-not-allowed hover:bg-slate-50"
                            >
                              <FileText size={12} />
                              Ver
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal nova avaliação */}
      {showModal && (
        <ModalNovaAvaliacao
          onClose={() => setShowModal(false)}
          onSalvar={handleCriarAvaliacao}
          salvando={criandoAval}
        />
      )}
    </div>
  )
}
