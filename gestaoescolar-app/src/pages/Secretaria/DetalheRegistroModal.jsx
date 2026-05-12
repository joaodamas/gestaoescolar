import { useEffect, useMemo, useState } from 'react'
import {
  Clock, AlertCircle, ArrowRightCircle, FileBadge, Printer,
  Mail, Phone, User, MapPin, Building2
} from 'lucide-react'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { Select, Textarea } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Card'
import {
  SITUACOES_INTENCAO, SITUACOES_MATRICULA,
  atualizarSituacaoIntencao, converterIntencaoEmMatricula, atualizarSituacaoMatricula,
  buscarIntencaoVaga,
} from '../../services/intencoesVaga'
import { listarTurmas } from '../../services/turmas'
import { buscarConfiguracoes } from '../../services/configuracoes'
import { gerarDeclaracaoMatricula } from './declaracaoPdf'
import { useAuth } from '../../context/AuthContext'

function formatarTimestamp(valor) {
  if (!valor) return '—'
  try {
    if (typeof valor === 'string') {
      return new Date(valor).toLocaleString('pt-BR')
    }
    if (valor.toDate) return valor.toDate().toLocaleString('pt-BR')
  } catch (err) {
    console.warn('Timestamp inválido:', err)
  }
  return String(valor)
}

function SituacaoBadge({ situacao, mapa }) {
  const cfg = mapa?.[situacao]
  if (!cfg) return <Badge variante="slate">{situacao || 'Não informada'}</Badge>
  return <Badge variante={cfg.variante}>{cfg.label}</Badge>
}

function Timeline({ historico = [], mapa }) {
  if (!historico.length) {
    return (
      <p className="text-xs text-slate-500 italic">Sem histórico registrado.</p>
    )
  }
  const ordenado = [...historico].sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''))
  return (
    <ol className="relative border-l border-slate-200 pl-4 space-y-3">
      {ordenado.map((entrada, idx) => (
        <li key={`${entrada.data}-${idx}`} className="relative">
          <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white" />
          <div className="flex flex-wrap items-center gap-2">
            <SituacaoBadge situacao={entrada.situacao} mapa={mapa} />
            <span className="text-xs text-slate-500">{formatarTimestamp(entrada.data)}</span>
          </div>
          <p className="text-sm text-slate-800 mt-1">{entrada.motivo || '—'}</p>
          {entrada.usuario_nome && (
            <p className="text-xs text-slate-500 mt-0.5">por {entrada.usuario_nome}</p>
          )}
        </li>
      ))}
    </ol>
  )
}

function CampoLinha({ icone: Icone, label, valor }) {
  return (
    <div className="flex items-start gap-2 py-1">
      {Icone && <Icone size={14} className="mt-0.5 text-slate-400 shrink-0" />}
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">{label}</p>
        <p className="text-sm text-slate-800 break-words">{valor || '—'}</p>
      </div>
    </div>
  )
}

