import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import { createElement } from 'react'

/**
 * Estilos comuns compartilhados pelos relatórios em PDF.
 * Pensados para A4 (paisagem ou retrato) com tipografia legível.
 */
export const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 32,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  brand: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    letterSpacing: 1,
  },
  escola: {
    fontSize: 9,
    color: '#475569',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  titulo: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  dataGeracao: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
  },

  content: {
    flexGrow: 1,
  },

  footer: {
    position: 'absolute',
    bottom: 20,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    fontSize: 8,
    color: '#94a3b8',
  },

  // Tabela
  table: {
    width: '100%',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableRowZebra: {
    backgroundColor: '#fafafa',
  },
  th: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#334155',
  },
  td: {
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 9,
    color: '#0f172a',
  },

  // Seções
  secao: {
    marginTop: 10,
    marginBottom: 6,
  },
  tituloSecao: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 4,
  },

  // Info aluno / turma
  infoBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 8,
    marginBottom: 10,
  },
  infoLinha: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  infoLabel: {
    fontSize: 9,
    color: '#64748b',
    width: 90,
    fontFamily: 'Helvetica-Bold',
  },
  infoValor: {
    fontSize: 9,
    color: '#0f172a',
    flex: 1,
  },
})

/**
 * Componente reusável de página com cabeçalho e rodapé padronizados.
 * Use dentro de <Document>. Aceita `orientation` para landscape.
 */
export function PageLayout({
  children,
  titulo,
  escola = 'Escola Municipal',
  dataGeracao,
  orientation = 'portrait',
  size = 'A4',
}) {
  const dataExibida = dataGeracao || new Date().toLocaleString('pt-BR')

  return createElement(
    Page,
    { size, orientation, style: styles.page },
    createElement(
      View,
      { style: styles.header, fixed: true },
      createElement(
        View,
        { style: styles.headerLeft },
        createElement(Text, { style: styles.brand }, 'GESTAO ESCOLAR A VISTA'),
        createElement(Text, { style: styles.escola }, escola),
      ),
      createElement(
        View,
        { style: styles.headerRight },
        titulo ? createElement(Text, { style: styles.titulo }, titulo) : null,
        createElement(Text, { style: styles.dataGeracao }, `Gerado em ${dataExibida}`),
      ),
    ),
    createElement(View, { style: styles.content }, children),
    createElement(
      View,
      { style: styles.footer, fixed: true },
      createElement(Text, null, 'Documento de uso interno - confidencial'),
      createElement(Text, {
        render: ({ pageNumber, totalPages }) => `Pagina ${pageNumber} de ${totalPages}`,
      }),
    ),
  )
}

/**
 * Dispara o download de um Document do @react-pdf/renderer.
 *
 * @param {React.ReactElement} documento - Elemento <Document>...</Document>.
 * @param {string} nomeArquivo - Nome do arquivo (com ou sem .pdf).
 */
export async function baixarPDF(documento, nomeArquivo) {
  const blob = await pdf(documento).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo.endsWith('.pdf') ? nomeArquivo : `${nomeArquivo}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Pequeno delay para permitir o início do download antes de revogar
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Helper para gerar PDF — wrapper alternativo equivalente a baixarPDF.
 * Mantido para legibilidade em chamadas externas.
 */
export async function gerarPDF(documento, nomeArquivo) {
  return baixarPDF(documento, nomeArquivo)
}

/**
 * Converte string em slug seguro para nome de arquivo.
 */
export function slugify(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export { Document, Page, Text, View, StyleSheet }
