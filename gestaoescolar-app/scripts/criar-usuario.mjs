import { initializeApp } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyAp-_6TNw6LE3tDTKtE8U3UIH1eCB6ScsA',
  authDomain: 'gestaoescolar-jpproject.firebaseapp.com',
  projectId: 'gestaoescolar-jpproject',
  storageBucket: 'gestaoescolar-jpproject.firebasestorage.app',
  messagingSenderId: '464707743912',
  appId: '1:464707743912:web:f3847645ef50c321fbd29d',
}

const app  = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db   = getFirestore(app)

const EMAIL = 'joaodamasit@gmail.com'
const SENHA = 'Jopa@0206'

async function main() {
  let uid

  // Tenta criar. Se já existe, tenta fazer login para pegar o UID
  try {
    console.log('Criando usuário no Firebase Auth...')
    const cred = await createUserWithEmailAndPassword(auth, EMAIL, SENHA)
    uid = cred.user.uid
    console.log('✅ Usuário criado:', uid)
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log('Usuário já existe. Fazendo login para obter UID...')
      const cred = await signInWithEmailAndPassword(auth, EMAIL, SENHA)
      uid = cred.user.uid
      console.log('✅ UID obtido:', uid)
    } else {
      throw err
    }
  }

  // Cria/atualiza documento em /usuarios
  console.log('Criando documento em /usuarios...')
  await setDoc(
    doc(db, 'usuarios', uid),
    {
      nome: 'João Damas',
      email: EMAIL,
      perfil: 'diretor',
      ativo: true,
      turmas_ids: [],
      ultimo_acesso: serverTimestamp(),
      created_at: serverTimestamp(),
      LGPD: {
        consentimento_data: serverTimestamp(),
        ip_consentimento: '127.0.0.1',
      },
    },
    { merge: true }
  )

  console.log('✅ Documento /usuarios criado com perfil: diretor')
  console.log('')
  console.log('🎉 Setup completo!')
  console.log(`   Email: ${EMAIL}`)
  console.log(`   Perfil: diretor (acesso total)`)
  console.log(`   UID: ${uid}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
