import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, GraduationCap, ArrowRight, ArrowLeft, Mail, Lock, CheckCircle2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const { login, resetSenha } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [modoReset, setModoReset] = useState(false)
  const [resetEnviado, setResetEnviado] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await login(email, senha)
      navigate('/dashboard')
    } catch {
      setErro('Credenciais inválidas. Verifique e tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await resetSenha(email)
      setResetEnviado(true)
    } catch {
      setErro('Não foi possível enviar o e-mail.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950">
        {/* Decorative gradients */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

        <div className="relative flex flex-col justify-between p-12 z-10 text-white w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <GraduationCap size={22} strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-semibold">Gestão Escolar</p>
              <p className="text-xs text-slate-400">À Vista · v2.0</p>
            </div>
          </div>

          {/* Quote */}
          <div className="max-w-md">
            <p className="text-3xl font-bold tracking-tight leading-tight mb-3">
              Gestão escolar simplificada,<br/>
              <span className="text-blue-400">decisões com clareza.</span>
            </p>
            <p className="text-slate-400 leading-relaxed">
              Modelagem histórica, conformidade LGPD, controle granular de acessos e relatórios pedagógicos detalhados.
            </p>
            <div className="flex items-center gap-6 mt-8">
              {['LGPD', 'Auditoria', 'Histórico', 'Multi-perfil'].map(item => (
                <div key={item} className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} Gestão Escolar À Vista. Todos os direitos reservados.</p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-10">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <GraduationCap size={22} className="text-white" strokeWidth={2.5} />
            </div>
            <p className="font-semibold text-slate-900">Gestão Escolar</p>
          </div>

          {!modoReset ? (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Bem-vindo de volta</h1>
                <p className="text-sm text-slate-500 mt-2">Entre com suas credenciais para acessar o sistema.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide uppercase">E-mail</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com.br"
                      required
                      className="w-full h-11 pl-9 pr-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Senha</label>
                    <button type="button" onClick={() => { setModoReset(true); setErro('') }} className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full h-11 pl-9 pr-10 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {mostrarSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {erro && (
                  <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2.5 rounded-lg animate-in slide-up duration-200">
                    <AlertCircle size={15} className="shrink-0" />
                    <span className="flex-1">{erro}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={carregando}
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm group"
                >
                  {carregando ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Entrar
                      <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-xs text-slate-500 mt-8">
                Acesso restrito a usuários autorizados pela administração escolar.
              </p>
            </>
          ) : (
            <>
              <button
                onClick={() => { setModoReset(false); setResetEnviado(false); setErro('') }}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors mb-6"
              >
                <ArrowLeft size={13} /> Voltar para o login
              </button>

              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Redefinir senha</h1>
                <p className="text-sm text-slate-500 mt-2">Informe seu e-mail e enviaremos um link de redefinição.</p>
              </div>

              {resetEnviado ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 size={22} className="text-emerald-600" />
                  </div>
                  <p className="text-emerald-900 font-semibold text-sm">E-mail enviado!</p>
                  <p className="text-emerald-700 text-xs mt-1.5">Verifique sua caixa de entrada e siga as instruções.</p>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide uppercase">E-mail</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com.br"
                        required
                        className="w-full h-11 pl-9 pr-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {erro && (
                    <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2.5 rounded-lg">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>{erro}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={carregando}
                    className="w-full h-11 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition-all flex items-center justify-center"
                  >
                    {carregando ? 'Enviando...' : 'Enviar link de redefinição'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
