import { useEffect, useMemo, useState, useCallback } from 'react'
import { alunoResumoDaMatricula, listarMatriculasDaTurma } from '../services/matriculas'
import {
  salvarChamada,
  buscarChamadaDoDia,
  historicoChamadas,
} from '../services/presencas'
import { verificarDiaLetivo } from '../services/calendario'

/**
 * Hook que encapsula a lógica de chamada/presença para uma turma + data.
 *
 * Retorna estados, derivados (presentes/ausentes/justificados) e métodos
 * para marcar presença, salvar a chamada e consultar histórico.
 *
 * NÃO altera comportamento da UI — apenas extrai a lógica de `ChamadaPage.jsx`.
 */
export function usePresenca({ turmaId, data, professorId, contexto = {} } = {}) {
  const [alunos, setAlunos] = useState([])
  const [presencas, setPresencas] = useState({}) // { [alunoId]: { status, justificativa } }
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  const [chamadaExistente, setChamadaExistente] = useState(false)
  const [diaLetivo, setDiaLetivo] = useState(null) // { ehLetivo, tipo, descricao }
  const [bloqueada48h, setBloqueada48h] = useState(false)

  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  // Carrega matrículas + verifica calendário + checa chamada existente.
  useEffect(() => {
    if (!turmaId || !data) {
      setAlunos([])
      setPresencas({})
      setChamadaExistente(false)
      setBloqueada48h(false)
      return
    }

    let cancelado = false
    setCarregando(true)
    setSucesso(false)
    setErro('')

    async function carregar() {
      const ano = new Date().getFullYear()
      const statusCal = await verificarDiaLetivo(data, ano, contexto)
      if (cancelado) return
      setDiaLetivo(statusCal)

      const matriculas = await listarMatriculasDaTurma(turmaId, ano, contexto)
      const lista = matriculas
        .map(alunoResumoDaMatricula)
        .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, 'pt-BR'))
      if (cancelado) return
      setAlunos(lista)

      const existentes = await buscarChamadaDoDia(turmaId, data, contexto)
      if (cancelado) return

      if (existentes.length > 0) {
        setChamadaExistente(true)
        const sample = existentes[0]
        const editavel = sample.editavel_ate?.toDate?.()
        setBloqueada48h(editavel ? editavel < new Date() : false)
        const estado = {}
        existentes.forEach(p => {
          estado[p.aluno_id] = {
            status: p.status,
            justificativa: p.justificativa ?? '',
          }
        })
        setPresencas(estado)
      } else {
        setChamadaExistente(false)
        setBloqueada48h(false)
        const estado = {}
        lista.forEach(a => {
          estado[a.id] = { status: 'presente', justificativa: '' }
        })
        setPresencas(estado)
      }
    }

    carregar()
      .catch(err => {
        console.error(err)
        if (!cancelado) {
          setErro('Erro ao carregar chamada. Verifique permissões/índices.')
          setAlunos([])
          setPresencas({})
        }
      })
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })

    return () => {
      cancelado = true
    }
  }, [turmaId, data, contexto])

  // pode_editar = não bloqueada por 48h
  const pode_editar = !bloqueada48h

  const marcarPresenca = useCallback((alunoId, status, justificativa) => {
    if (bloqueada48h) return
    setPresencas(prev => ({
      ...prev,
      [alunoId]: {
        status,
        justificativa:
          status === 'justificado'
            ? justificativa ?? prev[alunoId]?.justificativa ?? ''
            : '',
      },
    }))
  }, [bloqueada48h])

  const contagem = useMemo(() => {
    let presentes = 0
    let ausentes = 0
    let justificados = 0
    Object.values(presencas).forEach(c => {
      if (c.status === 'presente') presentes += 1
      else if (c.status === 'ausente') ausentes += 1
      else if (c.status === 'justificado') justificados += 1
    })
    return { presentes, ausentes, justificados }
  }, [presencas])

  const salvar = useCallback(async () => {
    if (!turmaId || !data) return { ok: false, motivo: 'sem_turma_ou_data' }

    const invalido = alunos.find(a => {
      const c = presencas[a.id]
      return (
        c?.status === 'justificado' &&
        (!c.justificativa || c.justificativa.length < 10)
      )
    })
    if (invalido) {
      return {
        ok: false,
        motivo: 'justificativa_curta',
        aluno: invalido,
      }
    }

    setSalvando(true)
    try {
      const entradas = alunos.map(a => ({
        alunoId: a.id,
        matriculaId: a.matriculaId,
        turmaId,
        data,
        status: presencas[a.id]?.status ?? 'presente',
        justificativa: presencas[a.id]?.justificativa ?? '',
      }))
      await salvarChamada(entradas, professorId, contexto)
      setChamadaExistente(true)
      setSucesso(true)
      return { ok: true }
    } catch (err) {
      console.error(err)
      return { ok: false, motivo: 'erro_salvar', erro: err }
    } finally {
      setSalvando(false)
    }
  }, [alunos, presencas, turmaId, data, professorId, contexto])

  // Histórico opcional (mantido para a página re-utilizar)
  const carregarHistorico = useCallback(
    async (limite = 12) => {
      if (!turmaId) return []
      return historicoChamadas(turmaId, limite, contexto)
    },
    [turmaId, contexto],
  )

  return {
    // estado
    alunos,
    presencas,
    carregando,
    erro,
    chamadaExistente,
    diaLetivo,
    bloqueada48h,
    salvando,
    sucesso,
    contagem,
    // derivados
    pode_editar,
    // métodos
    marcarPresenca,
    salvar,
    carregarHistorico,
    setErro,
  }
}

export default usePresenca
