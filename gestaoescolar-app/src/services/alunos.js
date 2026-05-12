import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, orderBy, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase/firebase'
import { comEscopoEscolar, filtrarListaPorEscopo, registroPertenceAoEscopo } from './escopo'

export async function listarAlunos(filtros = {}) {
  const ref = collection(db, 'alunos')
  const condicoes = [where('status', '==', filtros.status ?? 'ativo')]
  const q = query(ref, ...condicoes, orderBy('nome_completo'))
  const snap = await getDocs(q)
  return filtrarListaPorEscopo(snap.docs.map(d => ({ id: d.id, ...d.data() })), filtros)
}

export async function buscarAluno(id, contexto = {}) {
  const snap = await getDoc(doc(db, 'alunos', id))
  if (!snap.exists()) return null
  const aluno = { id: snap.id, ...snap.data() }
  return registroPertenceAoEscopo(aluno, contexto) ? aluno : null
}

// C-2 QA: consentimento_responsavel deve refletir o valor real coletado no formulário
export async function criarAluno(dados, criadoPor, consentimentoResponsavel = false, contexto = {}) {
  return addDoc(collection(db, 'alunos'), comEscopoEscolar({
    ...dados,
    status: 'ativo',
    created_at: serverTimestamp(),
    created_by: criadoPor,
    LGPD: { base_legal: 'obrigacao_legal', consentimento_responsavel: consentimentoResponsavel },
  }, contexto))
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
