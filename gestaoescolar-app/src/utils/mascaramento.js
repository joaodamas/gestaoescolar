// C-1 QA: Ocultamos os blocos 1 e 3 — só o bloco do meio fica visível
// Formato: ***.<3 dígitos>.***-** — padrão seguro para dados de menores (LGPD)
export function mascararCPF(cpf) {
  if (!cpf) return '***.***.***-**'
  const limpo = cpf.replace(/\D/g, '')
  if (limpo.length !== 11) return '***.***.***-**'
  return `***.${limpo.slice(3, 6)}.***-**`
}

export function mascararTelefone(tel) {
  if (!tel) return '(**) *****-****'
  const limpo = tel.replace(/\D/g, '')
  if (limpo.length < 10) return '(**) *****-****'
  return `(${limpo.slice(0, 2)}) *****-${limpo.slice(-4)}`
}

export function formatarCPF(cpf) {
  const limpo = cpf.replace(/\D/g, '').slice(0, 11)
  return limpo
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function validarCPF(cpf) {
  const limpo = String(cpf ?? '').replace(/\D/g, '')
  if (!limpo) return true
  if (limpo.length !== 11) return false
  if (/^(\d)\1+$/.test(limpo)) return false

  const calcularDigito = (base) => {
    let soma = 0
    for (let i = 0; i < base.length; i += 1) {
      soma += Number(base[i]) * (base.length + 1 - i)
    }
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }

  const d1 = calcularDigito(limpo.slice(0, 9))
  const d2 = calcularDigito(limpo.slice(0, 10))
  return d1 === Number(limpo[9]) && d2 === Number(limpo[10])
}

export function formatarTelefone(tel) {
  const limpo = tel.replace(/\D/g, '').slice(0, 11)
  if (limpo.length <= 10) {
    return limpo.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  }
  return limpo.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}
