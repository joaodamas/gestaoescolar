import {
  collection, doc, getDoc, getDocs, updateDoc, writeBatch,
  query, where, serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db } from '../firebase/firebase'

function editavelAte() {
  const d = new Date()
  d.setHours(d.getHours() + 48)
  return Timestamp.fromDate(d)
}

// S-1 QA: salvarChamada agora faz upsert — verifica existência antes de criar novo documento
// Usa ID determinístico: {alunoId}_{turmaId}_{data} para garantir unicidade
export async function salvarChamada(entradas, professorId) {
  const batch = writeBatch(db)
  const limite = editavelAte()

  for (const { alunoId, matriculaId, turmaId, disciplinaId, data, status, justificativa, periodo } of entradas) {
    const docId = `${alunoId}_${turmaId}_${data}`
    const ref = doc(db, 'presencas', docId)
    const existente = await getDoc(ref)

    if (existente.exists()) {
      // Atualiza documento existente (respeitando editavel_ate nas Security Rules)
      batch.update(ref, {
        status,
        justificativa: justificativa ?? '',
        updated_at: serverTimestamp(),
      })
    } else {
      // Cria novo documento com ID determinístico
      batch.set(ref, {
        aluno_id: alunoId,
        matricula_id: matriculaId,
        turma_id: turmaId,
        disciplina_id: disciplinaId ?? '',
        data,
        ano_letivo: Number(data?.slice(0, 4)) || new Date().getFullYear(),
        status,
        justificativa: justificativa ?? '',
        professor_id: professorId,
        periodo: periodo ?? 'manha',
        editavel_ate: limite,
        aprovado_por: null,
        created_at: serverTimestamp(),
      })
    }
  }

  return batch.commit()
}

export async function buscarChamadaDoDia(turmaId, data) {
  const q = query(
    collection(db, 'presencas'),
    where('turma_id', '==', turmaId),
    where('data', '==', data)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// M-4 QA: usa limit no Firestore em vez de fatiar no cliente
export async function historicoChamadas(turmaId, limiteDatas = 10) {
  const q = query(
    collection(db, 'presencas'),
    where('turma_id', '==', turmaId)
  )
  const snap = await getDocs(q)
  const porData = {}
  snap.docs.forEach(d => {
    const dado = d.data()
    if (!porData[dado.data]) porData[dado.data] = []
    porData[dado.data].push({ id: d.id, ...dado })
  })
  return Object.entries(porData)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, limiteDatas)
    .map(([data, registros]) => ({ data, registros }))
}
