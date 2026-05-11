import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../firebase/firebase'
import { useAuth } from '../../context/AuthContext'
import { criarAluno, atualizarAluno } from '../../services/alunos'
import { criarMatricula, atualizarMatricula } from '../../services/matriculas'
import { listarResponsaveis, criarResponsavel, atualizarResponsavel } from '../../services/responsaveis'
import { listarTurmas } from '../../services/turmas'
import { mascararCPF, formatarCPF, formatarTelefone } from '../../utils/mascaramento'
import { consultarCEP, formatarCEP } from '../../utils/cep'
import { exportarParaExcel, formatarParaExportacao } from '../../utils/exportExcel'
import {
  Search, Plus, ChevronRight, User, Users, AlertCircle, Download,
  CheckCircle2, ShieldCheck, MapPin, Loader2, Camera, Upload, Edit3
} from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { Card, Badge, EmptyState, Spinner } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
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
  const [editandoAluno, setEditandoAluno] = useState(null)
  const [editandoResponsavelId, setEditandoResponsavelId] = useState(null)
  const [alunoPerfilAberto, setAlunoPerfilAberto] = useState(null)
  const [form, setForm] = useState(formInicial())
  const [abaAtiva, setAbaAtiva] = useState('aluno')
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')
  const [buscandoCEP, setBuscandoCEP] = useState(false)
  const [cepErro, setCepErro] = useState('')

  function formInicial() {
    return {
      nome_completo: '', data_nascimento: '', cpf: '', ra: '', sexo: '',
      status: 'ativo',
      foto_url: '', foto_arquivo: null,
      tem_deficiencia: false, deficiencia_descricao: '',
      tem_doenca: false, doencas: '',
      tem_alergia: false, alergias: '',
      alergias_alimentares: '',
      restricoes_alimentares: '',
      medicamentos_continuos: '',
      plano_saude: '',
      observacoes_saude: '',
      contato_emergencia_nome: '',
      contato_emergencia_telefone: '',
      necessidades_especiais: '', turma_id: '', ano_letivo: ANO_LETIVO,
      // Endereço (com auto-preenchimento via CEP)
      cep: '', logradouro: '', numero: '', complemento: '',
      bairro: '', cidade: '', uf: '',
      resp_nome: '', resp_parentesco: 'mae', resp_telefone: '',
      resp_email: '', resp_financeiro: true, resp_pedagogico: true,
      resp_consentimento: false,
    }
  }

  const [erroQuery, setErroQuery] = useState(null)

  useEffect(() => {
    setCarregando(true)
    setErroQuery(null)
    const q = query(collection(db, 'alunos'), where('status', '==', filtroStatus), orderBy('nome_completo'))
    const unsub = onSnapshot(
      q,
      async (snap) => {
        const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setAlunos(lista)

        const mMap = {}
        await Promise.all(lista.map(async (aluno) => {
          try {
            const mq = query(
              collection(db, 'matriculas'),
              where('aluno_id', '==', aluno.id),
              where('ano_letivo', '==', ANO_LETIVO),
              where('status', '==', 'ativa')
            )
            const mSnap = await getDocs(mq)
            if (!mSnap.empty) mMap[aluno.id] = { id: mSnap.docs[0].id, ...mSnap.docs[0].data() }
          } catch (e) {
            console.warn('matricula query falhou para', aluno.id, e.message)
          }
        }))
        setMatriculasMap(mMap)
        setCarregando(false)
      },
      (err) => {
        console.error('Erro ao listar alunos:', err)
        setErroQuery(err.message ?? 'Falha ao carregar alunos. Verifique permissões/índices.')
        setAlunos([])
        setCarregando(false)
      }
    )
    return unsub
  }, [filtroStatus])

  useEffect(() => { listarTurmas(ANO_LETIVO).then(setTurmas) }, [])

  const alunosFiltrados = alunos.filter(a => {
    const termo = busca.toLowerCase()
    const nomeBate = a.nome_completo?.toLowerCase().includes(termo) || a.ra?.toLowerCase().includes(termo)
    const turmaBate = !filtroTurma || matriculasMap[a.id]?.turma_id === filtroTurma
    return nomeBate && turmaBate
  })

  function nomeTurma(alunoId) {
    const mat = matriculasMap[alunoId]
    if (!mat) return '—'
    return turmas.find(t => t.id === mat.turma_id)?.nome ?? '—'
  }

  function exportarLista() {
    const linhas = formatarParaExportacao(alunosFiltrados, {
      'Nome': 'nome_completo',
      'RA': 'ra',
      'CPF': aluno => mascararCPF(aluno.cpf),
      'Matrícula': aluno => matriculasMap[aluno.id]?.numero_matricula ?? '',
      'Turma': aluno => nomeTurma(aluno.id),
      'Status': aluno => STATUS_BADGE[aluno.status]?.label ?? aluno.status ?? '',
      'Data de nascimento': 'data_nascimento',
      'Cidade': 'endereco.cidade',
      'UF': 'endereco.uf',
    })
    exportarParaExcel(linhas, `alunos-${filtroStatus}-${ANO_LETIVO}`, 'Alunos')
  }

  function abrirNovaMatricula() {
    setEditandoAluno(null)
    setEditandoResponsavelId(null)
    setForm(formInicial())
    setAbaAtiva('aluno')
    setErroForm('')
    setDrawerAberto(true)
  }

  async function abrirEditarAluno(aluno) {
    const saude = aluno.saude ?? {}
    const endereco = aluno.endereco ?? {}
    const responsaveis = await listarResponsaveis(aluno.id).catch(() => [])
    const responsavel = responsaveis[0] ?? null
    setEditandoAluno(aluno)
    setEditandoResponsavelId(responsavel?.id ?? null)
    setForm({
      ...formInicial(),
      nome_completo: aluno.nome_completo ?? '',
      data_nascimento: aluno.data_nascimento ?? '',
      cpf: aluno.cpf ? formatarCPF(aluno.cpf) : '',
      ra: aluno.ra ?? '',
      sexo: aluno.sexo ?? '',
      status: aluno.status ?? 'ativo',
      foto_url: aluno.foto_url ?? '',
      foto_arquivo: null,
      necessidades_especiais: aluno.necessidades_especiais ?? saude.deficiencia_descricao ?? '',
      tem_deficiencia: !!saude.tem_deficiencia,
      deficiencia_descricao: saude.deficiencia_descricao ?? aluno.necessidades_especiais ?? '',
      tem_doenca: !!saude.tem_doenca,
      doencas: saude.doencas ?? '',
      tem_alergia: !!saude.tem_alergia,
      alergias: saude.alergias ?? '',
      alergias_alimentares: saude.alergias_alimentares ?? '',
      restricoes_alimentares: saude.restricoes_alimentares ?? '',
      medicamentos_continuos: saude.medicamentos_continuos ?? '',
      plano_saude: saude.plano_saude ?? '',
      observacoes_saude: saude.observacoes_saude ?? '',
      contato_emergencia_nome: saude.contato_emergencia_nome ?? '',
      contato_emergencia_telefone: saude.contato_emergencia_telefone ? formatarTelefone(saude.contato_emergencia_telefone) : '',
      cep: endereco.cep ? formatarCEP(endereco.cep) : '',
      logradouro: endereco.logradouro ?? '',
      numero: endereco.numero ?? '',
      complemento: endereco.complemento ?? '',
      bairro: endereco.bairro ?? '',
      cidade: endereco.cidade ?? '',
      uf: endereco.uf ?? '',
      turma_id: matriculasMap[aluno.id]?.turma_id ?? '',
      ano_letivo: matriculasMap[aluno.id]?.ano_letivo ?? ANO_LETIVO,
      resp_nome: responsavel?.nome ?? '',
      resp_parentesco: responsavel?.parentesco ?? 'mae',
      resp_telefone: responsavel?.telefone ? formatarTelefone(responsavel.telefone) : '',
      resp_email: responsavel?.email ?? '',
      resp_financeiro: responsavel?.responsavel_financeiro ?? true,
      resp_pedagogico: responsavel?.responsavel_pedagogico ?? true,
      resp_consentimento: responsavel?.consentimento_lgpd ?? true,
    })
    setAbaAtiva('aluno')
    setErroForm('')
    setDrawerAberto(true)
  }

  async function resolverFotoUrl() {
    let fotoUrl = form.foto_url.trim()
    if (form.foto_arquivo) {
      const ext = form.foto_arquivo.name.split('.').pop()?.toLowerCase() || 'jpg'
      const nomeSeguro = `${Date.now()}-${form.nome_completo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${ext}`
      const fotoRef = ref(storage, `alunos/fotos/${nomeSeguro}`)
      const upload = await uploadBytes(fotoRef, form.foto_arquivo)
      fotoUrl = await getDownloadURL(upload.ref)
    }
    return fotoUrl
  }

  function montarDadosAluno(fotoUrl) {
    return {
      nome_completo: form.nome_completo.trim(),
      data_nascimento: form.data_nascimento,
      cpf: form.cpf.replace(/\D/g, ''),
      ra: form.ra.trim(),
      sexo: form.sexo,
      status: form.status,
      necessidades_especiais: form.necessidades_especiais,
      foto_url: fotoUrl,
      saude: {
        tem_deficiencia: form.tem_deficiencia,
        deficiencia_descricao: form.deficiencia_descricao,
        tem_doenca: form.tem_doenca,
        doencas: form.doencas,
        tem_alergia: form.tem_alergia,
        alergias: form.alergias,
        alergias_alimentares: form.alergias_alimentares,
        restricoes_alimentares: form.restricoes_alimentares,
        medicamentos_continuos: form.medicamentos_continuos,
        plano_saude: form.plano_saude,
        observacoes_saude: form.observacoes_saude,
        contato_emergencia_nome: form.contato_emergencia_nome,
        contato_emergencia_telefone: form.contato_emergencia_telefone.replace(/\D/g, ''),
      },
      endereco: {
        cep: form.cep.replace(/\D/g, ''),
        logradouro: form.logradouro,
        numero: form.numero,
        complemento: form.complemento,
        bairro: form.bairro,
        cidade: form.cidade,
        uf: form.uf,
      },
    }
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
    if (!form.nome_completo.trim()) { setErroForm('Nome do aluno é obrigatório.'); return }
    if (!form.data_nascimento) { setErroForm('Data de nascimento é obrigatória.'); return }
    if (!form.turma_id) { setErroForm('Selecione uma turma.'); return }
    if (!form.resp_consentimento) { setErroForm('Consentimento LGPD obrigatório.'); return }
    setSalvando(true)
    try {
      const fotoUrl = await resolverFotoUrl()
      const alunoRef = await criarAluno(montarDadosAluno(fotoUrl), user.uid, form.resp_consentimento)

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

  async function salvarEdicaoAluno(e) {
    e?.preventDefault?.()
    if (!editandoAluno) return
    setErroForm('')
    if (!form.nome_completo.trim()) { setErroForm('Nome do aluno é obrigatório.'); return }
    if (!form.data_nascimento) { setErroForm('Data de nascimento é obrigatória.'); return }
    setSalvando(true)
    try {
      const fotoUrl = await resolverFotoUrl()
      await atualizarAluno(editandoAluno.id, montarDadosAluno(fotoUrl))

      const matriculaAtual = matriculasMap[editandoAluno.id]
      if (matriculaAtual?.id) {
        await atualizarMatricula(matriculaAtual.id, {
          turma_id: form.turma_id,
          ano_letivo: Number(form.ano_letivo) || ANO_LETIVO,
        })
      }

      const dadosResponsavel = {
        aluno_id: editandoAluno.id,
        nome: form.resp_nome.trim(),
        parentesco: form.resp_parentesco,
        cpf: '',
        telefone: form.resp_telefone.replace(/\D/g, ''),
        email: form.resp_email.trim().toLowerCase(),
        responsavel_financeiro: form.resp_financeiro,
        responsavel_pedagogico: form.resp_pedagogico,
        consentimento_lgpd: form.resp_consentimento,
      }
      if (editandoResponsavelId) {
        await atualizarResponsavel(editandoResponsavelId, dadosResponsavel)
      } else if (dadosResponsavel.nome) {
        await criarResponsavel(dadosResponsavel)
      }

      setDrawerAberto(false)
      setEditandoAluno(null)
      setEditandoResponsavelId(null)
      setForm(formInicial())
      setAbaAtiva('aluno')
    } catch (err) {
      setErroForm('Erro ao atualizar cadastro. Tente novamente.')
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
            <Button
              variante="secondary"
              icon={Download}
              onClick={exportarLista}
              disabled={alunosFiltrados.length === 0}
            >
              Exportar
            </Button>
            <Button variante="accent" icon={Plus} onClick={abrirNovaMatricula}>
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

      {/* Banner de erro */}
      {erroQuery && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Erro ao carregar alunos</p>
            <p className="text-xs text-rose-700 mt-0.5">{erroQuery}</p>
            <p className="text-[11px] text-rose-600 mt-1">Verifique no console do navegador o link para criar o índice (caso a mensagem mencione "requires an index").</p>
          </div>
        </div>
      )}

      {/* Tabela */}
      <Card>
        {carregando ? (
          <div className="py-16 flex justify-center"><Spinner size="lg" /></div>
        ) : alunosFiltrados.length === 0 ? (
          <EmptyState
            icon={Users}
            titulo="Nenhum aluno encontrado"
            descricao={busca || filtroTurma ? 'Tente ajustar os filtros de busca.' : 'Comece criando uma nova matrícula.'}
            acao={!busca && !filtroTurma ? <Button variante="accent" icon={Plus} onClick={abrirNovaMatricula}>Nova Matrícula</Button> : null}
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
                  <th className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Ações</th>
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
                            <p className="text-xs text-slate-400 font-mono">
                              {aluno.ra ? `RA ${aluno.ra}` : mascararCPF(aluno.cpf)}
                            </p>
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
                        <div className="flex justify-end gap-1">
                          <Button
                            variante="ghost"
                            tamanho="sm"
                            icon={Edit3}
                            onClick={(e) => {
                              e.stopPropagation()
                              abrirEditarAluno(aluno)
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            variante="ghost"
                            tamanho="sm"
                            icon={ChevronRight}
                            onClick={(e) => {
                              e.stopPropagation()
                              setAlunoPerfilAberto(aluno)
                            }}
                          >
                            Ver Perfil
                          </Button>
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

      {/* Modal Nova Matrícula / Edição de Cadastro */}
      <Modal
        aberto={drawerAberto}
        onFechar={() => {
          setDrawerAberto(false)
          setEditandoAluno(null)
          setEditandoResponsavelId(null)
          setForm(formInicial())
          setAbaAtiva('aluno')
        }}
        titulo={editandoAluno ? 'Editar Cadastro do Aluno' : 'Nova Matrícula'}
        descricao={editandoAluno ? 'Atualize os dados pessoais, saúde e endereço do aluno.' : 'Cadastre o aluno e o responsável legal.'}
        tamanho="xl"
        footer={
          <>
            <Button variante="ghost" onClick={() => {
              setDrawerAberto(false)
              setEditandoAluno(null)
              setEditandoResponsavelId(null)
              setForm(formInicial())
              setAbaAtiva('aluno')
            }}>Cancelar</Button>
            {abaAtiva === 'aluno' && (
              <Button variante="accent" onClick={() => setAbaAtiva('saude')}>
                Próximo: Saúde
              </Button>
            )}
            {abaAtiva === 'saude' && (
              <>
                <Button variante="secondary" onClick={() => setAbaAtiva('aluno')}>← Voltar</Button>
                <Button variante="accent" onClick={() => setAbaAtiva('endereco')}>
                  Próximo: Endereço
                </Button>
              </>
            )}
            {abaAtiva === 'endereco' && (
              <>
                <Button variante="secondary" onClick={() => setAbaAtiva('saude')}>← Voltar</Button>
                <Button variante="accent" onClick={() => setAbaAtiva('responsavel')}>
                  Próximo: Responsável
                </Button>
              </>
            )}
            {abaAtiva === 'responsavel' && (
              <>
                <Button variante="secondary" onClick={() => setAbaAtiva('endereco')}>← Voltar</Button>
                <Button variante="accent" loading={salvando} onClick={editandoAluno ? salvarEdicaoAluno : salvarNovaMatricula}>
                  {editandoAluno ? 'Salvar Alterações' : 'Confirmar Matrícula'}
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
            { id: 'saude',       label: 'Saúde',          num: 2 },
            { id: 'endereco',    label: 'Endereço',       num: 3 },
            { id: 'responsavel', label: 'Responsável',    num: 4 },
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
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                {form.foto_url ? (
                  <img src={form.foto_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={24} className="text-slate-400" />
                )}
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="URL da Foto"
                  value={form.foto_url}
                  onChange={e => setForm(f => ({ ...f, foto_url: e.target.value }))}
                  placeholder="https://..."
                  hint="Opcional; também pode selecionar um arquivo."
                />
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide uppercase">
                    Arquivo da Foto
                  </label>
                  <label className="h-10 px-3 text-sm rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                    <Upload size={15} className="text-slate-500" />
                    <span className="truncate text-slate-600">
                      {form.foto_arquivo?.name || 'Selecionar imagem'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const arquivo = e.target.files?.[0] ?? null
                        setForm(f => ({
                          ...f,
                          foto_arquivo: arquivo,
                          foto_url: arquivo ? URL.createObjectURL(arquivo) : f.foto_url,
                        }))
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

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
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="RA (Registro do Aluno)"
                value={form.ra}
                maxLength={20}
                onChange={e => setForm(f => ({ ...f, ra: e.target.value.replace(/[^\w-]/g, '').toUpperCase() }))}
                placeholder="Ex: 123456789-X"
                hint="Identificador estadual"
              />
              <Input
                label="CPF"
                value={form.cpf}
                maxLength={14}
                onChange={e => setForm(f => ({ ...f, cpf: formatarCPF(e.target.value) }))}
                placeholder="000.000.000-00"
                hint="Será mascarado"
              />
            </div>
            <Input
              label="Necessidades Especiais"
              value={form.necessidades_especiais}
              onChange={e => setForm(f => ({ ...f, necessidades_especiais: e.target.value }))}
              placeholder="Descreva se houver (opcional)"
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Status"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="transferido">Transferido</option>
                <option value="formado">Formado</option>
              </Select>
              <div />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label={editandoAluno ? 'Turma Atual *' : 'Turma *'}
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

        {abaAtiva === 'saude' && (
          <form className="space-y-4">
            <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-4">
              <p className="text-xs font-bold text-rose-900 mb-1">Informações de saúde e acessibilidade</p>
              <p className="text-xs text-rose-700">Esses dados ajudam a equipe em emergências, alimentação, inclusão e acompanhamento pedagógico.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2.5 cursor-pointer">
                <input type="checkbox" checked={form.tem_deficiencia} onChange={e => setForm(f => ({ ...f, tem_deficiencia: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
                Tem deficiência
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2.5 cursor-pointer">
                <input type="checkbox" checked={form.tem_doenca} onChange={e => setForm(f => ({ ...f, tem_doenca: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
                Tem doença/condição
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2.5 cursor-pointer">
                <input type="checkbox" checked={form.tem_alergia} onChange={e => setForm(f => ({ ...f, tem_alergia: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
                Tem alergia
              </label>
            </div>

            <Textarea
              label="Deficiência / Necessidades de Acessibilidade"
              value={form.deficiencia_descricao}
              onChange={e => setForm(f => ({ ...f, deficiencia_descricao: e.target.value, necessidades_especiais: e.target.value }))}
              placeholder="Ex: baixa visão, deficiência auditiva, TEA, mobilidade reduzida, adaptações necessárias..."
              rows={3}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Textarea
                label="Doenças ou Condições"
                value={form.doencas}
                onChange={e => setForm(f => ({ ...f, doencas: e.target.value }))}
                placeholder="Ex: asma, diabetes, epilepsia..."
                rows={3}
              />
              <Textarea
                label="Alergias"
                value={form.alergias}
                onChange={e => setForm(f => ({ ...f, alergias: e.target.value }))}
                placeholder="Ex: medicamentos, insetos, poeira..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Alergias Alimentares"
                value={form.alergias_alimentares}
                onChange={e => setForm(f => ({ ...f, alergias_alimentares: e.target.value }))}
                placeholder="Ex: leite, ovo, amendoim..."
              />
              <Input
                label="Restrições Alimentares"
                value={form.restricoes_alimentares}
                onChange={e => setForm(f => ({ ...f, restricoes_alimentares: e.target.value }))}
                placeholder="Ex: intolerância à lactose, dieta especial..."
              />
            </div>

            <Textarea
              label="Medicamentos Contínuos"
              value={form.medicamentos_continuos}
              onChange={e => setForm(f => ({ ...f, medicamentos_continuos: e.target.value }))}
              placeholder="Nome, dose e horários, se informado pelo responsável."
              rows={2}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                label="Plano de Saúde"
                value={form.plano_saude}
                onChange={e => setForm(f => ({ ...f, plano_saude: e.target.value }))}
                placeholder="Opcional"
              />
              <Input
                label="Contato Emergência"
                value={form.contato_emergencia_nome}
                onChange={e => setForm(f => ({ ...f, contato_emergencia_nome: e.target.value }))}
                placeholder="Nome"
              />
              <Input
                label="Telefone Emergência"
                value={form.contato_emergencia_telefone}
                maxLength={15}
                onChange={e => setForm(f => ({ ...f, contato_emergencia_telefone: formatarTelefone(e.target.value) }))}
                placeholder="(00) 00000-0000"
              />
            </div>

            <Textarea
              label="Observações Gerais"
              value={form.observacoes_saude}
              onChange={e => setForm(f => ({ ...f, observacoes_saude: e.target.value }))}
              placeholder="Orientações importantes para a equipe escolar."
              rows={3}
            />
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
