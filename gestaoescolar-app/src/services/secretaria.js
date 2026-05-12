import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '../firebase/firebase'
import { mascararTelefone } from '../utils/mascaramento'

const ANO_ATUAL = new Date().getFullYear()

const MATRICULAS_DEMO = [
  {
    id: 'demo-matricula-1',
    tipo: 'matricula',
    ano_letivo: ANO_ATUAL,
    ensino: 'fundamental_anos_iniciais',
    serie: '1º ano',
    situacao: 'ativa',
    aluno_nome: 'Ana Beatriz Martins',
    aluno_ra: '20260018',
    responsavel_nome: 'Mariana Martins',
    responsavel_telefone: '(11) 98888-0101',
    data_solicitacao: `${ANO_ATUAL}-01-18`,
    turma_nome: '1º ano A',
    origem: 'demo',
  },
  {
    id: 'demo-matricula-2',
    tipo: 'matricula',
    ano_letivo: ANO_ATUAL,
    ensino: 'fundamental_anos_finais',
    serie: '6º ano',
    situacao: 'pendente_documentacao',
    aluno_nome: 'Lucas Pereira de Souza',
    aluno_ra: '20250142',
    responsavel_nome: 'Ricardo Souza',
    responsavel_telefone: '(21) 97777-0202',
    data_solicitacao: `${ANO_ATUAL}-01-24`,
    turma_nome: '6º ano B',
    origem: 'demo',
  },
  {
    id: 'demo-intencao-1',
    tipo: 'intencao_vaga',
    ano_letivo: ANO_ATUAL + 1,
    ensino: 'educacao_infantil',
    serie: 'Pré II',
    situacao: 'em_analise',
    aluno_nome: 'Clara Oliveira Lima',
    aluno_ra: '',
    responsavel_nome: 'Patricia Lima',
    responsavel_telefone: '(31) 96666-0303',
    data_solicitacao: `${ANO_ATUAL}-04-07`,
    turma_nome: '',
    origem: 'demo',
  },
]

function normalizarMatricula(documento) {
  const dados = documento.data()
  return {
    id: documento.id,
    tipo: 'matricula',
    ano_letivo: Number(dados.ano_letivo ?? ANO_ATUAL),
    ensino: dados.ensino ?? dados.etapa_ensino ?? '',
    serie: dados.serie ?? dados.aluno_serie ?? '',
    situacao: dados.status ?? dados.situacao ?? 'ativa',
    protocolo: dados.numero_matricula ?? dados.protocolo ?? '',
    aluno_nome: dados.aluno_nome ?? dados.nome_aluno ?? '',
    aluno_ra: dados.aluno_ra ?? dados.ra ?? '',
    responsavel_nome: dados.responsavel_nome ?? '',
    responsavel_telefone: mascararTelefone(dados.responsavel_telefone ?? ''),
    data_solicitacao: dados.data_matricula ?? dados.data_solicitacao ?? '',
    turma_id: dados.turma_id ?? '',
    turma_nome: dados.turma_nome ?? '',
    intencao_vaga_id: dados.intencao_vaga_id ?? '',
    origem: 'firestore',
  }
}

function normalizarIntencao(documento) {
  const dados = documento.data()
  return {
    id: documento.id,
    tipo: 'intencao_vaga',
    ano_letivo: Number(dados.ano_letivo ?? dados.ano_interesse ?? ANO_ATUAL),
    ensino: dados.ensino ?? dados.etapa_ensino ?? '',
    serie: dados.serie ?? dados.serie_interesse ?? '',
    situacao: dados.situacao ?? dados.status ?? 'em_analise',
    protocolo: dados.protocolo ?? '',
    aluno_nome: dados.aluno_nome ?? dados.nome_aluno ?? dados.nome_crianca ?? '',
    aluno_ra: dados.aluno_ra ?? dados.ra ?? '',
    responsavel_nome: dados.responsavel_nome ?? dados.nome_responsavel ?? '',
    responsavel_telefone: mascararTelefone(dados.responsavel_telefone ?? dados.telefone_responsavel ?? ''),
    data_solicitacao: dados.data_solicitacao ?? dados.created_at?.toDate?.().toISOString?.().slice(0, 10) ?? '',
    matriculado_em_outro_colegio: Boolean(dados.matriculado_em_outro_colegio),
    matricula_id: dados.matricula_id ?? '',
    origem: 'firestore',
  }
}

async function listarColecao(nomeColecao, anoLetivo, normalizar) {
  const q = query(
    collection(db, nomeColecao),
    where('ano_letivo', '==', Number(anoLetivo)),
    orderBy('ano_letivo', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(normalizar)
}

/**
 * Lista matrículas + intenções de vaga de um ano letivo.
 *
 * Retorna também flags de diagnóstico para a UI distinguir:
 * - `usandoMock`: ambas as coleções vieram vazias (caímos no exemplo demo);
 * - `errosColecao`: erros por coleção (`permission-denied`, índice faltando etc.)
 *   para a tela mostrar mensagem específica em vez de "sem dados".
 */
export async function listarRegistrosSecretaria({ anoLetivo = ANO_ATUAL } = {}) {
  const consultas = await Promise.allSettled([
    listarColecao('matriculas', anoLetivo, normalizarMatricula),
    listarColecao('intencoes_vaga', anoLetivo, normalizarIntencao),
  ])

  const errosColecao = {}
  const registros = []

  consultas.forEach((resultado, index) => {
    const colecao = index === 0 ? 'matriculas' : 'intencoes_vaga'
    if (resultado.status === 'fulfilled') {
      registros.push(...resultado.value)
    } else {
      errosColecao[colecao] = {
        code: resultado.reason?.code ?? 'unknown',
        message: resultado.reason?.message ?? 'Erro desconhecido',
      }
    }
  })

  // Só caímos no mock se NÃO houve erro nas duas e nenhum registro veio.
  const houveErro = Object.keys(errosColecao).length > 0
  if (!houveErro && registros.length === 0) {
    return {
      registros: MATRICULAS_DEMO.filter(item => Number(item.ano_letivo) === Number(anoLetivo)),
      usandoMock: true,
      errosColecao,
    }
  }

  return { registros, usandoMock: false, errosColecao }
}
