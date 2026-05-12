/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase/firebase'

const AuthContext = createContext(null)
const STORAGE_KEY_PREFIX = 'gestaoescolar.unidade.'

function normalizarUnidades(perfilData = {}, fallbackId = null) {
  if (Array.isArray(perfilData.unidades) && perfilData.unidades.length > 0) {
    return perfilData.unidades
      .map((item, index) => {
        if (!item) return null
        if (typeof item === 'string') {
          return { id: item, nome: `Unidade ${index + 1}`, escola_id: perfilData.escola_id ?? '' }
        }
        const id = item.id ?? item.unidade_id ?? item.codigo ?? item.nome
        if (!id) return null
        return {
          id,
          nome: item.nome ?? item.label ?? `Unidade ${index + 1}`,
          escola_id: item.escola_id ?? perfilData.escola_id ?? '',
        }
      })
      .filter(Boolean)
  }

  if (Array.isArray(perfilData.unidades_ids) && perfilData.unidades_ids.length > 0) {
    return perfilData.unidades_ids.map((id, index) => ({
      id,
      nome: `Unidade ${index + 1}`,
      escola_id: perfilData.escola_id ?? '',
    }))
  }

  const id = perfilData.unidade_atual_id ?? perfilData.unidade_id ?? fallbackId
  if (!id) return []

  return [{
    id,
    nome: perfilData.unidade_nome ?? 'Unidade principal',
    escola_id: perfilData.escola_id ?? '',
  }]
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [unidadeAtualId, setUnidadeAtualId] = useState('')
  const [loading, setLoading] = useState(true)

  const unidadesDisponiveis = useMemo(
    () => normalizarUnidades(perfil, perfil?.unidade_atual_id ?? perfil?.unidade_id ?? null),
    [perfil],
  )

  const unidadeAtual = useMemo(() => {
    if (!unidadesDisponiveis.length) return null
    return unidadesDisponiveis.find((item) => item.id === unidadeAtualId) ?? unidadesDisponiveis[0]
  }, [unidadeAtualId, unidadesDisponiveis])
  const perfilTipo = perfil?.perfil ?? null
  const escolaId = perfil?.escola_id ?? unidadeAtual?.escola_id ?? null
  const unidadesIds = unidadesDisponiveis.map((item) => item.id)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const snap = await getDoc(doc(db, 'usuarios', firebaseUser.uid))
          if (snap.exists() && snap.data().ativo !== false) {
            const perfilData = { id: snap.id, ...snap.data() }
            const unidades = normalizarUnidades(perfilData, perfilData.unidade_atual_id ?? perfilData.unidade_id ?? null)
            const storageKey = `${STORAGE_KEY_PREFIX}${firebaseUser.uid}`
            const unidadePersistida = typeof window !== 'undefined'
              ? window.localStorage.getItem(storageKey)
              : null
            const unidadePerfil = perfilData.unidade_atual_id
            const unidadeInicial = unidades.find((item) => item.id === unidadePerfil)?.id
              ?? unidades.find((item) => item.id === unidadePersistida)?.id
              ?? unidades[0]?.id
              ?? ''

            setPerfil(perfilData)
            setUser(firebaseUser)
            setUnidadeAtualId(unidadeInicial)
            if (unidadeInicial && typeof window !== 'undefined') {
              window.localStorage.setItem(storageKey, unidadeInicial)
            }
          } else {
            await signOut(auth)
            setUser(null)
            setPerfil(null)
            setUnidadeAtualId('')
          }
        } else {
          setUser(null)
          setPerfil(null)
          setUnidadeAtualId('')
        }
      } catch (err) {
        console.error('Erro ao carregar perfil do usuário:', err)
        setUser(null)
        setPerfil(null)
        setUnidadeAtualId('')
      } finally {
        setLoading(false)
      }
    })
    return unsubscribe
  }, [])

  async function login(email, senha) {
    const cred = await signInWithEmailAndPassword(auth, email, senha)
    updateDoc(doc(db, 'usuarios', cred.user.uid), {
      ultimo_acesso: serverTimestamp(),
    }).catch(err => console.warn('Falha ao atualizar último acesso:', err))
    return cred
  }

  async function logout() {
    await signOut(auth)
  }

  async function resetSenha(email) {
    await sendPasswordResetEmail(auth, email)
  }

  async function selecionarUnidade(unidadeId) {
    const proxima = unidadesDisponiveis.find((item) => item.id === unidadeId)?.id ?? unidadesDisponiveis[0]?.id ?? ''
    setUnidadeAtualId(proxima)
    setPerfil((atual) => (atual ? { ...atual, unidade_atual_id: proxima } : atual))
    if (user?.uid && typeof window !== 'undefined') {
      window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${user.uid}`, proxima)
    }
    if (user?.uid) {
      try {
        await updateDoc(doc(db, 'usuarios', user.uid), {
          unidade_atual_id: proxima,
          updated_at: serverTimestamp(),
        })
      } catch (err) {
        console.warn('Falha ao persistir unidade atual do usuário:', err)
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        perfil,
        perfilTipo,
        escolaId,
        unidadesIds,
        loading,
        login,
        logout,
        resetSenha,
        unidadeAtual,
        unidadeAtualId,
        unidadesDisponiveis,
        selecionarUnidade,
        setUnidadeAtualId: selecionarUnidade,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
