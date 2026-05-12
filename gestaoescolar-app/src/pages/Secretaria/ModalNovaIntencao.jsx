import { useState } from 'react'
import { Loader2, GraduationCap, MapPin, UserRound, School } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { formatarCEP, cepValido, consultarCEP } from '../../utils/cep'
import { formatarTelefone, formatarCPF, validarCPF } from '../../utils/mascaramento'
import { criarIntencaoVaga } from '../../services/intencoesVaga'

const ABAS = [
  { id: 'estudante',   label: 'Estudante',     icon: GraduationCap },
  { id: 'endereco',    label: 'Endereço',      icon: MapPin },
  { id: 'responsavel', label: 'Responsável',   icon: UserRound },
  { id: 'vaga',        label: 'Escola e vaga', icon: School },
]

const ENSINOS = [
  { value: 'educacao_infantil',        label: 'Educação Infantil' },
  { value: 'fundamental_anos_iniciais', label: 'Fund. Anos Iniciais' },
  { value: 'fundamental_anos_finais',   label: 'Fund. Anos Finais' },
  { value: 'ensino_medio',              label: 'Ensino Médio' },
]

const TURNOS = [
  { value: '',         label: 'Sem preferência' },
  { value: 'manha',    label: 'Manhã' },
  { value: 'tarde',    label: 'Tarde' },
  { value: 'integral', label: 'Integral' },
  { value: 'noite',    label: 'Noite' },
]

const ESTADO_INICIAL = {
  ano_letivo: new Date().getFullYear() + 1,
  aluno_nome: '',
  aluno_data_nascimento: '',
  aluno_cpf: '',
  aluno_sexo: '',
  ensino: '',
  serie: '',
  turno_preferencia: '',

  endereco: {
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
  },

  responsavel_nome: '',
  responsavel_parentesco: '',
  responsavel_telefone: '',
  responsavel_email: '',
  responsavel_cpf: '',

  escola_origem_nome: '',
  escola_origem_cidade: '',
  escola_origem_uf: '',
  matriculado_em_outro_colegio: false,

  observacoes: '',
}

