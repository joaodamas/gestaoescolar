import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase/firebase'
import { comEscopoEscolar, filtrarListaPorEscopo } from './escopo'

export async function listarResponsaveis(alunoId, contexto = {}) {
  const q = query(collection(db, 'responsaveis'), where('aluno_id', '==', alunoId))
  const snap = await getDocs(q)
  return filtrarListaPorEscopo(snap.docs.map(d => ({ id: d.id, ...d.data() })), contexto)
}

export async function criarResponsavel(dados, contexto = {}) {
  return addDoc(collection(db, 'responsaveis'), comEscopoEscolar({
    ...dados,
    consentimento_data: dados.consentimento_data ?? serverTimestamp(),
    created_at: serverTimestamp(),
  }, contexto))
}

export async function atualizarResponsavel(id, dados) {
  return updateDoc(doc(db, 'responsaveis', id), {
    ...dados,
    updated_at: serverTimestamp(),
  })
}
