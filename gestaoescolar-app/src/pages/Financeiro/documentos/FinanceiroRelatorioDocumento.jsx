import { Text, View } from '@react-pdf/renderer'
import { PageLayout, styles } from '../../../utils/exportPDF'

function moeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0)
}

function dataBr(data) {
  if (!data) return '-'
  const [ano, mes, dia] = String(data).split('-')
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : String(data)
}

export function FinanceiroRelatorioDocumento({ dados }) {
  const lancamentos = dados?.lancamentos ?? []
  const totais = dados?.totais ?? {}

  return (
    <PageLayout
      titulo="Relatorio Financeiro"
      escola={dados?.escola ?? 'Gestao Escolar A Vista'}
      dataGeracao={dados?.dataGeracao}
      orientation="landscape"
    >
      <View style={styles.infoBox}>
        <View style={styles.infoLinha}>
          <Text style={styles.infoLabel}>Ano</Text>
          <Text style={styles.infoValor}>{dados?.ano ?? '-'}</Text>
        </View>
        <View style={styles.infoLinha}>
          <Text style={styles.infoLabel}>Previsto</Text>
          <Text style={styles.infoValor}>{moeda(totais.orcamentoPrevisto)}</Text>
        </View>
        <View style={styles.infoLinha}>
          <Text style={styles.infoLabel}>Executado</Text>
          <Text style={styles.infoValor}>{moeda(totais.totalExecutado)}</Text>
        </View>
        <View style={styles.infoLinha}>
          <Text style={styles.infoLabel}>Saldo</Text>
          <Text style={styles.infoValor}>{moeda(totais.saldoDisponivel)}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.th, { width: '12%' }]}>Data</Text>
          <Text style={[styles.th, { width: '12%' }]}>Tipo</Text>
          <Text style={[styles.th, { width: '22%' }]}>Categoria</Text>
          <Text style={[styles.th, { width: '16%' }]}>Centro</Text>
          <Text style={[styles.th, { width: '14%', textAlign: 'right' }]}>Valor</Text>
          <Text style={[styles.th, { width: '12%' }]}>Status</Text>
          <Text style={[styles.th, { width: '12%' }]}>Aprovado</Text>
        </View>

        {lancamentos.length === 0 ? (
          <View style={styles.tableRow}>
            <Text style={[styles.td, { width: '100%' }]}>Nenhum lancamento encontrado.</Text>
          </View>
        ) : lancamentos.map((item, idx) => (
          <View key={item.id ?? idx} style={[styles.tableRow, idx % 2 ? styles.tableRowZebra : null]}>
            <Text style={[styles.td, { width: '12%' }]}>{dataBr(item.data_lancamento)}</Text>
            <Text style={[styles.td, { width: '12%' }]}>{item.tipo ?? '-'}</Text>
            <Text style={[styles.td, { width: '22%' }]}>{item.categoria ?? '-'}</Text>
            <Text style={[styles.td, { width: '16%' }]}>{item.centro_custo ?? '-'}</Text>
            <Text style={[styles.td, { width: '14%', textAlign: 'right' }]}>{moeda(item.valor)}</Text>
            <Text style={[styles.td, { width: '12%' }]}>{item.status ?? '-'}</Text>
            <Text style={[styles.td, { width: '12%' }]}>{item.aprovado_por ? 'Sim' : 'Nao'}</Text>
          </View>
        ))}
      </View>
    </PageLayout>
  )
}
