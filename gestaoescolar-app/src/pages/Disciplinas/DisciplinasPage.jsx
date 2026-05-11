import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  observarDisciplinas, criarDisciplina, atualizarDisciplina, arquivarDisciplina,
} from '../../services/disciplinas'
import { listarTodasTurmas } from '../../services/turmas'
import { listarUsuarios } from '../../services/usuarios'
import {
  BookMarked, Plus, Edit3, Archive, AlertCircle, Search, Clock, Users,
} from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { Card, Badge, EmptyState, Spinner } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'

const ANO_LETIVO = new Date().getFullYear()

export default function DisciplinasPage() {
  const { user, perfil } = useAuth()
  const podeGerenciar = ['diretor', 'coordenador'].includes(perfil?.perfil)

  const [disciplinas, setDisciplinas] = useState([])
  const [turmas, setTurmas] = useState([])
  const [professores, setProfessores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erroQuery, setErroQuery] = useState(null)

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroTurma, setFiltroTurma] = useState('')
  const [filtroAno, setFiltroAno] = useState(String(ANO_LETIVO))
  const [filtroProfessor, setFiltroProfessor] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('ativa') // ativa | arquivada | todas

  // Modal
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')
  const [form, setForm] = useState(formInicial())

  function formInicial() {
    return {
      nome: '',
      codigo: '',
      carga_horaria_semanal: 4,
      turma_id: '',
      professor_id: '',
      professores_ids: [],
      ano_letivo: ANO_LETIVO,
    }
  }

  // ─── Realtime de disciplinas (com filtros server-side) ───────────────────
  useEffect(() => {
    setCarregando(true)
    setErroQuery(null)

    const filtros = { ano_letivo: Number(filtroAno) }
    if (filtroStatus === 'ativa') filtros.ativa = true
    if (filtroStatus === 'arquivada') filtros.ativa = false
    if (filtroTurma) filtros.turma_id = filtroTurma
    if (filtroProfessor) filtros.professor_id = filtroProfessor

    const unsub = observarDisciplinas(
      filtros,
      (lista) => {
        setDisciplinas(lista)
        setCarregando(false)
      },
      (err) => {
        setErroQuery(err.message ?? 'Falha ao carregar disciplinas. Verifique permissões/índices.')
        setCarregando(false)
      }
    )
    return unsub
  }, [filtroAno, filtroTurma, filtroProfessor, filtroStatus])

  // ─── Carrega listas auxiliares (turmas + professores) ────────────────────
  useEffect(() => {
    listarTodasTurmas(Number(filtroAno))
      .then(setTurmas)
      .catch(err => console.error('Erro ao listar turmas:', err))
  }, [filtroAno])

  useEffect(() => {
    listarUsuarios({ perfil: 'professor', ativo: true })
      .then(setProfessores)
      .catch(err => console.error('Erro ao listar professores:', err))
  }, [])

  // ─── Filtro client-side pela busca textual ───────────────────────────────
  const disciplinasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return disciplinas
    return disciplinas.filter(d =>
      d.nome?.toLowerCase().includes(termo) ||
      d.codigo?.toLowerCase().includes(termo)
    )
  }, [disciplinas, busca])

  const turmaPorId = useMemo(() => Object.fromEntries(turmas.map(t => [t.id, t])), [turmas])
  const professorPorId = useMemo(() => Object.fromEntries(professores.map(p => [p.id, p])), [professores])

  // ─── Ações ───────────────────────────────────────────────────────────────
  function abrirModalNova() {
    setEditando(null)
    setForm(formInicial())
    setErroForm('')
    setModalAberto(true)
  }

  function abrirModalEditar(d) {
    const professoresIds = d.professores_ids?.length
      ? d.professores_ids
      : (d.professor_id ? [d.professor_id] : [])
    setEditando(d.id)
    setForm({
      nome: d.nome ?? '',
      codigo: d.codigo ?? '',
      carga_horaria_semanal: d.carga_horaria_semanal ?? 4,
      turma_id: d.turma_id ?? '',
      professor_id: d.professor_id ?? professoresIds[0] ?? '',
      professores_ids: professoresIds,
      ano_letivo: d.ano_letivo ?? ANO_LETIVO,
    })
    setErroForm('')
    setModalAberto(true)
  }

  async function handleSalvar(e) {
    e?.preventDefault?.()
    if (!form.nome.trim()) { setErroForm('Nome da disciplina é obrigatório.'); return }
    if (!form.turma_id) { setErroForm('Selecione uma turma.'); return }
    if (Number(form.carga_horaria_semanal) <= 0) {
      setErroForm('Carga horária semanal precisa ser maior que zero.'); return
    }

    setSalvando(true)
    setErroForm('')
    try {
      const dados = {
        nome: form.nome.trim(),
        codigo: form.codigo.trim(),
        carga_horaria_semanal: Number(form.carga_horaria_semanal),
        turma_id: form.turma_id,
        professor_id: form.professores_ids[0] ?? null,
        professores_ids: form.professores_ids,
        ano_letivo: Number(form.ano_letivo),
      }
      if (editando) {
        await atualizarDisciplina(editando, dados)
      } else {
        await criarDisciplina(dados, user?.uid)
      }
      setModalAberto(false)
    } catch (err) {
      console.error(err)
      setErroForm('Erro ao salvar disciplina. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleArquivar(d) {
    if (!confirm(`Arquivar disciplina "${d.nome}"?\n\nA disciplina não será deletada — apenas marcada como inativa (soft delete).`)) return
    try {
      await arquivarDisciplina(d.id)
    } catch (err) {
      console.error(err)
      alert('Erro ao arquivar disciplina.')
    }
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

  // Anos disponíveis no filtro (atual e dois anteriores)
  const anosDisponiveis = [ANO_LETIVO, ANO_LETIVO - 1, ANO_LETIVO - 2]

  return (
    <div>
      <PageHeader
        titulo="Disciplinas"
        descricao={`${disciplinasFiltradas.length} disciplina(s) encontrada(s) · Ano letivo ${filtroAno}`}
        icon={BookMarked}
        acoes={
          podeGerenciar ? (
            <Button variante="accent" icon={Plus} onClick={abrirModalNova}>
              Nova Disciplina
            </Button>
          ) : null
        }
      />

      {erroQuery && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Erro ao carregar disciplinas</p>
            <p className="text-xs text-rose-700 mt-0.5 break-words">{erroQuery}</p>
            <p className="text-[11px] text-rose-600 mt-1">Provavelmente é índice do Firestore — abra o console e clique no link da mensagem para criar.</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <Card className="mb-4">
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            icon={Search}
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou código..."
            className="lg:col-span-2"
          />
          <Select value={filtroTurma} onChange={e => setFiltroTurma(e.target.value)}>
            <option value="">Todas as turmas</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </Select>
          <Select value={filtroProfessor} onChange={e => setFiltroProfessor(e.target.value)}>
            <option value="">Todos os professores</option>
            {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </Select>
          <Select value={filtroAno} onChange={e => setFiltroAno(e.target.value)}>
            {anosDisponiveis.map(a => <option key={a} value={String(a)}>{a}</option>)}
          </Select>
          <Select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="lg:col-span-5 max-w-[16rem]">
            <option value="ativa">Apenas ativas</option>
            <option value="arquivada">Apenas arquivadas</option>
            <option value="todas">Todas</option>
          </Select>
        </div>
      </Card>

      {/* Tabela */}
      {carregando ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : disciplinasFiltradas.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookMarked}
            titulo={disciplinas.length === 0 ? 'Nenhuma disciplina cadastrada' : 'Nenhuma disciplina encontrada'}
            descricao={disciplinas.length === 0 ? 'Comece cadastrando a primeira disciplina do ano letivo.' : 'Tente ajustar os filtros.'}
            acao={disciplinas.length === 0 && podeGerenciar
              ? <Button variante="accent" icon={Plus} onClick={abrirModalNova}>Criar Disciplina</Button>
              : null}
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Disciplina</th>
                  <th className="text-left font-semibold px-4 py-3">Turma</th>
                  <th className="text-left font-semibold px-4 py-3">Professor</th>
                  <th className="text-left font-semibold px-4 py-3">Carga H. Semanal</th>
                  <th className="text-left font-semibold px-4 py-3">Status</th>
                  {podeGerenciar && <th className="text-right font-semibold px-4 py-3">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {disciplinasFiltradas.map(d => {
                  const turma = turmaPorId[d.turma_id]
                  const professoresIds = d.professores_ids?.length
                    ? d.professores_ids
                    : (d.professor_id ? [d.professor_id] : [])
                  const professoresDisciplina = professoresIds.map(id => professorPorId[id]).filter(Boolean)
                  return (
                    <tr key={d.id} className={`hover:bg-slate-50 ${!d.ativa ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{d.nome}</p>
                        {d.codigo && <p className="text-[11px] text-slate-500 font-mono">{d.codigo}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {turma ? (
                          <span className="inline-flex items-center gap-1.5">
                            {turma.nome}
                          </span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {professoresDisciplina.length > 0 ? (
                          <span className="inline-flex items-center gap-1.5 max-w-xs">
                            <Users size={13} className="text-slate-400" />
                            <span className="truncate">{professoresDisciplina.map(p => p.nome).join(', ')}</span>
                          </span>
                        ) : <span className="text-slate-400">Sem titular</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={13} className="text-slate-400" />
                          {d.carga_horaria_semanal ?? 0}h
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {d.ativa
                          ? <Badge variante="green">Ativa</Badge>
                          : <Badge variante="slate">Arquivada</Badge>}
                      </td>
                      {podeGerenciar && (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <Button variante="secondary" tamanho="sm" icon={Edit3} onClick={() => abrirModalEditar(d)}>
                              Editar
                            </Button>
                            {d.ativa && (
                              <Button
                                variante="ghost"
                                tamanho="sm"
                                icon={Archive}
                                onClick={() => handleArquivar(d)}
                                className="text-rose-600 hover:bg-rose-50"
                              >
                                Arquivar
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal de criação/edição */}
      <Modal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        titulo={editando ? 'Editar Disciplina' : 'Nova Disciplina'}
        descricao={editando ? 'Atualize os dados da disciplina.' : 'Cadastre uma nova disciplina para uma turma.'}
        tamanho="lg"
        footer={
          <>
            <Button variante="ghost" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button variante="accent" loading={salvando} onClick={handleSalvar}>
              {editando ? 'Salvar Alterações' : 'Criar Disciplina'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSalvar} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Nome da Disciplina *"
              required
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: Matemática"
            />
            <Input
              label="Código"
              value={form.codigo}
              onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
              placeholder="Ex: MAT-5A"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Carga H. Semanal *"
              type="number"
              min={1}
              max={40}
              value={form.carga_horaria_semanal}
              onChange={e => setForm(f => ({ ...f, carga_horaria_semanal: e.target.value }))}
            />
            <Select
              label="Turma *"
              value={form.turma_id}
              onChange={e => setForm(f => ({ ...f, turma_id: e.target.value }))}
            >
              <option value="">Selecione a turma</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </Select>
            <Input
              label="Ano Letivo"
              type="number"
              min={2000}
              max={2100}
              value={form.ano_letivo}
              onChange={e => setForm(f => ({ ...f, ano_letivo: e.target.value }))}
            />
          </div>

          <div>
            <p className="block text-xs font-medium text-slate-600 mb-1.5">Professores responsáveis</p>
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
            <p className="text-[11px] text-slate-400 mt-1">Permite co-docência e substituição sem perder compatibilidade com professor titular.</p>
          </div>

          {erroForm && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2.5 rounded-lg">
              <AlertCircle size={15} className="shrink-0" />
              <span>{erroForm}</span>
            </div>
          )}
        </form>
      </Modal>
    </div>
  )
}
