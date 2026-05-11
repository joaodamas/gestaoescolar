import {
  collection, doc, addDoc, updateDoc, getDocs, getDoc,
  query, where, orderBy, onSnapshot, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase/firebase'

const ANO_ATUAL = new Date().getFullYear()

export async function listarTurmas(anoLetivo) {
  const q = query(
    collection(db, 'turmas'),
    where('ano_letivo', '==', anoLetivo ?? ANO_ATUAL),
    where('ativa', '==', true),
    orderBy('nome')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function listarTodasTurmas(anoLetivo) {
  const q = query(
    collection(db, 'turmas'),
    where('ano_letivo', '==', anoLetivo ?? ANO_ATUAL),
    orderBy('nome')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export function observarTurmas(anoLetivo, callback) {
  const q = query(
    collection(db, 'turmas'),
    where('ano_letivo', '==', anoLetivo ?? ANO_ATUAL),
    orderBy('nome')
  )
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export async function buscarTurma(id) {
  const snap = await getDoc(doc(db, 'turmas', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function criarTurma(dados, criadoPor) {
  return addDoc(collection(db, 'turmas'), {
    ...dados,
    ano_letivo: dados.ano_letivo ?? ANO_ATUAL,
    ativa: dados.ativa ?? true,
    professores_ids: dados.professores_ids ?? [],
    capacidade_max: dados.capacidade_max ?? 35,
    created_at: serverTimestamp(),
    created_by: criadoPor,
  })
}

export async function atualizarTurma(id, dados) {
  return updateDoc(doc(db, 'turmas', id), {
    ...dados,
    updated_at: serverTimestamp(),
  })
}

export async function arquivarTurma(id) {
  return updateDoc(doc(db, 'turmas', id), {
    ativa: false,
    arquivada_em: serverTimestamp(),
  })
}

export async function contarAlunosDaTurma(turmaId, anoLetivo) {
  const q = query(
    collection(db, 'matriculas'),
    where('turma_id', '==', turmaId),
    where('ano_letivo', '==', anoLetivo ?? ANO_ATUAL),
    where('status', '==', 'ativa')
  )
  const snap = await getDocs(q)
  return snap.size
}
