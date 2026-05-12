const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https')
const { onDocumentCreated, onDocumentUpdated, onDocumentWritten } = require('firebase-functions/v2/firestore')
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

// ── Helper: buscar perfil de um usuário (best-effort) ─────────────────────
async function resolverPerfil(uid) {
  if (!uid || uid === 'system') return 'system'
  try {
    const snap = await db.collection('usuarios').doc(uid).get()
    if (snap.exists) return snap.data().perfil ?? 'desconhecido'
  } catch (err) {
    console.warn('Falha ao resolver perfil:', err?.message ?? err)
  }
  return 'desconhecido'
}

// ── Helper: notificar usuários ativos por perfil ──────────────────────────
async function notificarPorPerfil(perfis, payload) {
  const lista = Array.isArray(perfis) ? perfis : [perfis]
  const snap = await db.collection('usuarios')
    .where('perfil', 'in', lista)
    .where('ativo', '==', true)
    .get()

  await Promise.all(snap.docs.map(async (u) => {
    const idDoc = payload.dedupeId ? `${payload.dedupeId}_${u.id}` : undefined
    const ref = idDoc
      ? db.collection('notificacoes').doc(idDoc)
      : db.collection('notificacoes').doc()
    if (idDoc) {
      const existente = await ref.get()
      if (existente.exists) return
    }
    await ref.set({
      destinatario_id: u.id,
      tipo: payload.tipo,
      titulo: payload.titulo,
      mensagem: payload.mensagem,
      lida: false,
      data_envio: admin.firestore.FieldValue.serverTimestamp(),
      referencia_id: payload.referenciaId ?? '',
      referencia_modulo: payload.referenciaModulo ?? '',
    })
  }))
}

function dataEhDiaUtil(data) {
  if (!data) return false
  const dia = new Date(`${data}T00:00:00`).getDay()
  return dia !== 0 && dia !== 6
}

async function carregarCalendarioPorData(anoLetivo) {
  const snap = await db.collection('calendario')
    .where('ano_letivo', '==', anoLetivo)
    .get()
  return snap.docs.reduce((acc, doc) => {
    const ev = doc.data()
    if (ev.data) acc[ev.data] = ev
    return acc
  }, {})
}

