import {
  collection, doc, updateDoc, getDocs, writeBatch,
  query, where, orderBy, onSnapshot, limit
} from 'firebase/firestore'
import { db } from '../firebase/firebase'

export function observarNotificacoes(usuarioId, callback, qtd = 20) {
  const q = query(
    collection(db, 'notificacoes'),
    where('destinatario_id', '==', usuarioId),
    orderBy('data_envio', 'desc'),
    limit(qtd)
  )
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }, err => {
    console.error('Erro ao observar notificações:', err)
    callback([])
  })
}

export async function marcarComoLida(id) {
  return updateDoc(doc(db, 'notificacoes', id), { lida: true })
}

export async function marcarTodasComoLidas(usuarioId) {
  const q = query(
    collection(db, 'notificacoes'),
    where('destinatario_id', '==', usuarioId),
    where('lida', '==', false)
  )
  const snap = await getDocs(q)
  if (snap.empty) return
  const batch = writeBatch(db)
  snap.docs.forEach(d => batch.update(d.ref, { lida: true }))
  return batch.commit()
}
