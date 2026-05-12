import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle, ClipboardList, FileSearch, GraduationCap, Inbox,
  Plus, Printer, Search, ShieldAlert, UserRoundCheck, UsersRound
} from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { Badge, Card, KpiCard } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import SearchPanel from '../../components/shared/SearchPanel'
import DataActionTable from '../../components/shared/DataActionTable'
import { listarRegistrosSecretaria } from '../../services/secretaria'
import { SITUACOES_INTENCAO, SITUACOES_MATRICULA } from '../../services/intencoesVaga'
import { buscarConfiguracoes } from '../../services/configuracoes'
import { useAuth } from '../../context/AuthContext'
import ModalNovaIntencao from './ModalNovaIntencao'
import DetalheRegistroModal from './DetalheRegistroModal'
import { gerarDeclaracaoMatricula } from './declaracaoPdf'

const ANO_ATUAL = new Date().getFullYear()
const ANOS_LETIVOS = [ANO_ATUAL + 1, ANO_ATUAL, ANO_ATUAL - 1]

const ENSINOS = {
  educacao_infantil: 'Educação Infantil',
  fundamental_anos_iniciais: 'Fund. Anos Iniciais',
  fundamental_anos_finais: 'Fund. Anos Finais',
  ensino_medio: 'Ensino Médio',
}

const SITUACOES_TABELA = { ...SITUACOES_INTENCAO, ...SITUACOES_MATRICULA }

function labelEnsino(valor) {
  return ENSINOS[valor] ?? (valor || 'Não informado')
}

function labelTipo(tipo) {
  return tipo === 'intencao_vaga' ? 'Intenção de vaga' : 'Matrícula'
}

