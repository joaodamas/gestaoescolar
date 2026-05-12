import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, getDocs, doc, getDoc, limit } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { listarResponsaveis } from '../../services/responsaveis'
import { listarMatriculasDoAluno } from '../../services/matriculas'
import { listarCalendario } from '../../services/calendario'
import { auditarAcao } from '../../services/auditoria'
import { useAuth } from '../../context/AuthContext'
import { mascararCPF, mascararTelefone } from '../../utils/mascaramento'
import { baixarPDF, slugify, Document } from '../../utils/exportPDF'
import { resumirFrequencia } from '../../utils/frequencia'
import { AlunoLGPDDocumento } from './documentos/AlunoLGPDDocumento'
import {
  User, Heart, BookOpen, Calendar, Users as UsersIcon,
  GraduationCap, AlertTriangle, MapPin, Mail, Phone,
  FileText, ShieldCheck, TrendingUp, Activity
} from 'lucide-react'
import Modal from '../../components/ui/Modal'
import { Badge, EmptyState, Spinner } from '../../components/ui/Card'
import Button from '../../components/ui/Button'

const ABAS = [
  { id: 'dados',       label: 'Dados Pessoais',   icon: User },
  { id: 'historico',   label: 'Histórico',        icon: Calendar },
  { id: 'presencas',   label: 'Presença',         icon: TrendingUp },
  { id: 'notas',       label: 'Notas',            icon: BookOpen },
  { id: 'ocorrencias', label: 'Ocorrências',      icon: AlertTriangle },
]

const STATUS_OCORR = {
  aberta: 'red', em_andamento: 'yellow', resolvida: 'green',
}

