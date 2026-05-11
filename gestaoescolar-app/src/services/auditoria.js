import {
  collection, doc, getDoc, getDocs,
  query, where, orderBy, limit, onSnapshot
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
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

/**
 * Grava um registro de auditoria via Cloud Function callable.
 *
 * /auditoria tem regra `allow write: if false` no Firestore Rules — apenas
 * Cloud Functions (que rodam com privilégios de admin) podem gravar nessa
 * coleção. Use este helper quando uma ação crítica do frontend não estiver
 * coberta por um trigger automático.
 *
 * @param {Object} params
 * @param {string} params.usuarioId      uid do usuário que executou a ação
 * @param {string} params.perfil         perfil do usuário (diretor|coordenador|...)
 * @param {string} params.acao           código da ação (ex: 'NOTA_ALTERADA_POS_FECHAMENTO')
 * @param {string} params.modulo         módulo (ex: 'notas', 'financeiro')
 * @param {string} params.entidade       coleção afetada (ex: 'notas')
 * @param {string} params.entidadeId     id do documento afetado
 * @param {*}      params.valorAnterior  snapshot antes da alteração
 * @param {*}      params.valorNovo      snapshot depois da alteração
 * @param {string} params.motivo         justificativa textual
 * @returns {Promise<{ ok: boolean, id: string }>}
 */
export async function auditarAcao({
  usuarioId,
  perfil,
  acao,
  modulo,
  entidade,
  entidadeId,
  valorAnterior,
  valorNovo,
  motivo,
}) {
  const functions = getFunctions(undefined, 'southamerica-east1')
  const callable = httpsCallable(functions, 'auditarAcaoCallable')
  const resp = await callable({
    usuarioId,
    perfil,
    acao,
    modulo,
    entidade,
    entidadeId,
    valorAnterior: valorAnterior ?? null,
    valorNovo: valorNovo ?? null,
    motivo: motivo ?? '',
  })
  return resp.data
}
