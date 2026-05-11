import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  observarUsuarios, atualizarUsuario, alternarStatusUsuario,
  vincularTurmas, criarUsuarioDoc
} from '../../services/usuarios'
import { listarTodasTurmas } from '../../services/turmas'
import {
  Users, UserPlus, Search, Edit3, Power, ShieldCheck,
  Shield, AlertCircle, CheckCircle2, GraduationCap, Mail,
  Crown, Briefcase, ClipboardList
} from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { Card, Badge, EmptyState, Spinner } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'

const PERFIS = [
  { id: 'diretor',     label: 'Diretor(a)',     cor: 'purple',  icon: Crown },
  { id: 'coordenador', label: 'Coordenador(a)', cor: 'blue',    icon: ShieldCheck },
  { id: 'professor',   label: 'Professor(a)',   cor: 'green',   icon: GraduationCap },
  { id: 'admin',       label: 'Administrativo', cor: 'orange',  icon: Briefcase },
  { id: 'secretaria',  label: 'Secretaria',     cor: 'slate',   icon: ClipboardList },
]

const PERFIL_MAP = Object.fromEntries(PERFIS.map(p => [p.id, p]))

export default function UsuariosPage() {
  const { perfil: meuPerfil } = useAuth()
  const podeGerenciar = ['diretor', 'admin'].includes(meuPerfil?.perfil)

  const [usuarios, setUsuarios] = useState([])
  const [turmas, setTurmas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroPerfil, setFiltroPerfil] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [erroQuery, setErroQuery] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [form, setForm] = useState(formInicial())

  function formInicial() {
    return { nome: '', email: '', perfil: 'professor', uid: '', turmas_ids: [], ativo: true }
  }

  useEffect(() => {
    const unsub = observarUsuarios(
      lista => {
        setUsuarios(lista)
        setCarregando(false)
      },
      err => {
        setErroQuery(err.message ?? 'Erro ao carregar usuários. Verifique permissões/índices.')
        setCarregando(false)
      }
    )
    return unsub
  }, [])

  useEffect(() => {
    listarTodasTurmas().then(setTurmas).catch(() => setTurmas([]))
  }, [])

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter(u => {
      const bate = u.nome?.toLowerCase().includes(busca.toLowerCase())
                || u.email?.toLowerCase().includes(busca.toLowerCase())
      const perfilBate = !filtroPerfil || u.perfil === filtroPerfil
      const statusBate = filtroStatus === 'todos'
        ? true : filtroStatus === 'ativos' ? u.ativo : !u.ativo
      return bate && perfilBate && statusBate
    })
  }, [usuarios, busca, filtroPerfil, filtroStatus])

  const contagemPorPerfil = useMemo(() => {
    const c = {}
    PERFIS.forEach(p => { c[p.id] = usuarios.filter(u => u.perfil === p.id && u.ativo).length })
    return c
  }, [usuarios])

  function abrirModalEditar(u) {
    setEditando(u.id)
    setForm({
      nome: u.nome ?? '',
      email: u.email ?? '',
      perfil: u.perfil ?? 'professor',
      uid: u.id,
      turmas_ids: u.turmas_ids ?? [],
      ativo: u.ativo ?? true,
    })
    setErro('')
    setModalAberto(true)
  }

  function abrirModalNovo() {
    setEditando(null)
    setForm(formInicial())
    setErro('')
    setModalAberto(true)
  }

  function toggleTurma(turmaId) {
    setForm(f => ({
      ...f,
      turmas_ids: f.turmas_ids.includes(turmaId)
        ? f.turmas_ids.filter(t => t !== turmaId)
        : [...f.turmas_ids, turmaId]
    }))
  }

  async function handleSalvar(e) {
    e.preventDefault()
    setErro('')
    if (!form.nome.trim()) { setErro('Nome é obrigatório.'); return }
    if (!form.email.trim()) { setErro('E-mail é obrigatório.'); return }
    setSalvando(true)
    try {
      if (editando) {
        await atualizarUsuario(editando, {
          nome: form.nome.trim(),
          perfil: form.perfil,
          turmas_ids: form.perfil === 'professor' ? form.turmas_ids : [],
        })
        setSucesso('Usuário atualizado com sucesso.')
      } else {
        if (!form.uid.trim()) {
          setErro('UID do Firebase Auth é obrigatório. Crie o usuário no Console primeiro.')
          setSalvando(false)
          return
        }
        await criarUsuarioDoc(form.uid.trim(), {
          nome: form.nome.trim(),
          email: form.email.trim().toLowerCase(),
          perfil: form.perfil,
          ativo: form.ativo,
          turmas_ids: form.perfil === 'professor' ? form.turmas_ids : [],
        })
        setSucesso('Documento de usuário criado. Use o UID do Firebase Auth.')
      }
      setModalAberto(false)
      setTimeout(() => setSucesso(''), 3500)
    } catch (err) {
      setErro('Erro ao salvar. Verifique permissões.')
      console.error(err)
    } finally {
      setSalvando(false)
    }
  }

  async function handleToggleAtivo(u) {
    if (!confirm(`${u.ativo ? 'Desativar' : 'Reativar'} usuário "${u.nome}"?`)) return
    await alternarStatusUsuario(u.id, !u.ativo)
  }

  if (carregando) return <div className="flex justify-center py-32"><Spinner size="lg" /></div>

  return (
    <div>
      <PageHeader
        titulo="Gestão de Usuários"
        descricao={`${usuarios.filter(u => u.ativo).length} ativos · ${usuarios.length} total`}
        icon={Shield}
        acoes={
          podeGerenciar && (
            <Button variante="accent" icon={UserPlus} onClick={abrirModalNovo}>
              Novo Usuário
            </Button>
          )
        }
      />

      {erroQuery && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{erroQuery}</span>
        </div>
      )}

      {/* Cards por perfil */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {PERFIS.map(p => {
          const cores = {
            purple:  { bg: 'bg-purple-50',  text: 'text-purple-700', icon: 'bg-purple-100' },
            blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',   icon: 'bg-blue-100' },
            green:   { bg: 'bg-emerald-50', text: 'text-emerald-700',icon: 'bg-emerald-100' },
            orange:  { bg: 'bg-orange-50',  text: 'text-orange-700', icon: 'bg-orange-100' },
            slate:   { bg: 'bg-slate-50',   text: 'text-slate-700',  icon: 'bg-slate-100' },
          }
          const c = cores[p.cor]
          const Icon = p.icon
          return (
            <button
              key={p.id}
              onClick={() => setFiltroPerfil(filtroPerfil === p.id ? '' : p.id)}
              className={`${c.bg} rounded-2xl p-4 border ${filtroPerfil === p.id ? 'ring-2 ring-blue-500 border-transparent' : 'border-transparent'} hover:scale-[1.02] transition-all text-left`}
            >
              <div className={`w-9 h-9 ${c.icon} rounded-xl flex items-center justify-center mb-3`}>
                <Icon size={16} className={c.text} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{contagemPorPerfil[p.id]}</p>
              <p className={`text-xs font-medium ${c.text} mt-0.5`}>{p.label}</p>
            </button>
          )
        })}
      </div>

      {sucesso && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-xl flex items-center gap-2 animate-in slide-up duration-200">
          <CheckCircle2 size={16} /> {sucesso}
        </div>
      )}

      {/* Filtros */}
      <Card className="mb-4">
        <div className="p-4 flex flex-wrap gap-3 items-end">
          <Input
            icon={Search}
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="flex-1 min-w-56"
          />
          <Select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="min-w-44">
            <option value="todos">Todos os status</option>
            <option value="ativos">Apenas ativos</option>
            <option value="inativos">Apenas inativos</option>
          </Select>
        </div>
      </Card>

      {/* Tabela */}
      <Card>
        {usuariosFiltrados.length === 0 ? (
          <EmptyState
            icon={Users}
            titulo="Nenhum usuário encontrado"
            descricao={busca || filtroPerfil ? 'Ajuste os filtros para ver mais resultados.' : 'Nenhum usuário cadastrado ainda.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-5 py-3">Usuário</th>
                  <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Perfil</th>
                  <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Turmas</th>
                  <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuariosFiltrados.map(u => {
                  const p = PERFIL_MAP[u.perfil]
                  const PerfilIcon = p?.icon ?? Users
                  const iniciais = u.nome?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() ?? '?'
                  return (
                    <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${!u.ativo ? 'opacity-60' : ''}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {iniciais}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{u.nome ?? '—'}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                              <Mail size={11} /> {u.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                          <PerfilIcon size={13} />
                          {p?.label ?? u.perfil}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {u.perfil === 'professor' ? (
                          <Badge variante={u.turmas_ids?.length ? 'blue' : 'slate'}>
                            {u.turmas_ids?.length ?? 0} {u.turmas_ids?.length === 1 ? 'turma' : 'turmas'}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variante={u.ativo ? 'green' : 'slate'}>
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end gap-1">
                          {podeGerenciar && (
                            <>
                              <button onClick={() => abrirModalEditar(u)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                <Edit3 size={14} />
                              </button>
                              <button onClick={() => handleToggleAtivo(u)} className={`p-2 rounded-lg transition-colors ${u.ativo ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`} title={u.ativo ? 'Desativar' : 'Reativar'}>
                                <Power size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de edição/criação */}
      <Modal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        titulo={editando ? 'Editar Usuário' : 'Novo Usuário'}
        descricao={editando ? 'Atualize as informações ou vincule turmas.' : 'Crie o usuário no Firebase Auth Console primeiro e cole o UID aqui.'}
        tamanho="xl"
        footer={
          <>
            <Button variante="ghost" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button variante="accent" loading={salvando} onClick={handleSalvar}>
              {editando ? 'Salvar Alterações' : 'Criar Documento'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSalvar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nome Completo *" required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="João Silva" />
          <Input label="E-mail *" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@escola.com" disabled={!!editando} />

          {!editando && (
            <div className="md:col-span-2">
              <Input
                label="UID do Firebase Auth *"
                value={form.uid}
                onChange={e => setForm(f => ({ ...f, uid: e.target.value }))}
                placeholder="r9MZzSocU2UpPWBmVjSyOfZEtLJ2..."
                hint="Crie o usuário em Console Firebase → Authentication e cole o UID gerado."
              />
            </div>
          )}

          <Select label="Perfil *" value={form.perfil} onChange={e => setForm(f => ({ ...f, perfil: e.target.value }))}>
            {PERFIS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </Select>

          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
                className="w-4 h-4 accent-blue-600 rounded"
              />
              Usuário ativo (pode fazer login)
            </label>
          </div>

          {form.perfil === 'professor' && (
            <div className="md:col-span-2">
              <p className="text-xs font-semibold text-slate-700 mb-2 tracking-wide uppercase">
                Turmas Vinculadas ({form.turmas_ids.length})
              </p>
              <p className="text-xs text-slate-500 mb-3">
                O professor só verá alunos e poderá lançar chamada/notas para as turmas selecionadas.
              </p>
              {turmas.length === 0 ? (
                <div className="bg-slate-50 rounded-lg p-4 text-center text-xs text-slate-500">
                  Nenhuma turma cadastrada. Crie turmas primeiro em "Turmas".
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1">
                  {turmas.map(t => {
                    const sel = form.turmas_ids.includes(t.id)
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => toggleTurma(t.id)}
                        className={`text-left p-3 rounded-lg border transition-all ${
                          sel
                            ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{t.nome}</p>
                            <p className="text-[11px] text-slate-500 truncate">{t.serie} · {t.turno}</p>
                          </div>
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${sel ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                            {sel && <CheckCircle2 size={12} className="text-white" />}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {erro && (
            <div className="md:col-span-2 flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2.5 rounded-lg">
              <AlertCircle size={15} className="shrink-0" />
              <span>{erro}</span>
            </div>
          )}
        </form>
      </Modal>
    </div>
  )
}
