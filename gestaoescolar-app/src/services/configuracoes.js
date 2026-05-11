import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/firebase'

const DEFAULTS = {
  nome_escola: 'Escola Municipal',
  cnpj: '',
  endereco: {},
  logo_url: '',
  ano_letivo_atual: new Date().getFullYear(),
  meta_presenca: 90,
  meta_aprovacao: 90,
  meta_saeb: 6.0,
  orcamento_previsto: 0,
  limite_comprovante: 500,
  saeb_historico: {},
  regras_nota: {
    prova: 0.6,
    trabalho: 0.3,
    participacao: 0.1,
  },
  missao: 'Garantir aprendizagens significativas e formar cidadãos para a vida.',
  valores: ['Respeito', 'Responsabilidade', 'Colaboração', 'Excelência', 'Equidade'],
  slogan: 'Informação que orienta. Gestão que transforma.',
}

export async function buscarConfiguracoes() {
  const snap = await getDoc(doc(db, 'configuracoes', 'escola'))
  return snap.exists() ? { ...DEFAULTS, ...snap.data() } : DEFAULTS
}

export async function salvarConfiguracoes(dados, usuarioId) {
  return setDoc(doc(db, 'configuracoes', 'escola'), {
    ...dados,
    edited_by: usuarioId,
    updated_at: serverTimestamp(),
  }, { merge: true })
}
