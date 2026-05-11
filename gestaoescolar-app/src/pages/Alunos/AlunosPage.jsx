import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { useAuth } from '../../context/AuthContext'
import { criarAluno } from '../../services/alunos'
import { criarMatricula } from '../../services/matriculas'
import { listarTurmas } from '../../services/turmas'
import { mascararCPF, formatarCPF, formatarTelefone } from '../../utils/mascaramento'
import { consultarCEP, formatarCEP } from '../../utils/cep'
import {
  Search, Plus, ChevronRight, User, Users, AlertCircle, Download,
  CheckCircle2, ShieldCheck, MapPin, Loader2
} from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { Card, Badge, EmptyState, Spinner } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import PerfilAlunoModal from './PerfilAlunoModal'

const ANO_LETIVO = new Date().getFullYear()

const STATUS_BADGE = {
  ativo:       { label: 'Ativo',       variante: 'green' },
  inativo:     { label: 'Inativo',     variante: 'slate' },
  transferido: { label: 'Transferido', variante: 'yellow' },
  formado:     { label: 'Formado',     variante: 'blue' },
}

export default function AlunosPage() {
  const { user } = useAuth()

  const [alunos, setAlunos] = useState([])
  const [turmas, setTurmas] = useState([])
  const [matriculasMap, setMatriculasMap] = useState({})
  const [busca, setBusca] = useState('')
  const [filtroTurma, setFiltroTurma] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('ativo')
  const [carregando, setCarregando] = useState(true)
  const [drawerAberto, setDrawerAberto] = useState(false)
  const [alunoPerfilAberto, setAlunoPerfilAberto] = useState(null)
  const [form, setForm] = useState(formInicial())
  const [abaAtiva, setAbaAtiva] = useState('aluno')
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')
  const [buscandoCEP, setBuscandoCEP] = useState(false)
  const [cepErro, setCepErro] = useState('')

  function formInicial() {
    return {
      nome_completo: '', data_nascimento: '', cpf: '', sexo: '',
      necessidades_especiais: '', turma_id: '', ano_letivo: ANO_LETIVO,
      // Endereço (com auto-preenchimento via CEP)
      cep: '', logradouro: '', numero: '', complemento: '',
      bairro: '', cidade: '', uf: '',
      resp_nome: '', resp_parentesco: 'mae', resp_telefone: '',
      resp_email: '', resp_financeiro: true, resp_pedagogico: true,
      resp_consentimento: false,
    }
  }

  useEffect(() => {
    const q = query(collection(db, 'alunos'), where('status', '==', filtroStatus), orderBy('nome_completo'))
    const unsub = onSnapshot(q, async (snap) => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setAlunos(lista)

      const mMap = {}
      await Promise.all(lista.map(async (aluno) => {
        const mq = query(
          collection(db, 'matriculas'),
          where('aluno_id', '==', aluno.id),
          where('ano_letivo', '==', ANO_LETIVO),
          where('status', '==', 'ativa')
        )
        const mSnap = await getDocs(mq)
        if (!mSnap.empty) mMap[aluno.id] = mSnap.docs[0].data()
      }))
      setMatriculasMap(mMap)
      setCarregando(false)
    })
    return unsub
  }, [filtroStatus])

  useEffect(() => { listarTurmas(ANO_LETIVO).then(setTurmas) }, [])

  const alunosFiltrados = alunos.filter(a => {
    const nomeBate = a.nome_completo?.toLowerCase().includes(busca.toLowerCase())
    const turmaBate = !filtroTurma || matriculasMap[a.id]?.turma_id === filtroTurma
    return nomeBate && turmaBate
  })

  function nomeTurma(alunoId) {
    const mat = matriculasMap[alunoId]
    if (!mat) return '—'
    return turmas.find(t => t.id === mat.turma_id)?.nome ?? '—'
  }

  async function handleCepBlur() {
    const cepLimpo = form.cep.replace(/\D/g, '')
    if (cepLimpo.length !== 8) { setCepErro(''); return }
    setBuscandoCEP(true)
    setCepErro('')
    const { sucesso, dados, erro } = await consultarCEP(cepLimpo)
    setBuscandoCEP(false)
    if (sucesso) {
      setForm(f => ({
        ...f,
        logradouro: dados.logradouro || f.logradouro,
        bairro: dados.bairro || f.bairro,
        cidade: dados.cidade || f.cidade,
        uf: dados.uf || f.uf,
        complemento: dados.complemento || f.complemento,
      }))
    } else {
      setCepErro(erro ?? 'Erro ao consultar CEP.')
    }
  }

  async function salvarNovaMatricula(e) {
    e.preventDefault()
    setErroForm('')
    if (!form.turma_id) { setErroForm('Selecione uma turma.'); return }
    if (!form.resp_consentimento) { setErroForm('Consentimento LGPD obrigatório.'); return }
    setSalvando(true)
    try {
      const alunoRef = await criarAluno({
        nome_completo: form.nome_completo,
        data_nascimento: form.data_nascimento,
        cpf: form.cpf.replace(/\D/g, ''),
        sexo: form.sexo,
        necessidades_especiais: form.necessidades_especiais,
        foto_url: '',
        endereco: {
          cep: form.cep.replace(/\D/g, ''),
          logradouro: form.logradouro,
          numero: form.numero,
          complemento: form.complemento,
          bairro: form.bairro,
          cidade: form.cidade,
          uf: form.uf,
        },
      }, user.uid, form.resp_consentimento)

      await addDoc(collection(db, 'responsaveis'), {
        aluno_id: alunoRef.id,
        nome: form.resp_nome,
        parentesco: form.resp_parentesco,
        cpf: '',
        telefone: form.resp_telefone.replace(/\D/g, ''),
        email: form.resp_email,
        responsavel_financeiro: form.resp_financeiro,
        responsavel_pedagogico: form.resp_pedagogico,
        consentimento_lgpd: form.resp_consentimento,
        consentimento_data: serverTimestamp(),
        created_at: serverTimestamp(),
      })

      await criarMatricula(alunoRef.id, form.turma_id, form.ano_letivo, user.uid)

      setDrawerAberto(false)
      setForm(formInicial())
      setAbaAtiva('aluno')
    } catch (err) {
      setErroForm('Erro ao salvar. Tente novamente.')
      console.error(err)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <PageHeader
        titulo="Gestão de Alunos"
        descricao={`${alunos.length} ${alunos.length === 1 ? 'aluno cadastrado' : 'alunos cadastrados'} · Ano letivo ${ANO_LETIVO}`}
        icon={Users}
        acoes={
          <>
            <Button variante="secondary" icon={Download}>Exportar</Button>
            <Button variante="accent" icon={Plus} onClick={() => setDrawerAberto(true)}>
              Nova Matrícula
            </Button>
          </>
        }
      />

      {/* Filtros */}
      <Card className="mb-4">
        <div className="p-4 flex flex-wrap gap-3 items-end">
          <Input
            icon={Search}
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar aluno por nome..."
            className="flex-1 min-w-56"
          />
          <Select value={filtroTurma} onChange={e => setFiltroTurma(e.target.value)} className="min-w-44">
            <option value="">Todas as turmas</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </Select>
          <Select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="min-w-36">
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
            <option value="transferido">Transferidos</option>
            <option value="formado">Formados</option>
          </Select>
        </div>
      </Card>

      {/* Tabela */}
      <Card>
        {carregando ? (
          <div className="py-16 flex justify-center"><Spinner size="lg" /></div>
        ) : alunosFiltrados.length === 0 ? (
          <EmptyState
            icon={Users}
            titulo="Nenhum aluno encontrado"
            descricao={busca || filtroTurma ? 'Tente ajustar os filtros de busca.' : 'Comece criando uma nova matrícula.'}
            acao={!busca && !filtroTurma ? <Button variante="accent" icon={Plus} onClick={() => setDrawerAberto(true)}>Nova Matrícula</Button> : null}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-5 py-3">Aluno</th>
                  <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Matrícula</th>
                  <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Turma</th>
                  <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alunosFiltrados.map(aluno => {
                  const badge = STATUS_BADGE[aluno.status] ?? { label: aluno.status, variante: 'slate' }
                  return (
                    <tr
                      key={aluno.id}
                      onClick={() => setAlunoPerfilAberto(aluno)}
                      className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full ring-1 ring-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                            <User size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{aluno.nome_completo}</p>
                            <p className="text-xs text-slate-400 font-mono">{mascararCPF(aluno.cpf)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 font-mono">
                        {matriculasMap[aluno.id]?.numero_matricula ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-700">{nomeTurma(aluno.id)}</td>
                      <td className="px-4 py-3.5">
                        <Badge variante={badge.variante}>{badge.label}</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-600 transition-colors inline" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Nova Matrícula */}
      <Modal
        aberto={drawerAberto}
        onFechar={() => setDrawerAberto(false)}
        titulo="Nova Matrícula"
        descricao="Cadastre o aluno e o responsável legal."
        tamanho="xl"
        footer={
          <>
            <Button variante="ghost" onClick={() => setDrawerAberto(false)}>Cancelar</Button>
            {abaAtiva === 'aluno' && (
              <Button variante="accent" onClick={() => setAbaAtiva('endereco')}>
                Próximo: Endereço
              </Button>
            )}
            {abaAtiva === 'endereco' && (
              <>
                <Button variante="secondary" onClick={() => setAbaAtiva('aluno')}>← Voltar</Button>
                <Button variante="accent" onClick={() => setAbaAtiva('responsavel')}>
                  Próximo: Responsável
                </Button>
              </>
            )}
            {abaAtiva === 'responsavel' && (
              <>
                <Button variante="secondary" onClick={() => setAbaAtiva('endereco')}>← Voltar</Button>
                <Button variante="accent" loading={salvando} onClick={salvarNovaMatricula}>
                  Confirmar Matrícula
                </Button>
              </>
            )}
          </>
        }
      >
        {/* Stepper visual com 3 etapas */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { id: 'aluno',       label: 'Dados do Aluno', num: 1 },
            { id: 'endereco',    label: 'Endereço',       num: 2 },
            { id: 'responsavel', label: 'Responsável',    num: 3 },
          ].map((step, i, arr) => (
            <div key={step.id} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => setAbaAtiva(step.id)}
                className={`flex items-center gap-2 ${abaAtiva === step.id ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  abaAtiva === step.id
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {step.num}
                </div>
                <span className={`text-xs font-semibold ${abaAtiva === step.id ? 'text-slate-900' : 'text-slate-500'} whitespace-nowrap`}>
                  {step.label}
                </span>
              </button>
              {i < arr.length - 1 && <div className="flex-1 h-px bg-slate-200 mx-3" />}
            </div>
          ))}
        </div>

        {abaAtiva === 'aluno' && (
          <form className="space-y-4">
            <Input
              label="Nome Completo *"
              required
              value={form.nome_completo}
              onChange={e => setForm(f => ({ ...f, nome_completo: e.target.value }))}
              placeholder="Nome completo do aluno"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Data de Nascimento *"
                type="date"
                required
                value={form.data_nascimento}
                onChange={e => setForm(f => ({ ...f, data_nascimento: e.target.value }))}
              />
              <Select
                label="Sexo"
                value={form.sexo}
                onChange={e => setForm(f => ({ ...f, sexo: e.target.value }))}
              >
                <option value="">Selecione</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="outro">Outro</option>
              </Select>
            </div>
            <Input
              label="CPF"
              value={form.cpf}
              maxLength={14}
              onChange={e => setForm(f => ({ ...f, cpf: formatarCPF(e.target.value) }))}
              placeholder="000.000.000-00"
              hint="Opcional · será mascarado em exibições"
            />
            <Input
              label="Necessidades Especiais"
              value={form.necessidades_especiais}
              onChange={e => setForm(f => ({ ...f, necessidades_especiais: e.target.value }))}
              placeholder="Descreva se houver (opcional)"
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Turma *"
                required
                value={form.turma_id}
                onChange={e => setForm(f => ({ ...f, turma_id: e.target.value }))}
              >
                <option value="">Selecione</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </Select>
              <Input
                label="Ano Letivo *"
                type="number"
                required
                value={form.ano_letivo}
                onChange={e => setForm(f => ({ ...f, ano_letivo: Number(e.target.value) }))}
              />
            </div>
          </form>
        )}

        {abaAtiva === 'endereco' && (
          <form className="space-y-4" onSubmit={e => e.preventDefault()}>
            {/* CEP com auto-preenchimento */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin size={18} className="text-blue-700" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-blue-900 mb-1">Auto-preenchimento por CEP</p>
                  <p className="text-xs text-blue-700 mb-3">Digite o CEP e os campos serão preenchidos automaticamente via ViaCEP.</p>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="relative">
                        <input
                          type="text"
                          value={form.cep}
                          maxLength={9}
                          onChange={e => { setForm(f => ({ ...f, cep: formatarCEP(e.target.value) })); setCepErro('') }}
                          onBlur={handleCepBlur}
                          placeholder="00000-000"
                          className="w-full h-10 px-3 text-sm rounded-lg bg-white border border-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                        />
                        {buscandoCEP && (
                          <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />
                        )}
                      </div>
                      {cepErro && <p className="text-xs text-rose-600 mt-1.5">{cepErro}</p>}
                    </div>
                    <Button
                      type="button"
                      variante="secondary"
                      tamanho="md"
                      onClick={handleCepBlur}
                      loading={buscandoCEP}
                    >
                      Buscar
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Logradouro"
                value={form.logradouro}
                onChange={e => setForm(f => ({ ...f, logradouro: e.target.value }))}
                placeholder="Rua, Avenida..."
                className="col-span-2"
              />
              <Input
                label="Número"
                value={form.numero}
                onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                placeholder="123"
              />
            </div>

            <Input
              label="Complemento"
              value={form.complemento}
              onChange={e => setForm(f => ({ ...f, complemento: e.target.value }))}
              placeholder="Apto, bloco (opcional)"
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Bairro"
                value={form.bairro}
                onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))}
              />
              <Input
                label="Cidade"
                value={form.cidade}
                onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-4 gap-3">
              <Select
                label="UF"
                value={form.uf}
                onChange={e => setForm(f => ({ ...f, uf: e.target.value }))}
              >
                <option value="">—</option>
                {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf =>
                  <option key={uf} value={uf}>{uf}</option>
                )}
              </Select>
            </div>
          </form>
        )}

        {abaAtiva === 'responsavel' && (
          <form className="space-y-4">
            <Input
              label="Nome do Responsável *"
              required
              value={form.resp_nome}
              onChange={e => setForm(f => ({ ...f, resp_nome: e.target.value }))}
              placeholder="Nome completo"
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Parentesco"
                value={form.resp_parentesco}
                onChange={e => setForm(f => ({ ...f, resp_parentesco: e.target.value }))}
              >
                <option value="mae">Mãe</option>
                <option value="pai">Pai</option>
                <option value="avo">Avó/Avô</option>
                <option value="tutor">Tutor</option>
                <option value="outro">Outro</option>
              </Select>
              <Input
                label="Telefone *"
                required
                value={form.resp_telefone}
                maxLength={15}
                onChange={e => setForm(f => ({ ...f, resp_telefone: formatarTelefone(e.target.value) }))}
                placeholder="(00) 00000-0000"
              />
            </div>
            <Input
              label="E-mail"
              type="email"
              value={form.resp_email}
              onChange={e => setForm(f => ({ ...f, resp_email: e.target.value }))}
              placeholder="email@exemplo.com"
            />
            <div className="flex flex-wrap gap-4 px-1">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.resp_financeiro}
                  onChange={e => setForm(f => ({ ...f, resp_financeiro: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                Resp. Financeiro
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.resp_pedagogico}
                  onChange={e => setForm(f => ({ ...f, resp_pedagogico: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                Resp. Pedagógico
              </label>
            </div>

            {/* LGPD Card */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                  <ShieldCheck size={16} className="text-amber-700" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-900 mb-1">LGPD — Consentimento obrigatório</p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.resp_consentimento}
                      onChange={e => setForm(f => ({ ...f, resp_consentimento: e.target.checked }))}
                      className="w-4 h-4 accent-amber-600 rounded mt-0.5"
                    />
                    <span className="text-xs text-amber-800 leading-relaxed">
                      O responsável autoriza o armazenamento e uso dos dados pessoais do aluno conforme a LGPD (Lei 13.709/2018), com base legal de obrigação legal (art. 7º, II).
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {erroForm && (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2.5 rounded-lg">
                <AlertCircle size={15} className="shrink-0" />
                <span>{erroForm}</span>
              </div>
            )}
          </form>
        )}
      </Modal>

      {/* Perfil do Aluno */}
      <PerfilAlunoModal
        aluno={alunoPerfilAberto}
        aberto={!!alunoPerfilAberto}
        onFechar={() => setAlunoPerfilAberto(null)}
      />
    </div>
  )
}
