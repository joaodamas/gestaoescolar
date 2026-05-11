import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  FileText,
  ClipboardList,
  CalendarCheck2,
  AlertTriangle,
  UserMinus,
  ShieldAlert,
  Wallet,
  ReceiptText,
  TrendingUp,
  FileSpreadsheet,
  Search,
  Download,
  Lock,
  FileDown,
} from 'lucide-react'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { Document } from '@react-pdf/renderer'

import { db } from '../../firebase/firebase'
import { useAuth } from '../../context/AuthContext'

import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import {
  Card,
  Badge,
  Spinner,
  EmptyState,
} from '../../components/ui/Card'

import { mascararCPF } from '../../utils/mascaramento'
import { exportarParaExcel, formatarParaExportacao } from '../../utils/exportExcel'
import { baixarPDF, slugify } from '../../utils/exportPDF'
import { resumirFrequencia } from '../../utils/frequencia'

import { buscarAlunos } from '../../services/ocorrencias'
import { listarTurmas } from '../../services/turmas'
import { listarDisciplinasDaTurma } from '../../services/notas'
import { buscarConfiguracoes } from '../../services/configuracoes'
import { listarCalendario } from '../../services/calendario'

import { BoletimDocumento } from './documentos/BoletimDocumento.jsx'
import { DiarioDocumento } from './documentos/DiarioDocumento.jsx'

// ─── Configuração geral ──────────────────────────────────────────────────────

const ANO_ATUAL = new Date().getFullYear()
const ANOS_LETIVOS = [ANO_ATUAL, ANO_ATUAL - 1, ANO_ATUAL - 2]
const BIMESTRES = [1, 2, 3, 4]

const RELATORIOS_POR_PERFIL = {
  diretor:     ['boletim', 'diario', 'frequencia', 'risco', 'faltas', 'ocorrencias', 'orcamento', 'pdde', 'saeb', 'resumo'],
  coordenador: ['boletim', 'diario', 'frequencia', 'risco', 'faltas', 'ocorrencias', 'saeb'],
  professor:   ['diario'],
  admin:       ['orcamento', 'pdde'],
  secretaria:  ['saeb', 'resumo'],
}

const CATALOGO_RELATORIOS = [
  {
    id: 'boletim',
    titulo: 'Boletim do Aluno',
    descricao: 'Notas por bimestre, médias e situação final em PDF individual.',
    icon: FileText,
    cor: 'blue',
    disponivel: true,
  },
  {
    id: 'diario',
    titulo: 'Diário de Classe',
    descricao: 'Notas e frequência da turma em PDF (paisagem) e Excel.',
    icon: ClipboardList,
    cor: 'purple',
    disponivel: true,
  },
  {
    id: 'frequencia',
    titulo: 'Frequência por Turma',
    descricao: 'Percentual de presença mensal por turma e período.',
    icon: CalendarCheck2,
    cor: 'green',
    disponivel: false,
  },
  {
    id: 'risco',
    titulo: 'Alunos em Risco',
    descricao: 'Alunos com baixo desempenho e alta infrequência.',
    icon: AlertTriangle,
    cor: 'rose',
    disponivel: false,
  },
  {
    id: 'faltas',
    titulo: 'Faltas > 25%',
    descricao: 'Alunos próximos ou acima do limite legal de faltas.',
    icon: UserMinus,
    cor: 'orange',
    disponivel: false,
  },
  {
    id: 'ocorrencias',
    titulo: 'Ocorrências por Período',
    descricao: 'Consolidado de ocorrências disciplinares e encaminhamentos.',
    icon: ShieldAlert,
    cor: 'rose',
    disponivel: false,
  },
  {
    id: 'orcamento',
    titulo: 'Orçamento por Categoria',
    descricao: 'Acompanhamento de despesas por categoria orçamentária.',
    icon: Wallet,
    cor: 'green',
    disponivel: false,
  },
  {
    id: 'pdde',
    titulo: 'Prestação PDDE',
    descricao: 'Relatório de prestação de contas do PDDE.',
    icon: ReceiptText,
    cor: 'blue',
    disponivel: false,
  },
  {
    id: 'saeb',
    titulo: 'Evolução SAEB',
    descricao: 'Histórico de desempenho no SAEB e metas.',
    icon: TrendingUp,
    cor: 'purple',
    disponivel: false,
  },
  {
    id: 'resumo',
    titulo: 'Resumo Gerencial Mensal',
    descricao: 'Visão executiva consolidada do mês.',
    icon: FileSpreadsheet,
    cor: 'slate',
    disponivel: false,
  },
]

