import {
  collection, doc, addDoc, updateDoc, getDocs, getDoc,
  query, where, orderBy, onSnapshot, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase/firebase'
import { comEscopoEscolar, filtrarListaPorEscopo, registroPertenceAoEscopo } from './escopo'

const ANO_ATUAL = new Date().getFullYear()

export async function listarTurmas(anoLetivo, contexto = {}) {
  const q = query(
    collection(db, 'turmas'),
    where('ano_letivo', '==', anoLetivo ?? ANO_ATUAL),
    where('ativa', '==', true),
    orderBy('nome')
  )
  const snap = await getDocs(q)
  return filtrarListaPorEscopo(snap.docs.map(d => ({ id: d.id, ...d.data() })), contexto)
}

export async function listarTodasTurmas(anoLetivo, contexto = {}) {
  const q = query(
    collection(db, 'turmas'),
    where('ano_letivo', '==', anoLetivo ?? ANO_ATUAL),
    orderBy('nome')
  )
  const snap = await getDocs(q)
  return filtrarListaPorEscopo(snap.docs.map(d => ({ id: d.id, ...d.data() })), contexto)
}

export function observarTurmas(anoLetivo, callback, errorCallback, contexto = {}) {
  const q = query(
    collection(db, 'turmas'),
    where('ano_letivo', '==', anoLetivo ?? ANO_ATUAL),
    orderBy('nome')
  )
  return onSnapshot(
    q,
    snap => callback(filtrarListaPorEscopo(snap.docs.map(d => ({ id: d.id, ...d.data() })), contexto)),
    err => {
      console.error('Erro ao observar turmas:', err)
      errorCallback?.(err)
      // Garante que o callback é chamado para destravar o loading
      callback([])
    }
  )
}

export async function buscarTurma(id, contexto = {}) {
  const snap = await getDoc(doc(db, 'turmas', id))
  if (!snap.exists()) return null
  const turma = { id: snap.id, ...snap.data() }
  return registroPertenceAoEscopo(turma, contexto) ? turma : null
}

export async function criarTurma(dados, criadoPor, contexto = {}) {
  return addDoc(collection(db, 'turmas'), comEscopoEscolar({
    ...dados,
    ano_letivo: dados.ano_letivo ?? ANO_ATUAL,
    ativa: dados.ativa ?? true,
    professores_ids: dados.professores_ids ?? [],
    capacidade_max: dados.capacidade_max ?? 35,
    created_at: serverTimestamp(),
    created_by: criadoPor,
  }, contexto))
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

export async function contarAlunosDaTurma(turmaId, anoLetivo, contexto = {}) {
  const q = query(
    collection(db, 'matriculas'),
    where('turma_id', '==', turmaId),
    where('ano_letivo', '==', anoLetivo ?? ANO_ATUAL),
    where('status', '==', 'ativa')
  )
  const snap = await getDocs(q)
  return filtrarListaPorEscopo(snap.docs.map(d => ({ id: d.id, ...d.data() })), contexto).length
}
