import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, orderBy, limit, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase/firebase'
import { comEscopoEscolar, filtrarListaPorEscopo } from './escopo'

export async function listarPendencias(filtros = {}) {
  const condicoes = []
  if (filtros.status) condicoes.push(where('status', '==', filtros.status))
  if (filtros.tipo) condicoes.push(where('tipo', '==', filtros.tipo))
  const q = query(collection(db, 'pendencias'), ...condicoes, orderBy('data_prazo', 'asc'))
  const snap = await getDocs(q)
  return filtrarListaPorEscopo(snap.docs.map(d => ({ id: d.id, ...d.data() })), filtros)
}

export async function listarPendenciasDashboard(qtd = 5, contexto = {}) {
  const q = query(
    collection(db, 'pendencias'),
    where('status', 'in', ['pendente', 'em_andamento', 'planejado']),
    orderBy('data_prazo', 'asc'),
    limit(qtd)
  )
  const snap = await getDocs(q)
  return filtrarListaPorEscopo(snap.docs.map(d => ({ id: d.id, ...d.data() })), contexto)
}

export async function criarPendencia(dados, usuarioId, contexto = {}) {
  return addDoc(collection(db, 'pendencias'), comEscopoEscolar({
    ...dados,
    status: dados.status ?? 'pendente',
    alerta_dias_antes: dados.alerta_dias_antes ?? 15,
    notificacao_enviada: false,
    created_by: usuarioId,
    created_at: serverTimestamp(),
  }, contexto))
}

export async function atualizarPendencia(id, dados) {
  return updateDoc(doc(db, 'pendencias', id), {
    ...dados,
    updated_at: serverTimestamp(),
  })
}