export default function PerfilAlunoModal({ aluno, aberto, onFechar }) {
  const { user, perfil } = useAuth()
  const [aba, setAba] = useState('dados')
  const [responsaveis, setResponsaveis] = useState([])
  const [historico, setHistorico] = useState([])
  const [presencas, setPresencas] = useState({
    presentes: 0,
    ausentes: 0,
    justificados: 0,
    total: 0,
    frequencia_real: 0,
    frequencia_limite: 0,
    percentual_faltas_limite: 0,
  })
  const [notas, setNotas] = useState([])
  const [ocorrencias, setOcorrencias] = useState([])
  const [turmasMap, setTurmasMap] = useState({})
  const [carregando, setCarregando] = useState(false)
  const [gerandoPdf, setGerandoPdf] = useState(false)

  useEffect(() => {
    if (!aberto || !aluno) return
    setAba('dados')

    async function carregarDados() {
      setCarregando(true)
      try {
        // Responsáveis
        const resps = await listarResponsaveis(aluno.id)
        setResponsaveis(resps)

        // Histórico de matrículas
        const matriculas = await listarMatriculasDoAluno(aluno.id)
        setHistorico(matriculas)

        // Turmas (para mostrar nome)
        const turmaIds = [...new Set(matriculas.map(m => m.turma_id))]
        const tm = {}
        await Promise.all(turmaIds.map(async tid => {
          const snap = await getDoc(doc(db, 'turmas', tid))
          if (snap.exists()) tm[tid] = snap.data()
        }))
        setTurmasMap(tm)

        // Presenças (resumo) - exclui feriados/recessos e separa frequência real da regra legal
        const presSnap = await getDocs(query(collection(db, 'presencas'), where('aluno_id', '==', aluno.id)))
        const registrosPresenca = presSnap.docs.map(d => d.data())
        const anosPresenca = [...new Set(registrosPresenca.map(p => Number(p.ano_letivo) || Number(p.data?.slice(0, 4))).filter(Boolean))]
        const eventosCalendario = (await Promise.all(anosPresenca.map(ano => listarCalendario(ano)))).flat()
        setPresencas(resumirFrequencia(registrosPresenca, eventosCalendario))

        // Últimas notas
        const notasSnap = await getDocs(query(
          collection(db, 'notas'),
          where('aluno_id', '==', aluno.id),
          orderBy('ano_letivo', 'desc'),
          limit(20)
        ))
        setNotas(notasSnap.docs.map(d => ({ id: d.id, ...d.data() })))

        // Ocorrências
        const ocorrSnap = await getDocs(query(
          collection(db, 'ocorrencias'),
          where('aluno_id', '==', aluno.id),
          orderBy('data_ocorrencia', 'desc')
        ))
        setOcorrencias(ocorrSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (err) {
        console.error('Erro ao carregar perfil:', err)
      } finally {
        setCarregando(false)
      }
    }

    carregarDados()
  }, [aberto, aluno])

  useEffect(() => {
    if (!aberto || !aluno?.id || !user?.uid) return
    if (!aluno.saude || Object.keys(aluno.saude).length === 0) return

    auditarAcao({
      usuarioId: user.uid,
      perfil: perfil?.perfil,
      acao: 'ACESSO_DADOS_MEDICOS_ALUNO',
      modulo: 'alunos',
      entidade: 'alunos',
      entidadeId: aluno.id,
      valorNovo: { aluno_id: aluno.id, campos: Object.keys(aluno.saude) },
      motivo: 'Acesso ao perfil do aluno com dados de saúde/acessibilidade.',
    }).catch(err => console.warn('Falha ao auditar acesso a dados médicos:', err))
  }, [aberto, aluno?.id, user?.uid, perfil?.perfil])

  if (!aluno) return null

  const idade = aluno.data_nascimento
    ? Math.floor((Date.now() - new Date(aluno.data_nascimento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  const presencaPct = Math.round(presencas.frequencia_real ?? 0)
  const presencaLimitePct = Math.round(presencas.frequencia_limite ?? 0)
  const faltasLimitePct = presencas.percentual_faltas_limite ?? 0

  const iniciais = aluno.nome_completo?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() ?? '?'

  async function exportarPDF() {
    setGerandoPdf(true)
    try {
      const documento = (
        <Document>
          <AlunoLGPDDocumento
            dados={{
              aluno,
              responsaveis,
              historico,
              presencas,
              notas,
              ocorrencias,
              turmasMap,
              dataGeracao: new Date().toLocaleString('pt-BR'),
            }}
          />
        </Document>
      )
      await baixarPDF(documento, `dados-aluno-${slugify(aluno.nome_completo || aluno.id)}.pdf`)
    } catch (err) {
      console.error('Erro ao exportar dados do aluno:', err)
    } finally {
      setGerandoPdf(false)
    }
  }

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={null} tamanho="xl">
      {/* Hero do aluno */}
      <div className="-mx-6 -mt-5 mb-4 px-6 pb-5 pt-2 border-b border-slate-100">
        <div className="flex items-center gap-4">
          {aluno.foto_url ? (
            <img src={aluno.foto_url} alt="" className="w-16 h-16 rounded-2xl object-cover shadow-lg shrink-0" />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg shrink-0">
              {iniciais}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-slate-900 truncate">{aluno.nome_completo}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variante={aluno.status === 'ativo' ? 'green' : 'slate'}>
                {aluno.status}
              </Badge>
              {idade !== null && <span className="text-xs text-slate-500">{idade} anos</span>}
              {aluno.ra && <span className="text-xs text-slate-500 font-mono">RA {aluno.ra}</span>}
              <span className="text-xs text-slate-400 font-mono">{mascararCPF(aluno.cpf)}</span>
            </div>
          </div>
          {historico[0] && turmasMap[historico[0].turma_id] && (
            <div className="text-right shrink-0">
              <p className="text-xs text-slate-400 font-medium">Turma atual</p>
              <p className="text-sm font-bold text-slate-900">{turmasMap[historico[0].turma_id].nome}</p>
              <p className="text-xs text-slate-500">{historico[0].numero_matricula}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {ABAS.map(a => {
          const Icon = a.icon
          return (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                aba === a.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon size={13} /> {a.label}
            </button>
          )
        })}
      </div>

      {carregando ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <>
          {aba === 'dados' && (
            <div className="space-y-5">
              {/* Dados pessoais */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Dados Pessoais</h3>
                <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-x-4 gap-y-3">
                  <Info label="Nome Completo" valor={aluno.nome_completo} />
                  <Info label="Sexo" valor={aluno.sexo === 'M' ? 'Masculino' : aluno.sexo === 'F' ? 'Feminino' : aluno.sexo || '—'} />
                  <Info label="Data de Nascimento" valor={aluno.data_nascimento ? new Date(aluno.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} />
                  <Info label="CPF (mascarado)" valor={mascararCPF(aluno.cpf)} mono />
                  <Info label="RA (Registro do Aluno)" valor={aluno.ra || '—'} mono />
                  {aluno.necessidades_especiais && (
                    <div className="col-span-2 flex items-start gap-2 mt-1 pt-3 border-t border-slate-200">
                      <Heart size={14} className="text-rose-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Necessidades Especiais</p>
                        <p className="text-sm text-slate-700">{aluno.necessidades_especiais}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Saúde e acessibilidade */}
              {aluno.saude && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Heart size={12} /> Saúde e Acessibilidade
                  </h3>
                  <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                    <Info label="Tem deficiência" valor={aluno.saude.tem_deficiencia ? 'Sim' : 'Não'} />
                    <Info label="Tem doença/condição" valor={aluno.saude.tem_doenca ? 'Sim' : 'Não'} />
                    <Info label="Tem alergia" valor={aluno.saude.tem_alergia ? 'Sim' : 'Não'} />
                    <Info label="Plano de saúde" valor={aluno.saude.plano_saude || '—'} />
                    {aluno.saude.deficiencia_descricao && <Info label="Acessibilidade" valor={aluno.saude.deficiencia_descricao} />}
                    {aluno.saude.doencas && <Info label="Doenças/Condições" valor={aluno.saude.doencas} />}
                    {aluno.saude.alergias && <Info label="Alergias" valor={aluno.saude.alergias} />}
                    {aluno.saude.alergias_alimentares && <Info label="Alergias Alimentares" valor={aluno.saude.alergias_alimentares} />}
                    {aluno.saude.restricoes_alimentares && <Info label="Restrições Alimentares" valor={aluno.saude.restricoes_alimentares} />}
                    {aluno.saude.medicamentos_continuos && <Info label="Medicamentos Contínuos" valor={aluno.saude.medicamentos_continuos} />}
                    {(aluno.saude.contato_emergencia_nome || aluno.saude.contato_emergencia_telefone) && (
                      <Info
                        label="Contato de Emergência"
                        valor={`${aluno.saude.contato_emergencia_nome || '—'} · ${mascararTelefone(aluno.saude.contato_emergencia_telefone)}`}
                      />
                    )}
                    {aluno.saude.observacoes_saude && (
                      <div className="md:col-span-2">
                        <Info label="Observações" valor={aluno.saude.observacoes_saude} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Endereço */}
              {aluno.endereco?.cep && (
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <MapPin size={12} /> Endereço
                  </h3>
                  <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700">
                    <p>{aluno.endereco.logradouro}, {aluno.endereco.numero}{aluno.endereco.complemento ? ` — ${aluno.endereco.complemento}` : ''}</p>
                    <p className="text-slate-500 text-xs mt-1">
                      {aluno.endereco.bairro} · {aluno.endereco.cidade}/{aluno.endereco.uf}
                      <span className="ml-2 font-mono">CEP {aluno.endereco.cep}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Responsáveis */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <UsersIcon size={12} /> Responsáveis ({responsaveis.length})
                </h3>
                {responsaveis.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 rounded-xl p-4">Nenhum responsável vinculado.</p>
                ) : (
                  <div className="space-y-2">
                    {responsaveis.map(r => (
                      <div key={r.id} className="bg-slate-50 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <p className="text-sm font-semibold text-slate-900 truncate">{r.nome}</p>
                              <Badge variante="slate">{r.parentesco}</Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                              {r.telefone && <span className="flex items-center gap-1"><Phone size={11} />{mascararTelefone(r.telefone)}</span>}
                              {r.email && <span className="flex items-center gap-1"><Mail size={11} />{r.email}</span>}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 items-end shrink-0">
                            {r.responsavel_financeiro && <Badge variante="blue">Financeiro</Badge>}
                            {r.responsavel_pedagogico && <Badge variante="purple">Pedagógico</Badge>}
                          </div>
                        </div>
                        {r.consentimento_lgpd && (
                          <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-1.5 text-[11px] text-emerald-700">
                            <ShieldCheck size={11} /> Consentimento LGPD registrado
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {aba === 'historico' && (
            <div>
              {historico.length === 0 ? (
                <EmptyState icon={Calendar} titulo="Sem histórico de matrículas" />
              ) : (
                <div className="space-y-2">
                  {historico.map((m, i) => {
                    const t = turmasMap[m.turma_id]
                    return (
                      <div key={m.id} className="bg-slate-50 rounded-xl p-4 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          m.status === 'ativa' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                        }`}>
                          <GraduationCap size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {t?.nome ?? 'Turma'} · Ano {m.ano_letivo}
                          </p>
                          <p className="text-xs text-slate-500">
                            Matrícula {m.numero_matricula}
                            {m.data_matricula && ` · ${new Date(m.data_matricula + 'T00:00:00').toLocaleDateString('pt-BR')}`}
                          </p>
                        </div>
                        <Badge variante={m.status === 'ativa' ? 'green' : 'slate'}>{m.status}</Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {aba === 'presencas' && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Presença</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{presencaPct}%</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                  <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Presentes</p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">{presencas.presentes}</p>
                </div>
                <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
                  <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Ausentes</p>
                  <p className="text-2xl font-bold text-rose-700 mt-1">{presencas.ausentes}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Justificados</p>
                  <p className="text-2xl font-bold text-amber-700 mt-1">{presencas.justificados}</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 text-slate-700 text-sm px-4 py-3 rounded-xl">
                <p className="font-semibold">Frequência para limite legal: {presencaLimitePct}%</p>
                <p className="text-xs text-slate-500 mt-1">
                  Faltas justificadas permanecem no histórico real, mas não entram no limite de 25%.
                </p>
              </div>

              {faltasLimitePct >= 25 && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <div>
                    <p className="font-semibold">Alerta: faltas acima do limite</p>
                    <p className="text-xs">Aluno atingiu {Math.round(faltasLimitePct)}% de faltas não justificadas — necessita acompanhamento.</p>
                  </div>
                </div>
              )}

              {presencas.total === 0 && (
                <EmptyState icon={TrendingUp} titulo="Sem registros de presença" descricao="A chamada ainda não foi feita para este aluno." />
              )}
            </div>
          )}

          {aba === 'notas' && (
            <div>
              {notas.length === 0 ? (
                <EmptyState icon={BookOpen} titulo="Sem notas lançadas" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 py-2">Ano</th>
                        <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 py-2">Bim.</th>
                        <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 py-2">Nota</th>
                        <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 py-2">Situação</th>
                        <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {notas.map(n => (
                        <tr key={n.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-sm text-slate-600">{n.ano_letivo}</td>
                          <td className="px-3 py-2 text-sm text-slate-600">{n.bimestre}º</td>
                          <td className="px-3 py-2 text-sm font-bold text-slate-900">{Number(n.nota ?? n.media_bimestral ?? 0).toFixed(1)}</td>
                          <td className="px-3 py-2">
                            {n.situacao && (
                              <Badge variante={n.situacao === 'aprovado' ? 'green' : n.situacao === 'recuperacao' ? 'yellow' : 'red'}>
                                {n.situacao}
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variante={n.fechado ? 'slate' : 'blue'}>{n.fechado ? 'Fechado' : 'Aberto'}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {aba === 'ocorrencias' && (
            <div>
              {ocorrencias.length === 0 ? (
                <EmptyState icon={AlertTriangle} titulo="Sem ocorrências registradas" descricao="Aluno sem histórico de ocorrências disciplinares ou médicas." />
              ) : (
                <div className="space-y-2">
                  {ocorrencias.map(o => (
                    <div key={o.id} className="bg-slate-50 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          o.gravidade === 'alta' ? 'bg-rose-100 text-rose-600' :
                          o.gravidade === 'media' ? 'bg-amber-100 text-amber-600' :
                          'bg-slate-200 text-slate-500'
                        }`}>
                          <AlertTriangle size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variante="slate">{o.tipo}</Badge>
                            <Badge variante={o.gravidade === 'alta' ? 'red' : o.gravidade === 'media' ? 'yellow' : 'green'}>
                              {o.gravidade}
                            </Badge>
                            <Badge variante={STATUS_OCORR[o.status] ?? 'slate'}>{o.status}</Badge>
                          </div>
                          <p className="text-sm text-slate-700 mb-1">{o.descricao}</p>
                          {o.providencia && <p className="text-xs text-slate-500">Providência: {o.providencia}</p>}
                          <p className="text-[11px] text-slate-400 mt-1">
                            {o.data_ocorrencia && new Date(o.data_ocorrencia + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-100">
        <p className="text-[11px] text-slate-400 flex items-center gap-1">
          <ShieldCheck size={11} /> Dados mascarados conforme LGPD
        </p>
        <Button variante="secondary" icon={FileText} loading={gerandoPdf} onClick={exportarPDF}>
          Exportar PDF
        </Button>
      </div>
    </Modal>
  )
}

function Info({ label, valor, mono }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm text-slate-800 ${mono ? 'font-mono' : ''}`}>{valor ?? '—'}</p>
    </div>
  )
}
