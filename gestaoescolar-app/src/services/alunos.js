import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, orderBy, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase/firebase'

export async function listarAlunos(filtros = {}) {
  const ref = collection(db, 'alunos')
  const condicoes = [where('status', '==', filtros.status ?? 'ativo')]
  const q = query(ref, ...condicoes, orderBy('nome_completo'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function buscarAluno(id) {
  const snap = await getDoc(doc(db, 'alunos', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// C-2 QA: consentimento_responsavel deve refletir o valor real coletado no formulário
export async function criarAluno(dados, criadoPor, consentimentoResponsavel = false) {
  return addDoc(collection(db, 'alunos'), {
    ...dados,
    status: 'ativo',
    created_at: serverTimestamp(),
    created_by: criadoPor,
    LGPD: { base_legal: 'obrigacao_legal', consentimento_responsavel: consentimentoResponsavel },
  })
}

export async function atualizarAluno(id, dados) {
  return updateDoc(doc(db, 'alunos', id), {
    ...dados,
    updated_at: serverTimestamp(),
  })
}

export async function inativarAluno(id, motivo, usuarioId) {
  return updateDoc(doc(db, 'alunos', id), {
    status: 'inativo',
    motivo_inativacao: motivo,
    inativado_por: usuarioId,
    inativado_em: serverTimestamp(),
  })
}
