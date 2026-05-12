import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  Building2,
  ClipboardList,
  FileStack,
  HeartPulse,
  ShieldCheck,
  UtensilsCrossed,
  Waypoints,
} from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import ModuleHub from '../../components/shared/ModuleHub'
import { Card } from '../../components/ui/Card'
import { useAuth } from '../../context/AuthContext'

const AREAS = {
  diario: {
    titulo: 'Diario Avancado',
    descricao: 'Estruturacao do diario de classe por professor, turma, semana e aprovacoes.',
    icon: ClipboardList,
    status: 'Fase 12.0 em andamento',
    cards: [
      { title: 'Lancamentos', description: 'Visao semanal, pendencias e fechamento do diario.', status: 'Planejado', statusColor: 'blue' },
      { title: 'Atribuicoes', description: 'Horario do professor, turma, disciplina e dia da semana.', status: 'Arquitetura', statusColor: 'yellow' },
      { title: 'Auditoria', description: 'Reabertura, deferimento e assinatura com motivo obrigatorio.', status: 'Dependente', statusColor: 'red' },
    ],
  },
  saude: {
    titulo: 'Saude na Escola',
    descricao: 'Area segregada para dados sensiveis, atendimentos e acompanhamento especializado.',
    icon: HeartPulse,
    status: 'Bloqueado por politica de acesso',
    cards: [
      { title: 'Atendimentos', description: 'Registro de atendimento, CID, profissional e anexos.', status: 'Pendente', statusColor: 'yellow' },
      { title: 'Acesso sensivel', description: 'Perfis dedicados, segregacao e trilha obrigatoria de auditoria.', status: 'Critico', statusColor: 'red' },
      { title: 'Integracao aluno', description: 'Indicadores de saude expostos sem abrir o prontuario completo.', status: 'Planejado', statusColor: 'blue' },
    ],
  },
  nutricao: {
    titulo: 'Nutricao',
    descricao: 'Base para cardapios, restricoes alimentares e relatórios operacionais.',
    icon: UtensilsCrossed,
    status: 'Estruturacao inicial',
    cards: [
      { title: 'Cardapio', description: 'Organizacao por periodo, turma e calendario.', status: 'Planejado', statusColor: 'blue' },
      { title: 'Restricoes', description: 'Leitura controlada das restricoes alimentares dos alunos.', status: 'Dependente', statusColor: 'yellow' },
      { title: 'Equipe', description: 'Permissao operacional especifica para nutricao.', status: 'Arquitetura', statusColor: 'yellow' },
    ],
  },
  colegio: {
    titulo: 'Colegio e Unidade',
    descricao: 'Informacoes institucionais, documentos da unidade, transporte e operacao escolar.',
    icon: Building2,
    status: 'Base pronta para crescer',
    cards: [
      { title: 'Contexto de unidade', description: 'Selecao da unidade atual para preparar filtros por escola.', status: 'Entregue', statusColor: 'green' },
      { title: 'Documentos', description: 'Repositorio oficial com categorias, validade e anexos.', status: 'Planejado', statusColor: 'blue' },
      { title: 'Transporte', description: 'Cadastro de rotas, veiculos, motoristas e alunos atendidos.', status: 'Backlog', statusColor: 'slate' },
    ],
  },
  paesp: {
    titulo: 'PAESP',
    descricao: 'Estrutura reservada para indicadores externos, TRI e importacao de resultados.',
    icon: BarChart3,
    status: 'Aguardando modelagem',
    cards: [
      { title: 'Dashboard TRI', description: 'Comparativos por escola, turma e rede.', status: 'Pendente', statusColor: 'yellow' },
      { title: 'Historico', description: 'Base para evolucao por avaliacao e ano.', status: 'Pendente', statusColor: 'yellow' },
      { title: 'Importacoes', description: 'Entrada de planilhas e consolidacao automatica.', status: 'Critico', statusColor: 'red' },
    ],
  },
  integracoes: {
    titulo: 'Integracoes',
    descricao: 'Central para plataformas externas e politicas de acesso auditado.',
    icon: Waypoints,
    status: 'Estruturacao de politica visual',
    cards: [
      { title: 'Links oficiais', description: 'Educacao Modelo, Centro de Midias, Saude na Escola e site do colegio.', status: 'Planejado', statusColor: 'blue' },
      { title: 'Auditoria externa', description: 'Registro de acesso sempre que uma integracao abrir fora do sistema.', status: 'Dependente', statusColor: 'yellow' },
      { title: 'Permissoes', description: 'Liberacao por perfil operacional e unidade.', status: 'Arquitetura', statusColor: 'yellow' },
    ],
  },
  supervisao: {
    titulo: 'Supervisao',
    descricao: 'Area de acompanhamento pedagogico, observacao e devolutivas de gestao.',
    icon: ShieldCheck,
    status: 'Backlog estruturado',
    cards: [
      { title: 'Aulas observadas', description: 'Observacao, devolutiva e plano de acao.', status: 'Planejado', statusColor: 'blue' },
      { title: 'Acompanhamento', description: 'Visao restrita de indicadores por professor, turma e unidade.', status: 'Pendente', statusColor: 'yellow' },
      { title: 'Relatorios', description: 'Saidas oficiais para supervisao e coordenacao.', status: 'Backlog', statusColor: 'slate' },
    ],
  },
}

function detectarArea(pathname) {
  return pathname.split('/').filter(Boolean)[0] || 'colegio'
}

export default function AreaHubPage() {
  const { pathname } = useLocation()
  const { unidadeAtual } = useAuth()

  const areaId = detectarArea(pathname)
  const area = AREAS[areaId] ?? {
    titulo: 'Modulo em estruturacao',
    descricao: 'Area reservada para expansao da Fase 12.',
    icon: Activity,
    status: 'Backlog',
    cards: [],
  }

  const modules = useMemo(
    () => area.cards.map((item) => ({
      key: item.title,
      title: item.title,
      description: item.description,
      icon: area.icon,
      status: item.status,
      statusColor: item.statusColor,
    })),
    [area.cards, area.icon],
  )

  return (
    <div>
      <PageHeader
        titulo={area.titulo}
        descricao={area.descricao}
        icon={area.icon}
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contexto operacional</p>
            <p className="mt-1 text-sm text-slate-700">
              {unidadeAtual
                ? `Voce esta acessando ${unidadeAtual.nome}.`
                : 'Nenhuma unidade foi configurada para este usuario.'}
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
            {area.status}
          </span>
        </div>
      </Card>

      <ModuleHub
        titulo="Frentes desta area"
        descricao="Hub de planejamento para liberar implementacoes sem espalhar regras e modelos antes da hora."
        modules={modules}
        columns={3}
      />

      <Card className="mt-4 p-4">
        <div className="flex items-start gap-3">
          <FileStack size={18} className="mt-0.5 text-slate-500" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Proxima etapa recomendada</p>
            <p className="mt-1 text-sm text-slate-600">
              Fechar modelagem, permissoes e auditoria desta area antes de abrir CRUDs e anexos sensiveis.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
