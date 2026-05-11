import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const snap = await getDoc(doc(db, 'usuarios', firebaseUser.uid))
        if (snap.exists() && snap.data().ativo !== false) {
          setPerfil({ id: snap.id, ...snap.data() })
          setUser(firebaseUser)
        } else {
          await signOut(auth)
          setUser(null)
          setPerfil(null)
        }
      } else {
        setUser(null)
        setPerfil(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function login(email, senha) {
    const cred = await signInWithEmailAndPassword(auth, email, senha)
    await updateDoc(doc(db, 'usuarios', cred.user.uid), {
      ultimo_acesso: serverTimestamp(),
    })
    return cred
  }

  async function logout() {
    await signOut(auth)
  }

  async function resetSenha(email) {
    await sendPasswordResetEmail(auth, email)
  }

  return (
    <AuthContext.Provider value={{ user, perfil, loading, login, logout, resetSenha }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
