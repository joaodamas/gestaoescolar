const { onCall, onRequest } = require('firebase-functions/v2/https')
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const admin = require('firebase-admin')

admin.initializeApp()
const db = admin.firestore()

const ANO_ATUAL = new Date().getFullYear()

// ── Helper: gravar em /auditoria (imutável) ────────────────────────────────
async function auditarAcao({ usuarioId, perfil, acao, modulo, entidade, entidadeId, valorAnterior, valorNovo, motivo }) {
  return db.collection('auditoria').add({
    usuario_id: usuarioId ?? 'system',
    perfil: perfil ?? 'system',
    acao,
    modulo,
    entidade,
    entidade_id: entidadeId ?? '',
    valor_anterior: valorAnterior ?? null,
    valor_novo: valorNovo ?? null,
    motivo: motivo ?? '',
    ip: null,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  })
}

// ── Helper: criar notificação ──────────────────────────────────────────────
async function criarNotificacao({ destinatarioId, tipo, titulo, mensagem, referenciaId, referenciaModulo }) {
  return db.collection('notificacoes').add({
    destinatario_id: destinatarioId,
    tipo,
    titulo,
    mensagem,
    lida: false,
    data_envio: admin.firestore.FieldValue.serverTimestamp(),
    referencia_id: referenciaId ?? '',
    referencia_modulo: referenciaModulo ?? '',
  })
}

// ── recalcularIndicadores — Callable + Scheduled ────────────────────────────
async function recalcular(ano) {
  const anoLetivo = ano ?? ANO_ATUAL

  // 1. Total alunos ativos
  const alunosSnap = await db.collection('alunos').where('status', '==', 'ativo').get()
  const totalAlunos = alunosSnap.size

  // 2. Total colaboradores
  const usuariosSnap = await db.collection('usuarios').where('ativo', '==', true).get()
  const totalColaboradores = usuariosSnap.size

  // 3. Presenças — breakdown completo
  const presencasSnap = await db.collection('presencas').get()
  const totalPresencas = presencasSnap.size
  let presentesCount = 0, ausentesCount = 0, justificadosCount = 0
  presencasSnap.docs.forEach(d => {
    const st = d.data().status
    if (st === 'presente') presentesCount++
    else if (st === 'ausente') ausentesCount++
    else if (st === 'justificado') justificadosCount++
  })
  const presencaMedia = totalPresencas > 0 ? +(presentesCount / totalPresencas * 100).toFixed(1) : 0
  const ausenciaMedia = totalPresencas > 0 ? +(ausentesCount / totalPresencas * 100).toFixed(1) : 0
  const justificadosMedia = totalPresencas > 0 ? +(justificadosCount / totalPresencas * 100).toFixed(1) : 0

  // 4. Taxa de aprovação
  const notasSnap = await db.collection('notas').where('ano_letivo', '==', anoLetivo).where('fechado', '==', true).get()
  const totalNotas = notasSnap.size
  const aprovadas = notasSnap.docs.filter(d => {
    const m = d.data().media_bimestral ?? d.data().nota
    return m >= 6.0
  }).length
  const taxaAprovacao = totalNotas > 0 ? Math.round((aprovadas / totalNotas) * 100) : 0

  // 5. Financeiro
  const finSnap = await db.collection('financeiro_lancamentos')
    .where('ano', '==', anoLetivo)
    .where('status', '==', 'aprovado')
    .get()
  let orcamentoExecutado = 0
  finSnap.docs.forEach(d => {
    if (d.data().tipo === 'despesa') orcamentoExecutado += d.data().valor ?? 0
  })
  const configSnap = await db.collection('configuracoes').doc('escola').get()
  const config = configSnap.exists ? configSnap.data() : {}
  const orcamentoPrevisto = config.orcamento_previsto ?? 0
  const saebHistorico = config.saeb_historico ?? {} // { 2021: 5.4, 2022: 5.8, ... }
  const mediaSaeb = saebHistorico[anoLetivo] ?? 0

  // 6. Ocorrências por tipo
  const ocorrSnap = await db.collection('ocorrencias').get()
  const totalOcorrencias = { disciplinar: 0, medico: 0, encaminhamento: 0, reuniao: 0, acidente: 0 }
  ocorrSnap.docs.forEach(d => {
    const tipo = d.data().tipo
    if (totalOcorrencias[tipo] !== undefined) totalOcorrencias[tipo]++
  })

  // 7. Projetos resumo
  const projSnap = await db.collection('projetos').get()
  const totalProjetos = { planejado: 0, em_andamento: 0, concluido: 0, cancelado: 0 }
  projSnap.docs.forEach(d => {
    const st = d.data().status
    if (totalProjetos[st] !== undefined) totalProjetos[st]++
  })

  // Grava em /indicadores/{ano}
  await db.collection('indicadores').doc(String(anoLetivo)).set({
    ano: anoLetivo,
    total_alunos: totalAlunos,
    total_colaboradores: totalColaboradores,
    presenca_media: presencaMedia,
    ausencia_media: ausenciaMedia,
    justificados_media: justificadosMedia,
    presentes_count: presentesCount,
    ausentes_count: ausentesCount,
    justificados_count: justificadosCount,
    total_registros_presenca: totalPresencas,
    taxa_aprovacao: taxaAprovacao,
    media_saeb: mediaSaeb,
    saeb_historico: saebHistorico,
    orcamento_previsto: orcamentoPrevisto,
    orcamento_executado: orcamentoExecutado,
    saldo_disponivel: orcamentoPrevisto - orcamentoExecutado,
    total_ocorrencias: totalOcorrencias,
    total_projetos: totalProjetos,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true })

  return { ok: true, ano: anoLetivo, totalAlunos, presencaMedia, taxaAprovacao }
}

