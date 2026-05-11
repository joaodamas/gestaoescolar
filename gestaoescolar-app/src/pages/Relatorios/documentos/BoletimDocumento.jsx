import { Text, View } from '@react-pdf/renderer'
import { PageLayout, styles } from '../../../utils/exportPDF'

function formatarNota(valor) {
  if (valor === null || valor === undefined || valor === '') return '-'
  const numero = Number(valor)
  return Number.isNaN(numero) ? '-' : numero.toFixed(1).replace('.', ',')
}

function formatarData(data) {
  if (!data) return '-'
  return String(data)
}

export function BoletimDocumento({ dados }) {
  const escola = dados?.escola?.nome_escola || dados?.escola?.nome || 'Escola Municipal'
  const aluno = dados?.aluno ?? {}
  const turma = dados?.turma ?? {}
  const linhas = dados?.linhas ?? []

  return (
    <PageLayout
      titulo="Boletim do Aluno"
      escola={escola}
      dataGeracao={dados?.dataGeracao}
      orientation="portrait"
    >
      <View style={styles.infoBox}>
        <View style={styles.infoLinha}>
          <Text style={styles.infoLabel}>Aluno</Text>
          <Text style={styles.infoValor}>{aluno.nome_completo || '-'}</Text>
        </View>
        <View style={styles.infoLinha}>
          <Text style={styles.infoLabel}>RA/Matrícula</Text>
          <Text style={styles.infoValor}>{aluno.ra || dados?.matricula?.numero_matricula || '-'}</Text>
        </View>
        <View style={styles.infoLinha}>
          <Text style={styles.infoLabel}>Turma</Text>
          <Text style={styles.infoValor}>{turma.nome || '-'}</Text>
        </View>
        <View style={styles.infoLinha}>
          <Text style={styles.infoLabel}>Ano letivo</Text>
          <Text style={styles.infoValor}>{dados?.anoLetivo || '-'}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.th, { width: '34%' }]}>Disciplina</Text>
          <Text style={[styles.th, { width: '11%', textAlign: 'center' }]}>1º</Text>
          <Text style={[styles.th, { width: '11%', textAlign: 'center' }]}>2º</Text>
          <Text style={[styles.th, { width: '11%', textAlign: 'center' }]}>3º</Text>
          <Text style={[styles.th, { width: '11%', textAlign: 'center' }]}>4º</Text>
          <Text style={[styles.th, { width: '11%', textAlign: 'center' }]}>Média</Text>
          <Text style={[styles.th, { width: '11%' }]}>Situação</Text>
        </View>

        {linhas.length === 0 ? (
          <View style={styles.tableRow}>
            <Text style={[styles.td, { width: '100%', color: '#64748b' }]}>
              Nenhuma nota encontrada para os filtros selecionados.
            </Text>
          </View>
        ) : (
          linhas.map((linha, idx) => (
            <View key={`${linha.disciplina}-${idx}`} style={[styles.tableRow, idx % 2 ? styles.tableRowZebra : null]}>
              <Text style={[styles.td, { width: '34%' }]}>{linha.disciplina}</Text>
              <Text style={[styles.td, { width: '11%', textAlign: 'center' }]}>{formatarNota(linha.bim?.[1])}</Text>
              <Text style={[styles.td, { width: '11%', textAlign: 'center' }]}>{formatarNota(linha.bim?.[2])}</Text>
              <Text style={[styles.td, { width: '11%', textAlign: 'center' }]}>{formatarNota(linha.bim?.[3])}</Text>
              <Text style={[styles.td, { width: '11%', textAlign: 'center' }]}>{formatarNota(linha.bim?.[4])}</Text>
              <Text style={[styles.td, { width: '11%', textAlign: 'center' }]}>{formatarNota(linha.media)}</Text>
              <Text style={[styles.td, { width: '11%' }]}>{linha.situacao || '-'}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.secao}>
        <Text style={styles.tituloSecao}>Observações</Text>
        <Text style={{ fontSize: 8, color: '#64748b' }}>
          Boletim gerado para fins de acompanhamento escolar em {formatarData(dados?.dataGeracao)}.
        </Text>
      </View>
    </PageLayout>
  )
}
