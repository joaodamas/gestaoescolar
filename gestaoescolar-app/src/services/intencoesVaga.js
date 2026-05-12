import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, orderBy, serverTimestamp, arrayUnion
} from 'firebase/firestore'
import { db } from '../firebase/firebase'
import { auditarAcao } from './auditoria'
import { comEscopoEscolar } from './escopo'

const ANO_ATUAL = new Date().getFullYear()

export const SITUACOES_INTENCAO = {
  em_analise:     { label: 'Em análise',       variante: 'purple', terminal: false },
  pendente_documentacao: { label: 'Pendente doc.', variante: 'yellow', terminal: false },
  aguardando_vaga: { label: 'Aguardando vaga', variante: 'orange', terminal: false },
  homologada:     { label: 'Homologada',       variante: 'green',  terminal: false },
  excecao:        { label: 'Exceção',          variante: 'blue',   terminal: false },
  encaminhada:    { label: 'Encaminhada',      variante: 'slate',  terminal: true },
  indeferida:     { label: 'Indeferida',       variante: 'red',    terminal: true },
  cancelada:      { label: 'Cancelada',        variante: 'slate',  terminal: true },
  convertida_matricula: { label: 'Convertida em matrícula', variante: 'green', terminal: true },
}

export const SITUACOES_MATRICULA = {
  solicitada:  { label: 'Solicitada',  variante: 'blue' },
  deferida:    { label: 'Deferida',    variante: 'purple' },
  ativa:       { label: 'Ativa',       variante: 'green' },
  transferida: { label: 'Transferida', variante: 'orange' },
  evadida:     { label: 'Evadida',     variante: 'red' },
  cancelada:   { label: 'Cancelada',   variante: 'slate' },
  concluida:   { label: 'Concluída',   variante: 'slate' },
}

function gerarProtocolo(prefixo, ano) {
  const sufixo = Date.now().toString().slice(-6)
  return `${prefixo}${ano}${sufixo}`
}

function entradaHistorico({ situacao, motivo = '', usuarioId = null, usuarioNome = null }) {
  return {
    situacao,
    motivo,
    usuario_id: usuarioId,
    usuario_nome: usuarioNome,
    data: new Date().toISOString(),
  }
}

/**
 * Cria uma nova intenção de vaga e grava a primeira entrada de histórico.
 */
export async function criarIntencaoVaga(dados, autor) {
  const anoLetivo = Number(dados.ano_letivo) || ANO_ATUAL
  const situacaoInicial = dados.situacao || 'em_analise'

  const payload = comEscopoEscolar({
    protocolo: gerarProtocolo('IV', anoLetivo),
    ano_letivo: anoLetivo,
    situacao: situacaoInicial,

    aluno_nome: dados.aluno_nome?.trim() ?? '',
    aluno_ra: dados.aluno_ra?.trim() ?? '',
    aluno_data_nascimento: dados.aluno_data_nascimento ?? '',
    aluno_cpf: dados.aluno_cpf ?? '',
    aluno_sexo: dados.aluno_sexo ?? '',

    ensino: dados.ensino ?? '',
    serie: dados.serie ?? '',
    turno_preferencia: dados.turno_preferencia ?? '',

    endereco: dados.endereco ?? null,

    responsavel_nome: dados.responsavel_nome?.trim() ?? '',
    responsavel_telefone: dados.responsavel_telefone ?? '',
    responsavel_email: dados.responsavel_email ?? '',
    responsavel_parentesco: dados.responsavel_parentesco ?? '',
    responsavel_cpf: dados.responsavel_cpf ?? '',

    escola_origem_nome: dados.escola_origem_nome ?? '',
    escola_origem_cidade: dados.escola_origem_cidade ?? '',
    escola_origem_uf: dados.escola_origem_uf ?? '',
    matriculado_em_outro_colegio: Boolean(dados.matriculado_em_outro_colegio),

    observacoes: dados.observacoes ?? '',
    documentos_pendentes: Array.isArray(dados.documentos_pendentes) ? dados.documentos_pendentes : [],

    historico_situacao: [entradaHistorico({
      situacao: situacaoInicial,
      motivo: 'Cadastro inicial da intenção de vaga.',
      usuarioId: autor?.uid ?? null,
      usuarioNome: autor?.nome ?? null,
    })],

    data_solicitacao: new Date().toISOString().slice(0, 10),
    created_by: autor?.uid ?? null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  }, autor)

  const ref = await addDoc(collection(db, 'intencoes_vaga'), payload)

  await auditarAcao({
    usuarioId: autor?.uid,
    perfil: autor?.perfil,
    acao: 'INTENCAO_VAGA_CRIADA',
    modulo: 'secretaria',
    entidade: 'intencoes_vaga',
    entidadeId: ref.id,
    valorNovo: { protocolo: payload.protocolo, situacao: situacaoInicial, ensino: payload.ensino, serie: payload.serie },
    motivo: 'Cadastro inicial de intenção de vaga.',
  }).catch(err => console.warn('Falha ao auditar criação de intenção:', err))

  return { id: ref.id, ...payload }
}

