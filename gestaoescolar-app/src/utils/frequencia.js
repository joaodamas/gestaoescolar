const TIPOS_NAO_LETIVOS = new Set(['feriado', 'recesso'])

function dataEhDiaUtil(data) {
  if (!data) return false
  const dia = new Date(`${data}T00:00:00`).getDay()
  return dia !== 0 && dia !== 6
}

export function ehRegistroLetivo(data, eventosCalendario = []) {
  const evento = eventosCalendario.find(ev => ev.data === data)
  if (evento) return !TIPOS_NAO_LETIVOS.has(evento.tipo)
  return dataEhDiaUtil(data)
}

export function resumirFrequencia(registros = [], eventosCalendario = []) {
  const letivos = registros.filter(reg => ehRegistroLetivo(reg.data, eventosCalendario))
  const resumo = letivos.reduce((acc, reg) => {
    if (reg.status === 'presente') acc.presentes += 1
    else if (reg.status === 'ausente') acc.ausentes += 1
    else if (reg.status === 'justificado') acc.justificados += 1
    return acc
  }, {
    presentes: 0,
    ausentes: 0,
    justificados: 0,
    total: letivos.length,
  })

  const totalSeguro = Math.max(resumo.total, 1)
  return {
    ...resumo,
    frequencia_real: resumo.total > 0 ? (resumo.presentes / totalSeguro) * 100 : 0,
    frequencia_limite: resumo.total > 0 ? ((resumo.presentes + resumo.justificados) / totalSeguro) * 100 : 0,
    percentual_faltas_limite: resumo.total > 0 ? (resumo.ausentes / totalSeguro) * 100 : 0,
  }
}
