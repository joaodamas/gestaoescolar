import { Text, View } from '@react-pdf/renderer'
import { PageLayout, styles } from '../../../utils/exportPDF'

function formatarNota(valor) {
  if (valor === null || valor === undefined || valor === '') return '-'
  const numero = Number(valor)
  return Number.isNaN(numero) ? '-' : numero.toFixed(1).replace('.', ',')
}

function formatarFrequencia(valor) {
  const numero = Number(valor)
  return Number.isNaN(numero) ? '-' : `${numero.toFixed(1).replace('.', ',')}%`
}

export function DiarioDocumento({ dados }) {
  const escola = dados?.escola?.nome_escola || dados?.escola?.nome || 'Escola Municipal'
  const turma = dados?.turma ?? {}
  const disciplina = dados?.disciplina ?? null
  const linhas = dados?.linhas ?? []

  return (
    <PageLayout
      titulo="Diário de Classe"
      escola={escola}
      dataGeracao={dados?.dataGeracao}
      orientation="landscape"
    >
      <View style={styles.infoBox}>
        <View style={styles.infoLinha}>
          <Text style={styles.infoLabel}>Turma</Text>
          <Text style={styles.infoValor}>{turma.nome || '-'}</Text>
        </View>
        <View style={styles.infoLinha}>
          <Text style={styles.infoLabel}>Disciplina</Text>
          <Text style={styles.infoValor}>{disciplina?.nome || 'Todas as disciplinas'}</Text>
        </View>
        <View style={styles.infoLinha}>
          <Text style={styles.infoLabel}>Ano/Bimestre</Text>
          <Text style={styles.infoValor}>{dados?.anoLetivo || '-'} · {dados?.bimestre || '-'}º bimestre</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.th, { width: '6%', textAlign: 'center' }]}>Nº</Text>
          <Text style={[styles.th, { width: '14%' }]}>RA</Text>
          <Text style={[styles.th, { width: '34%' }]}>Aluno</Text>
          <Text style={[styles.th, { width: '8%', textAlign: 'center' }]}>1º</Text>
          <Text style={[styles.th, { width: '8%', textAlign: 'center' }]}>2º</Text>
          <Text style={[styles.th, { width: '8%', textAlign: 'center' }]}>3º</Text>
          <Text style={[styles.th, { width: '8%', textAlign: 'center' }]}>4º</Text>
          <Text style={[styles.th, { width: '7%', textAlign: 'center' }]}>Média</Text>
          <Text style={[styles.th, { width: '7%', textAlign: 'center' }]}>Freq.</Text>
        </View>

        {linhas.length === 0 ? (
          <View style={styles.tableRow}>
            <Text style={[styles.td, { width: '100%', color: '#64748b' }]}>
              Nenhum aluno ativo encontrado para a turma selecionada.
            </Text>
          </View>
        ) : (
          linhas.map((linha, idx) => (
            <View key={`${linha.numero}-${linha.nome}`} style={[styles.tableRow, idx % 2 ? styles.tableRowZebra : null]}>
              <Text style={[styles.td, { width: '6%', textAlign: 'center' }]}>{linha.numero}</Text>
              <Text style={[styles.td, { width: '14%' }]}>{linha.ra || '-'}</Text>
              <Text style={[styles.td, { width: '34%' }]}>{linha.nome}</Text>
              <Text style={[styles.td, { width: '8%', textAlign: 'center' }]}>{formatarNota(linha.notas?.[1])}</Text>
              <Text style={[styles.td, { width: '8%', textAlign: 'center' }]}>{formatarNota(linha.notas?.[2])}</Text>
              <Text style={[styles.td, { width: '8%', textAlign: 'center' }]}>{formatarNota(linha.notas?.[3])}</Text>
              <Text style={[styles.td, { width: '8%', textAlign: 'center' }]}>{formatarNota(linha.notas?.[4])}</Text>
              <Text style={[styles.td, { width: '7%', textAlign: 'center' }]}>{formatarNota(linha.media)}</Text>
              <Text style={[styles.td, { width: '7%', textAlign: 'center' }]}>{formatarFrequencia(linha.frequencia)}</Text>
            </View>
          ))
        )}
      </View>
    </PageLayout>
  )
}
