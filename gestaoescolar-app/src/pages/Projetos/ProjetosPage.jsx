import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useAuth } from '../../context/AuthContext'
import { criarProjeto, atualizarStatusProjeto } from '../../services/projetos'
import { criarPendencia, atualizarPendencia } from '../../services/pendencias'
import {
  FolderKanban, Plus, Calendar, User, Target,
  AlertCircle, CheckCircle2, Circle, Clock, X
} from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { Card, CardHeader, Badge, EmptyState, Spinner } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'

const COLUNAS = [
  { id: 'planejado',    label: 'Planejado',    cor: 'blue',    icon: Circle },
  { id: 'em_andamento', label: 'Em andamento', cor: 'amber',   icon: Clock },
  { id: 'concluido',    label: 'Concluído',    cor: 'emerald', icon: CheckCircle2 },
]

const STATUS_PEND = {
  pendente:     { label: 'Pendente',    variante: 'red' },
  em_andamento: { label: 'Em andamento', variante: 'yellow' },
  planejado:    { label: 'Planejado',    variante: 'blue' },
  concluido:    { label: 'Concluído',    variante: 'green' },
}

const TIPOS_PENDENCIA = ['PDDE', 'Conselho PDE', 'Plano de Ação', 'Formação', 'Avaliação Institucional', 'Outro']

