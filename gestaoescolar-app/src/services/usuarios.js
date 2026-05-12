import {
  collection, doc, getDoc, getDocs, updateDoc, setDoc,
  query, where, orderBy, onSnapshot, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase/firebase'
import { comEscopoEscolar, filtrarListaPorEscopo } from './escopo'

export async function listarUsuarios(filtros = {}) {
  const condicoes = []
  if (filtros.perfil) condicoes.push(where('perfil', '==', filtros.perfil))
  if (filtros.ativo !== undefined) condicoes.push(where('ativo', '==', filtros.ativo))
  const q = condicoes.length
    ? query(collection(db, 'usuarios'), ...condicoes, orderBy('nome'))
    : query(collection(db, 'usuarios'), orderBy('nome'))
  const snap = await getDocs(q)
  return filtrarListaPorEscopo(snap.docs.map(d => ({ id: d.id, ...d.data() })), filtros)
}

export function observarUsuarios(callback, errorCallback, contexto = {}) {
  const q = query(collection(db, 'usuarios'), orderBy('nome'))
  return onSnapshot(
    q,
    snap => callback(filtrarListaPorEscopo(snap.docs.map(d => ({ id: d.id, ...d.data() })), contexto)),
    err => {
      console.error('Erro ao observar usuários:', err)
      errorCallback?.(err)
      callback([])
    }
  )
}

export async function buscarUsuario(uid) {
  const snap = await getDoc(doc(db, 'usuarios', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

/**
 * Cria documento /usuarios após o uid já existir no Firebase Auth.
 * A criação no Auth deve ser feita separadamente (Console, Cloud Function, etc).
 */
export async function criarUsuarioDoc(uid, dados, contexto = {}) {
  const unidadeId = dados.unidade_id ?? dados.unidade_atual_id ?? contexto.unidadeAtualId ?? ''
  const unidadesIds = dados.unidades_ids ?? (unidadeId ? [unidadeId] : [])

  return setDoc(doc(db, 'usuarios', uid), comEscopoEscolar({
    nome: dados.nome,
    email: dados.email,
    perfil: dados.perfil,
    ativo: dados.ativo ?? true,
    turmas_ids: dados.turmas_ids ?? [],
    escola_id: dados.escola_id ?? '',
    unidade_id: unidadeId,
    unidade_atual_id: dados.unidade_atual_id ?? unidadeId,
    unidades_ids: unidadesIds,
    unidades: dados.unidades ?? [],
    created_at: serverTimestamp(),
  }, contexto), { merge: true })
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
