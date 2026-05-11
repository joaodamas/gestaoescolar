import { useEffect, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useAuth } from '../../context/AuthContext'
import {
  observarTurmas, criarTurma, atualizarTurma, arquivarTurma, contarAlunosDaTurma
} from '../../services/turmas'
import {
  Users, Plus, Sun, Moon, Sunrise, Edit3, Archive,
  GraduationCap, ClipboardList, AlertCircle, Search
} from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { Card, Badge, EmptyState, Spinner } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'

const ANO_LETIVO = new Date().getFullYear()

const TURNO_CONFIG = {
  manha:    { label: 'Manhã',    icon: Sunrise, cor: 'bg-amber-50 text-amber-700 ring-amber-200' },
  tarde:    { label: 'Tarde',    icon: Sun,     cor: 'bg-orange-50 text-orange-700 ring-orange-200' },
  integral: { label: 'Integral', icon: Moon,    cor: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
}

export default function TurmasPage() {
  const { user, perfil } = useAuth()
  const [turmas, setTurmas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroTurno, setFiltroTurno] = useState('')
  const [professores, setProfessores] = useState([])

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState(formInicial())

  const [alunosCount, setAlunosCount] = useState({})
  const [erroQuery, setErroQuery] = useState(null)

  const podeGerenciar = ['diretor', 'coordenador'].includes(perfil?.perfil)

  function formInicial() {
    return {
      nome: '', serie: '', turno: 'manha', sala: '', capacidade_max: 35,
      professor_id: '', professores_ids: [], ano_letivo: ANO_LETIVO,
    }
  }

  useEffect(() => {
    setCarregando(true)
    setErroQuery(null)
    const unsub = observarTurmas(
      ANO_LETIVO,
      async (lista) => {
        setTurmas(lista)
        setCarregando(false)

        // Conta alunos por turma
        const counts = {}
        await Promise.all(lista.map(async t => {
          try {
            counts[t.id] = await contarAlunosDaTurma(t.id, ANO_LETIVO)
          } catch (e) {
            counts[t.id] = 0
          }
        }))
        setAlunosCount(counts)
      },
      (err) => {
        setErroQuery(err.message ?? 'Falha ao carregar turmas. Verifique permissões/índices.')
        setCarregando(false)
      }
    )
    return unsub
  }, [])

  useEffect(() => {
    // Lista professores ativos
    async function loadProfs() {
      const q = query(collection(db, 'usuarios'), where('perfil', '==', 'professor'), where('ativo', '==', true))
      const snap = await getDocs(q)
      setProfessores(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }
    loadProfs().catch(console.error)
  }, [])

  function abrirModalNova() {
    setEditando(null)
    setForm(formInicial())
    setErro('')
    setModalAberto(true)
  }

  function abrirModalEditar(turma) {
    const professoresIds = turma.professores_ids?.length
      ? turma.professores_ids
      : (turma.professor_id ? [turma.professor_id] : [])
    setEditando(turma.id)
    setForm({
      nome: turma.nome ?? '',
      serie: turma.serie ?? '',
      turno: turma.turno ?? 'manha',
      sala: turma.sala ?? '',
      capacidade_max: turma.capacidade_max ?? 35,
      professor_id: turma.professor_id ?? professoresIds[0] ?? '',
      professores_ids: professoresIds,
      ano_letivo: turma.ano_letivo ?? ANO_LETIVO,
    })
    setErro('')
    setModalAberto(true)
  }

  async function handleSalvar(e) {
    e.preventDefault()
    if (!form.nome.trim()) { setErro('Nome da turma é obrigatório.'); return }
    if (!form.serie.trim()) { setErro('Série/Ano é obrigatório.'); return }
    setSalvando(true)
    setErro('')
    try {
      const dados = {
        nome: form.nome.trim(),
        serie: form.serie.trim(),
        turno: form.turno,
        sala: form.sala.trim(),
        capacidade_max: Number(form.capacidade_max),
        ano_letivo: Number(form.ano_letivo),
        professor_id: form.professores_ids[0] ?? null,
        professores_ids: form.professores_ids,
      }
      if (editando) {
        await atualizarTurma(editando, dados)
      } else {
        await criarTurma(dados, user.uid)
      }
      setModalAberto(false)
    } catch (err) {
      setErro('Erro ao salvar. Tente novamente.')
      console.error(err)
    } finally {
      setSalvando(false)
    }
  }

  async function handleArquivar(turma) {
    if (!confirm(`Arquivar turma "${turma.nome}"?\n\nA turma não será deletada — apenas marcada como inativa (soft delete).`)) return
    await arquivarTurma(turma.id)
  }

  function alternarProfessor(professorId) {
    setForm(f => {
      const selecionados = f.professores_ids.includes(professorId)
        ? f.professores_ids.filter(id => id !== professorId)
        : [...f.professores_ids, professorId]
      return {
        ...f,
        professores_ids: selecionados,
        professor_id: selecionados[0] ?? '',
      }
    })
  }

  const turmasFiltradas = turmas.filter(t => {
    const nomeBate = t.nome?.toLowerCase().includes(busca.toLowerCase()) || t.serie?.toLowerCase().includes(busca.toLowerCase())
    const turnoBate = !filtroTurno || t.turno === filtroTurno
    return nomeBate && turnoBate
  })

  const turmasAtivas = turmas.filter(t => t.ativa).length
  const totalAlunos = Object.values(alunosCount).reduce((acc, n) => acc + n, 0)

  return (
    <div>
      <PageHeader
        titulo="Turmas e Salas de Aula"
        descricao={`${turmasAtivas} turmas ativas · ${totalAlunos} alunos matriculados · Ano letivo ${ANO_LETIVO}`}
        icon={GraduationCap}
        acoes={
          podeGerenciar ? (
            <Button variante="accent" icon={Plus} onClick={abrirModalNova}>
              Nova Turma
            </Button>
          ) : null
        }
      />

      {/* Banner de erro */}
      {erroQuery && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Erro ao carregar turmas</p>
            <p className="text-xs text-rose-700 mt-0.5 break-words">{erroQuery}</p>
            <p className="text-[11px] text-rose-600 mt-1">Provavelmente é índice do Firestore — abra o console e clique no link da mensagem para criar.</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <Card className="mb-4">
        <div className="p-4 flex flex-wrap gap-3 items-end">
          <Input
            icon={Search}
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou série..."
            className="flex-1 min-w-56"
          />
          <Select value={filtroTurno} onChange={e => setFiltroTurno(e.target.value)} className="min-w-44">
            <option value="">Todos os turnos</option>
            <option value="manha">Manhã</option>
            <option value="tarde">Tarde</option>
            <option value="integral">Integral</option>
          </Select>
        </div>
      </Card>

      {/* Lista de turmas em grid */}
      {carregando ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : turmasFiltradas.length === 0 ? (
        <Card>
          <EmptyState
            icon={GraduationCap}
            titulo={turmas.length === 0 ? 'Nenhuma turma cadastrada' : 'Nenhuma turma encontrada'}
            descricao={turmas.length === 0 ? 'Comece criando a primeira turma do ano letivo.' : 'Tente ajustar os filtros.'}
            acao={turmas.length === 0 && podeGerenciar
              ? <Button variante="accent" icon={Plus} onClick={abrirModalNova}>Criar Turma</Button>
              : null}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {turmasFiltradas.map(turma => {
            const turno = TURNO_CONFIG[turma.turno] ?? TURNO_CONFIG.manha
            const TurnoIcon = turno.icon
            const ocupacao = (alunosCount[turma.id] ?? 0) / (turma.capacidade_max ?? 1) * 100
            const professoresIds = turma.professores_ids?.length
              ? turma.professores_ids
              : (turma.professor_id ? [turma.professor_id] : [])
            const professoresTurma = professoresIds.map(id => professores.find(p => p.id === id)).filter(Boolean)
            const inativa = !turma.ativa

            return (
              <Card key={turma.id} hover className={inativa ? 'opacity-60' : ''}>
                {/* Header colorido */}
                <div className={`relative overflow-hidden h-24 bg-gradient-to-br ${
                  turma.turno === 'manha' ? 'from-amber-400 to-orange-400'
                  : turma.turno === 'tarde' ? 'from-orange-400 to-rose-400'
                  : 'from-indigo-500 to-purple-500'
                } rounded-t-2xl`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4" />
                  <div className="relative p-4 flex items-center justify-between">
                    <div>
                      <span className={`inline-flex items-center gap-1 bg-white/20 backdrop-blur ring-1 ring-white/30 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide`}>
                        <TurnoIcon size={10} /> {turno.label}
                      </span>
                      {inativa && (
                        <span className="ml-1.5 inline-flex bg-white/30 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold">
                          Arquivada
                        </span>
                      )}
                    </div>
                    <span className="text-white/90 text-xs font-mono">{turma.ano_letivo}</span>
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-slate-900 truncate">{turma.nome}</h3>
                      <p className="text-xs text-slate-500">{turma.serie}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Users size={12} /> Alunos
                      </span>
                      <span className="font-bold text-slate-900">
                        {alunosCount[turma.id] ?? 0} / {turma.capacidade_max}
                      </span>
                    </div>

                    {/* Barra de ocupação */}
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          ocupacao > 90 ? 'bg-rose-500' : ocupacao > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, ocupacao)}%` }}
                      />
                    </div>

                    {turma.sala && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <ClipboardList size={12} /> Sala
                        </span>
                        <span className="font-medium text-slate-700">{turma.sala}</span>
                      </div>
                    )}

                    {professoresTurma.length > 0 && (
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-slate-500">Professores</span>
                        <span className="font-medium text-slate-700 text-right">
                          {professoresTurma.map(p => p.nome).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  {podeGerenciar && (
                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                      <Button variante="secondary" tamanho="sm" icon={Edit3} className="flex-1" onClick={() => abrirModalEditar(turma)}>
                        Editar
                      </Button>
                      {turma.ativa && (
                        <Button variante="ghost" tamanho="sm" icon={Archive} onClick={() => handleArquivar(turma)} className="text-rose-600 hover:bg-rose-50">
                          Arquivar
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal de criação/edição */}
      <Modal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        titulo={editando ? 'Editar Turma' : 'Nova Turma'}
        descricao={editando ? 'Atualize as informações da turma.' : 'Cadastre uma nova sala de aula para o ano letivo.'}
        tamanho="lg"
        footer={
          <>
            <Button variante="ghost" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button variante="accent" loading={salvando} onClick={handleSalvar}>
              {editando ? 'Salvar Alterações' : 'Criar Turma'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSalvar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nome da Turma *"
              required
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: 5º Ano A"
            />
            <Input
              label="Série / Ano *"
              required
              value={form.serie}
              onChange={e => setForm(f => ({ ...f, serie: e.target.value }))}
              placeholder="Ex: 5º Ano"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Turno *"
              value={form.turno}
              onChange={e => setForm(f => ({ ...f, turno: e.target.value }))}
            >
              <option value="manha">Manhã</option>
              <option value="tarde">Tarde</option>
              <option value="integral">Integral</option>
            </Select>
            <Input
              label="Sala"
              value={form.sala}
              onChange={e => setForm(f => ({ ...f, sala: e.target.value }))}
              placeholder="Ex: 12"
            />
            <Input
              label="Capacidade Máx."
              type="number"
              min={1}
              max={60}
              value={form.capacidade_max}
              onChange={e => setForm(f => ({ ...f, capacidade_max: e.target.value }))}
            />
          </div>

          <div>
            <p className="block text-xs font-medium text-slate-600 mb-1.5">Professores vinculados</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-xl border border-slate-200 p-3 max-h-48 overflow-y-auto">
              {professores.length === 0 ? (
                <p className="text-xs text-slate-400 md:col-span-2">Nenhum professor ativo cadastrado.</p>
              ) : professores.map(p => {
                const selecionado = form.professores_ids.includes(p.id)
                return (
                  <label key={p.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                    selecionado ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={selecionado}
                      onChange={() => alternarProfessor(p.id)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium truncate">{p.nome}</span>
                      <span className="block text-xs text-slate-500 truncate">{p.email}</span>
                    </span>
                  </label>
                )
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">O primeiro selecionado fica como titular para compatibilidade com registros antigos.</p>
          </div>

          <Input
            label="Ano Letivo"
            type="number"
            min={2000}
            max={2100}
            value={form.ano_letivo}
            onChange={e => setForm(f => ({ ...f, ano_letivo: e.target.value }))}
          />

          {erro && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2.5 rounded-lg">
              <AlertCircle size={15} className="shrink-0" />
              <span>{erro}</span>
            </div>
          )}
        </form>
      </Modal>
    </div>
  )
}
