import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { listarTurmas } from '../../services/turmas'
import { usePresenca } from '../../hooks/usePresenca'
import { CheckCircle2, XCircle, Clock, Save, AlertTriangle, CalendarDays, Info, History, X } from 'lucide-react'

const hoje = () => new Date().toISOString().split('T')[0]

const STATUS_BTN = {
  presente: { label: 'P', cor: 'bg-green-500 text-white border-green-500', icon: CheckCircle2 },
  ausente:  { label: 'F', cor: 'bg-red-500 text-white border-red-500',   icon: XCircle },
  justificado: { label: 'J', cor: 'bg-amber-400 text-white border-amber-400', icon: Clock },
}

export default function ChamadaPage() {
  const { user, perfil, escolaId, unidadeAtualId } = useAuth()
  const isDiretor = ['diretor', 'coordenador'].includes(perfil?.perfil)
  const escopo = useMemo(() => ({ escolaId, unidadeAtualId, perfil }), [escolaId, unidadeAtualId, perfil])

  const [turmas, setTurmas]       = useState([])
  const [turmaSel, setTurmaSel]   = useState('')
  const [data, setData]           = useState(hoje())
  const [sucesso, setSucesso]     = useState(false)
  const [historicoAberto, setHistoricoAberto] = useState(false)
  const [historico, setHistorico] = useState([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)

  const {
    alunos,
    presencas: chamada,
    carregando,
    erro,
    setErro,
    chamadaExistente: jaExiste,
    diaLetivo: statusCalendario,
    bloqueada48h: bloqueada,
    salvando,
    contagem,
    marcarPresenca,
    salvar: salvarChamadaHook,
    carregarHistorico,
  } = usePresenca({ turmaId: turmaSel, data, professorId: user?.uid, contexto: escopo })

  const { presentes, ausentes, justificados } = contagem

  // Carrega turmas (professor vê só as suas)
  useEffect(() => {
    listarTurmas(undefined, escopo).then(todas => {
      if (isDiretor) { setTurmas(todas); return }
      const minhas = todas.filter(t => perfil?.turmas_ids?.includes(t.id))
      setTurmas(minhas)
      if (minhas.length === 1) setTurmaSel(minhas[0].id)
    })
  }, [escopo, isDiretor, perfil?.turmas_ids])

  // Reset de feedback ao trocar filtros
  useEffect(() => { setSucesso(false) }, [turmaSel, data])

  async function abrirHistorico() {
    if (!turmaSel) return
    setHistoricoAberto(true)
    setCarregandoHistorico(true)
    setErro('')
    try {
      const lista = await carregarHistorico(12)
      setHistorico(lista)
    } catch (err) {
      console.error(err)
      setErro('Erro ao carregar histórico de chamadas.')
      setHistorico([])
    } finally {
      setCarregandoHistorico(false)
    }
  }

  function marcar(alunoId, status) {
    marcarPresenca(alunoId, status, chamada[alunoId]?.justificativa)
  }

  async function salvar() {
    const result = await salvarChamadaHook()
    if (!result.ok) {
      if (result.motivo === 'justificativa_curta') {
        alert(`Justificativa obrigatória (mínimo 10 caracteres) para: ${result.aluno?.nome_completo}`)
      } else if (result.motivo === 'erro_salvar') {
        alert('Erro ao salvar. Tente novamente.')
      }
      return
    }
    setSucesso(true)
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Chamada / Presença</h1>
        <p className="text-slate-500 text-sm mt-0.5">Registro diário de frequência</p>
      </div>

      {/* Seletores */}
      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-44">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Turma</label>
          <select value={turmaSel} onChange={e => setTurmaSel(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">Selecione uma turma</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Data</label>
          <input type="date" value={data} onChange={e => setData(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {turmaSel && (
          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              onClick={abrirHistorico}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <History size={14} /> Histórico
            </button>
            <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
              <CheckCircle2 size={14} /> {presentes}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
              <XCircle size={14} /> {ausentes}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
              <Clock size={14} /> {justificados}
            </span>
          </div>
        )}
      </div>

      {/* Avisos */}
      {erro && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3 rounded-xl">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}

      {statusCalendario && !statusCalendario.ehLetivo && turmaSel && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3 rounded-xl">
          <Info size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Esta data não é um dia letivo</p>
            <p className="text-xs text-rose-700 mt-0.5">
              {statusCalendario.tipo === 'feriado' && `Feriado: ${statusCalendario.descricao}`}
              {statusCalendario.tipo === 'recesso' && `Recesso: ${statusCalendario.descricao || 'período de recesso escolar'}`}
              {statusCalendario.tipo === 'fim_semana' && 'Sábado ou domingo'}
              {statusCalendario.tipo === 'evento' && `Evento: ${statusCalendario.descricao}`}
              {' · A chamada não deve ser registrada.'}
            </p>
          </div>
        </div>
      )}
      {jaExiste && !bloqueada && !sucesso && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-3 rounded-xl">
          <CalendarDays size={16} /> Chamada já registrada para este dia.
        </div>
      )}
      {sucesso && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
          <CheckCircle2 size={16} /> Chamada salva com sucesso!
        </div>
      )}
      {bloqueada && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-xl">
          <AlertTriangle size={16} /> Chamada bloqueada (prazo de 48h expirado). Solicite edição ao Coordenador.
        </div>
      )}

      {/* Lista de alunos */}
      {turmaSel && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {carregando ? (
            <div className="flex justify-center items-center h-48">
              <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : alunos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <p className="text-sm">Nenhum aluno matriculado nesta turma</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-50">
                {alunos.map((aluno, idx) => {
                  const c = chamada[aluno.id] ?? { status: 'presente', justificativa: '' }
                  return (
                    <div key={aluno.id} className="px-5 py-3 flex items-center gap-4">
                      <span className="text-sm text-slate-400 w-6 text-right shrink-0">{idx + 1}</span>
                      <p className="flex-1 text-sm font-medium text-slate-800">{aluno.nome_completo}</p>

                      {/* Botões P/F/J */}
                      <div className="flex gap-1.5 shrink-0">
                        {Object.entries(STATUS_BTN).map(([s, cfg]) => (
                          <button
                            key={s}
                            onClick={() => marcar(aluno.id, s)}
                            disabled={bloqueada}
                            className={`w-9 h-9 rounded-lg border-2 text-sm font-bold transition-all ${
                              c.status === s ? cfg.cor : 'border-slate-200 text-slate-400 hover:border-slate-400'
                            } ${bloqueada ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            {cfg.label}
                          </button>
                        ))}
                      </div>

                      {/* Justificativa */}
                      {c.status === 'justificado' && (
                        <input
                          value={c.justificativa}
                          onChange={e => marcarPresenca(aluno.id, 'justificado', e.target.value)}
                          placeholder="Motivo (mín. 10 caracteres)"
                          className="text-sm border border-amber-200 rounded-lg px-3 py-1.5 w-60 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50"
                        />
                      )}
                    </div>
                  )
                })}
              </div>

              {!bloqueada && (
                <div className="px-5 py-4 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={salvar}
                    disabled={salvando}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
                  >
                    {salvando
                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Save size={15} />}
                    {salvando ? 'Salvando...' : 'Salvar Chamada'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!turmaSel && (
        <div className="flex flex-col items-center justify-center h-64 text-slate-300">
          <CalendarDays size={48} className="mb-3" />
          <p className="text-sm text-slate-400">Selecione uma turma para registrar a chamada</p>
        </div>
      )}

      {historicoAberto && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Histórico de chamadas</h2>
                <p className="text-xs text-slate-500">Últimos registros da turma selecionada</p>
              </div>
              <button
                onClick={() => setHistoricoAberto(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[65vh]">
              {carregandoHistorico ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : historico.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  Nenhuma chamada registrada para esta turma.
                </div>
              ) : (
                <div className="space-y-3">
                  {historico.map(item => {
                    const presentes = item.registros.filter(r => r.status === 'presente').length
                    const ausentes = item.registros.filter(r => r.status === 'ausente').length
                    const justificados = item.registros.filter(r => r.status === 'justificado').length
                    return (
                      <button
                        key={item.data}
                        type="button"
                        onClick={() => {
                          setData(item.data)
                          setHistoricoAberto(false)
                        }}
                        className="w-full text-left border border-slate-200 rounded-xl px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {new Date(`${item.data}T00:00:00`).toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-xs text-slate-500">{item.registros.length} registros</p>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded">{presentes} P</span>
                            <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-1 rounded">{ausentes} F</span>
                            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded">{justificados} J</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