exports.recalcularIndicadoresCallable = onCall({ region: 'southamerica-east1' }, async (req) => {
  return recalcular(req.data?.ano)
})

exports.recalcularIndicadoresScheduled = onSchedule(
  { schedule: 'every 15 minutes', region: 'southamerica-east1' },
  async () => recalcular(ANO_ATUAL)
)

// ── onPresencaSalva — detecta 25% de faltas ────────────────────────────────
exports.onPresencaSalva = onDocumentCreated(
  { document: 'presencas/{id}', region: 'southamerica-east1' },
  async (event) => {
    const presenca = event.data.data()
    if (presenca.status !== 'ausente') return

    const { aluno_id, turma_id, ano_letivo } = presenca
    const anoLetivo = ano_letivo ?? ANO_ATUAL

    // Conta total de dias letivos no calendário
    const calSnap = await db.collection('calendario')
      .where('tipo', '==', 'aula')
      .where('ano_letivo', '==', anoLetivo)
      .get()
    const totalDiasLetivos = calSnap.size || 200 // fallback razoável

    // Conta faltas do aluno no ano
    const faltasSnap = await db.collection('presencas')
      .where('aluno_id', '==', aluno_id)
      .where('status', 'in', ['ausente'])
      .get()
    const totalFaltas = faltasSnap.size

    const pctFaltas = totalFaltas / totalDiasLetivos
    if (pctFaltas < 0.25) return

    // Busca coordenadores para notificar
    const coordSnap = await db.collection('usuarios')
      .where('perfil', 'in', ['coordenador', 'diretor'])
      .where('ativo', '==', true)
      .get()

    const alunoSnap = await db.collection('alunos').doc(aluno_id).get()
    const nomeAluno = alunoSnap.exists ? alunoSnap.data().nome_completo : 'Aluno'

    await Promise.all(coordSnap.docs.map(u =>
      criarNotificacao({
        destinatarioId: u.id,
        tipo: 'alerta_faltas',
        titulo: `⚠️ Alerta de faltas — ${nomeAluno}`,
        mensagem: `${nomeAluno} atingiu ${Math.round(pctFaltas * 100)}% de faltas (limite: 25%).`,
        referenciaId: aluno_id,
        referenciaModulo: 'chamada',
      })
    ))
  }
)

