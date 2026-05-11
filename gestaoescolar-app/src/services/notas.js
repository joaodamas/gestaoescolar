import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase/firebase'

const ANO_ATUAL = new Date().getFullYear()

// ─── Avaliações ──────────────────────────────────────────────────────────────

export async function listarAvaliacoes(turmaId, disciplinaId, bimestre, anoLetivo) {
  const q = query(
    collection(db, 'avaliacoes'),
    where('turma_id', '==', turmaId),
    where('disciplina_id', '==', disciplinaId),
    where('bimestre', '==', bimestre),
    where('ano_letivo', '==', anoLetivo ?? ANO_ATUAL),
    orderBy('data_aplicacao', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function criarAvaliacao(dados) {
  return addDoc(collection(db, 'avaliacoes'), {
    ...dados,
    ano_letivo: dados.ano_letivo ?? ANO_ATUAL,
    created_at: serverTimestamp(),
  })
}

// ─── Notas ───────────────────────────────────────────────────────────────────

export async function listarNotas(avaliacaoId) {
  const q = query(
    collection(db, 'notas'),
    where('avaliacao_id', '==', avaliacaoId)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Persiste uma nota com merge para não sobrescrever campos não enviados.
 * O id do documento é derivado de forma determinística para facilitar upsert.
 */
export async function salvarNota(
  alunoId,
  avaliacaoId,
  disciplinaId,
  turmaId,
  bimestre,
  anoLetivo,
  nota,
  lancadoPor
) {
  const docId = `${alunoId}_${avaliacaoId}`
  const ref = doc(db, 'notas', docId)
  return setDoc(
    ref,
    {
      aluno_id: alunoId,
      avaliacao_id: avaliacaoId,
      disciplina_id: disciplinaId,
      turma_id: turmaId,
      bimestre,
      ano_letivo: anoLetivo ?? ANO_ATUAL,
      nota,
      lancado_por: lancadoPor,
      fechado: false,
      updated_at: serverTimestamp(),
    },
    { merge: true }
  )
}

// ─── Cálculo de média ────────────────────────────────────────────────────────

/**
 * Calcula a média bimestral ponderada.
 * @param {Array<{avaliacao_id: string, nota: number}>} notas
 * @param {Array<{id: string, peso: number}>} avaliacoes
 * @returns {number|null} média ou null se não houver dados suficientes
 */
export function calcularMediaBimestral(notas, avaliacoes) {
  if (!notas?.length || !avaliacoes?.length) return null

  const avaliacaoMap = Object.fromEntries(avaliacoes.map(a => [a.id, a]))

  let somaPonderada = 0
  let somaPesos = 0

  notas.forEach(n => {
    const avaliacao = avaliacaoMap[n.avaliacao_id]
    if (avaliacao && n.nota !== null && n.nota !== undefined && n.nota !== '') {
      const peso = Number(avaliacao.peso) || 0
      somaPonderada += Number(n.nota) * peso
      somaPesos += peso
    }
  })

  if (somaPesos === 0) return null
  return somaPonderada / somaPesos
}

// ─── Fechar bimestre ─────────────────────────────────────────────────────────

export async function fecharBimestre(turmaId, disciplinaId, bimestre, anoLetivo, usuarioId) {
  const q = query(
    collection(db, 'notas'),
    where('turma_id', '==', turmaId),
    where('disciplina_id', '==', disciplinaId),
    where('bimestre', '==', bimestre),
    where('ano_letivo', '==', anoLetivo ?? ANO_ATUAL)
  )

  const snap = await getDocs(q)
  if (snap.empty) return

  const batch = writeBatch(db)
  const entrada = {
    acao: 'fechar_bimestre',
    usuario_id: usuarioId,
    timestamp: new Date().toISOString(),
  }

  snap.docs.forEach(d => {
    batch.update(d.ref, {
      fechado: true,
      fechado_em: serverTimestamp(),
      fechado_por: usuarioId,
      historico_alteracoes: [...(d.data().historico_alteracoes ?? []), entrada],
    })
  })

  return batch.commit()
}

// ─── Disciplinas da turma ────────────────────────────────────────────────────

export async function listarDisciplinasDaTurma(turmaId, anoLetivo) {
  const q = query(
    collection(db, 'disciplinas'),
    where('turma_id', '==', turmaId),
    where('ano_letivo', '==', anoLetivo ?? ANO_ATUAL),
    orderBy('nome', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
