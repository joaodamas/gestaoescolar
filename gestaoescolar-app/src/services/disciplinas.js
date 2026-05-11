import {
  collection, doc, addDoc, updateDoc, getDocs, getDoc,
  query, where, onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/firebase'

const ANO_ATUAL = new Date().getFullYear()

function aplicarFiltros(lista, filtros = {}) {
  return lista
    .filter(d => !filtros.turma_id || d.turma_id === filtros.turma_id)
    .filter(d => filtros.ativa === undefined || d.ativa === filtros.ativa)
    .filter(d => !filtros.professor_id
      || d.professor_id === filtros.professor_id
      || (d.professores_ids ?? []).includes(filtros.professor_id))
    .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR'))
}

/**
 * Lista disciplinas aplicando filtros opcionais.
 * Filtros suportados: turma_id, ano_letivo, ativa, professor_id.
 */
export async function listarDisciplinas(filtros = {}) {
  const q = query(
    collection(db, 'disciplinas'),
    where('ano_letivo', '==', Number(filtros.ano_letivo) || ANO_ATUAL)
  )
  const snap = await getDocs(q)
  return aplicarFiltros(snap.docs.map(d => ({ id: d.id, ...d.data() })), filtros)
}

/**
 * Realtime: observa disciplinas com filtros.
 * Sempre invoca errorCallback e libera o loading mesmo em erro (padrão da casa).
 */
export function observarDisciplinas(filtros = {}, callback, errorCallback) {
  const q = query(
    collection(db, 'disciplinas'),
    where('ano_letivo', '==', Number(filtros.ano_letivo) || ANO_ATUAL)
  )

  return onSnapshot(
    q,
    snap => callback(aplicarFiltros(snap.docs.map(d => ({ id: d.id, ...d.data() })), filtros)),
    err => {
      console.error('Erro ao observar disciplinas:', err)
      errorCallback?.(err)
      callback([])
    }
  )
}

export async function buscarDisciplina(id) {
  const snap = await getDoc(doc(db, 'disciplinas', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function criarDisciplina(dados, criadoPor) {
  return addDoc(collection(db, 'disciplinas'), {
    nome: dados.nome,
    codigo: dados.codigo ?? '',
    carga_horaria_semanal: Number(dados.carga_horaria_semanal) || 0,
    turma_id: dados.turma_id ?? null,
    professor_id: dados.professor_id ?? dados.professores_ids?.[0] ?? null,
    professores_ids: dados.professores_ids ?? [],
    ano_letivo: Number(dados.ano_letivo) || ANO_ATUAL,
    ativa: dados.ativa ?? true,
    created_at: serverTimestamp(),
    created_by: criadoPor ?? null,
  })
}

export async function atualizarDisciplina(id, dados) {
  const payload = { ...dados, updated_at: serverTimestamp() }
  if (payload.carga_horaria_semanal !== undefined) {
    payload.carga_horaria_semanal = Number(payload.carga_horaria_semanal) || 0
  }
  if (payload.ano_letivo !== undefined) {
    payload.ano_letivo = Number(payload.ano_letivo) || ANO_ATUAL
  }
  return updateDoc(doc(db, 'disciplinas', id), payload)
}

/**
 * Soft delete — marca como inativa, não remove fisicamente.
 */
export async function arquivarDisciplina(id) {
  return updateDoc(doc(db, 'disciplinas', id), {
    ativa: false,
    arquivada_em: serverTimestamp(),
  })
}

/**
 * Atalho para listar disciplinas de uma turma específica.
 * Mantido aqui por consistência com o service (também existe em notas.js).
 */
export async function listarDisciplinasDaTurma(turmaId, anoLetivo) {
  const q = query(
    collection(db, 'disciplinas'),
    where('ano_letivo', '==', anoLetivo ?? ANO_ATUAL)
  )
  const snap = await getDocs(q)
  return aplicarFiltros(
    snap.docs.map(d => ({ id: d.id, ...d.data() })),
    { turma_id: turmaId, ativa: true }
  )
}
