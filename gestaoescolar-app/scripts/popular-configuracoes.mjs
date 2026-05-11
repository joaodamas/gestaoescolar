import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyAp-_6TNw6LE3tDTKtE8U3UIH1eCB6ScsA',
  authDomain: 'gestaoescolar-jpproject.firebaseapp.com',
  projectId: 'gestaoescolar-jpproject',
  storageBucket: 'gestaoescolar-jpproject.firebasestorage.app',
  messagingSenderId: '464707743912',
  appId: '1:464707743912:web:f3847645ef50c321fbd29d',
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

async function main() {
  console.log('Fazendo login como diretor...')
  await signInWithEmailAndPassword(auth, 'joaodamasit@gmail.com', 'Jopa@0206')

  console.log('Populando /configuracoes/escola...')
  await setDoc(doc(db, 'configuracoes', 'escola'), {
    nome_escola: 'Escola Municipal Modelo',
    cnpj: '00.000.000/0001-00',
    slogan: 'Informação que orienta. Gestão que transforma.',
    missao: 'Garantir aprendizagens significativas e formar cidadãos para a vida.',
    valores: ['Respeito', 'Responsabilidade', 'Colaboração', 'Excelência', 'Equidade'],
    ano_letivo_atual: new Date().getFullYear(),
    meta_presenca: 90,
    meta_aprovacao: 90,
    meta_saeb: 6.0,
    orcamento_previsto: 1200000,
    limite_comprovante: 500,
    saeb_historico: {
      '2021': 5.4,
      '2022': 5.8,
      '2023': 6.1,
      '2024': 6.3,
    },
    regras_nota: { prova: 0.6, trabalho: 0.3, participacao: 0.1 },
    updated_at: serverTimestamp(),
  }, { merge: true })

  console.log('Populando /indicadores/{ano} com dados de demo...')
  const ano = String(new Date().getFullYear())
  await setDoc(doc(db, 'indicadores', ano), {
    ano: Number(ano),
    total_alunos: 782,
    total_colaboradores: 68,
    presenca_media: 92.1,
    ausencia_media: 6.2,
    justificados_media: 1.7,
    presentes_count: 720,
    ausentes_count: 49,
    justificados_count: 13,
    total_registros_presenca: 782,
    taxa_aprovacao: 93.4,
    media_saeb: 6.3,
    saeb_historico: { '2021': 5.4, '2022': 5.8, '2023': 6.1, '2024': 6.3 },
    orcamento_previsto: 1200000,
    orcamento_executado: 824400,
    saldo_disponivel: 375600,
    total_ocorrencias: { disciplinar: 5, medico: 2, encaminhamento: 3, reuniao: 1, acidente: 0 },
    total_projetos: { planejado: 1, em_andamento: 4, concluido: 0, cancelado: 0 },
    updated_at: serverTimestamp(),
  }, { merge: true })

  console.log('✅ Configurações e indicadores populados com dados de demonstração.')
  process.exit(0)
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