function formatarData(data) {
  if (!data) return '-'
  const partes = String(data).slice(0, 10).split('-')
  if (partes.length !== 3) return data
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function normalizarBusca(valor) {
  return String(valor ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export default function SecretariaPage() {
  const { user, perfil } = useAuth()
  const autor = useMemo(() => ({
    uid: user?.uid,
    nome: perfil?.nome,
    perfil: perfil?.perfil,
  }), [user?.uid, perfil?.nome, perfil?.perfil])

  const [anoLetivo, setAnoLetivo] = useState(ANO_ATUAL)
  const [ensino, setEnsino] = useState('')
  const [serie, setSerie] = useState('')
  const [situacao, setSituacao] = useState('')
  const [busca, setBusca] = useState('')
  const [registros, setRegistros] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [errosColecao, setErrosColecao] = useState({})
  const [usandoMock, setUsandoMock] = useState(false)
  const [recarregar, setRecarregar] = useState(0)

  const [modalNovaIntencao, setModalNovaIntencao] = useState(false)
  const [registroDetalhe, setRegistroDetalhe] = useState(null)
  const [imprimindoId, setImprimindoId] = useState(null)

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro('')
    setErrosColecao({})

    listarRegistrosSecretaria({ anoLetivo })
      .then(({ registros: lista, usandoMock: mock, errosColecao: erros }) => {
        if (!ativo) return
        setRegistros(lista)
        setUsandoMock(mock)
        setErrosColecao(erros ?? {})
      })
      .catch((err) => {
        if (!ativo) return
        console.error('Erro ao carregar secretaria:', err)
        setErro(err.message ?? 'Falha ao carregar matrículas e intenções de vaga.')
        setRegistros([])
        setUsandoMock(false)
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    return () => { ativo = false }
  }, [anoLetivo, recarregar])

  const seriesDisponiveis = useMemo(() => {
    const series = registros
      .filter(item => !ensino || item.ensino === ensino)
      .map(item => item.serie)
      .filter(Boolean)
    return [...new Set(series)].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))
  }, [registros, ensino])

  const registrosFiltrados = useMemo(() => {
    const termo = normalizarBusca(busca)
    return registros.filter(item => {
      const ensinoBate = !ensino || item.ensino === ensino
      const serieBate = !serie || item.serie === serie
      const situacaoBate = !situacao || item.situacao === situacao
      const buscaBate = !termo || [
        item.aluno_nome,
        item.aluno_ra,
        item.responsavel_nome,
        item.protocolo,
      ].some(valor => normalizarBusca(valor).includes(termo))

      return ensinoBate && serieBate && situacaoBate && buscaBate
    })
  }, [busca, ensino, registros, serie, situacao])

  const totais = useMemo(() => {
    const matriculas = registros.filter(item => item.tipo === 'matricula').length
    const intencoes = registros.filter(item => item.tipo === 'intencao_vaga').length
    const pendencias = registros.filter(item => (
      ['pendente_documentacao', 'em_analise', 'aguardando_vaga', 'solicitada'].includes(item.situacao)
    )).length

    return { matriculas, intencoes, pendencias }
  }, [registros])

  function limparFiltros() {
    setEnsino('')
    setSerie('')
    setSituacao('')
    setBusca('')
  }

  function recarregarLista() {
    setRecarregar(v => v + 1)
  }

  async function imprimirDeclaracaoLinha(registro) {
    if (registro.tipo !== 'matricula') {
      alert('Declaração disponível apenas para matrículas formais.')
      return
    }
    setImprimindoId(registro.id)
    try {
      const escola = await buscarConfiguracoes().catch(() => null)
      await gerarDeclaracaoMatricula({ matricula: registro, escola, autor })
    } catch (err) {
      console.error(err)
      alert('Falha ao gerar declaração.')
    } finally {
      setImprimindoId(null)
    }
  }

  const filtrosAtivos = Boolean(busca || ensino || serie || situacao)

  const filtros = [
    {
      key: 'anoLetivo',
      label: 'Ano letivo',
      type: 'select',
      value: String(anoLetivo),
      onChange: (valor) => setAnoLetivo(Number(valor)),
      placeholder: null,
      options: ANOS_LETIVOS.map(ano => ({ value: String(ano), label: String(ano) })),
    },
    {
      key: 'ensino',
      label: 'Ensino',
      type: 'select',
      value: ensino,
      onChange: (valor) => {
        setEnsino(valor)
        setSerie('')
      },
      placeholder: 'Todos',
      options: Object.entries(ENSINOS).map(([valor, label]) => ({ value: valor, label })),
    },
    {
      key: 'serie',
      label: 'Série',
      type: 'select',
      value: serie,
      onChange: (valor) => setSerie(valor),
      placeholder: 'Todas',
      options: seriesDisponiveis.map(item => ({ value: item, label: item })),
    },
    {
      key: 'situacao',
      label: 'Situação',
      type: 'select',
      value: situacao,
      onChange: (valor) => setSituacao(valor),
      placeholder: 'Todas',
      options: Object.entries(SITUACOES_TABELA)
        .map(([valor, config]) => ({ value: valor, label: config.label })),
    },
  ]

  const colunas = [
    {
      key: 'aluno',
      header: 'Aluno',
      nowrap: false,
      render: (item) => (
        <div>
          <p className="font-medium text-slate-900">{item.aluno_nome || 'Aluno sem nome'}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {item.protocolo ? `${item.protocolo} · ` : ''}RA {item.aluno_ra || '-'}
          </p>
        </div>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (item) => (
        <Badge variante={item.tipo === 'intencao_vaga' ? 'blue' : 'green'}>{labelTipo(item.tipo)}</Badge>
      ),
    },
    {
      key: 'ensino_serie',
      header: 'Ensino/Série',
      nowrap: false,
      render: (item) => (
        <div className="text-slate-700">
          <p>{labelEnsino(item.ensino)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{item.serie || 'Série não informada'}</p>
        </div>
      ),
    },
    {
      key: 'situacao',
      header: 'Situação',
      render: (item) => {
        const cfg = SITUACOES_TABELA[item.situacao] ?? { label: item.situacao || 'Não informada', variante: 'slate' }
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variante={cfg.variante}>{cfg.label}</Badge>
            {item.matriculado_em_outro_colegio && (
              <Badge variante="orange">Outro colégio</Badge>
            )}
          </div>
        )
      },
    },
    {
      key: 'responsavel',
      header: 'Responsável',
      nowrap: false,
      render: (item) => (
        <div className="text-slate-700">
          <p>{item.responsavel_nome || '-'}</p>
          <p className="text-xs text-slate-500 mt-0.5">{item.responsavel_telefone || ''}</p>
        </div>
      ),
    },
    {
      key: 'data_solicitacao',
      header: 'Solicitação',
      render: (item) => formatarData(item.data_solicitacao),
    },
    {
      key: 'turma',
      header: 'Turma',
      render: (item) => item.turma_nome || item.turma_id || '-',
    },
  ]

  const acoesLinha = (registro) => [
    {
      key: 'imprimir',
      label: 'Declaração',
      title: registro.tipo === 'matricula' ? 'Imprimir declaração de matrícula' : 'Disponível apenas para matrículas',
      icon: Printer,
      disabled: registro.tipo !== 'matricula' || registro.origem === 'demo' || imprimindoId === registro.id,
      onClick: (row) => imprimirDeclaracaoLinha(row),
    },
  ]

  return (
    <div>
      <PageHeader
        titulo="Secretaria e Matrículas"
        descricao={`Hub de matrículas e intenções de vaga · Ano letivo ${anoLetivo}`}
        icon={ClipboardList}
        acoes={(
          <Button variante="accent" icon={Plus} onClick={() => setModalNovaIntencao(true)}>
            Nova intenção
          </Button>
        )}
      />

      {erro && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Erro ao carregar registros</p>
            <p className="text-xs text-rose-700 mt-0.5 break-words">{erro}</p>
          </div>
        </div>
      )}

      {Object.keys(errosColecao).length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold">Acesso parcial às coleções</p>
            <ul className="text-xs text-amber-800 mt-1 list-disc list-inside space-y-0.5">
              {Object.entries(errosColecao).map(([colecao, info]) => (
                <li key={colecao}>
                  <span className="font-medium">{colecao}</span> · {info.code} — {info.message}
                </li>
              ))}
            </ul>
            <p className="text-xs text-amber-800 mt-1">
              Verifique as Firestore Rules e o perfil do usuário antes de tomar decisões com base nesta lista.
            </p>
          </div>
        </div>
      )}

      {usandoMock && (
        <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
          <FileSearch size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Dados demonstrativos</p>
            <p className="text-xs text-blue-700 mt-0.5">Nenhuma matrícula ou intenção de vaga foi encontrada para este ano letivo.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <KpiCard label="Matrículas" valor={totais.matriculas} icon={UserRoundCheck} cor="green" descricao="Registros formais" />
        <KpiCard label="Intenções" valor={totais.intencoes} icon={UsersRound} cor="blue" descricao="Interesse em vaga" />
        <KpiCard label="Pendências" valor={totais.pendencias} icon={AlertCircle} cor="orange" descricao="Demandam análise" />
        <KpiCard label="Resultado" valor={registrosFiltrados.length} icon={Search} cor="purple" descricao="Após filtros" />
      </div>

      <SearchPanel
        className="mb-4"
        titulo="Busca de matrículas e intenções"
        descricao={`${registrosFiltrados.length} registro(s) encontrados`}
        searchValue={busca}
        onSearchChange={(valor) => setBusca(valor)}
        searchPlaceholder="Buscar aluno, RA, protocolo ou responsável..."
        filters={filtros}
        onClear={filtrosAtivos ? limparFiltros : undefined}
        clearLabel="Limpar filtros"
      />

      <DataActionTable
        columns={colunas}
        rows={registrosFiltrados}
        rowKey={(row) => `${row.tipo}-${row.id}`}
        loading={carregando}
        emptyIcon={Inbox}
        emptyTitle="Nenhum registro encontrado"
        emptyDescription="Ajuste os filtros, cadastre uma nova intenção ou pesquise por outro nome/RA/protocolo."
        minWidth="960px"
        actions={acoesLinha}
        onRowClick={(row) => row.origem !== 'demo' && setRegistroDetalhe(row)}
      />

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <GraduationCap size={18} className="text-blue-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-900">Triagem</h3>
          <p className="text-xs text-slate-600 mt-1">Centralize intenção de vaga, análise de série e encaminhamento para matrícula.</p>
        </Card>
        <Card className="p-4">
          <FileSearch size={18} className="text-emerald-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-900">Documentos</h3>
          <p className="text-xs text-slate-600 mt-1">Acompanhe pendências de documentação antes de ativar a matrícula.</p>
        </Card>
        <Card className="p-4">
          <UsersRound size={18} className="text-amber-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-900">Vagas</h3>
          <p className="text-xs text-slate-600 mt-1">Filtre por ensino, série e ano letivo para apoiar a organização das turmas.</p>
        </Card>
      </div>

      <ModalNovaIntencao
        aberto={modalNovaIntencao}
        onFechar={() => setModalNovaIntencao(false)}
        autor={autor}
        onCriado={() => recarregarLista()}
      />

      <DetalheRegistroModal
        aberto={Boolean(registroDetalhe)}
        onFechar={() => setRegistroDetalhe(null)}
        registro={registroDetalhe}
        autor={autor}
        onAtualizado={recarregarLista}
      />
    </div>
  )
}
