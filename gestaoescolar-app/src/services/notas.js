import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase/firebase'
import { comEscopoEscolar, filtrarListaPorEscopo } from './escopo'

const ANO_ATUAL = new Date().getFullYear()

// ─── Avaliações ──────────────────────────────────────────────────────────────

export async function listarAvaliacoes(turmaId, disciplinaId, bimestre, anoLetivo, contexto = {}) {
  const q = query(
    collection(db, 'avaliacoes'),
    where('turma_id', '==', turmaId),
    where('disciplina_id', '==', disciplinaId),
    where('bimestre', '==', bimestre),
    where('ano_letivo', '==', anoLetivo ?? ANO_ATUAL),
    orderBy('data_aplicacao', 'asc')
  )
  const snap = await getDocs(q)
  return filtrarListaPorEscopo(snap.docs.map(d => ({ id: d.id, ...d.data() })), contexto)
}

export async function criarAvaliacao(dados, contexto = {}) {
  return addDoc(collection(db, 'avaliacoes'), comEscopoEscolar({
    ...dados,
    ano_letivo: dados.ano_letivo ?? ANO_ATUAL,
    created_at: serverTimestamp(),
  }, contexto))
}

// ─── Notas ───────────────────────────────────────────────────────────────────

export async function listarNotas(avaliacaoId, contexto = {}) {
  const q = query(
    collection(db, 'notas'),
    where('avaliacao_id', '==', avaliacaoId)
  )
  const snap = await getDocs(q)
  return filtrarListaPorEscopo(snap.docs.map(d => ({ id: d.id, ...d.data() })), contexto)
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
  lancadoPor,
  extras = {},
  contexto = {}
) {
  const docId = `${alunoId}_${avaliacaoId}`
  const ref = doc(db, 'notas', docId)
  const existente = await getDoc(ref)
  const anterior = existente.exists() ? existente.data() : null
  const camposHistorico = [
    'nota',
    'media_bimestral',
    'nota_recuperacao',
    'media_final',
    'aprovado_conselho',
    'situacao',
  ]
  const valorNovo = { nota, ...extras }
  const mudou = !anterior || camposHistorico.some(campo => {
    const antes = anterior[campo] ?? null
    const depois = valorNovo[campo] ?? null
    return antes !== depois
  })
  const historico = mudou
    ? [
        ...(anterior?.historico_alteracoes ?? []),
        {
          acao: anterior ? 'atualizar_nota' : 'criar_nota',
          usuario_id: lancadoPor,
          timestamp: new Date().toISOString(),
          valor_anterior: anterior
            ? Object.fromEntries(camposHistorico.map(campo => [campo, anterior[campo] ?? null]))
            : null,
          valor_novo: Object.fromEntries(camposHistorico.map(campo => [campo, valorNovo[campo] ?? null])),
        },
      ]
    : (anterior?.historico_alteracoes ?? [])

  return setDoc(
    ref,
    {
      ...comEscopoEscolar({}, contexto),
      aluno_id: alunoId,
      avaliacao_id: avaliacaoId,
      disciplina_id: disciplinaId,
      turma_id: turmaId,
      bimestre,
      ano_letivo: anoLetivo ?? ANO_ATUAL,
      nota,
      lancado_por: lancadoPor,
      fechado: anterior?.fechado ?? false,
      ...extras,
      historico_alteracoes: historico,
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

export async function fecharBimestre(turmaId, disciplinaId, bimestre, anoLetivo, usuarioId, contexto = {}) {
  const q = query(
    collection(db, 'notas'),
    where('turma_id', '==', turmaId),
    where('disciplina_id', '==', disciplinaId),
    where('bimestre', '==', bimestre),
    where('ano_letivo', '==', anoLetivo ?? ANO_ATUAL)
  )

  const snap = await getDocs(q)
  const docsNoEscopo = filtrarListaPorEscopo(snap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() })), contexto)
  if (docsNoEscopo.length === 0) return

  const batch = writeBatch(db)
  const entrada = {
    acao: 'fechar_bimestre',
    usuario_id: usuarioId,
    timestamp: new Date().toISOString(),
  }

  docsNoEscopo.forEach(d => {
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

export async function listarDisciplinasDaTurma(turmaId, anoLetivo, contexto = {}) {
  const q = query(
    collection(db, 'disciplinas'),
    where('ano_letivo', '==', anoLetivo ?? ANO_ATUAL)
  )
  const snap = await getDocs(q)
  return filtrarListaPorEscopo(snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(d => d.turma_id === turmaId)
    .filter(d => d.ativa !== false)
    .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR')), contexto)
}
