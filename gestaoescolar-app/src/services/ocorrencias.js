import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase/firebase'
import { comEscopoEscolar, filtrarListaPorEscopo } from './escopo'

// Tipos restritos a professores
const TIPOS_RESTRITOS_PROFESSOR = ['medico', 'acidente']

// Todos os tipos válidos de ocorrência
export const TIPOS_OCORRENCIA = ['disciplinar', 'medico', 'encaminhamento', 'reuniao', 'acidente']

/**
 * Lista ocorrências da coleção /ocorrencias.
 * Se perfil === 'professor', exclui os tipos 'medico' e 'acidente'.
 * Aceita filtros: tipo, status, gravidade, dataInicio (string ISO), dataFim (string ISO).
 *
 * @param {string} perfil - Perfil do usuário logado
 * @param {object} filtros - Filtros opcionais
 * @returns {Promise<Array>}
 */
export async function listarOcorrencias(perfil, filtros = {}) {
  const ref = collection(db, 'ocorrencias')
  const condicoes = []

  // Restrição por perfil: professor não vê médico nem acidente
  if (perfil === 'professor') {
    condicoes.push(where('tipo', 'not-in', TIPOS_RESTRITOS_PROFESSOR))
  } else if (filtros.tipo) {
    // Filtro de tipo só é aplicado para não-professores (ou professor com tipo permitido)
    condicoes.push(where('tipo', '==', filtros.tipo))
  }

  // Filtro de tipo para professor (apenas tipos permitidos)
  if (perfil === 'professor' && filtros.tipo && !TIPOS_RESTRITOS_PROFESSOR.includes(filtros.tipo)) {
    // Quando professor filtra por tipo permitido, refaz com == em vez de not-in
    const condicoesTipo = [where('tipo', '==', filtros.tipo)]

    if (filtros.status) condicoesTipo.push(where('status', '==', filtros.status))
    if (filtros.gravidade) condicoesTipo.push(where('gravidade', '==', filtros.gravidade))
    if (filtros.dataInicio) {
      condicoesTipo.push(where('data_ocorrencia', '>=', filtros.dataInicio))
    }
    if (filtros.dataFim) {
      condicoesTipo.push(where('data_ocorrencia', '<=', filtros.dataFim))
    }
    condicoesTipo.push(orderBy('data_ocorrencia', 'desc'))
    const snap = await getDocs(query(ref, ...condicoesTipo))
    return filtrarListaPorEscopo(snap.docs.map(d => ({ id: d.id, ...d.data() })), filtros)
  }

  // Filtros comuns (não-professor ou professor sem filtro de tipo específico)
  if (filtros.status) condicoes.push(where('status', '==', filtros.status))
  if (filtros.gravidade) condicoes.push(where('gravidade', '==', filtros.gravidade))
  if (filtros.dataInicio) {
    condicoes.push(where('data_ocorrencia', '>=', filtros.dataInicio))
  }
  if (filtros.dataFim) {
    condicoes.push(where('data_ocorrencia', '<=', filtros.dataFim))
  }

  // not-in não pode ser combinado com orderBy no mesmo campo;
  // quando professor, ordena por created_at como alternativa segura
  if (perfil === 'professor') {
    condicoes.push(orderBy('data_ocorrencia', 'desc'))
  } else {
    condicoes.push(orderBy('data_ocorrencia', 'desc'))
  }

  const q = query(ref, ...condicoes)
  const snap = await getDocs(q)
  return filtrarListaPorEscopo(snap.docs.map(d => ({ id: d.id, ...d.data() })), filtros)
}

/**
 * Cria uma nova ocorrência em /ocorrencias.
 *
 * @param {object} dados - Campos da ocorrência
 * @param {string} usuarioId - UID do usuário que está registrando
 * @returns {Promise<DocumentReference>}
 */
export async function criarOcorrencia(dados, usuarioId, contexto = {}) {
  // Denormalização: salva o snapshot do nome do aluno e do registrador
  // para evitar lookup em toda listagem (boa prática Firestore)
  let alunoNome = dados.aluno_nome ?? ''
  if (!alunoNome && dados.aluno_id) {
    try {
      const snap = await getDoc(doc(db, 'alunos', dados.aluno_id))
      if (snap.exists()) alunoNome = snap.data().nome_completo ?? ''
    } catch {}
  }

  let registradoPorNome = dados.registrado_por_nome ?? ''
  if (!registradoPorNome && usuarioId) {
    try {
      const snap = await getDoc(doc(db, 'usuarios', usuarioId))
      if (snap.exists()) registradoPorNome = snap.data().nome ?? ''
    } catch {}
  }

  return addDoc(collection(db, 'ocorrencias'), comEscopoEscolar({
    aluno_id: dados.aluno_id,
    aluno_nome: alunoNome,
    tipo: dados.tipo,
    descricao: dados.descricao,
    providencia: dados.providencia ?? '',
    data_ocorrencia: dados.data_ocorrencia,
    status: 'aberta',
    gravidade: dados.gravidade,
    registrado_por: usuarioId,
    registrado_por_nome: registradoPorNome,
    notificado_responsavel: dados.notificado_responsavel ?? false,
    created_at: serverTimestamp(),
  }, contexto))
}

/**
 * Marca uma ocorrência como resolvida.
 *
 * @param {string} id - ID do documento em /ocorrencias
 * @returns {Promise<void>}
 */
export async function marcarResolvida(id) {
  return updateDoc(doc(db, 'ocorrencias', id), {
    status: 'resolvida',
    resolvida_em: serverTimestamp(),
  })
}

/**
 * Busca alunos pelo prefixo do nome (busca por prefixo via Firestore range query).
 *
 * @param {string} termo - Texto digitado pelo usuário
 * @returns {Promise<Array>}
 */
export async function buscarAlunos(termo, contexto = {}) {
  if (!termo || termo.trim().length < 2) return []
  const termoBusca = termo.trim()
  const termoFim = termoBusca + ''

  const q = query(
    collection(db, 'alunos'),
    where('nome_completo', '>=', termoBusca),
    where('nome_completo', '<=', termoFim),
    orderBy('nome_completo'),
    limit(10)
  )
  const snap = await getDocs(q)
  return filtrarListaPorEscopo(snap.docs.map(d => ({ id: d.id, ...d.data() })), contexto)
}

/**
 * Retorna contagem de ocorrências agrupadas por tipo.
 * Se perfil === 'professor', os tipos médico e acidente retornam 0.
 *
 * @param {string} perfil - Perfil do usuário
 * @returns {Promise<object>} - { disciplinar: N, medico: N, encaminhamento: N, reuniao: N, acidente: N }
 */
export async function contarPorTipo(perfil, contexto = {}) {
  const contagens = {
    disciplinar: 0,
    medico: 0,
    encaminhamento: 0,
    reuniao: 0,
    acidente: 0,
  }

  // Tipos visíveis conforme perfil
  const tiposConsultar = perfil === 'professor'
    ? TIPOS_OCORRENCIA.filter(t => !TIPOS_RESTRITOS_PROFESSOR.includes(t))
    : TIPOS_OCORRENCIA

  await Promise.all(
    tiposConsultar.map(async (tipo) => {
      const q = query(collection(db, 'ocorrencias'), where('tipo', '==', tipo))
      const snap = await getDocs(q)
      contagens[tipo] = filtrarListaPorEscopo(snap.docs.map(d => ({ id: d.id, ...d.data() })), contexto).length
    })
  )

  return contagens
}