// ── onDespesaAprovada — recalcula indicadores ao aprovar despesa ───────────
exports.onDespesaAprovada = onDocumentUpdated(
  { document: 'financeiro_lancamentos/{id}', region: 'southamerica-east1' },
  async (event) => {
    const antes = event.data.before.data()
    const depois = event.data.after.data()
    if (antes.status !== 'aprovado' && depois.status === 'aprovado') {
      await recalcular(depois.ano ?? ANO_ATUAL)
      // Auditar aprovação
      await auditarAcao({
        usuarioId: depois.aprovado_por,
        acao: 'DESPESA_APROVADA',
        modulo: 'financeiro',
        entidade: 'financeiro_lancamentos',
        entidadeId: event.params.id,
        valorAnterior: { status: antes.status },
        valorNovo: { status: depois.status },
      })
    }
  }
)

// ── alertarPrazos — diariamente às 8h ─────────────────────────────────────
exports.alertarPrazos = onSchedule(
  { schedule: 'every day 08:00', region: 'southamerica-east1' },
  async () => {
    const hoje = new Date()
    const em7Dias = new Date(hoje)
    em7Dias.setDate(hoje.getDate() + 7)
    const prazoStr = em7Dias.toISOString().split('T')[0]
    const hojeStr = hoje.toISOString().split('T')[0]

    const pendSnap = await db.collection('pendencias')
      .where('data_prazo', '>=', hojeStr)
      .where('data_prazo', '<=', prazoStr)
      .where('notificacao_enviada', '==', false)
      .where('status', '!=', 'concluido')
      .get()

    await Promise.all(pendSnap.docs.map(async (pend) => {
      const dados = pend.data()
      if (dados.responsavel_id) {
        await criarNotificacao({
          destinatarioId: dados.responsavel_id,
          tipo: 'prazo_pendencia',
          titulo: `📅 Prazo se aproximando: ${dados.titulo}`,
          mensagem: `A pendência "${dados.titulo}" vence em ${dados.data_prazo}.`,
          referenciaId: pend.id,
          referenciaModulo: 'projetos',
        })
      }
      await pend.ref.update({ notificacao_enviada: true })
    }))
  }
)

// ── onNotaAlteradaAposFechamento — auditoria obrigatória ──────────────────
exports.onNotaAlteradaAposFechamento = onDocumentUpdated(
  { document: 'notas/{id}', region: 'southamerica-east1' },
  async (event) => {
    const antes = event.data.before.data()
    const depois = event.data.after.data()
    // Só audita se a nota foi alterada em bimestre que estava fechado
    if (antes.fechado && antes.nota !== depois.nota) {
      await auditarAcao({
        usuarioId: depois.lancado_por,
        acao: 'NOTA_ALTERADA_POS_FECHAMENTO',
        modulo: 'notas',
        entidade: 'notas',
        entidadeId: event.params.id,
        valorAnterior: { nota: antes.nota },
        valorNovo: { nota: depois.nota },
        motivo: depois.motivo_alteracao ?? '',
      })

      // Notifica o diretor
      const diretorSnap = await db.collection('usuarios')
        .where('perfil', '==', 'diretor')
        .where('ativo', '==', true)
        .limit(1)
        .get()
      if (!diretorSnap.empty) {
        await criarNotificacao({
          destinatarioId: diretorSnap.docs[0].id,
          tipo: 'nota_alterada',
          titulo: '⚠️ Nota alterada após fechamento do bimestre',
          mensagem: `Nota alterada de ${antes.nota} para ${depois.nota} em bimestre fechado.`,
          referenciaId: event.params.id,
          referenciaModulo: 'notas',
        })
      }
    }
  }
)
