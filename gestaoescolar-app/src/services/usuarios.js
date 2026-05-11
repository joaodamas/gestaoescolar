import {
  collection, doc, getDoc, getDocs, updateDoc, setDoc,
  query, where, orderBy, onSnapshot, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase/firebase'

export async function listarUsuarios(filtros = {}) {
  const condicoes = []
  if (filtros.perfil) condicoes.push(where('perfil', '==', filtros.perfil))
  if (filtros.ativo !== undefined) condicoes.push(where('ativo', '==', filtros.ativo))
  const q = condicoes.length
    ? query(collection(db, 'usuarios'), ...condicoes, orderBy('nome'))
    : query(collection(db, 'usuarios'), orderBy('nome'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export function observarUsuarios(callback) {
  const q = query(collection(db, 'usuarios'), orderBy('nome'))
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

export async function buscarUsuario(uid) {
  const snap = await getDoc(doc(db, 'usuarios', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

/**
 * Cria documento /usuarios após o uid já existir no Firebase Auth.
 * A criação no Auth deve ser feita separadamente (Console, Cloud Function, etc).
 */
export async function criarUsuarioDoc(uid, dados) {
  return setDoc(doc(db, 'usuarios', uid), {
    nome: dados.nome,
    email: dados.email,
    perfil: dados.perfil,
    ativo: dados.ativo ?? true,
    turmas_ids: dados.turmas_ids ?? [],
    created_at: serverTimestamp(),
  }, { merge: true })
}

export async function atualizarUsuario(uid, dados) {
  return updateDoc(doc(db, 'usuarios', uid), {
    ...dados,
    updated_at: serverTimestamp(),
  })
}

export async function alternarStatusUsuario(uid, ativo) {
  return updateDoc(doc(db, 'usuarios', uid), {
    ativo,
    updated_at: serverTimestamp(),
  })
}

export async function alterarPerfil(uid, novoPerfil) {
  return updateDoc(doc(db, 'usuarios', uid), {
    perfil: novoPerfil,
    perfil_alterado_em: serverTimestamp(),
  })
}

export async function vincularTurmas(uid, turmasIds) {
  return updateDoc(doc(db, 'usuarios', uid), {
    turmas_ids: turmasIds,
    updated_at: serverTimestamp(),
  })
}
