import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase/firebase'

/**
 * Lista lançamentos financeiros com filtros opcionais.
 * Filtros aceitos: tipo, categoria, status, ano, mes, centro_custo
 */
export async function listarLancamentos(filtros = {}) {
  const ref_ = collection(db, 'financeiro_lancamentos')
  const condicoes = []

  if (filtros.tipo)         condicoes.push(where('tipo', '==', filtros.tipo))
  if (filtros.categoria)    condicoes.push(where('categoria', '==', filtros.categoria))
  if (filtros.status)       condicoes.push(where('status', '==', filtros.status))
  if (filtros.ano)          condicoes.push(where('ano', '==', Number(filtros.ano)))
  if (filtros.mes)          condicoes.push(where('mes', '==', Number(filtros.mes)))
  if (filtros.centro_custo) condicoes.push(where('centro_custo', '==', filtros.centro_custo))

  const q = query(ref_, ...condicoes, orderBy('data_lancamento', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Cria um novo lançamento financeiro com status inicial "pendente".
 * @param {Object} dados - Campos do lançamento (sem status, created_by, created_at)
 * @param {string} usuarioId - UID do usuário que está criando
 */
export async function criarLancamento(dados, usuarioId) {
  const dataLancamento = dados.data_lancamento ?? new Date().toISOString().split('T')[0]
  const [ano, mesStr] = dataLancamento.split('-')

  return addDoc(collection(db, 'financeiro_lancamentos'), {
    tipo: dados.tipo,
    categoria: dados.categoria ?? '',
    subcategoria: dados.subcategoria ?? '',
    valor: Number(dados.valor),
    data_lancamento: dataLancamento,
    descricao: dados.descricao ?? '',
    status: 'pendente',
    aprovado_por: null,
    comprovante_url: dados.comprovante_url ?? '',
    centro_custo: dados.centro_custo ?? '',
    ano: Number(ano),
    mes: Number(mesStr),
    created_by: usuarioId,
    created_at: serverTimestamp(),
  })
}

/**
 * Aprova um lançamento pendente. Apenas o Diretor pode chamar esta função.
 * @param {string} id - ID do documento em /financeiro_lancamentos
 * @param {string} diretorId - UID do diretor que está aprovando
 */
export async function aprovarLancamento(id, diretorId) {
  return updateDoc(doc(db, 'financeiro_lancamentos', id), {
    status: 'aprovado',
    aprovado_por: diretorId,
    aprovado_em: serverTimestamp(),
  })
}

/**
 * Cancela um lançamento existente.
 * @param {string} id - ID do documento em /financeiro_lancamentos
 */
export async function cancelarLancamento(id) {
  return updateDoc(doc(db, 'financeiro_lancamentos', id), {
    status: 'cancelado',
    cancelado_em: serverTimestamp(),
  })
}

/**
 * Agrega todos os lançamentos aprovados de um ano e retorna totais.
 * @param {number} ano
 * @returns {{ totalReceitas, totalDespesas, saldoDisponivel }}
 */
export async function calcularTotais(ano) {
  const q = query(
    collection(db, 'financeiro_lancamentos'),
    where('ano', '==', Number(ano)),
    where('status', '==', 'aprovado')
  )
  const snap = await getDocs(q)

  let totalReceitas = 0
  let totalDespesas = 0

  snap.docs.forEach(d => {
    const dado = d.data()
    if (dado.tipo === 'receita')  totalReceitas += Number(dado.valor)
    if (dado.tipo === 'despesa')  totalDespesas += Number(dado.valor)
  })

  return {
    totalReceitas,
    totalDespesas,
    saldoDisponivel: totalReceitas - totalDespesas,
  }
}

/**
 * Faz upload de comprovante para Firebase Storage e retorna a URL pública.
 * @param {File} file - Arquivo PDF ou imagem
 * @param {string} lancamentoId - ID do lançamento para nomear o caminho
 * @returns {Promise<string>} URL de download
 */
export async function uploadComprovante(file, lancamentoId) {
  const extensao = file.name.split('.').pop()
  const caminho = `comprovantes/${lancamentoId}/${Date.now()}.${extensao}`
  const storageRef = ref(storage, caminho)
  const snapshot = await uploadBytes(storageRef, file)
  return getDownloadURL(snapshot.ref)
}

/**
 * Busca o documento de configurações da escola.
 * @returns {{ orcamento_previsto, limite_comprovante, ...resto }}
 */
export async function buscarConfiguracoes() {
  const snap = await getDoc(doc(db, 'configuracoes', 'escola'))
  if (!snap.exists()) return { orcamento_previsto: 0, limite_comprovante: 500 }
  return { id: snap.id, ...snap.data() }
}
