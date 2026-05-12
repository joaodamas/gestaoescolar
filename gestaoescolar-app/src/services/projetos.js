import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, orderBy, limit, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase/firebase'
import { comEscopoEscolar, filtrarListaPorEscopo } from './escopo'

export async function listarProjetos(filtros = {}) {
  const condicoes = []
  if (filtros.status) condicoes.push(where('status', '==', filtros.status))
  const q = query(collection(db, 'projetos'), ...condicoes, orderBy('data_inicio', 'desc'))
  const snap = await getDocs(q)
  return filtrarListaPorEscopo(snap.docs.map(d => ({ id: d.id, ...d.data() })), filtros)
}

export async function listarProjetosDashboard(qtd = 5, contexto = {}) {
  const q = query(
    collection(db, 'projetos'),
    where('status', 'in', ['em_andamento', 'planejado']),
    orderBy('data_inicio', 'desc'),
    limit(qtd)
  )
  const snap = await getDocs(q)
  return filtrarListaPorEscopo(snap.docs.map(d => ({ id: d.id, ...d.data() })), contexto)
}

export async function criarProjeto(dados, usuarioId, contexto = {}) {
  return addDoc(collection(db, 'projetos'), comEscopoEscolar({
    ...dados,
    status: dados.status ?? 'planejado',
    created_by: usuarioId,
    created_at: serverTimestamp(),
  }, contexto))
}

export async function atualizarStatusProjeto(id, status, usuarioId) {
  return updateDoc(doc(db, 'projetos', id), {
    status,
    updated_at: serverTimestamp(),
    updated_by: usuarioId,
  })
}
