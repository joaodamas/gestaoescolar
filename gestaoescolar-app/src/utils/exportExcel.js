import * as XLSX from 'xlsx'

/**
 * Exporta um array de objetos para um arquivo Excel (.xlsx) com uma única aba.
 *
 * @param {Array<object>} dados - Array de objetos. As chaves viram cabeçalhos.
 * @param {string} nomeArquivo - Nome do arquivo (sem extensão).
 * @param {string} [nomeSheet='Dados'] - Nome da aba/planilha dentro do workbook.
 * @returns {void} Dispara o download imediatamente no navegador.
 */
export function exportarParaExcel(dados, nomeArquivo, nomeSheet = 'Dados') {
  if (!Array.isArray(dados)) {
    throw new Error('exportarParaExcel: "dados" precisa ser um array de objetos.')
  }

  const linhas = dados.length === 0 ? [{}] : dados
  const worksheet = XLSX.utils.json_to_sheet(linhas)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sanitizarNomeAba(nomeSheet))

  const nome = nomeArquivo.endsWith('.xlsx') ? nomeArquivo : `${nomeArquivo}.xlsx`
  XLSX.writeFile(workbook, nome)
}

/**
 * Exporta múltiplas abas em um único arquivo Excel.
 *
 * @param {Array<{nome: string, dados: Array<object>}>} abas - Lista de abas a serem criadas.
 * @param {string} nomeArquivo - Nome do arquivo (sem extensão).
 * @returns {void}
 */
export function exportarMultiplasAbas(abas, nomeArquivo) {
  if (!Array.isArray(abas) || abas.length === 0) {
    throw new Error('exportarMultiplasAbas: forneça pelo menos uma aba.')
  }

  const workbook = XLSX.utils.book_new()
  abas.forEach(({ nome, dados }) => {
    const linhas = Array.isArray(dados) && dados.length > 0 ? dados : [{}]
    const worksheet = XLSX.utils.json_to_sheet(linhas)
    XLSX.utils.book_append_sheet(workbook, worksheet, sanitizarNomeAba(nome))
  })

  const nome = nomeArquivo.endsWith('.xlsx') ? nomeArquivo : `${nomeArquivo}.xlsx`
  XLSX.writeFile(workbook, nome)
}

/**
 * Reformata um array de objetos aplicando rótulos PT-BR e/ou transformações.
 *
 * @param {Array<object>} dados - Dados brutos.
 * @param {Record<string, string | ((item: object) => any)>} mapeamento
 *        Mapeamento { 'Rótulo': 'campo_origem' | função(item) }.
 * @returns {Array<object>} Array reformatado com chaves humanas.
 */
export function formatarParaExportacao(dados, mapeamento) {
  if (!Array.isArray(dados)) return []
  if (!mapeamento || typeof mapeamento !== 'object') return dados

  return dados.map((item) => {
    const linha = {}
    Object.entries(mapeamento).forEach(([rotulo, origem]) => {
      if (typeof origem === 'function') {
        linha[rotulo] = origem(item) ?? ''
      } else if (typeof origem === 'string') {
        linha[rotulo] = obterCampoAninhado(item, origem) ?? ''
      } else {
        linha[rotulo] = ''
      }
    })
    return linha
  })
}

// ─── Helpers internos ────────────────────────────────────────────────────────

function obterCampoAninhado(obj, caminho) {
  if (obj == null) return undefined
  return caminho.split('.').reduce((acc, parte) => (acc == null ? acc : acc[parte]), obj)
}

// Excel limita nomes de aba a 31 caracteres e proíbe alguns símbolos
function sanitizarNomeAba(nome) {
  const limpo = String(nome ?? 'Dados').replace(/[\\/?*[\]:]/g, '_').trim() || 'Dados'
  return limpo.slice(0, 31)
}