// ─── Página principal ────────────────────────────────────────────────────────

export default function RelatoriosPage() {
  const { perfil } = useAuth()
  const [relatorioAberto, setRelatorioAberto] = useState(null)

  const perfilUsuario = perfil?.perfil ?? 'professor'
  const autorizados = RELATORIOS_POR_PERFIL[perfilUsuario] ?? []

  const relatoriosVisiveis = useMemo(
    () => CATALOGO_RELATORIOS.filter((r) => autorizados.includes(r.id)),
    [autorizados],
  )

  return (
    <div className="p-6 bg-slate-50 min-h-full">
      <PageHeader
        titulo="Relatórios"
        descricao="Gere boletins, diários de classe e relatórios gerenciais"
        icon={BarChart3}
      />

      {relatoriosVisiveis.length === 0 ? (
        <Card>
          <EmptyState
            icon={Lock}
            titulo="Nenhum relatório disponível"
            descricao="Seu perfil não possui acesso a relatórios. Solicite revisão ao administrador."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {relatoriosVisiveis.map((rel) => (
            <CardRelatorio
              key={rel.id}
              relatorio={rel}
              onGerar={() => setRelatorioAberto(rel.id)}
            />
          ))}
        </div>
      )}

      {relatorioAberto === 'boletim' && (
        <ModalBoletim onFechar={() => setRelatorioAberto(null)} />
      )}
      {relatorioAberto === 'diario' && (
        <ModalDiario onFechar={() => setRelatorioAberto(null)} />
      )}
    </div>
  )
}

// ─── Card de relatório ───────────────────────────────────────────────────────