export default function ModalNovaIntencao({ aberto, onFechar, onCriado, autor }) {
  const [aba, setAba] = useState('estudante')
  const [form, setForm] = useState(ESTADO_INICIAL)
  const [erros, setErros] = useState({})
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [erroCep, setErroCep] = useState('')
  const [salvando, setSalvando] = useState(false)

  function atualizar(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
    setErros(prev => ({ ...prev, [campo]: '' }))
  }

  function atualizarEndereco(campo, valor) {
    setForm(prev => ({ ...prev, endereco: { ...prev.endereco, [campo]: valor } }))
  }

  async function buscarCEP() {
    const cep = form.endereco.cep
    if (!cepValido(cep)) {
      setErroCep('CEP inválido (8 dígitos).')
      return
    }
    setBuscandoCep(true)
    setErroCep('')
    try {
      const resp = await consultarCEP(cep)
      if (resp.sucesso) {
        setForm(prev => ({
          ...prev,
          endereco: {
            ...prev.endereco,
            logradouro: resp.dados.logradouro || prev.endereco.logradouro,
            bairro: resp.dados.bairro || prev.endereco.bairro,
            cidade: resp.dados.cidade || prev.endereco.cidade,
            uf: resp.dados.uf || prev.endereco.uf,
            complemento: resp.dados.complemento || prev.endereco.complemento,
          },
        }))
      } else {
        setErroCep(resp.erro ?? 'CEP não encontrado.')
      }
    } catch (err) {
      console.error(err)
      setErroCep('Falha ao consultar CEP.')
    } finally {
      setBuscandoCep(false)
    }
  }

  function validar() {
    const novosErros = {}
    if (!form.aluno_nome.trim()) novosErros.aluno_nome = 'Nome é obrigatório.'
    if (!form.aluno_data_nascimento) novosErros.aluno_data_nascimento = 'Data de nascimento é obrigatória.'
    if (form.aluno_cpf && !validarCPF(form.aluno_cpf)) novosErros.aluno_cpf = 'CPF inválido.'
    if (!form.ensino) novosErros.ensino = 'Ensino é obrigatório.'
    if (!form.serie.trim()) novosErros.serie = 'Série é obrigatória.'
    if (!form.responsavel_nome.trim()) novosErros.responsavel_nome = 'Nome do responsável é obrigatório.'
    if (!form.responsavel_telefone.trim()) novosErros.responsavel_telefone = 'Telefone é obrigatório.'
    if (form.responsavel_cpf && !validarCPF(form.responsavel_cpf)) novosErros.responsavel_cpf = 'CPF inválido.'
    setErros(novosErros)
    return novosErros
  }

  async function handleSalvar() {
    const novosErros = validar()
    if (Object.keys(novosErros).length > 0) {
      // Foca a primeira aba que tem erro.
      if (novosErros.aluno_nome || novosErros.aluno_data_nascimento || novosErros.aluno_cpf || novosErros.ensino || novosErros.serie) {
        setAba('estudante')
      } else if (novosErros.responsavel_nome || novosErros.responsavel_telefone || novosErros.responsavel_cpf) {
        setAba('responsavel')
      }
      return
    }

    setSalvando(true)
    try {
      const intencao = await criarIntencaoVaga(form, autor)
      onCriado?.(intencao)
      setForm(ESTADO_INICIAL)
      setAba('estudante')
      onFechar?.()
    } catch (err) {
      console.error(err)
      alert(`Erro ao criar intenção: ${err.message ?? err}`)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={salvando ? undefined : onFechar}
      titulo="Nova intenção de vaga"
      descricao="Cadastre o interesse de um responsável para análise da equipe."
      tamanho="xl"
      footer={(
        <>
          <Button variante="secondary" onClick={onFechar} disabled={salvando}>Cancelar</Button>
          <Button variante="accent" onClick={handleSalvar} loading={salvando}>
            Salvar intenção
          </Button>
        </>
      )}
    >
      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3 mb-4">
        {ABAS.map((tab) => {
          const Icon = tab.icon
          const ativo = aba === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAba(tab.id)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                ativo ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {aba === 'estudante' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Nome completo"
            value={form.aluno_nome}
            onChange={(e) => atualizar('aluno_nome', e.target.value)}
            error={erros.aluno_nome}
            className="sm:col-span-2"
          />
          <Input
            label="Data de nascimento"
            type="date"
            value={form.aluno_data_nascimento}
            onChange={(e) => atualizar('aluno_data_nascimento', e.target.value)}
            error={erros.aluno_data_nascimento}
          />
          <Input
            label="CPF (opcional)"
            value={form.aluno_cpf}
            onChange={(e) => atualizar('aluno_cpf', formatarCPF(e.target.value))}
            placeholder="000.000.000-00"
            error={erros.aluno_cpf}
          />
          <Select
            label="Sexo"
            value={form.aluno_sexo}
            onChange={(e) => atualizar('aluno_sexo', e.target.value)}
          >
            <option value="">Não informado</option>
            <option value="feminino">Feminino</option>
            <option value="masculino">Masculino</option>
            <option value="outro">Outro</option>
          </Select>
          <Select
            label="Ensino pretendido"
            value={form.ensino}
            onChange={(e) => atualizar('ensino', e.target.value)}
            error={erros.ensino}
          >
            <option value="">Selecione</option>
            {ENSINOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </Select>
          <Input
            label="Série pretendida"
            value={form.serie}
            onChange={(e) => atualizar('serie', e.target.value)}
            placeholder="Ex.: 1º ano, 6º ano, Pré II..."
            error={erros.serie}
          />
          <Select
            label="Turno"
            value={form.turno_preferencia}
            onChange={(e) => atualizar('turno_preferencia', e.target.value)}
          >
            {TURNOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <Input
            label="Ano letivo"
            type="number"
            value={form.ano_letivo}
            onChange={(e) => atualizar('ano_letivo', Number(e.target.value))}
          />
        </div>
      )}

      {aba === 'endereco' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="CEP"
              value={form.endereco.cep}
              onChange={(e) => atualizarEndereco('cep', formatarCEP(e.target.value))}
              onBlur={() => form.endereco.cep && buscarCEP()}
              placeholder="00000-000"
              error={erroCep}
              icon={buscandoCep ? Loader2 : undefined}
            />
          </div>
          <Input
            label="Logradouro"
            value={form.endereco.logradouro}
            onChange={(e) => atualizarEndereco('logradouro', e.target.value)}
            className="sm:col-span-2"
          />
          <Input
            label="Número"
            value={form.endereco.numero}
            onChange={(e) => atualizarEndereco('numero', e.target.value)}
          />
          <Input
            label="Complemento"
            value={form.endereco.complemento}
            onChange={(e) => atualizarEndereco('complemento', e.target.value)}
          />
          <Input
            label="Bairro"
            value={form.endereco.bairro}
            onChange={(e) => atualizarEndereco('bairro', e.target.value)}
          />
          <Input
            label="Cidade"
            value={form.endereco.cidade}
            onChange={(e) => atualizarEndereco('cidade', e.target.value)}
          />
          <Input
            label="UF"
            value={form.endereco.uf}
            onChange={(e) => atualizarEndereco('uf', e.target.value.toUpperCase().slice(0, 2))}
            placeholder="SP"
          />
        </div>
      )}

      {aba === 'responsavel' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Nome completo"
            value={form.responsavel_nome}
            onChange={(e) => atualizar('responsavel_nome', e.target.value)}
            error={erros.responsavel_nome}
            className="sm:col-span-2"
          />
          <Input
            label="Parentesco"
            value={form.responsavel_parentesco}
            onChange={(e) => atualizar('responsavel_parentesco', e.target.value)}
            placeholder="Ex.: Mãe, Pai, Avó..."
          />
          <Input
            label="Telefone"
            value={form.responsavel_telefone}
            onChange={(e) => atualizar('responsavel_telefone', formatarTelefone(e.target.value))}
            error={erros.responsavel_telefone}
            placeholder="(11) 99999-0000"
          />
          <Input
            label="Email"
            type="email"
            value={form.responsavel_email}
            onChange={(e) => atualizar('responsavel_email', e.target.value)}
            placeholder="responsavel@exemplo.com"
          />
          <Input
            label="CPF (opcional)"
            value={form.responsavel_cpf}
            onChange={(e) => atualizar('responsavel_cpf', formatarCPF(e.target.value))}
            placeholder="000.000.000-00"
            error={erros.responsavel_cpf}
          />
        </div>
      )}

      {aba === 'vaga' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Escola de origem"
              value={form.escola_origem_nome}
              onChange={(e) => atualizar('escola_origem_nome', e.target.value)}
              className="sm:col-span-2"
            />
            <Input
              label="Cidade da escola de origem"
              value={form.escola_origem_cidade}
              onChange={(e) => atualizar('escola_origem_cidade', e.target.value)}
            />
            <Input
              label="UF"
              value={form.escola_origem_uf}
              onChange={(e) => atualizar('escola_origem_uf', e.target.value.toUpperCase().slice(0, 2))}
            />
          </div>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/60 text-sm text-amber-900">
            <input
              type="checkbox"
              checked={form.matriculado_em_outro_colegio}
              onChange={(e) => atualizar('matriculado_em_outro_colegio', e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold block">Estudante matriculado em outro colégio</span>
              <span className="text-xs text-amber-800/80 mt-0.5 block">
                Marcará destaque visual e exigirá histórico de encaminhamento. Use em caso de transferência ativa.
              </span>
            </span>
          </label>

          <Textarea
            label="Observações"
            rows={4}
            value={form.observacoes}
            onChange={(e) => atualizar('observacoes', e.target.value)}
            placeholder="Documentos pendentes, observações pedagógicas, contexto familiar..."
          />
        </div>
      )}
    </Modal>
  )
}