/**
 * Lista intenções por ano letivo.
 */
export async function listarIntencoesVaga(anoLetivo = ANO_ATUAL) {
  const q = query(
    collection(db, 'intencoes_vaga'),
    where('ano_letivo', '==', Number(anoLetivo)),
    orderBy('created_at', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function buscarIntencaoVaga(id) {
  const snap = await getDoc(doc(db, 'intencoes_vaga', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

/**
 * Atualiza a situação da intenção, exigindo motivo, gravando histórico e
 * auditando a mudança. Bloqueia transições de estados terminais.
 */
export async function atualizarSituacaoIntencao({ id, novaSituacao, motivo, autor }) {
  if (!id || !novaSituacao) throw new Error('id e novaSituacao são obrigatórios.')
  if (!motivo || motivo.trim().length < 5) {
    throw new Error('Motivo é obrigatório (mín. 5 caracteres).')
  }
  if (!SITUACOES_INTENCAO[novaSituacao]) {
    throw new Error(`Situação inválida: ${novaSituacao}`)
  }

  const ref = doc(db, 'intencoes_vaga', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Intenção de vaga não encontrada.')

  const dadosAntes = snap.data()
  if (SITUACOES_INTENCAO[dadosAntes.situacao]?.terminal) {
    throw new Error('Esta intenção já está em estado terminal e não pode ser alterada.')
  }

  const entrada = entradaHistorico({
    situacao: novaSituacao,
    motivo,
    usuarioId: autor?.uid ?? null,
    usuarioNome: autor?.nome ?? null,
  })

  await updateDoc(ref, {
    situacao: novaSituacao,
    motivo_ultima_alteracao: motivo,
    historico_situacao: arrayUnion(entrada),
    updated_at: serverTimestamp(),
    updated_by: autor?.uid ?? null,
  })

  await auditarAcao({
    usuarioId: autor?.uid,
    perfil: autor?.perfil,
    acao: 'INTENCAO_VAGA_SITUACAO_ATUALIZADA',
    modulo: 'secretaria',
    entidade: 'intencoes_vaga',
    entidadeId: id,
    valorAnterior: { situacao: dadosAntes.situacao },
    valorNovo: { situacao: novaSituacao },
    motivo,
  }).catch(err => console.warn('Falha ao auditar atualização de intenção:', err))

  return true
}

/**
 * Converte uma intenção homologada em matrícula, gerando documento em
 * /matriculas, marcando a intenção como `convertida_matricula` e linkando
 * cruzadamente as duas. Não cria aluno ainda — o vínculo com /alunos é
 * feito separadamente, pelo fluxo de "Nova matrícula" formal, mas o
 * payload já carrega snapshot dos dados para preservar histórico.
 */
export async function converterIntencaoEmMatricula({ id, turmaId, turmaNome, autor }) {
  if (!id) throw new Error('id da intenção é obrigatório.')

  const refIntencao = doc(db, 'intencoes_vaga', id)
  const snap = await getDoc(refIntencao)
  if (!snap.exists()) throw new Error('Intenção não encontrada.')

  const dados = snap.data()
  if (dados.situacao !== 'homologada' && dados.situacao !== 'excecao') {
    throw new Error('Apenas intenções homologadas (ou em exceção) podem ser convertidas em matrícula.')
  }

  const anoLetivo = Number(dados.ano_letivo) || ANO_ATUAL

  const matriculaPayload = comEscopoEscolar({
    ano_letivo: anoLetivo,
    turma_id: turmaId ?? '',
    turma_nome: turmaNome ?? '',
    status: 'solicitada',
    numero_matricula: gerarProtocolo('M', anoLetivo),
    aluno_nome: dados.aluno_nome ?? '',
    aluno_ra: dados.aluno_ra ?? '',
    ensino: dados.ensino ?? '',
    serie: dados.serie ?? '',
    responsavel_nome: dados.responsavel_nome ?? '',
    responsavel_telefone: dados.responsavel_telefone ?? '',
    endereco: dados.endereco ?? null,
    intencao_vaga_id: id,
    historico_situacao: [entradaHistorico({
      situacao: 'solicitada',
      motivo: `Convertida da intenção ${dados.protocolo}.`,
      usuarioId: autor?.uid ?? null,
      usuarioNome: autor?.nome ?? null,
    })],
    data_matricula: new Date().toISOString().slice(0, 10),
    created_by: autor?.uid ?? null,
    created_at: serverTimestamp(),
  }, dados)

  const refMatricula = await addDoc(collection(db, 'matriculas'), matriculaPayload)

  const entrada = entradaHistorico({
    situacao: 'convertida_matricula',
    motivo: `Convertida em matrícula ${matriculaPayload.numero_matricula}.`,
    usuarioId: autor?.uid ?? null,
    usuarioNome: autor?.nome ?? null,
  })

  await updateDoc(refIntencao, {
    situacao: 'convertida_matricula',
    matricula_id: refMatricula.id,
    matricula_protocolo: matriculaPayload.numero_matricula,
    historico_situacao: arrayUnion(entrada),
    updated_at: serverTimestamp(),
    updated_by: autor?.uid ?? null,
  })

  await auditarAcao({
    usuarioId: autor?.uid,
    perfil: autor?.perfil,
    acao: 'INTENCAO_CONVERTIDA_MATRICULA',
    modulo: 'secretaria',
    entidade: 'matriculas',
    entidadeId: refMatricula.id,
    valorAnterior: { intencao_id: id, situacao_intencao: dados.situacao },
    valorNovo: { matricula_protocolo: matriculaPayload.numero_matricula, turma_id: turmaId, turma_nome: turmaNome },
    motivo: 'Conversão de intenção de vaga em matrícula.',
  }).catch(err => console.warn('Falha ao auditar conversão:', err))

  return { matriculaId: refMatricula.id, protocolo: matriculaPayload.numero_matricula }
}

/**
 * Atualiza situação de uma MATRÍCULA com histórico + auditoria
 * (usado pelo workflow de deferimento/movimentação escolar).
 */
export async function atualizarSituacaoMatricula({ id, novaSituacao, motivo, autor }) {
  if (!id || !novaSituacao) throw new Error('id e novaSituacao são obrigatórios.')
  if (!SITUACOES_MATRICULA[novaSituacao]) throw new Error(`Situação inválida: ${novaSituacao}`)
  if (!motivo || motivo.trim().length < 5) throw new Error('Motivo é obrigatório (mín. 5 caracteres).')

  const ref = doc(db, 'matriculas', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Matrícula não encontrada.')

  const antes = snap.data()
  const entrada = entradaHistorico({
    situacao: novaSituacao,
    motivo,
    usuarioId: autor?.uid ?? null,
    usuarioNome: autor?.nome ?? null,
  })

  await updateDoc(ref, {
    status: novaSituacao,
    motivo_ultima_alteracao: motivo,
    historico_situacao: arrayUnion(entrada),
    updated_at: serverTimestamp(),
    updated_by: autor?.uid ?? null,
  })

  await auditarAcao({
    usuarioId: autor?.uid,
    perfil: autor?.perfil,
    acao: 'MATRICULA_SITUACAO_ATUALIZADA',
    modulo: 'secretaria',
    entidade: 'matriculas',
    entidadeId: id,
    valorAnterior: { status: antes.status },
    valorNovo: { status: novaSituacao },
    motivo,
  }).catch(err => console.warn('Falha ao auditar atualização de matrícula:', err))

  return true
}
