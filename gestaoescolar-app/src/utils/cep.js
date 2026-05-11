/**
 * Utilitário para consulta de CEP via ViaCEP API (gratuita, sem chave).
 * https://viacep.com.br/
 */

const CACHE = new Map() // cep limpo → resposta cacheada na sessão

export function formatarCEP(cep) {
  const limpo = (cep ?? '').replace(/\D/g, '').slice(0, 8)
  if (limpo.length <= 5) return limpo
  return `${limpo.slice(0, 5)}-${limpo.slice(5)}`
}

export function cepValido(cep) {
  return /^\d{8}$/.test((cep ?? '').replace(/\D/g, ''))
}

/**
 * Consulta o ViaCEP. Retorna { sucesso, dados, erro }.
 * dados: { cep, logradouro, bairro, cidade, uf, complemento, ddd }
 */
export async function consultarCEP(cep) {
  const limpo = (cep ?? '').replace(/\D/g, '')
  if (!cepValido(limpo)) {
    return { sucesso: false, erro: 'CEP inválido. Use 8 dígitos.' }
  }

  if (CACHE.has(limpo)) {
    return { sucesso: true, dados: CACHE.get(limpo) }
  }

  try {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 5000)

    const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`, { signal: ctrl.signal })
    clearTimeout(timeout)

    if (!res.ok) return { sucesso: false, erro: 'Falha na consulta do CEP.' }

    const json = await res.json()
    if (json.erro) return { sucesso: false, erro: 'CEP não encontrado.' }

    const dados = {
      cep: json.cep,
      logradouro: json.logradouro ?? '',
      complemento: json.complemento ?? '',
      bairro: json.bairro ?? '',
      cidade: json.localidade ?? '',
      uf: json.uf ?? '',
      ddd: json.ddd ?? '',
    }
    CACHE.set(limpo, dados)
    return { sucesso: true, dados }
  } catch (err) {
    if (err.name === 'AbortError') return { sucesso: false, erro: 'Tempo esgotado na consulta do CEP.' }
    return { sucesso: false, erro: 'Erro de rede ao consultar CEP.' }
  }
}