function CardRelatorio({ relatorio, onGerar }) {
  const Icon = relatorio.icon
  const indisponivel = !relatorio.disponivel

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconeBg(relatorio.cor)}`}>
          <Icon size={20} strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">{relatorio.titulo}</h3>
            {indisponivel && <Badge variante="slate">Em breve</Badge>}
          </div>
          <p className="text-xs text-slate-500 mt-1">{relatorio.descricao}</p>
        </div>
      </div>

      <div className="flex items-center justify-end mt-auto">
        <div className="group relative">
          <Button
            variante="primary"
            tamanho="sm"
            icon={Download}
            onClick={onGerar}
            disabled={indisponivel}
          >
            Gerar
          </Button>
          {indisponivel && (
            <span className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow group-hover:opacity-100 transition-opacity">
              Em breve
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function iconeBg(cor) {
  const mapa = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-emerald-100 text-emerald-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    rose: 'bg-rose-100 text-rose-600',
    slate: 'bg-slate-100 text-slate-600',
  }
  return mapa[cor] || mapa.slate
}

// ═══════════════════════════════════════════════════════════════════════════
// Modal: Boletim do Aluno (PDF)
// ═══════════════════════════════════════════════════════════════════════════

function ModalBoletim({ onFechar }) {
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [alunoSelecionado, setAlunoSelecionado] = useState(null)
  const [anoLetivo, setAnoLetivo] = useState(ANO_ATUAL)
  const [bimestreFiltro, setBimestreFiltro] = useState('')
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!termo || termo.trim().length < 2) {
      setResultados([])
      return
    }
    let cancelado = false
    setBuscando(true)
    const t = setTimeout(async () => {
      try {
        const lista = await buscarAlunos(termo)
        if (!cancelado) setResultados(lista)
      } catch (e) {
        if (!cancelado) {
          console.error(e)
          setResultados([])
        }
      } finally {
        if (!cancelado) setBuscando(false)
      }
    }, 300)
    return () => {
      cancelado = true
      clearTimeout(t)
    }
  }, [termo])

  async function gerar() {
    if (!alunoSelecionado) {
      setErro('Selecione um aluno.')
      return
    }
    setErro('')
    setGerando(true)
    try {
      const dados = await carregarDadosBoletim({
        alunoId: alunoSelecionado.id,
        anoLetivo: Number(anoLetivo),
        bimestre: bimestreFiltro ? Number(bimestreFiltro) : null,
      })

      const documento = (
        <Document>
          <BoletimDocumento dados={dados} />
        </Document>
      )

      const nome = `boletim-${anoLetivo}-${slugify(dados.aluno?.nome_completo || 'aluno')}.pdf`
      await baixarPDF(documento, nome)
      onFechar()
    } catch (e) {
      console.error(e)
      setErro(e.message || 'Falha ao gerar boletim.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo="Boletim do Aluno"
      descricao="Gera um PDF com o histórico de notas do aluno no ano letivo selecionado."
      tamanho="lg"
      footer={
        <>
          <Button variante="secondary" onClick={onFechar} disabled={gerando}>
            Cancelar
          </Button>
          <Button
            variante="primary"
            icon={FileDown}
            onClick={gerar}
            loading={gerando}
            disabled={!alunoSelecionado || gerando}
          >
            Gerar PDF
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide uppercase">
            Aluno
          </label>
          {alunoSelecionado ? (
            <div className="flex items-center justify-between gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {alunoSelecionado.nome_completo}
                </p>
                <p className="text-xs text-slate-500">
                  CPF: {mascararCPF(alunoSelecionado.cpf)}
                </p>
              </div>
              <Button
                variante="ghost"
                tamanho="sm"
                onClick={() => {
                  setAlunoSelecionado(null)
                  setTermo('')
                  setResultados([])
                }}
              >
                Trocar
              </Button>
            </div>
          ) : (
            <>
              <Input
                placeholder="Digite o nome do aluno (mínimo 2 caracteres)"
                icon={Search}
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
              />
              {buscando && (
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                  <Spinner size="sm" /> Buscando…
                </p>
              )}
              {!buscando && resultados.length > 0 && (
                <ul className="mt-2 max-h-44 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {resultados.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => setAlunoSelecionado(a)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors"
                      >
                        <p className="text-sm font-medium text-slate-900">{a.nome_completo}</p>
                        <p className="text-xs text-slate-500">
                          CPF: {mascararCPF(a.cpf)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!buscando && termo.length >= 2 && resultados.length === 0 && (
                <p className="text-xs text-slate-500 mt-2">Nenhum aluno encontrado.</p>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Ano letivo"
            value={anoLetivo}
            onChange={(e) => setAnoLetivo(e.target.value)}
          >
            {ANOS_LETIVOS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
          <Select
            label="Bimestre (opcional)"
            value={bimestreFiltro}
            onChange={(e) => setBimestreFiltro(e.target.value)}
          >
            <option value="">Todos os bimestres</option>
            {BIMESTRES.map((b) => (
              <option key={b} value={b}>{b}º bimestre</option>
            ))}
          </Select>
        </div>

        {erro && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
            {erro}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Modal: Diário de Classe (PDF + Excel)
// ═══════════════════════════════════════════════════════════════════════════

function ModalDiario({ onFechar }) {
  const [anoLetivo, setAnoLetivo] = useState(ANO_ATUAL)
  const [turmas, setTurmas] = useState([])
  const [disciplinas, setDisciplinas] = useState([])
  const [carregandoTurmas, setCarregandoTurmas] = useState(false)
  const [turmaId, setTurmaId] = useState('')
  const [disciplinaId, setDisciplinaId] = useState('')
  const [bimestre, setBimestre] = useState(1)
  const [gerando, setGerando] = useState(false)
  const [formato, setFormato] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let cancelado = false
    setCarregandoTurmas(true)
    listarTurmas(Number(anoLetivo))
      .then((lista) => { if (!cancelado) setTurmas(lista) })
      .catch((e) => { console.error(e); if (!cancelado) setTurmas([]) })
      .finally(() => { if (!cancelado) setCarregandoTurmas(false) })
    return () => { cancelado = true }
  }, [anoLetivo])

  useEffect(() => {
    if (!turmaId) { setDisciplinas([]); return }
    let cancelado = false
    listarDisciplinasDaTurma(turmaId, Number(anoLetivo))
      .then((lista) => { if (!cancelado) setDisciplinas(lista) })
      .catch((e) => { console.error(e); if (!cancelado) setDisciplinas([]) })
    return () => { cancelado = true }
  }, [turmaId, anoLetivo])

  async function gerar(tipoSaida) {
    if (!turmaId) {
      setErro('Selecione uma turma.')
      return
    }
    setErro('')
    setGerando(true)
    setFormato(tipoSaida)
    try {
      const dados = await carregarDadosDiario({
        turmaId,
        disciplinaId: disciplinaId || null,
        anoLetivo: Number(anoLetivo),
        bimestre: Number(bimestre),
      })

      const nomeBase = `diario-${slugify(dados.turma?.nome || turmaId)}-${anoLetivo}-bim${bimestre}`

      if (tipoSaida === 'pdf') {
        const documento = (
          <Document>
            <DiarioDocumento dados={dados} />
          </Document>
        )
        await baixarPDF(documento, `${nomeBase}.pdf`)
      } else {
        const formatado = formatarParaExportacao(dados.linhas, {
          'Nº': (item) => item.numero,
          'RA': (item) => item.ra || '',
          'Aluno': (item) => item.nome,
          'N1': (item) => formatarNota(item.notas[1]),
          'N2': (item) => formatarNota(item.notas[2]),
          'N3': (item) => formatarNota(item.notas[3]),
          'N4': (item) => formatarNota(item.notas[4]),
          'Média': (item) => formatarNota(item.media),
          'Frequência %': (item) => `${item.frequencia.toFixed(1)}%`,
        })
        exportarParaExcel(formatado, nomeBase, 'Diário')
      }

      onFechar()
    } catch (e) {
      console.error(e)
      setErro(e.message || 'Falha ao gerar diário.')
    } finally {
      setGerando(false)
      setFormato(null)
    }
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo="Diário de Classe"
      descricao="Notas e frequência da turma — exportação em PDF (paisagem) ou Excel."
      tamanho="lg"
      footer={
        <>
          <Button variante="secondary" onClick={onFechar} disabled={gerando}>
            Cancelar
          </Button>
          <Button
            variante="secondary"
            icon={FileSpreadsheet}
            onClick={() => gerar('excel')}
            loading={gerando && formato === 'excel'}
            disabled={!turmaId || gerando}
          >
            Excel
          </Button>
          <Button
            variante="primary"
            icon={FileDown}
            onClick={() => gerar('pdf')}
            loading={gerando && formato === 'pdf'}
            disabled={!turmaId || gerando}
          >
            PDF
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Ano letivo"
          value={anoLetivo}
          onChange={(e) => setAnoLetivo(e.target.value)}
        >
          {ANOS_LETIVOS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Select>

        <Select
          label="Bimestre"
          value={bimestre}
          onChange={(e) => setBimestre(e.target.value)}
        >
          {BIMESTRES.map((b) => (
            <option key={b} value={b}>{b}º bimestre</option>
          ))}
        </Select>

        <Select
          label="Turma"
          value={turmaId}
          onChange={(e) => { setTurmaId(e.target.value); setDisciplinaId('') }}
          disabled={carregandoTurmas}
        >
          <option value="">Selecione…</option>
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>{t.nome}</option>
          ))}
        </Select>

        <Select
          label="Disciplina (opcional)"
          value={disciplinaId}
          onChange={(e) => setDisciplinaId(e.target.value)}
          disabled={!turmaId || disciplinas.length === 0}
        >
          <option value="">Todas as disciplinas</option>
          {disciplinas.map((d) => (
            <option key={d.id} value={d.id}>{d.nome}</option>
          ))}
        </Select>
      </div>

      {erro && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
          {erro}
        </div>
      )}
    </Modal>
  )
}

// ─── Helpers de formatação ───────────────────────────────────────────────────

function formatarNota(n) {
  if (n === null || n === undefined || n === '') return '—'
  const num = Number(n)
  if (Number.isNaN(num)) return '—'
  return num.toFixed(1).replace('.', ',')
}

function calcularSituacao(media) {
  if (media === null || media === undefined) return '—'
  if (media >= 6.0) return 'Aprovado'
  if (media >= 4.0) return 'Recuperação'
  return 'Reprovado'
}

// ═══════════════════════════════════════════════════════════════════════════
// Carregadores de dados — leitura no Firestore
// ═══════════════════════════════════════════════════════════════════════════

async function carregarDadosBoletim({ alunoId, anoLetivo, bimestre }) {
  const escola = await buscarConfiguracoes()

  // Aluno
  const alunoSnap = await getDoc(doc(db, 'alunos', alunoId))
  if (!alunoSnap.exists()) throw new Error('Aluno não encontrado.')
  const aluno = { id: alunoSnap.id, ...alunoSnap.data() }

  // Matrícula ativa do ano
  const qMatriculas = query(
    collection(db, 'matriculas'),
    where('aluno_id', '==', alunoId),
    where('ano_letivo', '==', anoLetivo),
    where('status', '==', 'ativa'),
  )
  const matSnap = await getDocs(qMatriculas)
  const matricula = matSnap.docs[0] ? { id: matSnap.docs[0].id, ...matSnap.docs[0].data() } : null

  // Turma
  let turma = null
  if (matricula?.turma_id) {
    const turmaSnap = await getDoc(doc(db, 'turmas', matricula.turma_id))
    if (turmaSnap.exists()) turma = { id: turmaSnap.id, ...turmaSnap.data() }
  }

  // Notas
  const condsNotas = [
    where('aluno_id', '==', alunoId),
    where('ano_letivo', '==', anoLetivo),
  ]
  if (bimestre) condsNotas.push(where('bimestre', '==', bimestre))

  const notasSnap = await getDocs(query(collection(db, 'notas'), ...condsNotas))
  const notasBrutas = notasSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  // Disciplinas (para nome legível) — preferir as da turma; fallback: buscar individualmente
  const idsDisciplinas = Array.from(new Set(notasBrutas.map((n) => n.disciplina_id).filter(Boolean)))
  const mapaDisciplinas = {}
  if (turma?.id) {
    try {
      const lista = await listarDisciplinasDaTurma(turma.id, anoLetivo)
      lista.forEach((d) => { mapaDisciplinas[d.id] = d.nome })
    } catch {
      // ignorado — fallback abaixo
    }
  }
  await Promise.all(
    idsDisciplinas
      .filter((id) => !mapaDisciplinas[id])
      .map(async (id) => {
        try {
          const snap = await getDoc(doc(db, 'disciplinas', id))
          mapaDisciplinas[id] = snap.exists() ? (snap.data().nome ?? id) : id
        } catch {
          mapaDisciplinas[id] = id
        }
      }),
  )

  // Agrupa por disciplina x bimestre — média das notas registradas dentro do bimestre
  const porDisciplina = {}
  notasBrutas.forEach((n) => {
    const idDisc = n.disciplina_id || 'sem_disciplina'
    if (!porDisciplina[idDisc]) {
      porDisciplina[idDisc] = {
        disciplina_id: idDisc,
        disciplina_nome: mapaDisciplinas[idDisc] || idDisc,
        bimestres: { 1: [], 2: [], 3: [], 4: [] },
      }
    }
    const b = Number(n.bimestre)
    if (b >= 1 && b <= 4 && n.nota !== null && n.nota !== undefined && n.nota !== '') {
      porDisciplina[idDisc].bimestres[b].push(Number(n.nota))
    }
  })

  const linhas = Object.values(porDisciplina)
    .map((d) => {
      const bMedias = {}
      BIMESTRES.forEach((b) => {
        const arr = d.bimestres[b]
        bMedias[b] = arr.length === 0 ? null : arr.reduce((a, v) => a + v, 0) / arr.length
      })
      const validas = Object.values(bMedias).filter((v) => v !== null)
      const media = validas.length === 0 ? null : validas.reduce((a, v) => a + v, 0) / validas.length
      return {
        disciplina: d.disciplina_nome,
        bim: bMedias,
        media,
        situacao: calcularSituacao(media),
      }
    })
    .sort((a, b) => a.disciplina.localeCompare(b.disciplina, 'pt-BR'))

  return {
    escola,
    aluno,
    turma,
    matricula,
    anoLetivo,
    bimestreFiltro: bimestre,
    linhas,
    dataGeracao: new Date().toLocaleString('pt-BR'),
  }
}

async function carregarDadosDiario({ turmaId, disciplinaId, anoLetivo, bimestre }) {
  const escola = await buscarConfiguracoes()

  // Turma
  const turmaSnap = await getDoc(doc(db, 'turmas', turmaId))
  if (!turmaSnap.exists()) throw new Error('Turma não encontrada.')
  const turma = { id: turmaSnap.id, ...turmaSnap.data() }

  // Disciplina (opcional)
  let disciplina = null
  if (disciplinaId) {
    const dSnap = await getDoc(doc(db, 'disciplinas', disciplinaId))
    if (dSnap.exists()) disciplina = { id: dSnap.id, ...dSnap.data() }
  }

  // Matrículas ativas
  const matSnap = await getDocs(query(
    collection(db, 'matriculas'),
    where('turma_id', '==', turmaId),
    where('ano_letivo', '==', anoLetivo),
    where('status', '==', 'ativa'),
  ))
  const matriculas = matSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  if (matriculas.length === 0) {
    return {
      escola, turma, disciplina, anoLetivo, bimestre,
      linhas: [],
      dataGeracao: new Date().toLocaleString('pt-BR'),
    }
  }

  // Alunos (paralelo)
  const alunosResolvidos = await Promise.all(
    matriculas.map(async (m) => {
      try {
        const snap = await getDoc(doc(db, 'alunos', m.aluno_id))
        return snap.exists()
          ? { id: snap.id, matricula: m, ...snap.data() }
          : { id: m.aluno_id, matricula: m, nome_completo: '(aluno removido)' }
      } catch {
        return { id: m.aluno_id, matricula: m, nome_completo: '(erro)' }
      }
    }),
  )

  alunosResolvidos.sort((a, b) =>
    (a.nome_completo || '').localeCompare(b.nome_completo || '', 'pt-BR'),
  )

  // Notas da turma no ano (filtramos cliente-side por bimestre/disciplina)
  const condsNotas = [
    where('turma_id', '==', turmaId),
    where('ano_letivo', '==', anoLetivo),
  ]
  if (disciplinaId) condsNotas.push(where('disciplina_id', '==', disciplinaId))

  const notasSnap = await getDocs(query(collection(db, 'notas'), ...condsNotas))
  const todasNotas = notasSnap.docs.map((d) => d.data())

  // Presenças da turma — agrupamos por aluno para o bimestre informado
  // Sem campo "bimestre" no schema; usamos todas as presenças do ano e
  // contamos o percentual geral. Caso /presencas tenha muitos registros,
  // a query usa o índice (turma_id, data) já existente.
  const presencasSnap = await getDocs(query(
    collection(db, 'presencas'),
    where('turma_id', '==', turmaId),
  ))
  const eventosCalendario = await listarCalendario(anoLetivo)
  const presencasPorAluno = {}
  presencasSnap.docs.forEach((d) => {
    const p = d.data()
    if (!p.aluno_id) return
    const anoPresenca = Number(p.ano_letivo) || Number(p.data?.slice(0, 4))
    if (anoPresenca !== anoLetivo) return
    if (!presencasPorAluno[p.aluno_id]) presencasPorAluno[p.aluno_id] = []
    presencasPorAluno[p.aluno_id].push(p)
  })

  const linhas = alunosResolvidos.map((aluno, idx) => {
    const notasAluno = todasNotas.filter((n) => n.aluno_id === aluno.id && Number(n.bimestre) === bimestre)
    const porBimestreMedia = {}
    BIMESTRES.forEach((b) => {
      const arr = todasNotas
        .filter((n) => n.aluno_id === aluno.id && Number(n.bimestre) === b)
        .map((n) => Number(n.nota))
        .filter((v) => !Number.isNaN(v))
      porBimestreMedia[b] = arr.length === 0 ? null : arr.reduce((a, v) => a + v, 0) / arr.length
    })
    const validas = Object.values(porBimestreMedia).filter((v) => v !== null)
    const media = validas.length === 0 ? null : validas.reduce((a, v) => a + v, 0) / validas.length

    const pres = resumirFrequencia(presencasPorAluno[aluno.id] ?? [], eventosCalendario)
    const frequencia = pres.frequencia_limite

    return {
      numero: idx + 1,
      ra: aluno.matricula?.numero_matricula || '',
      nome: aluno.nome_completo || '—',
      notas: porBimestreMedia,
      notasDoBimestre: notasAluno,
      media,
      frequencia,
    }
  })

  return {
    escola,
    turma,
    disciplina,
    anoLetivo,
    bimestre,
    linhas,
    dataGeracao: new Date().toLocaleString('pt-BR'),
  }
}
