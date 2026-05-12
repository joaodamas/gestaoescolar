import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, orderBy, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase/firebase'

const ANO_ATUAL = new Date().getFullYear()

function gerarNumeroMatricula(ano) {
  const timestamp = Date.now().toString().slice(-6)
  return `${ano}${timestamp}`
}

export function montarResumoAlunoMatricula(aluno = {}) {
  return {
    aluno_nome: aluno.nome_completo?.trim?.() || aluno.aluno_nome?.trim?.() || '',
    aluno_ra: aluno.ra?.trim?.() || aluno.aluno_ra?.trim?.() || '',
  }
}

export function alunoResumoDaMatricula(matricula = {}) {
  return {
    id: matricula.aluno_id,
    matriculaId: matricula.id,
    nome_completo: matricula.aluno_nome || 'Aluno sem nome sincronizado',
    ra: matricula.aluno_ra || '',
    matricula,
  }
}

export async function criarMatricula(alunoId, turmaId, anoLetivo, criadoPor, alunoResumo = {}) {
  return addDoc(collection(db, 'matriculas'), {
    aluno_id: alunoId,
    turma_id: turmaId,
    ano_letivo: anoLetivo ?? ANO_ATUAL,
    data_matricula: new Date().toISOString().split('T')[0],
    status: 'ativa',
    numero_matricula: gerarNumeroMatricula(anoLetivo ?? ANO_ATUAL),
    observacoes: '',
    ...montarResumoAlunoMatricula(alunoResumo),
    created_by: criadoPor,
    created_at: serverTimestamp(),
  })
}

export async function listarMatriculasDoAluno(alunoId) {
  const q = query(
    collection(db, 'matriculas'),
    where('aluno_id', '==', alunoId),
    orderBy('ano_letivo', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function listarMatriculasDaTurma(turmaId, anoLetivo) {
  const q = query(
    collection(db, 'matriculas'),
    where('turma_id', '==', turmaId),
    where('ano_letivo', '==', anoLetivo ?? ANO_ATUAL),
    where('status', '==', 'ativa')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function encerrarMatricula(matriculaId) {
  return updateDoc(doc(db, 'matriculas', matriculaId), {
    status: 'encerrada',
    updated_at: serverTimestamp(),
  })
}

export async function atualizarMatricula(matriculaId, dados) {
  return updateDoc(doc(db, 'matriculas', matriculaId), {
    ...dados,
    updated_at: serverTimestamp(),
  })
}
