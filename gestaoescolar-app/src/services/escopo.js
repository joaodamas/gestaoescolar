export function extrairEscopoEscolar(contexto = {}) {
  const escolaId = contexto.escolaId
    ?? contexto.escola_id
    ?? contexto.escola?.id
    ?? contexto.perfil?.escolaId
    ?? contexto.perfil?.escola_id
    ?? ''

  const unidadeId = contexto.unidadeAtualId
    ?? contexto.unidade_atual_id
    ?? contexto.unidade_id
    ?? contexto.unidadeAtual?.id
    ?? contexto.unidade?.id
    ?? contexto.perfil?.unidadeAtualId
    ?? contexto.perfil?.unidade_atual_id
    ?? contexto.perfil?.unidade_id
    ?? ''

  return {
    escola_id: escolaId || '',
    unidade_id: unidadeId || '',
  }
}

export function comEscopoEscolar(payload = {}, contexto = {}) {
  const escopo = extrairEscopoEscolar(contexto)
  return {
    ...payload,
    ...(escopo.escola_id ? { escola_id: escopo.escola_id } : {}),
    ...(escopo.unidade_id ? { unidade_id: escopo.unidade_id } : {}),
  }
}

export function registroPertenceAoEscopo(registro = {}, contexto = {}) {
  if (!registro || !contexto) return true

  const { escola_id: escolaIdRegistro = '', unidade_id: unidadeIdRegistro = '' } = registro
  const { escola_id: escolaIdEscopo, unidade_id: unidadeIdEscopo } = extrairEscopoEscolar(contexto)

  if (unidadeIdRegistro && unidadeIdEscopo) return unidadeIdRegistro === unidadeIdEscopo
  if (escolaIdRegistro && escolaIdEscopo) return escolaIdRegistro === escolaIdEscopo
  return true
}

export function filtrarListaPorEscopo(lista = [], contexto = {}) {
  return lista.filter((item) => registroPertenceAoEscopo(item, contexto))
}
