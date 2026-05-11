import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase/firebase'

export async function listarResponsaveis(alunoId) {
  const q = query(collection(db, 'responsaveis'), where('aluno_id', '==', alunoId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function criarResponsavel(dados) {
  return addDoc(collection(db, 'responsaveis'), {
    ...dados,
    consentimento_data: dados.consentimento_data ?? serverTimestamp(),
    created_at: serverTimestamp(),
  })
}

export async function atualizarResponsavel(id, dados) {
  return updateDoc(doc(db, 'responsaveis', id), {
    ...dados,
    updated_at: serverTimestamp(),
  })
}
