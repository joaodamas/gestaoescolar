import { Text, View } from '@react-pdf/renderer'
import { PageLayout, styles } from '../../../utils/exportPDF'
import { mascararCPF, mascararTelefone } from '../../../utils/mascaramento'

function texto(valor) {
  return valor === null || valor === undefined || valor === '' ? '-' : String(valor)
}

function dataBr(valor) {
  if (!valor) return '-'
  return new Date(`${valor}T00:00:00`).toLocaleDateString('pt-BR')
}

function Info({ label, valor }) {
  return (
    <View style={styles.infoLinha}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValor}>{texto(valor)}</Text>
    </View>
  )
}

export function AlunoLGPDDocumento({ dados }) {
  const aluno = dados?.aluno ?? {}
  const endereco = aluno.endereco ?? {}
  const saude = aluno.saude ?? {}
  const responsaveis = dados?.responsaveis ?? []
  const historico = dados?.historico ?? []
  const turmasMap = dados?.turmasMap ?? {}
  const presencas = dados?.presencas ?? { presentes: 0, ausentes: 0, justificados: 0, total: 0 }
  const notas = dados?.notas ?? []
  const ocorrencias = dados?.ocorrencias ?? []

  return (
    <PageLayout
      titulo="Exportacao de Dados do Aluno"
      escola={dados?.escola ?? 'Gestao Escolar A Vista'}
      dataGeracao={dados?.dataGeracao}
    >
      <View style={styles.infoBox}>
        <Info label="Nome" valor={aluno.nome_completo} />
        <Info label="RA" valor={aluno.ra} />
        <Info label="CPF" valor={mascararCPF(aluno.cpf)} />
        <Info label="Nascimento" valor={dataBr(aluno.data_nascimento)} />
        <Info label="Status" valor={aluno.status} />
        <Info label="Base legal" valor={aluno.LGPD?.base_legal || aluno.base_legal || 'obrigacao_legal'} />
      </View>

      <View style={styles.secao}>
        <Text style={styles.tituloSecao}>Endereco</Text>
        <Text style={styles.td}>
          {[
            endereco.logradouro,
            endereco.numero,
            endereco.complemento,
            endereco.bairro,
            endereco.cidade && endereco.uf ? `${endereco.cidade}/${endereco.uf}` : endereco.cidade || endereco.uf,
            endereco.cep ? `CEP ${endereco.cep}` : '',
          ].filter(Boolean).join(', ') || '-'}
        </Text>
      </View>

      <View style={styles.secao}>
        <Text style={styles.tituloSecao}>Saude e Acessibilidade</Text>
        <View style={styles.infoBox}>
          <Info label="Deficiencia" valor={saude.tem_deficiencia ? 'Sim' : 'Nao'} />
          <Info label="Descricao" valor={saude.deficiencia_descricao} />
          <Info label="Doenca" valor={saude.tem_doenca ? 'Sim' : 'Nao'} />
          <Info label="Condicoes" valor={saude.doencas} />
          <Info label="Alergia" valor={saude.tem_alergia ? 'Sim' : 'Nao'} />
          <Info label="Alergias" valor={saude.alergias} />
          <Info label="Alimentos" valor={saude.alergias_alimentares || saude.restricoes_alimentares} />
          <Info label="Medicamentos" valor={saude.medicamentos_continuos} />
          <Info label="Emergencia" valor={[saude.contato_emergencia_nome, mascararTelefone(saude.contato_emergencia_telefone)].filter(Boolean).join(' - ')} />
        </View>
      </View>

      <View style={styles.secao}>
        <Text style={styles.tituloSecao}>Responsaveis</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, { width: '32%' }]}>Nome</Text>
            <Text style={[styles.th, { width: '18%' }]}>Parentesco</Text>
            <Text style={[styles.th, { width: '20%' }]}>Telefone</Text>
            <Text style={[styles.th, { width: '30%' }]}>Email</Text>
          </View>
          {responsaveis.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.td, { width: '100%' }]}>Nenhum responsavel vinculado.</Text>
            </View>
          ) : responsaveis.map((r, idx) => (
            <View key={r.id ?? idx} style={[styles.tableRow, idx % 2 ? styles.tableRowZebra : null]}>
              <Text style={[styles.td, { width: '32%' }]}>{texto(r.nome)}</Text>
              <Text style={[styles.td, { width: '18%' }]}>{texto(r.parentesco)}</Text>
              <Text style={[styles.td, { width: '20%' }]}>{mascararTelefone(r.telefone)}</Text>
              <Text style={[styles.td, { width: '30%' }]}>{texto(r.email)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.secao}>
        <Text style={styles.tituloSecao}>Historico de Matriculas</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, { width: '18%' }]}>Ano</Text>
            <Text style={[styles.th, { width: '36%' }]}>Turma</Text>
            <Text style={[styles.th, { width: '26%' }]}>Matricula</Text>
            <Text style={[styles.th, { width: '20%' }]}>Status</Text>
          </View>
          {historico.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.td, { width: '100%' }]}>Sem historico de matriculas.</Text>
            </View>
          ) : historico.map((m, idx) => (
            <View key={m.id ?? idx} style={[styles.tableRow, idx % 2 ? styles.tableRowZebra : null]}>
              <Text style={[styles.td, { width: '18%' }]}>{texto(m.ano_letivo)}</Text>
              <Text style={[styles.td, { width: '36%' }]}>{texto(turmasMap[m.turma_id]?.nome)}</Text>
              <Text style={[styles.td, { width: '26%' }]}>{texto(m.numero_matricula)}</Text>
              <Text style={[styles.td, { width: '20%' }]}>{texto(m.status)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.secao}>
        <Text style={styles.tituloSecao}>Resumo Pedagogico</Text>
        <Text style={styles.td}>
          Presencas: {presencas.presentes} | Ausencias: {presencas.ausentes} | Justificadas: {presencas.justificados} | Total: {presencas.total}
        </Text>
        <Text style={styles.td}>
          Notas registradas: {notas.length} | Ocorrencias registradas: {ocorrencias.length}
        </Text>
      </View>
    </PageLayout>
  )
}