function ehDiaLetivo(data, eventosPorData) {
  const evento = eventosPorData[data]
  if (evento) return evento.tipo !== 'feriado' && evento.tipo !== 'recesso'
  return dataEhDiaUtil(data)
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

  // 3. Presenças — breakdown completo, apenas dias letivos do ano
  const calendarioPorData = await carregarCalendarioPorData(anoLetivo)
  const presencasSnap = await db.collection('presencas').get()
  let totalPresencas = 0
  let presentesCount = 0, ausentesCount = 0, justificadosCount = 0
  presencasSnap.docs.forEach(d => {
    const presenca = d.data()
    const anoPresenca = presenca.ano_letivo ?? Number(presenca.data?.slice(0, 4))
    if (anoPresenca !== anoLetivo || !ehDiaLetivo(presenca.data, calendarioPorData)) return

    totalPresencas += 1
    const st = presenca.status
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

// ── auditarAcaoCallable — gravar em /auditoria a partir do frontend ────────
// /auditoria tem regra `allow write: if false` — só Cloud Functions gravam.
exports.auditarAcaoCallable = onCall({ region: 'southamerica-east1' }, async (req) => {
  if (!req.auth) {
    throw new Error('Usuário não autenticado.')
  }
  const {
    acao, modulo, entidade, entidadeId,
    valorAnterior, valorNovo, motivo,
  } = req.data ?? {}

  if (!acao || !modulo || !entidade) {
    throw new Error('Campos obrigatórios ausentes: acao, modulo, entidade.')
  }

  const ip = req.rawRequest?.headers?.['x-forwarded-for']
            ?? req.rawRequest?.ip
            ?? null

  let perfilFinal = 'desconhecido'
  try {
    const userDoc = await db.collection('usuarios').doc(req.auth.uid).get()
    if (userDoc.exists) perfilFinal = userDoc.data().perfil ?? 'desconhecido'
  } catch (err) {
    console.warn('Falha ao buscar perfil para auditoria:', err?.message ?? err)
  }

  const ref = await db.collection('auditoria').add({
    usuario_id: req.auth.uid,
    perfil: perfilFinal,
    acao,
    modulo,
    entidade,
    entidade_id: entidadeId ?? '',
    valor_anterior: valorAnterior ?? null,
    valor_novo: valorNovo ?? null,
    motivo: motivo ?? '',
    ip,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  })

  return { ok: true, id: ref.id }
})

exports.recalcularIndicadoresScheduled = onSchedule(
  { schedule: 'every 15 minutes', region: 'southamerica-east1' },
  async () => recalcular(ANO_ATUAL)
)

async function avaliarAlertaFaltas(presenca) {
  if (presenca.status !== 'ausente') return

  const { aluno_id, turma_id, ano_letivo } = presenca
  const anoLetivo = ano_letivo ?? Number(presenca.data?.slice(0, 4)) ?? ANO_ATUAL
  const calendarioPorData = await carregarCalendarioPorData(anoLetivo)

  if (!ehDiaLetivo(presenca.data, calendarioPorData)) return

  const diasCalendario = Object.values(calendarioPorData)
  const diasLetivosCalendario = diasCalendario.filter(ev =>
    ev.tipo === 'aula' || ev.tipo === 'reposicao'
  ).length
  const totalDiasLetivos = diasLetivosCalendario || 200

  // Conta apenas faltas não justificadas em dias letivos do ano.
  const faltasSnap = await db.collection('presencas')
    .where('aluno_id', '==', aluno_id)
    .get()
  const totalFaltas = faltasSnap.docs.filter(doc => {
    const falta = doc.data()
    const anoFalta = falta.ano_letivo ?? Number(falta.data?.slice(0, 4))
    return anoFalta === anoLetivo
      && falta.status === 'ausente'
      && ehDiaLetivo(falta.data, calendarioPorData)
  }).length

  const pctFaltas = totalFaltas / totalDiasLetivos
  if (pctFaltas < 0.25) return

  const coordSnap = await db.collection('usuarios')
    .where('perfil', 'in', ['coordenador', 'diretor'])
    .where('ativo', '==', true)
    .get()

  const alunoSnap = await db.collection('alunos').doc(aluno_id).get()
  const nomeAluno = alunoSnap.exists ? alunoSnap.data().nome_completo : 'Aluno'

  await Promise.all(coordSnap.docs.map(async (u) => {
    const idNotificacao = `alerta_faltas_${anoLetivo}_${aluno_id}_${u.id}`
    const ref = db.collection('notificacoes').doc(idNotificacao)
    const existente = await ref.get()
    if (existente.exists) return

    await ref.set({
      destinatario_id: u.id,
      tipo: 'alerta_faltas',
      titulo: `⚠️ Alerta de faltas — ${nomeAluno}`,
      mensagem: `${nomeAluno} atingiu ${Math.round(pctFaltas * 100)}% de faltas não justificadas (limite: 25%).`,
      lida: false,
      data_envio: admin.firestore.FieldValue.serverTimestamp(),
      referencia_id: aluno_id,
      referencia_modulo: 'chamada',
      turma_id: turma_id ?? '',
      ano_letivo: anoLetivo,
    })
  }))
}

// ── onPresencaSalva — detecta 25% de faltas ────────────────────────────────
exports.onPresencaSalva = onDocumentCreated(
  { document: 'presencas/{id}', region: 'southamerica-east1' },
  async (event) => {
    await avaliarAlertaFaltas(event.data.data())
  }
)

exports.onPresencaAtualizada = onDocumentUpdated(
  { document: 'presencas/{id}', region: 'southamerica-east1' },
  async (event) => {
    const antes = event.data.before.data()
    const depois = event.data.after.data()
    if (antes.status === depois.status && antes.data === depois.data) return
    await avaliarAlertaFaltas(depois)
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

// ── onDespesaPendenteCriada — notifica Diretor para aprovação ──────────────
exports.onDespesaPendenteCriada = onDocumentCreated(
  { document: 'financeiro_lancamentos/{id}', region: 'southamerica-east1' },
  async (event) => {
    const lancamento = event.data.data()
    if (lancamento.tipo !== 'despesa' || lancamento.status !== 'pendente') return

    const diretorSnap = await db.collection('usuarios')
      .where('perfil', '==', 'diretor')
      .where('ativo', '==', true)
      .get()

    await Promise.all(diretorSnap.docs.map(async (diretor) => {
      const ref = db.collection('notificacoes').doc(`despesa_pendente_${event.params.id}_${diretor.id}`)
      const existente = await ref.get()
      if (existente.exists) return

      await ref.set({
        destinatario_id: diretor.id,
        tipo: 'despesa_pendente',
        titulo: 'Despesa pendente de aprovação',
        mensagem: `Despesa de R$ ${Number(lancamento.valor ?? 0).toFixed(2)} em ${lancamento.categoria || 'sem categoria'} aguarda aprovação.`,
        lida: false,
        data_envio: admin.firestore.FieldValue.serverTimestamp(),
        referencia_id: event.params.id,
        referencia_modulo: 'financeiro',
      })
    }))
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

    const configSnap = await db.collection('configuracoes').doc('escola').get()
    const diasPdde = Number(configSnap.exists ? configSnap.data().pdde_alerta_dias : 15) || 15
    const prazoPdde = new Date(hoje)
    prazoPdde.setDate(hoje.getDate() + diasPdde)
    const prazoPddeStr = prazoPdde.toISOString().split('T')[0]

    const pddeSnap = await db.collection('pendencias')
      .where('tipo', '==', 'PDDE')
      .get()

    const destinatariosSnap = await db.collection('usuarios')
      .where('perfil', 'in', ['diretor', 'admin'])
      .where('ativo', '==', true)
      .get()

    await Promise.all(pddeSnap.docs.map(async (pend) => {
      const dados = pend.data()
      if (dados.pdde_notificacao_enviada) return
      if (dados.status === 'concluido') return
      if (!dados.data_prazo || dados.data_prazo < hojeStr || dados.data_prazo > prazoPddeStr) return

      await Promise.all(destinatariosSnap.docs.map(async (u) => {
        const ref = db.collection('notificacoes').doc(`pdde_prazo_${pend.id}_${u.id}`)
        const existente = await ref.get()
        if (existente.exists) return

        await ref.set({
          destinatario_id: u.id,
          tipo: 'pdde_prazo',
          titulo: 'Prazo PDDE se aproximando',
          mensagem: `A pendência PDDE "${dados.titulo}" vence em ${dados.data_prazo}.`,
          lida: false,
          data_envio: admin.firestore.FieldValue.serverTimestamp(),
          referencia_id: pend.id,
          referencia_modulo: 'projetos',
        })
      }))

      await pend.ref.update({ pdde_notificacao_enviada: true })
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

// ── onOcorrenciaCriada — auditoria médica/acidente e alerta de gravidade ───
exports.onOcorrenciaCriada = onDocumentCreated(
  { document: 'ocorrencias/{id}', region: 'southamerica-east1' },
  async (event) => {
    const ocorrencia = event.data.data()
    const tiposSensiveis = ['medico', 'acidente']

    if (tiposSensiveis.includes(ocorrencia.tipo)) {
      await auditarAcao({
        usuarioId: ocorrencia.registrado_por,
        acao: 'OCORRENCIA_SENSIVEL_CRIADA',
        modulo: 'ocorrencias',
        entidade: 'ocorrencias',
        entidadeId: event.params.id,
        valorNovo: {
          tipo: ocorrencia.tipo,
          aluno_id: ocorrencia.aluno_id,
          gravidade: ocorrencia.gravidade,
        },
        motivo: 'Registro de ocorrência médica/acidente.',
      })
    }

    if (ocorrencia.gravidade !== 'alta') return

    const gestoresSnap = await db.collection('usuarios')
      .where('perfil', 'in', ['diretor', 'coordenador'])
      .where('ativo', '==', true)
      .get()

    await Promise.all(gestoresSnap.docs.map(async (u) => {
      const ref = db.collection('notificacoes').doc(`ocorrencia_grave_${event.params.id}_${u.id}`)
      const existente = await ref.get()
      if (existente.exists) return

      await ref.set({
        destinatario_id: u.id,
        tipo: 'ocorrencia_grave',
        titulo: 'Ocorrência grave registrada',
        mensagem: `${ocorrencia.aluno_nome || 'Aluno'} possui ocorrência de gravidade alta em acompanhamento.`,
        lida: false,
        data_envio: admin.firestore.FieldValue.serverTimestamp(),
        referencia_id: event.params.id,
        referencia_modulo: 'ocorrencias',
      })
    }))
  }
)
