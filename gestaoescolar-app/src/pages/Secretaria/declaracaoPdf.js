import { createElement as h } from 'react'
import { Document, Page, Text, View, StyleSheet, baixarPDF, slugify, PageLayout } from '../../utils/exportPDF'

const estilo = StyleSheet.create({
  resumo: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  bloco: {
    marginTop: 12,
  },
  tituloBloco: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  paragrafo: {
    fontSize: 10,
    color: '#0f172a',
    marginBottom: 6,
    lineHeight: 1.55,
  },
  campoLinha: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  campoLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    width: 110,
  },
  campoValor: {
    fontSize: 10,
    color: '#0f172a',
    flex: 1,
  },
  assinatura: {
    marginTop: 36,
    borderTopWidth: 1,
    borderTopColor: '#94a3b8',
    paddingTop: 6,
    width: 220,
    alignSelf: 'center',
  },
  assinaturaTexto: {
    fontSize: 9,
    color: '#475569',
    textAlign: 'center',
  },
})

function linha(label, valor) {
  return h(View, { style: estilo.campoLinha },
    h(Text, { style: estilo.campoLabel }, label),
    h(Text, { style: estilo.campoValor }, valor || '—'),
  )
}

/**
 * Gera e dispara o download de uma Declaração de Matrícula em PDF.
 *
 * @param {Object} params
 * @param {Object} params.matricula  Documento de /matriculas (com aluno_nome, aluno_ra, turma_nome, ensino, serie, ano_letivo).
 * @param {Object} params.escola     Documento de /configuracoes (nome_escola, cnpj, endereco, slogan).
 * @param {Object} params.autor      Autor da geração (uid + nome) — apenas para histórico.
 */
export async function gerarDeclaracaoMatricula({ matricula, escola, autor }) {
  if (!matricula) throw new Error('Matrícula é obrigatória para gerar a declaração.')

  const hoje = new Date()
  const dataExtenso = hoje.toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const nomeEscola = escola?.nome_escola ?? 'Escola Municipal'
  const enderecoEscola = [
    escola?.endereco?.logradouro,
    escola?.endereco?.numero,
    escola?.endereco?.bairro,
    escola?.endereco?.cidade && escola?.endereco?.uf
      ? `${escola.endereco.cidade}/${escola.endereco.uf}`
      : null,
  ].filter(Boolean).join(', ')

  const documento = h(Document, null,
    h(PageLayout, {
      titulo: 'Declaração de Matrícula',
      escola: nomeEscola,
    },
      // Texto principal
      h(View, { style: estilo.resumo },
        h(Text, { style: estilo.paragrafo },
          `Declaramos, para os devidos fins, que o(a) estudante abaixo identificado(a) ` +
          `encontra-se regularmente matriculado(a) nesta unidade escolar no ano letivo ${matricula.ano_letivo}.`
        ),
        linha('Aluno(a):',       matricula.aluno_nome),
        linha('RA:',             matricula.aluno_ra),
        linha('Protocolo:',      matricula.numero_matricula ?? matricula.protocolo ?? '—'),
        linha('Ensino:',         matricula.ensino ?? '—'),
        linha('Série/Turma:',    matricula.turma_nome || matricula.serie || '—'),
        linha('Situação:',       matricula.status ?? matricula.situacao ?? 'ativa'),
        linha('Ano letivo:',     String(matricula.ano_letivo ?? '—')),
      ),

      h(View, { style: estilo.bloco },
        h(Text, { style: estilo.tituloBloco }, 'Dados do responsável'),
        linha('Nome:',     matricula.responsavel_nome),
        linha('Telefone:', matricula.responsavel_telefone),
      ),

      h(View, { style: estilo.bloco },
        h(Text, { style: estilo.tituloBloco }, 'Dados da unidade escolar'),
        linha('Escola:',   nomeEscola),
        linha('CNPJ:',     escola?.cnpj ?? '—'),
        linha('Endereço:', enderecoEscola || '—'),
      ),

      h(Text, { style: { ...estilo.paragrafo, marginTop: 24 } },
        `Por ser verdade, firmamos a presente declaração em ${dataExtenso}.`
      ),

      h(View, { style: estilo.assinatura },
        h(Text, { style: estilo.assinaturaTexto }, autor?.nome ?? 'Secretaria Escolar'),
        h(Text, { style: { ...estilo.assinaturaTexto, fontSize: 8, color: '#94a3b8' } },
          'Documento emitido eletronicamente'),
      ),
    )
  )

  const nomeBase = `declaracao-${slugify(matricula.aluno_nome || matricula.numero_matricula || 'matricula')}`
  await baixarPDF(documento, nomeBase)
}
