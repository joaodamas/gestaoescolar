import { Text, View } from '@react-pdf/renderer'
import { PageLayout, styles } from '../../../utils/exportPDF'

export function RelatorioTabelaDocumento({ dados }) {
  const escola = dados?.escola?.nome_escola || dados?.escola?.nome || 'Escola Municipal'
  const colunas = dados?.colunas ?? []
  const linhas = dados?.linhas ?? []

  return (
    <PageLayout
      titulo={dados?.titulo ?? 'Relatório'}
      escola={escola}
      dataGeracao={dados?.dataGeracao}
      orientation="landscape"
    >
      <View style={styles.infoBox}>
        {(dados?.infos ?? []).map((info) => (
          <View key={info.label} style={styles.infoLinha}>
            <Text style={styles.infoLabel}>{info.label}</Text>
            <Text style={styles.infoValor}>{info.valor || '-'}</Text>
          </View>
        ))}
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          {colunas.map((col) => (
            <Text key={col.chave} style={[styles.th, { width: col.largura, textAlign: col.align || 'left' }]}>
              {col.label}
            </Text>
          ))}
        </View>

        {linhas.length === 0 ? (
          <View style={styles.tableRow}>
            <Text style={[styles.td, { width: '100%', color: '#64748b' }]}>
              Nenhum registro encontrado para os filtros selecionados.
            </Text>
          </View>
        ) : (
          linhas.map((linha, idx) => (
            <View key={`${idx}-${linha.nome || linha.aluno || linha.turma}`} style={[styles.tableRow, idx % 2 ? styles.tableRowZebra : null]}>
              {colunas.map((col) => (
                <Text key={col.chave} style={[styles.td, { width: col.largura, textAlign: col.align || 'left' }]}>
                  {linha[col.chave] ?? '-'}
                </Text>
              ))}
            </View>
          ))
        )}
      </View>
    </PageLayout>
  )
}