export default function DetalheRegistroModal({ aberto, onFechar, registro, autor, onAtualizado }) {
  const { perfil, escolaId, unidadeAtualId } = useAuth()
  const escopo = useMemo(() => ({ escolaId, unidadeAtualId, perfil }), [escolaId, unidadeAtualId, perfil])
  const [intencao, setIntencao] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [novaSituacao, setNovaSituacao] = useState('')
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [turmas, setTurmas] = useState([])
  const [turmaSel, setTurmaSel] = useState('')
  const [convertendo, setConvertendo] = useState(false)
  const [imprimindo, setImprimindo] = useState(false)

  const ehIntencao = registro?.tipo === 'intencao_vaga'
  const mapaSituacao = ehIntencao ? SITUACOES_INTENCAO : SITUACOES_MATRICULA
  const situacaoAtual = intencao?.situacao ?? registro?.situacao
  const terminal = ehIntencao && mapaSituacao[situacaoAtual]?.terminal

  // Carrega snapshot completo (incluindo endereço + histórico) se intenção.
  useEffect(() => {
    if (!aberto || !registro) {
      setIntencao(null)
      setNovaSituacao('')
      setMotivo('')
      setErro('')
      return
    }
    if (!ehIntencao) {
      setIntencao(registro)
      return
    }
    setCarregando(true)
    buscarIntencaoVaga(registro.id)
      .then((doc) => setIntencao(doc ?? registro))
      .catch((err) => {
        console.error(err)
        setErro('Falha ao carregar detalhes da intenção.')
      })
      .finally(() => setCarregando(false))
  }, [aberto, registro, ehIntencao])

  // Carrega turmas só quando intenção homologada (necessário para conversão).
  useEffect(() => {
    if (!aberto || !ehIntencao) return
    if (situacaoAtual !== 'homologada' && situacaoAtual !== 'excecao') return
    listarTurmas(intencao?.ano_letivo ?? registro?.ano_letivo, escopo)
      .then(setTurmas)
      .catch((err) => console.warn('Falha ao carregar turmas:', err))
  }, [aberto, ehIntencao, situacaoAtual, intencao?.ano_letivo, registro?.ano_letivo, escopo])

  async function aplicarNovaSituacao() {
    setErro('')
    if (!novaSituacao) { setErro('Selecione a nova situação.'); return }
    if (motivo.trim().length < 5) { setErro('Motivo deve ter pelo menos 5 caracteres.'); return }
    setSalvando(true)
    try {
      if (ehIntencao) {
        await atualizarSituacaoIntencao({ id: registro.id, novaSituacao, motivo, autor })
      } else {
        await atualizarSituacaoMatricula({ id: registro.id, novaSituacao, motivo, autor })
      }
      setNovaSituacao('')
      setMotivo('')
      onAtualizado?.()
      // Recarrega o snapshot para refletir histórico.
      if (ehIntencao) {
        const atualizado = await buscarIntencaoVaga(registro.id)
        setIntencao(atualizado)
      }
    } catch (err) {
      console.error(err)
      setErro(err.message ?? 'Erro ao atualizar situação.')
    } finally {
      setSalvando(false)
    }
  }

  async function converterEmMatricula() {
    setErro('')
    if (!turmaSel) { setErro('Selecione uma turma para a conversão.'); return }
    const turma = turmas.find(t => t.id === turmaSel)
    setConvertendo(true)
    try {
      const resultado = await converterIntencaoEmMatricula({
        id: registro.id,
        turmaId: turmaSel,
        turmaNome: turma?.nome ?? '',
        autor,
      })
      onAtualizado?.()
      alert(`Matrícula criada com protocolo ${resultado.protocolo}.`)
      const atualizado = await buscarIntencaoVaga(registro.id)
      setIntencao(atualizado)
    } catch (err) {
      console.error(err)
      setErro(err.message ?? 'Falha ao converter em matrícula.')
    } finally {
      setConvertendo(false)
    }
  }

  async function imprimirDeclaracao() {
    if (ehIntencao) { setErro('Declaração disponível apenas para matrículas formais.'); return }
    setImprimindo(true)
    setErro('')
    try {
      const escola = await buscarConfiguracoes().catch(() => null)
      await gerarDeclaracaoMatricula({ matricula: registro, escola, autor })
    } catch (err) {
      console.error(err)
      setErro('Falha ao gerar declaração.')
    } finally {
      setImprimindo(false)
    }
  }

  if (!registro) return null

  const dados = intencao ?? registro
  const endereco = dados.endereco

  const opcoesSituacao = Object.entries(mapaSituacao)
    .filter(([chave, cfg]) => !cfg.terminal || ehIntencao)
    .filter(([chave]) => chave !== situacaoAtual)

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={ehIntencao ? 'Detalhe da intenção de vaga' : 'Detalhe da matrícula'}
      descricao={`${dados.protocolo ? `Protocolo ${dados.protocolo} · ` : ''}Ano letivo ${dados.ano_letivo}`}
      tamanho="xl"
    >
      {carregando && (
        <div className="text-center text-sm text-slate-500 py-6">Carregando dados...</div>
      )}

      {erro && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm px-3 py-2">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Coluna 1 — identificação */}
        <section className="space-y-4">
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/40">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Situação atual</p>
              <SituacaoBadge situacao={situacaoAtual} mapa={mapaSituacao} />
            </div>
            <CampoLinha icone={User}     label="Aluno(a)" valor={dados.aluno_nome} />
            <CampoLinha icone={FileBadge} label="RA"       valor={dados.aluno_ra} />
            <CampoLinha                   label="Ensino"   valor={dados.ensino} />
            <CampoLinha                   label="Série"    valor={dados.serie} />
            <CampoLinha icone={Building2} label="Turma"    valor={dados.turma_nome || dados.turma_id} />

            {dados.matriculado_em_outro_colegio && (
              <div className="mt-2 px-2 py-1 text-xs font-medium rounded bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                <AlertCircle size={12} /> Matriculado em outro colégio
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Responsável</p>
            <CampoLinha icone={User}  label="Nome"     valor={dados.responsavel_nome} />
            <CampoLinha icone={Phone} label="Telefone" valor={dados.responsavel_telefone} />
            <CampoLinha icone={Mail}  label="Email"    valor={dados.responsavel_email} />
            <CampoLinha label="Parentesco" valor={dados.responsavel_parentesco} />
          </div>

          {endereco && (
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Endereço</p>
              <CampoLinha icone={MapPin} label="Logradouro" valor={[endereco.logradouro, endereco.numero].filter(Boolean).join(', ')} />
              <CampoLinha label="Complemento" valor={endereco.complemento} />
              <CampoLinha label="Bairro"      valor={endereco.bairro} />
              <CampoLinha label="Cidade/UF"   valor={[endereco.cidade, endereco.uf].filter(Boolean).join(' / ')} />
              <CampoLinha label="CEP"         valor={endereco.cep} />
            </div>
          )}
        </section>

        {/* Coluna 2 — workflow + timeline */}
        <section className="space-y-4">
          {!terminal && (
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Atualizar situação</p>
              <Select
                label="Nova situação"
                value={novaSituacao}
                onChange={(e) => setNovaSituacao(e.target.value)}
              >
                <option value="">Selecione</option>
                {opcoesSituacao.map(([chave, cfg]) => (
                  <option key={chave} value={chave}>{cfg.label}</option>
                ))}
              </Select>
              <Textarea
                label="Motivo / observação"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Explique o motivo da mudança (mín. 5 caracteres). Será registrado em auditoria."
              />
              <Button variante="accent" icon={Clock} onClick={aplicarNovaSituacao} loading={salvando}>
                Aplicar mudança
              </Button>
            </div>
          )}

          {ehIntencao && (situacaoAtual === 'homologada' || situacaoAtual === 'excecao') && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Converter em matrícula</p>
              <Select
                label="Turma destino"
                value={turmaSel}
                onChange={(e) => setTurmaSel(e.target.value)}
              >
                <option value="">Selecione a turma</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </Select>
              <Button variante="success" icon={ArrowRightCircle} onClick={converterEmMatricula} loading={convertendo}>
                Converter em matrícula
              </Button>
            </div>
          )}

          {!ehIntencao && (
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Documentos oficiais</p>
              <Button variante="secondary" icon={Printer} onClick={imprimirDeclaracao} loading={imprimindo}>
                Imprimir declaração de matrícula
              </Button>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Histórico de situação</p>
            <Timeline historico={dados.historico_situacao ?? []} mapa={mapaSituacao} />
          </div>
        </section>
      </div>
    </Modal>
  )
}
