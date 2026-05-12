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
import { alunoResumoDaMatricula } from '../../services/matriculas'

import { BoletimDocumento } from './documentos/BoletimDocumento.jsx'
import { DiarioDocumento } from './documentos/DiarioDocumento.jsx'
import { RelatorioTabelaDocumento } from './documentos/RelatorioTabelaDocumento.jsx'

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
    disponivel: true,
  },
  {
    id: 'risco',
    titulo: 'Alunos em Risco',
    descricao: 'Alunos com baixo desempenho e alta infrequência.',
    icon: AlertTriangle,
    cor: 'rose',
    disponivel: true,
  },
  {
    id: 'faltas',
    titulo: 'Faltas > 25%',
    descricao: 'Alunos próximos ou acima do limite legal de faltas.',
    icon: UserMinus,
    cor: 'orange',
    disponivel: true,
  },
  {
    id: 'ocorrencias',
    titulo: 'Ocorrências por Período',
    descricao: 'Consolidado de ocorrências disciplinares e encaminhamentos.',
    icon: ShieldAlert,
    cor: 'rose',
    disponivel: true,
  },
  {
    id: 'orcamento',
    titulo: 'Orçamento por Categoria',
    descricao: 'Acompanhamento de despesas por categoria orçamentária.',
    icon: Wallet,
    cor: 'green',
    disponivel: true,
  },
  {
    id: 'pdde',
    titulo: 'Prestação PDDE',
    descricao: 'Relatório de prestação de contas do PDDE.',
    icon: ReceiptText,
    cor: 'blue',
    disponivel: true,
  },
  {
    id: 'saeb',
    titulo: 'Evolução SAEB',
    descricao: 'Histórico de desempenho no SAEB e metas.',
    icon: TrendingUp,
    cor: 'purple',
    disponivel: true,
  },
  {
    id: 'resumo',
    titulo: 'Resumo Gerencial Mensal',
    descricao: 'Visão executiva consolidada do mês.',
    icon: FileSpreadsheet,
    cor: 'slate',
    disponivel: true,
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
      {['frequencia', 'risco', 'faltas'].includes(relatorioAberto) && (
        <ModalRelatorioTurma
          tipo={relatorioAberto}
          onFechar={() => setRelatorioAberto(null)}
        />
      )}
      {relatorioAberto === 'ocorrencias' && (
        <ModalOcorrenciasPeriodo onFechar={() => setRelatorioAberto(null)} />
      )}
      {relatorioAberto === 'orcamento' && (
        <ModalOrcamentoCategoria onFechar={() => setRelatorioAberto(null)} />
      )}
      {relatorioAberto === 'saeb' && (
        <ModalRelatorioSimples
          tipo="saeb"
          titulo="Evolução SAEB"
          descricao="Histórico SAEB e metas configuradas."
          onFechar={() => setRelatorioAberto(null)}
        />
      )}
      {relatorioAberto === 'resumo' && (
        <ModalRelatorioSimples
          tipo="resumo"
          titulo="Resumo Gerencial Mensal"
          descricao="Visão executiva consolidada dos indicadores do ano."
          onFechar={() => setRelatorioAberto(null)}
        />
      )}
      {relatorioAberto === 'pdde' && (
        <ModalRelatorioSimples
          tipo="pdde"
          titulo="Prestação de Contas PDDE"
          descricao="Pendências e movimentações financeiras vinculadas ao PDDE."
          onFechar={() => setRelatorioAberto(null)}
        />
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

// ═══════════════════════════════════════════════════════════════════════════
// Modal: Relatórios gerenciais por turma (PDF + Excel)
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG_RELATORIO_TURMA = {
  frequencia: {
    titulo: 'Frequência por Turma',
    descricao: 'Percentual de frequência real e legal por aluno.',
    nomeBase: 'frequencia-turma',
  },
  risco: {
    titulo: 'Alunos em Risco',
    descricao: 'Alunos com média abaixo de 6,0 ou frequência legal abaixo de 75%.',
    nomeBase: 'alunos-risco',
  },
  faltas: {
    titulo: 'Faltas acima do limite 25%',
    descricao: 'Alunos com frequência legal abaixo de 75%.',
    nomeBase: 'faltas-limite',
  },
}

function ModalRelatorioTurma({ tipo, onFechar }) {
  const cfg = CONFIG_RELATORIO_TURMA[tipo] ?? CONFIG_RELATORIO_TURMA.frequencia
  const [anoLetivo, setAnoLetivo] = useState(ANO_ATUAL)
  const [turmas, setTurmas] = useState([])
  const [turmaId, setTurmaId] = useState('')
  const [carregandoTurmas, setCarregandoTurmas] = useState(false)
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

  async function gerar(tipoSaida) {
    if (!turmaId) {
      setErro('Selecione uma turma.')
      return
    }
    setErro('')
    setGerando(true)
    setFormato(tipoSaida)
    try {
      const dados = await carregarDadosRelatorioTurma({
        tipo,
        turmaId,
        anoLetivo: Number(anoLetivo),
      })

      const nomeBase = `${cfg.nomeBase}-${slugify(dados.turma?.nome || turmaId)}-${anoLetivo}`
      if (tipoSaida === 'pdf') {
        const documento = (
          <Document>
            <RelatorioTabelaDocumento dados={dados} />
          </Document>
        )
        await baixarPDF(documento, `${nomeBase}.pdf`)
      } else {
        exportarParaExcel(dados.linhasExcel, nomeBase, cfg.titulo)
      }

      onFechar()
    } catch (e) {
      console.error(e)
      setErro(e.message || 'Falha ao gerar relatório.')
    } finally {
      setGerando(false)
      setFormato(null)
    }
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo={cfg.titulo}
      descricao={cfg.descricao}
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
          label="Turma"
          value={turmaId}
          onChange={(e) => setTurmaId(e.target.value)}
          disabled={carregandoTurmas}
        >
          <option value="">Selecione…</option>
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>{t.nome}</option>
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

function ModalOcorrenciasPeriodo({ onFechar }) {
  const [dataInicio, setDataInicio] = useState(`${ANO_ATUAL}-01-01`)
  const [dataFim, setDataFim] = useState(`${ANO_ATUAL}-12-31`)
  const [gerando, setGerando] = useState(false)
  const [formato, setFormato] = useState(null)
  const [erro, setErro] = useState('')

  async function gerar(tipoSaida) {
    setErro('')
    setGerando(true)
    setFormato(tipoSaida)
    try {
      const dados = await carregarDadosOcorrenciasPeriodo({ dataInicio, dataFim })
      const nomeBase = `ocorrencias-${dataInicio}-${dataFim}`
      if (tipoSaida === 'pdf') {
        const documento = (
          <Document>
            <RelatorioTabelaDocumento dados={dados} />
          </Document>
        )
        await baixarPDF(documento, `${nomeBase}.pdf`)
      } else {
        exportarParaExcel(dados.linhasExcel, nomeBase, 'Ocorrências')
      }
      onFechar()
    } catch (e) {
      console.error(e)
      setErro(e.message || 'Falha ao gerar relatório.')
    } finally {
      setGerando(false)
      setFormato(null)
    }
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo="Ocorrências por Período"
      descricao="Consolidado de ocorrências por tipo, gravidade e status."
      tamanho="lg"
      footer={<FooterExport onFechar={onFechar} gerando={gerando} formato={formato} onGerar={gerar} />}
    >
      <div className="grid grid-cols-2 gap-4">
        <Input label="Data inicial" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        <Input label="Data final" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
      </div>
      {erro && <ErroRelatorio>{erro}</ErroRelatorio>}
    </Modal>
  )
}

function ModalOrcamentoCategoria({ onFechar }) {
  const [anoLetivo, setAnoLetivo] = useState(ANO_ATUAL)
  const [gerando, setGerando] = useState(false)
  const [formato, setFormato] = useState(null)
  const [erro, setErro] = useState('')

  async function gerar(tipoSaida) {
    setErro('')
    setGerando(true)
    setFormato(tipoSaida)
    try {
      const dados = await carregarDadosOrcamentoCategoria({ anoLetivo: Number(anoLetivo) })
      const nomeBase = `orcamento-categoria-${anoLetivo}`
      if (tipoSaida === 'pdf') {
        const documento = (
          <Document>
            <RelatorioTabelaDocumento dados={dados} />
          </Document>
        )
        await baixarPDF(documento, `${nomeBase}.pdf`)
      } else {
        exportarParaExcel(dados.linhasExcel, nomeBase, 'Orçamento')
      }
      onFechar()
    } catch (e) {
      console.error(e)
      setErro(e.message || 'Falha ao gerar relatório.')
    } finally {
      setGerando(false)
      setFormato(null)
    }
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo="Orçamento por Categoria"
      descricao="Receitas, despesas e saldo por categoria orçamentária."
      tamanho="lg"
      footer={<FooterExport onFechar={onFechar} gerando={gerando} formato={formato} onGerar={gerar} />}
    >
      <Select label="Ano" value={anoLetivo} onChange={(e) => setAnoLetivo(e.target.value)}>
        {ANOS_LETIVOS.map((a) => <option key={a} value={a}>{a}</option>)}
      </Select>
      {erro && <ErroRelatorio>{erro}</ErroRelatorio>}
    </Modal>
  )
}

function ModalRelatorioSimples({ tipo, titulo, descricao, onFechar }) {
  const [anoLetivo, setAnoLetivo] = useState(ANO_ATUAL)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')

  async function gerar() {
    setErro('')
    setGerando(true)
    try {
      const dados = tipo === 'saeb'
        ? await carregarDadosSaeb({ anoLetivo: Number(anoLetivo) })
        : tipo === 'pdde'
          ? await carregarDadosPdde({ anoLetivo: Number(anoLetivo) })
          : await carregarDadosResumoMensal({ anoLetivo: Number(anoLetivo) })
      const documento = (
        <Document>
          <RelatorioTabelaDocumento dados={dados} />
        </Document>
      )
      await baixarPDF(documento, `${tipo}-${anoLetivo}.pdf`)
      onFechar()
    } catch (e) {
      console.error(e)
      setErro(e.message || 'Falha ao gerar relatório.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo={titulo}
      descricao={descricao}
      tamanho="lg"
      footer={
        <>
          <Button variante="secondary" onClick={onFechar} disabled={gerando}>Cancelar</Button>
          <Button variante="primary" icon={FileDown} onClick={gerar} loading={gerando}>Gerar PDF</Button>
        </>
      }
    >
      <Select label="Ano" value={anoLetivo} onChange={(e) => setAnoLetivo(e.target.value)}>
        {ANOS_LETIVOS.map((a) => <option key={a} value={a}>{a}</option>)}
      </Select>
      {erro && <ErroRelatorio>{erro}</ErroRelatorio>}
    </Modal>
  )
}

function FooterExport({ onFechar, gerando, formato, onGerar }) {
  return (
    <>
      <Button variante="secondary" onClick={onFechar} disabled={gerando}>
        Cancelar
      </Button>
      <Button
        variante="secondary"
        icon={FileSpreadsheet}
        onClick={() => onGerar('excel')}
        loading={gerando && formato === 'excel'}
        disabled={gerando}
      >
        Excel
      </Button>
      <Button
        variante="primary"
        icon={FileDown}
        onClick={() => onGerar('pdf')}
        loading={gerando && formato === 'pdf'}
        disabled={gerando}
      >
        PDF
      </Button>
    </>
  )
}

function ErroRelatorio({ children }) {
  return (
    <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
      {children}
    </div>
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

function formatarMoeda(valor) {
  return Number(valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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

  const alunosResolvidos = matriculas.map(alunoResumoDaMatricula)

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

async function carregarDadosRelatorioTurma({ tipo, turmaId, anoLetivo }) {
  const escola = await buscarConfiguracoes()

  const turmaSnap = await getDoc(doc(db, 'turmas', turmaId))
  if (!turmaSnap.exists()) throw new Error('Turma não encontrada.')
  const turma = { id: turmaSnap.id, ...turmaSnap.data() }

  const matSnap = await getDocs(query(
    collection(db, 'matriculas'),
    where('turma_id', '==', turmaId),
    where('ano_letivo', '==', anoLetivo),
    where('status', '==', 'ativa'),
  ))
  const matriculas = matSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  const alunos = matriculas.map(alunoResumoDaMatricula)

  alunos.sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || '', 'pt-BR'))

  const [notasSnap, presencasSnap, eventosCalendario] = await Promise.all([
    getDocs(query(
      collection(db, 'notas'),
      where('turma_id', '==', turmaId),
      where('ano_letivo', '==', anoLetivo),
    )),
    getDocs(query(
      collection(db, 'presencas'),
      where('turma_id', '==', turmaId),
    )),
    listarCalendario(anoLetivo),
  ])

  const notasPorAluno = {}
  notasSnap.docs.forEach((d) => {
    const n = d.data()
    const nota = Number(n.media_final ?? n.media_bimestral ?? n.nota)
    if (!n.aluno_id || Number.isNaN(nota)) return
    if (!notasPorAluno[n.aluno_id]) notasPorAluno[n.aluno_id] = []
    notasPorAluno[n.aluno_id].push(nota)
  })

  const presencasPorAluno = {}
  presencasSnap.docs.forEach((d) => {
    const p = d.data()
    if (!p.aluno_id) return
    const anoPresenca = Number(p.ano_letivo) || Number(p.data?.slice(0, 4))
    if (anoPresenca !== anoLetivo) return
    if (!presencasPorAluno[p.aluno_id]) presencasPorAluno[p.aluno_id] = []
    presencasPorAluno[p.aluno_id].push(p)
  })

  const base = alunos.map((aluno, idx) => {
    const notas = notasPorAluno[aluno.id] ?? []
    const media = notas.length === 0 ? null : notas.reduce((acc, n) => acc + n, 0) / notas.length
    const pres = resumirFrequencia(presencasPorAluno[aluno.id] ?? [], eventosCalendario)
    const frequenciaLegal = pres.frequencia_limite
    const frequenciaReal = pres.frequencia_real
    const faltasPct = pres.percentual_faltas_limite
    const emRiscoNota = media !== null && media < 6
    const emRiscoFreq = frequenciaLegal < 75

    return {
      numero: idx + 1,
      ra: aluno.matricula?.numero_matricula || aluno.ra || '',
      nome: aluno.nome_completo || '-',
      media,
      frequenciaLegal,
      frequenciaReal,
      faltasPct,
      ausentes: pres.ausentes,
      justificados: pres.justificados,
      total: pres.total,
      situacao: media === null ? 'Sem notas' : calcularSituacao(media),
      risco: emRiscoNota && emRiscoFreq ? 'Nota e frequência' : emRiscoNota ? 'Nota' : emRiscoFreq ? 'Frequência' : '',
    }
  })

  const linhasBase = tipo === 'risco'
    ? base.filter(l => l.risco)
    : tipo === 'faltas'
      ? base.filter(l => l.frequenciaLegal < 75)
      : base

  const colunas = tipo === 'frequencia'
    ? [
        { chave: 'numero', label: 'Nº', largura: '6%', align: 'center' },
        { chave: 'ra', label: 'RA', largura: '14%' },
        { chave: 'nome', label: 'Aluno', largura: '32%' },
        { chave: 'frequenciaLegal', label: 'Freq. legal', largura: '12%', align: 'center' },
        { chave: 'frequenciaReal', label: 'Freq. real', largura: '12%', align: 'center' },
        { chave: 'ausentes', label: 'Faltas', largura: '8%', align: 'center' },
        { chave: 'justificados', label: 'Just.', largura: '8%', align: 'center' },
        { chave: 'total', label: 'Total', largura: '8%', align: 'center' },
      ]
    : [
        { chave: 'numero', label: 'Nº', largura: '6%', align: 'center' },
        { chave: 'ra', label: 'RA', largura: '12%' },
        { chave: 'nome', label: 'Aluno', largura: '30%' },
        { chave: 'media', label: 'Média', largura: '10%', align: 'center' },
        { chave: 'frequenciaLegal', label: 'Freq. legal', largura: '12%', align: 'center' },
        { chave: 'faltasPct', label: 'Faltas %', largura: '10%', align: 'center' },
        { chave: 'ausentes', label: 'Faltas', largura: '8%', align: 'center' },
        { chave: 'risco', label: 'Motivo', largura: '12%' },
      ]

  const linhas = linhasBase.map((l) => ({
    ...l,
    media: l.media === null ? '-' : l.media.toFixed(1).replace('.', ','),
    frequenciaLegal: `${l.frequenciaLegal.toFixed(1).replace('.', ',')}%`,
    frequenciaReal: `${l.frequenciaReal.toFixed(1).replace('.', ',')}%`,
    faltasPct: `${l.faltasPct.toFixed(1).replace('.', ',')}%`,
  }))

  const linhasExcel = linhasBase.map((l) => ({
    'Nº': l.numero,
    'RA': l.ra,
    'Aluno': l.nome,
    'Média': l.media === null ? '' : Number(l.media.toFixed(2)),
    'Situação': l.situacao,
    'Frequência legal %': Number(l.frequenciaLegal.toFixed(2)),
    'Frequência real %': Number(l.frequenciaReal.toFixed(2)),
    'Faltas %': Number(l.faltasPct.toFixed(2)),
    'Faltas': l.ausentes,
    'Justificadas': l.justificados,
    'Registros letivos': l.total,
    'Risco': l.risco,
  }))

  const titulo = CONFIG_RELATORIO_TURMA[tipo]?.titulo ?? 'Relatório por Turma'
  return {
    escola,
    titulo,
    turma,
    anoLetivo,
    colunas,
    linhas,
    linhasExcel,
    infos: [
      { label: 'Turma', valor: turma.nome },
      { label: 'Ano letivo', valor: String(anoLetivo) },
      { label: 'Registros', valor: String(linhas.length) },
    ],
    dataGeracao: new Date().toLocaleString('pt-BR'),
  }
}

async function carregarDadosOcorrenciasPeriodo({ dataInicio, dataFim }) {
  const escola = await buscarConfiguracoes()
  const snap = await getDocs(query(
    collection(db, 'ocorrencias'),
    where('data_ocorrencia', '>=', dataInicio),
    where('data_ocorrencia', '<=', dataFim),
  ))

  const agrupado = {}
  snap.docs.forEach((docSnap) => {
    const o = docSnap.data()
    const chave = `${o.tipo || 'sem_tipo'}|${o.gravidade || 'sem_gravidade'}|${o.status || 'sem_status'}`
    if (!agrupado[chave]) {
      agrupado[chave] = {
        tipo: o.tipo || 'sem_tipo',
        gravidade: o.gravidade || 'sem_gravidade',
        status: o.status || 'sem_status',
        total: 0,
        responsavelNotificado: 0,
      }
    }
    agrupado[chave].total += 1
    if (o.notificado_responsavel) agrupado[chave].responsavelNotificado += 1
  })

  const linhasBase = Object.values(agrupado)
    .sort((a, b) => b.total - a.total || a.tipo.localeCompare(b.tipo, 'pt-BR'))

  const colunas = [
    { chave: 'tipo', label: 'Tipo', largura: '24%' },
    { chave: 'gravidade', label: 'Gravidade', largura: '18%' },
    { chave: 'status', label: 'Status', largura: '18%' },
    { chave: 'total', label: 'Total', largura: '12%', align: 'center' },
    { chave: 'responsavelNotificado', label: 'Resp. notif.', largura: '14%', align: 'center' },
    { chave: 'percentual', label: '% do período', largura: '14%', align: 'center' },
  ]
  const totalGeral = linhasBase.reduce((acc, l) => acc + l.total, 0)
  const linhas = linhasBase.map((l) => ({
    ...l,
    percentual: totalGeral ? `${((l.total / totalGeral) * 100).toFixed(1).replace('.', ',')}%` : '0,0%',
  }))

  return {
    escola,
    titulo: 'Ocorrências por Período',
    colunas,
    linhas,
    linhasExcel: linhas,
    infos: [
      { label: 'Período', valor: `${dataInicio} a ${dataFim}` },
      { label: 'Total', valor: String(totalGeral) },
    ],
    dataGeracao: new Date().toLocaleString('pt-BR'),
  }
}

async function carregarDadosOrcamentoCategoria({ anoLetivo }) {
  const escola = await buscarConfiguracoes()
  const snap = await getDocs(query(
    collection(db, 'financeiro_lancamentos'),
    where('ano', '==', anoLetivo),
  ))

  const porCategoria = {}
  snap.docs.forEach((docSnap) => {
    const l = docSnap.data()
    const categoria = l.categoria || 'Sem categoria'
    if (!porCategoria[categoria]) {
      porCategoria[categoria] = {
        categoria,
        receitas: 0,
        despesas: 0,
        pendentes: 0,
        aprovados: 0,
        cancelados: 0,
      }
    }
    const valor = Number(l.valor) || 0
    if (l.status === 'pendente') porCategoria[categoria].pendentes += valor
    if (l.status === 'cancelado') porCategoria[categoria].cancelados += valor
    if (l.status === 'aprovado') {
      porCategoria[categoria].aprovados += valor
      if (l.tipo === 'receita') porCategoria[categoria].receitas += valor
      if (l.tipo === 'despesa') porCategoria[categoria].despesas += valor
    }
  })

  const linhasBase = Object.values(porCategoria)
    .map((l) => ({ ...l, saldo: l.receitas - l.despesas }))
    .sort((a, b) => b.despesas - a.despesas || a.categoria.localeCompare(b.categoria, 'pt-BR'))

  const colunas = [
    { chave: 'categoria', label: 'Categoria', largura: '28%' },
    { chave: 'receitas', label: 'Receitas', largura: '14%', align: 'right' },
    { chave: 'despesas', label: 'Despesas', largura: '14%', align: 'right' },
    { chave: 'saldo', label: 'Saldo', largura: '14%', align: 'right' },
    { chave: 'pendentes', label: 'Pendentes', largura: '15%', align: 'right' },
    { chave: 'cancelados', label: 'Cancelados', largura: '15%', align: 'right' },
  ]

  const linhas = linhasBase.map((l) => ({
    categoria: l.categoria,
    receitas: formatarMoeda(l.receitas),
    despesas: formatarMoeda(l.despesas),
    saldo: formatarMoeda(l.saldo),
    pendentes: formatarMoeda(l.pendentes),
    cancelados: formatarMoeda(l.cancelados),
  }))

  const linhasExcel = linhasBase.map((l) => ({
    Categoria: l.categoria,
    Receitas: l.receitas,
    Despesas: l.despesas,
    Saldo: l.saldo,
    Pendentes: l.pendentes,
    Cancelados: l.cancelados,
  }))

  return {
    escola,
    titulo: 'Orçamento por Categoria',
    colunas,
    linhas,
    linhasExcel,
    infos: [
      { label: 'Ano', valor: String(anoLetivo) },
      { label: 'Receitas', valor: formatarMoeda(linhasBase.reduce((acc, l) => acc + l.receitas, 0)) },
      { label: 'Despesas', valor: formatarMoeda(linhasBase.reduce((acc, l) => acc + l.despesas, 0)) },
    ],
    dataGeracao: new Date().toLocaleString('pt-BR'),
  }
}

async function carregarDadosSaeb({ anoLetivo }) {
  const escola = await buscarConfiguracoes()
  const historico = escola.saeb_historico ?? {}
  const anos = Object.keys(historico).map(Number).sort((a, b) => a - b)
  const linhasBase = anos.map((ano, idx) => {
    const nota = Number(historico[ano]) || 0
    const anterior = idx > 0 ? Number(historico[anos[idx - 1]]) || 0 : null
    const variacao = anterior === null ? null : nota - anterior
    return {
      ano,
      nota,
      meta: Number(escola.meta_saeb) || 6,
      variacao,
      situacao: nota >= (Number(escola.meta_saeb) || 6) ? 'Meta atingida' : 'Abaixo da meta',
    }
  })

  const colunas = [
    { chave: 'ano', label: 'Ano', largura: '18%', align: 'center' },
    { chave: 'nota', label: 'SAEB', largura: '18%', align: 'center' },
    { chave: 'meta', label: 'Meta', largura: '18%', align: 'center' },
    { chave: 'variacao', label: 'Variação', largura: '20%', align: 'center' },
    { chave: 'situacao', label: 'Situação', largura: '26%' },
  ]

  const linhas = linhasBase.map((l) => ({
    ...l,
    nota: l.nota.toFixed(1).replace('.', ','),
    meta: l.meta.toFixed(1).replace('.', ','),
    variacao: l.variacao === null ? '-' : `${l.variacao >= 0 ? '+' : ''}${l.variacao.toFixed(1).replace('.', ',')}`,
  }))

  return {
    escola,
    titulo: 'Evolução SAEB',
    colunas,
    linhas,
    infos: [
      { label: 'Ano referência', valor: String(anoLetivo) },
      { label: 'Meta atual', valor: String(escola.meta_saeb ?? 6) },
      { label: 'Registros', valor: String(linhas.length) },
    ],
    dataGeracao: new Date().toLocaleString('pt-BR'),
  }
}

async function carregarDadosResumoMensal({ anoLetivo }) {
  const escola = await buscarConfiguracoes()
  const snap = await getDoc(doc(db, 'indicadores', String(anoLetivo)))
  const indicadores = snap.exists() ? snap.data() : {}

  const linhas = [
    { indicador: 'Alunos ativos', valor: indicadores.total_alunos ?? 0, meta: '-', situacao: '-' },
    { indicador: 'Colaboradores', valor: indicadores.total_colaboradores ?? 0, meta: '-', situacao: '-' },
    {
      indicador: 'Presença média',
      valor: `${Number(indicadores.presenca_media ?? 0).toFixed(1).replace('.', ',')}%`,
      meta: `${Number(escola.meta_presenca ?? 90).toFixed(1).replace('.', ',')}%`,
      situacao: Number(indicadores.presenca_media ?? 0) >= Number(escola.meta_presenca ?? 90) ? 'Dentro da meta' : 'Abaixo da meta',
    },
    {
      indicador: 'Taxa de aprovação',
      valor: `${Number(indicadores.taxa_aprovacao ?? 0).toFixed(1).replace('.', ',')}%`,
      meta: `${Number(escola.meta_aprovacao ?? 90).toFixed(1).replace('.', ',')}%`,
      situacao: Number(indicadores.taxa_aprovacao ?? 0) >= Number(escola.meta_aprovacao ?? 90) ? 'Dentro da meta' : 'Abaixo da meta',
    },
    {
      indicador: 'Orçamento previsto',
      valor: formatarMoeda(indicadores.orcamento_previsto ?? escola.orcamento_previsto ?? 0),
      meta: '-',
      situacao: '-',
    },
    {
      indicador: 'Orçamento executado',
      valor: formatarMoeda(indicadores.orcamento_executado ?? 0),
      meta: '-',
      situacao: '-',
    },
    {
      indicador: 'SAEB',
      valor: Number(indicadores.saeb_media ?? indicadores.media_saeb ?? escola.saeb_historico?.[anoLetivo] ?? 0).toFixed(1).replace('.', ','),
      meta: Number(escola.meta_saeb ?? 6).toFixed(1).replace('.', ','),
      situacao: '-',
    },
  ]

  return {
    escola,
    titulo: 'Resumo Gerencial Mensal',
    colunas: [
      { chave: 'indicador', label: 'Indicador', largura: '34%' },
      { chave: 'valor', label: 'Valor', largura: '22%' },
      { chave: 'meta', label: 'Meta', largura: '22%' },
      { chave: 'situacao', label: 'Situação', largura: '22%' },
    ],
    linhas,
    infos: [
      { label: 'Ano', valor: String(anoLetivo) },
      { label: 'Escola', valor: escola.nome_escola || 'Escola Municipal' },
    ],
    dataGeracao: new Date().toLocaleString('pt-BR'),
  }
}

async function carregarDadosPdde({ anoLetivo }) {
  const escola = await buscarConfiguracoes()
  const [pendSnap, finSnap] = await Promise.all([
    getDocs(query(collection(db, 'pendencias'), where('tipo', '==', 'PDDE'))),
    getDocs(query(collection(db, 'financeiro_lancamentos'), where('ano', '==', anoLetivo))),
  ])

  const pendencias = pendSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => !p.data_prazo || String(p.data_prazo).startsWith(String(anoLetivo)))

  const lancamentos = finSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((l) => {
      const texto = `${l.categoria ?? ''} ${l.subcategoria ?? ''} ${l.descricao ?? ''} ${l.centro_custo ?? ''}`.toLowerCase()
      return texto.includes('pdde')
    })

  const receitas = lancamentos
    .filter((l) => l.status === 'aprovado' && l.tipo === 'receita')
    .reduce((acc, l) => acc + (Number(l.valor) || 0), 0)
  const despesas = lancamentos
    .filter((l) => l.status === 'aprovado' && l.tipo === 'despesa')
    .reduce((acc, l) => acc + (Number(l.valor) || 0), 0)
  const pendentes = lancamentos
    .filter((l) => l.status === 'pendente')
    .reduce((acc, l) => acc + (Number(l.valor) || 0), 0)

  const linhas = [
    { item: 'Receitas aprovadas', valor: formatarMoeda(receitas), detalhe: 'Entradas PDDE aprovadas' },
    { item: 'Despesas aprovadas', valor: formatarMoeda(despesas), detalhe: 'Saídas PDDE aprovadas' },
    { item: 'Saldo executado', valor: formatarMoeda(receitas - despesas), detalhe: 'Receitas menos despesas aprovadas' },
    { item: 'Lançamentos pendentes', valor: formatarMoeda(pendentes), detalhe: 'Aguardando aprovação' },
    { item: 'Pendências PDDE abertas', valor: String(pendencias.filter(p => p.status !== 'concluido').length), detalhe: 'Prazos ainda em acompanhamento' },
    { item: 'Pendências PDDE concluídas', valor: String(pendencias.filter(p => p.status === 'concluido').length), detalhe: 'Prazos encerrados' },
  ]

  return {
    escola,
    titulo: 'Prestação de Contas PDDE',
    colunas: [
      { chave: 'item', label: 'Item', largura: '36%' },
      { chave: 'valor', label: 'Valor', largura: '24%' },
      { chave: 'detalhe', label: 'Detalhe', largura: '40%' },
    ],
    linhas,
    infos: [
      { label: 'Ano', valor: String(anoLetivo) },
      { label: 'Lançamentos', valor: String(lancamentos.length) },
      { label: 'Pendências', valor: String(pendencias.length) },
    ],
    dataGeracao: new Date().toLocaleString('pt-BR'),
  }
}