export default function ProjetosPage() {
  const { user, perfil } = useAuth()
  const podeGerenciar = ['diretor', 'coordenador', 'admin'].includes(perfil?.perfil)

  const [projetos, setProjetos] = useState([])
  const [pendencias, setPendencias] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState('projetos')

  const [modalProj, setModalProj] = useState(false)
  const [modalPend, setModalPend] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [formProj, setFormProj] = useState({
    nome: '', descricao: '', categoria: '', status: 'planejado',
    data_inicio: '', data_fim: '', meta: '', indicador_sucesso: '',
  })

  const [formPend, setFormPend] = useState({
    titulo: '', descricao: '', tipo: 'PDDE', data_prazo: '',
    status: 'pendente', responsavel_id: '', alerta_dias_antes: 15,
  })

  useEffect(() => {
    const qp = query(collection(db, 'projetos'), orderBy('data_inicio', 'desc'))
    const unsubP = onSnapshot(qp, snap => {
      setProjetos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setCarregando(false)
    })
    const qe = query(collection(db, 'pendencias'), orderBy('data_prazo', 'asc'))
    const unsubE = onSnapshot(qe, snap => {
      setPendencias(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => { unsubP(); unsubE() }
  }, [])

  async function handleSalvarProjeto(e) {
    e.preventDefault()
    if (!formProj.nome.trim()) { setErro('Nome obrigatório.'); return }
    setSalvando(true)
    try {
      await criarProjeto(formProj, user.uid)
      setModalProj(false)
      setFormProj({ nome: '', descricao: '', categoria: '', status: 'planejado', data_inicio: '', data_fim: '', meta: '', indicador_sucesso: '' })
      setErro('')
    } catch (err) { setErro('Erro ao salvar.'); console.error(err) }
    finally { setSalvando(false) }
  }

  async function handleSalvarPendencia(e) {
    e.preventDefault()
    if (!formPend.titulo.trim()) { setErro('Título obrigatório.'); return }
    if (!formPend.data_prazo) { setErro('Data prazo obrigatória.'); return }
    setSalvando(true)
    try {
      await criarPendencia({ ...formPend, responsavel_id: user.uid }, user.uid)
      setModalPend(false)
      setFormPend({ titulo: '', descricao: '', tipo: 'PDDE', data_prazo: '', status: 'pendente', responsavel_id: '', alerta_dias_antes: 15 })
      setErro('')
    } catch (err) { setErro('Erro ao salvar.'); console.error(err) }
    finally { setSalvando(false) }
  }

  async function avancarStatus(projeto) {
    const ordem = ['planejado', 'em_andamento', 'concluido']
    const idx = ordem.indexOf(projeto.status)
    if (idx < 0 || idx >= ordem.length - 1) return
    await atualizarStatusProjeto(projeto.id, ordem[idx + 1], user.uid)
  }

  if (carregando) return <div className="flex justify-center py-32"><Spinner size="lg" /></div>

  const diasAteVencer = (data) => {
    if (!data) return null
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const prazo = new Date(data + 'T00:00:00')
    return Math.ceil((prazo - hoje) / (1000 * 60 * 60 * 24))
  }

  return (
    <div>
      <PageHeader
        titulo="Projetos & Pendências"
        descricao={`${projetos.length} projetos · ${pendencias.length} pendências`}
        icon={FolderKanban}
        acoes={
          podeGerenciar && (
            aba === 'projetos'
              ? <Button variante="accent" icon={Plus} onClick={() => setModalProj(true)}>Novo Projeto</Button>
              : <Button variante="accent" icon={Plus} onClick={() => setModalPend(true)}>Nova Pendência</Button>
          )
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 rounded-xl p-1 w-fit">
        <button onClick={() => setAba('projetos')} className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${aba === 'projetos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
          Projetos (Kanban)
        </button>
        <button onClick={() => setAba('pendencias')} className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${aba === 'pendencias' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
          Pendências
        </button>
      </div>

      {aba === 'projetos' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUNAS.map(col => {
            const items = projetos.filter(p => p.status === col.id)
            const cores = {
              blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    dot: 'bg-blue-500' },
              amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-500' },
              emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
            }
            const c = cores[col.cor]
            const ColIcon = col.icon
            return (
              <div key={col.id} className={`${c.bg} rounded-2xl border ${c.border} p-3 min-h-[400px]`}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                    <h3 className={`text-xs font-bold uppercase tracking-widest ${c.text}`}>{col.label}</h3>
                    <span className={`text-xs font-bold ${c.text} bg-white/60 px-1.5 py-0.5 rounded`}>{items.length}</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {items.length === 0 ? (
                    <div className="text-center text-xs text-slate-400 italic py-8">Vazio</div>
                  ) : items.map(p => (
                    <div key={p.id} className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm hover:shadow-md transition-all">
                      <p className="text-sm font-semibold text-slate-900 mb-1.5">{p.nome}</p>
                      {p.descricao && <p className="text-xs text-slate-500 mb-2 line-clamp-2">{p.descricao}</p>}
                      <div className="space-y-1.5">
                        {p.categoria && <Badge variante="slate">{p.categoria}</Badge>}
                        {p.data_fim && (
                          <p className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Calendar size={10} /> Até {new Date(p.data_fim).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                        {p.indicador_sucesso && (
                          <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                            <Target size={10} /> {p.indicador_sucesso}
                          </p>
                        )}
                      </div>
                      {podeGerenciar && p.status !== 'concluido' && (
                        <button
                          onClick={() => avancarStatus(p)}
                          className={`w-full mt-3 text-xs font-medium ${c.text} hover:bg-white py-1.5 rounded-lg transition-colors`}
                        >
                          Avançar →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {aba === 'pendencias' && (
        <Card>
          {pendencias.length === 0 ? (
            <EmptyState
              icon={Clock}
              titulo="Nenhuma pendência cadastrada"
              descricao="Pendências ajudam a acompanhar prazos como PDDE, conselhos e formações."
              acao={podeGerenciar ? <Button variante="accent" icon={Plus} onClick={() => setModalPend(true)}>Nova Pendência</Button> : null}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {pendencias.map(p => {
                const dias = diasAteVencer(p.data_prazo)
                const urgente = dias !== null && dias <= 7 && p.status !== 'concluido'
                const venceu = dias !== null && dias < 0 && p.status !== 'concluido'
                const status = STATUS_PEND[p.status] ?? { label: p.status, variante: 'slate' }
                return (
                  <div key={p.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        venceu ? 'bg-rose-100 text-rose-600' : urgente ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Clock size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-slate-900 truncate">{p.titulo}</p>
                          <Badge variante="slate">{p.tipo}</Badge>
                        </div>
                        {p.descricao && <p className="text-xs text-slate-500 truncate mb-1">{p.descricao}</p>}
                        <p className={`text-xs flex items-center gap-1 ${venceu ? 'text-rose-600 font-semibold' : urgente ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
                          <Calendar size={11} />
                          {new Date(p.data_prazo + 'T00:00:00').toLocaleDateString('pt-BR')}
                          {' · '}
                          {venceu ? `Venceu há ${-dias}d` : dias === 0 ? 'Vence hoje' : `Em ${dias}d`}
                        </p>
                      </div>
                      <Badge variante={status.variante}>{status.label}</Badge>
                      {podeGerenciar && p.status !== 'concluido' && (
                        <Select
                          value={p.status}
                          onChange={async (e) => await atualizarPendencia(p.id, { status: e.target.value })}
                          className="w-44"
                        >
                          <option value="pendente">Pendente</option>
                          <option value="em_andamento">Em andamento</option>
                          <option value="planejado">Planejado</option>
                          <option value="concluido">Concluído</option>
                        </Select>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* Modal Novo Projeto */}
      <Modal
        aberto={modalProj}
        onFechar={() => setModalProj(false)}
        titulo="Novo Projeto Pedagógico"
        tamanho="xl"
        footer={
          <>
            <Button variante="ghost" onClick={() => setModalProj(false)}>Cancelar</Button>
            <Button variante="accent" loading={salvando} onClick={handleSalvarProjeto}>Criar Projeto</Button>
          </>
        }
      >
        <form onSubmit={handleSalvarProjeto} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nome do Projeto *" required value={formProj.nome} onChange={e => setFormProj(f => ({ ...f, nome: e.target.value }))} className="md:col-span-2" placeholder="Ex: Reforço em Língua Portuguesa" />
          <Textarea label="Descrição" value={formProj.descricao} onChange={e => setFormProj(f => ({ ...f, descricao: e.target.value }))} rows={3} className="md:col-span-2" placeholder="Detalhe o objetivo e escopo..." />
          <Input label="Categoria" value={formProj.categoria} onChange={e => setFormProj(f => ({ ...f, categoria: e.target.value }))} placeholder="Pedagógico, Cultural..." />
          <Select label="Status Inicial" value={formProj.status} onChange={e => setFormProj(f => ({ ...f, status: e.target.value }))}>
            <option value="planejado">Planejado</option>
            <option value="em_andamento">Em andamento</option>
          </Select>
          <Input label="Data de Início" type="date" value={formProj.data_inicio} onChange={e => setFormProj(f => ({ ...f, data_inicio: e.target.value }))} />
          <Input label="Data de Fim" type="date" value={formProj.data_fim} onChange={e => setFormProj(f => ({ ...f, data_fim: e.target.value }))} />
          <Input label="Meta" value={formProj.meta} onChange={e => setFormProj(f => ({ ...f, meta: e.target.value }))} className="md:col-span-2" placeholder="Ex: Atender 80 alunos do 5º ano" />
          <Input label="Indicador de Sucesso" value={formProj.indicador_sucesso} onChange={e => setFormProj(f => ({ ...f, indicador_sucesso: e.target.value }))} className="md:col-span-2" placeholder="Ex: Aumento de 20% na média de leitura" />

          {erro && <div className="md:col-span-2 flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2.5 rounded-lg"><AlertCircle size={15} />{erro}</div>}
        </form>
      </Modal>

      {/* Modal Nova Pendência */}
      <Modal
        aberto={modalPend}
        onFechar={() => setModalPend(false)}
        titulo="Nova Pendência"
        tamanho="lg"
        footer={
          <>
            <Button variante="ghost" onClick={() => setModalPend(false)}>Cancelar</Button>
            <Button variante="accent" loading={salvando} onClick={handleSalvarPendencia}>Criar Pendência</Button>
          </>
        }
      >
        <form onSubmit={handleSalvarPendencia} className="space-y-4">
          <Input label="Título *" required value={formPend.titulo} onChange={e => setFormPend(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Prestação de contas PDDE" />
          <Textarea label="Descrição" value={formPend.descricao} onChange={e => setFormPend(f => ({ ...f, descricao: e.target.value }))} rows={3} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Tipo" value={formPend.tipo} onChange={e => setFormPend(f => ({ ...f, tipo: e.target.value }))}>
              {TIPOS_PENDENCIA.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Input label="Data Prazo *" type="date" required value={formPend.data_prazo} onChange={e => setFormPend(f => ({ ...f, data_prazo: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Status" value={formPend.status} onChange={e => setFormPend(f => ({ ...f, status: e.target.value }))}>
              <option value="pendente">Pendente</option>
              <option value="planejado">Planejado</option>
              <option value="em_andamento">Em andamento</option>
            </Select>
            <Input label="Alertar dias antes" type="number" min={1} max={60} value={formPend.alerta_dias_antes} onChange={e => setFormPend(f => ({ ...f, alerta_dias_antes: Number(e.target.value) }))} />
          </div>

          {erro && <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2.5 rounded-lg"><AlertCircle size={15} />{erro}</div>}
        </form>
      </Modal>
    </div>
  )
}
