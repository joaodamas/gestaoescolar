import {
  collection, doc, getDoc, getDocs,
  query, where, orderBy, limit, startAfter, onSnapshot
} from 'firebase/firestore'
import { db } from '../firebase/firebase'

/**
 * Lista registros de auditoria com filtros.
 * /auditoria é IMUTÁVEL — gravada apenas por Cloud Functions.
 * Acesso restrito a Diretor e Admin (validado nas Security Rules).
 */
export async function listarAuditoria(filtros = {}, qtd = 50) {
  const condicoes = []
  if (filtros.modulo)     condicoes.push(where('modulo', '==', filtros.modulo))
  if (filtros.usuario_id) condicoes.push(where('usuario_id', '==', filtros.usuario_id))
  if (filtros.acao)       condicoes.push(where('acao', '==', filtros.acao))
  if (filtros.dataInicio) condicoes.push(where('created_at', '>=', new Date(filtros.dataInicio + 'T00:00:00')))
  if (filtros.dataFim)    condicoes.push(where('created_at', '<=', new Date(filtros.dataFim + 'T23:59:59')))

  const q = query(
    collection(db, 'auditoria'),
    ...condicoes,
    orderBy('created_at', 'desc'),
    limit(qtd)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Realtime: observa últimas N entradas de auditoria.
 * Útil para dashboard de monitoramento.
 */
export function observarAuditoriaRecente(qtd, callback, errorCallback) {
  const q = query(
    collection(db, 'auditoria'),
    orderBy('created_at', 'desc'),
    limit(qtd)
  )
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => {
      console.error('Erro ao observar auditoria:', err)
      errorCallback?.(err)
      callback([])
    }
  )
}

export async function buscarAuditoria(id) {
  const snap = await getDoc(doc(db, 'auditoria', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}
