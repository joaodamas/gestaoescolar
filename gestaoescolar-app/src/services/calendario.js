import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase/firebase'
import { comEscopoEscolar, filtrarListaPorEscopo } from './escopo'

const ANO_ATUAL = new Date().getFullYear()

export async function listarCalendario(anoLetivo, contexto = {}) {
  const q = query(
    collection(db, 'calendario'),
    where('ano_letivo', '==', anoLetivo ?? ANO_ATUAL)
  )
  const snap = await getDocs(q)
  return filtrarListaPorEscopo(snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(ev => ev.ativo !== false)
    .sort((a, b) => (a.data ?? '').localeCompare(b.data ?? '')), contexto)
}

export async function listarProximosEventos(limite = 5, anoLetivo = ANO_ATUAL, contexto = {}) {
  const hoje = new Date()
  const dataHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`

  const q = query(
    collection(db, 'calendario'),
    where('ano_letivo', '==', anoLetivo)
  )
  const snap = await getDocs(q)
  return filtrarListaPorEscopo(snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(ev => ev.ativo !== false)
    .filter(ev => (ev.data ?? '') >= dataHoje)
    .sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''))
    .slice(0, limite), contexto)
}

/**
 * Verifica se a data é dia letivo no calendário.
 * Retorna { ehLetivo, tipo, descricao }.
 * Se não houver registro: assume dia letivo se for dia útil (seg-sex).
 */
export async function verificarDiaLetivo(data, anoLetivo, contexto = {}) {
  const ano = anoLetivo ?? new Date(data + 'T00:00:00').getFullYear()
  const q = query(
    collection(db, 'calendario'),
    where('ano_letivo', '==', ano),
    where('data', '==', data)
  )
  const snap = await getDocs(q)

  if (!snap.empty) {
    const ativo = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(item => filtrarListaPorEscopo([item], contexto).length > 0)
      .find(d => d.ativo !== false)
    if (!ativo) return { ehLetivo: true, tipo: 'aula', descricao: '' }
    const reg = ativo
    return {
      ehLetivo: reg.tipo === 'aula' || reg.tipo === 'reposicao',
      tipo: reg.tipo,
      descricao: reg.descricao ?? '',
    }
  }

  // Sem registro: dia útil é letivo, fim de semana não
  const dia = new Date(data + 'T00:00:00').getDay()
  if (dia === 0 || dia === 6) {
    return { ehLetivo: false, tipo: 'fim_semana', descricao: 'Fim de semana' }
  }
  return { ehLetivo: true, tipo: 'aula', descricao: '' }
}

export async function criarEvento(dados, usuarioId, contexto = {}) {
  return addDoc(collection(db, 'calendario'), comEscopoEscolar({
    ...dados,
    ano_letivo: dados.ano_letivo ?? new Date(dados.data + 'T00:00:00').getFullYear(),
    created_by: usuarioId,
    created_at: serverTimestamp(),
  }, contexto))
}

export async function atualizarEvento(id, dados) {
  return updateDoc(doc(db, 'calendario', id), {
    ...dados,
    updated_at: serverTimestamp(),
  })
}

export async function removerEvento(id) {
  return updateDoc(doc(db, 'calendario', id), {
    ativo: false,
    arquivado_em: serverTimestamp(),
  })
}

export async function contarDiasLetivos(anoLetivo, contexto = {}) {
  const q = query(
    collection(db, 'calendario'),
    where('ano_letivo', '==', anoLetivo ?? ANO_ATUAL)
  )
  const snap = await getDocs(q)
  return filtrarListaPorEscopo(
    snap.docs.map(d => ({ id: d.id, ...d.data() })),
    contexto,
  ).filter(d => d.ativo !== false && ['aula', 'reposicao'].includes(d.tipo)).length
}
