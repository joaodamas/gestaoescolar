# Checklist de Desenvolvimento — Gestão Escolar À Vista
> v2.0 · Firebase + React · Maio 2026

---

## Legenda de Prioridade
- 🔴 **CRÍTICO** — Bloqueia tudo. Sem isso nada funciona.
- 🟠 **ALTA** — Core do sistema. MVP depende disso.
- 🟡 **MÉDIA** — Importante mas não bloqueia MVP.
- 🟢 **BAIXA** — Nice-to-have, pode ir para V2.

---

## FASE 1 — Base & Infraestrutura 🔴 CRÍTICO

### Setup Firebase
- [x] Criar projeto Firebase (Auth + Firestore + Storage + Functions + Hosting)
- [x] Configurar variáveis de ambiente `.env` (NUNCA commitar no git)
- [x] Adicionar `.env` no `.gitignore`
- [x] Configurar Firebase SDK no frontend (`/src/firebase/firebase.js`)
- [x] Configurar Firebase Auth (`/src/firebase/firebase.js` — auth exportado)
- [x] Configurar Firebase Storage (`/src/firebase/firebase.js` — storage exportado)
- [ ] Configurar Cloud Scheduler (recalcular KPIs a cada 15 min)

### Autenticação
- [x] Tela de Login (email + senha)
- [x] Integração Firebase Auth
- [x] Reset de senha por email ("Esqueci minha senha")
- [x] Mensagem de erro genérica (não revelar qual campo errou — segurança)
- [x] Buscar perfil do usuário em `/usuarios/{uid}` após login
- [x] Gravar `ultimo_acesso` no login
- [x] Redirecionar para Dashboard com menu filtrado por perfil
- [x] Logout

### AuthContext
- [x] Criar `AuthContext.jsx` com perfil do usuário logado
- [x] Hook `useAuth()` acessível em toda a app
- [x] Proteção de rotas por perfil (PrivateRoute)
- [x] Validação de acesso por módulo conforme tabela de perfis

### Firestore Indexes (Composite) 🔴 NOVO — CRÍTICO
- [x] Criar `firestore.indexes.json` com 22 índices compostos
- [x] alunos: `status + nome_completo`
- [x] turmas: `ano_letivo + nome` e `ano_letivo + ativa + nome`
- [x] matriculas: `aluno_id + ano_letivo (DESC)`, `aluno_id + ano_letivo + status`, `turma_id + ano_letivo + status`
- [x] presencas: `aluno_id + status`, `turma_id + data (DESC)`
- [x] notas: `aluno_id + ano_letivo (DESC)`, `turma_id + disciplina_id + bimestre + ano_letivo`, `ano_letivo + fechado`
- [x] avaliacoes: `turma_id + disciplina_id + bimestre + ano_letivo + data_aplicacao`
- [x] disciplinas: `turma_id + ano_letivo + nome`
- [x] ocorrencias: `aluno_id + data_ocorrencia (DESC)`, `tipo + data_ocorrencia (DESC)`
- [x] notificacoes: `destinatario_id + data_envio (DESC)`, `destinatario_id + lida`
- [x] projetos: `status + data_inicio (DESC)`
- [x] pendencias: `status + data_prazo`, `data_prazo + notificacao_enviada + status`
- [x] financeiro_lancamentos: `ano + status`
- [x] calendario: `ano_letivo + tipo`
- [x] usuarios: `perfil + ativo`
- [x] Deploy via `firebase deploy --only firestore:indexes`

### Tratamento de Erro em onSnapshot 🔴 NOVO — CRÍTICO
- [x] Adicionar error callback em todos os `onSnapshot` (sem isso, erros silenciam → loading infinito)
- [x] `AlunosPage`: erro callback + banner vermelho com mensagem
- [x] `TurmasPage`: erro callback via `observarTurmas(_, callback, errorCallback)`
- [x] `services/turmas.js`: `observarTurmas` aceita errorCallback e chama success([]) para destravar UI
- [x] `services/notificacoes.js`: error handler que retorna []
- [x] Aplicar mesmo padrão em todas as páginas restantes (Notas, Financeiro, Ocorrências, Projetos, Usuários)

### Firestore Security Rules
- [x] Regras para `/usuarios` — próprio + Diretor lê, Admin/Diretor escreve
- [x] Regras para `/alunos` — Diretor e Coordenador
- [x] Regras para `/responsaveis` — Diretor e Coordenador
- [x] Regras para `/matriculas` — Professor lê somente suas turmas
- [x] Regras para `/presencas` — Professor (48h), Coordenador, Diretor
- [x] Regras para `/notas` — Professor (bimestre aberto), Coord/Dir desbloqueiam
- [x] Regras para `/ocorrencias` — médico/acidente só Coord e Diretor
- [x] Regras para `/financeiro_lancamentos` — Admin cria, Diretor aprova
- [x] Regras para `/auditoria` — SOMENTE Cloud Functions gravam, nenhum perfil deleta
- [x] Regras para `/indicadores` — todos leem (somente leitura), só Cloud Functions escrevem
- [x] Regras para `/configuracoes` — todos leem, Diretor/Admin escrevem
- [ ] Mascaramento de CPF e telefone diretamente nas regras do Firestore
- [ ] **QA:** Resolver acesso seguro do professor a dados mínimos de alunos via `/matriculas` ou `/alunos_resumo`
- [x] **QA:** Alinhar rules/UI do Financeiro: Admin cria, Diretor aprova, Admin não aprova
- [x] **QA:** Separar `create/update/delete` em projetos e pendências; `allow delete: if false`

### Estrutura de Pastas
- [x] Criar estrutura conforme documentação (`/components`, `/pages`, `/hooks`, `/services`, `/firebase`, `/utils`, `/context`)
- [x] Setup React + Vite
- [x] Setup Tailwind CSS
- [x] Setup Recharts
- [x] Setup react-pdf / @react-pdf/renderer
- [x] Setup SheetJS (xlsx)

---

## FASE 2 — Gestão de Alunos 🔴 CRÍTICO

### Coleções Firestore
- [x] Modelagem `/alunos` (sem `turma_id` direto — vínculo via `/matriculas`)
- [x] Modelagem `/responsaveis`
- [x] Modelagem `/matriculas` (com `ano_letivo`, `status`, `numero_matricula` auto-gerado)
- [x] Modelagem `/turmas`
- [x] Modelagem `/disciplinas`
- [x] Modelagem `/calendario` + `services/calendario.js`

### Endereço com Auto-preenchimento por CEP 🔴 NOVO — CRÍTICO
- [x] Utilitário `utils/cep.js` com integração ViaCEP API
- [x] Cache em memória para evitar consultas repetidas
- [x] Validação de CEP (8 dígitos)
- [x] Formatação visual (00000-000)
- [x] Aba Endereço no modal de matrícula
- [x] Spinner de loading durante busca
- [x] Tratamento de erro (CEP inválido, não encontrado, timeout)
- [x] Campos auto-preenchidos: Logradouro, Bairro, Cidade, UF, Complemento
- [x] Salvo em `aluno.endereco` (objeto aninhado)

### Tela Gestão de Turmas (CRUD) 🔴 NOVO — CRÍTICO
- [x] Listagem de turmas em grid (cards) com indicadores visuais
- [x] Filtros por turno (manhã/tarde/integral) e busca
- [x] Card mostra: nome, série, turno, sala, capacidade, ocupação %, professor titular
- [x] Barra de ocupação colorida (verde/amarelo/vermelho conforme lotação)
- [x] Botão "+ Nova Turma" (modal — Diretor/Coordenador apenas)
- [x] Modal com campos: nome, série, turno, sala, capacidade máx., professor titular, ano letivo
- [x] Botão "Editar" por card
- [x] Botão "Arquivar" (soft delete — `ativa=false`)
- [x] Contagem de alunos por turma via `/matriculas` ativas
- [x] Atribuição de múltiplos professores (`professores_ids` array)
- [x] Vincular disciplinas à turma

### Tela Gestão de Disciplinas 🔴 NOVO — CRÍTICO
- [x] CRUD de disciplinas por turma e ano letivo
- [x] Filtros por turma, professor, ano letivo e status
- [x] Vincular professor responsável à disciplina
- [x] Soft delete via `ativa=false`
- [x] Error callback em `onSnapshot` para evitar loading infinito
- [x] Índices compostos adicionais para filtros da tela
- [x] Suporte a múltiplos professores por disciplina/turma

### Tela Gestão de Alunos
- [x] Listagem de alunos com status=ativo
- [x] Join com `/matriculas` para exibir turma atual
- [x] Barra de busca por nome
- [x] Filtros: Turma / Status / Ano letivo
- [x] Tabela: Nome | Matrícula | Turma | Presença % | Status | Ações
- [x] Botão "Exportar Lista" (Excel)
- [x] Modal expansivo "+ Nova Matrícula" com 3 abas: Aluno + Endereço + Responsável
  - [x] Aba Aluno: Nome, Data Nasc., **RA**, CPF, Sexo, Necessidades Especiais
  - [x] Foto do aluno (URL ou upload para Storage)
  - [x] Aba Saúde: deficiência/acessibilidade, doenças/condições, alergias, alergias alimentares, restrições alimentares, medicamentos, plano de saúde, contato de emergência e observações
  - [x] **RA (Registro do Aluno)** — campo identificador estadual, mostrado na tabela e perfil
  - [x] **Aba Endereço com auto-preenchimento por CEP (ViaCEP API)**
    - [x] Campo CEP com busca automática on-blur
    - [x] Logradouro, Número, Complemento, Bairro, Cidade, UF
    - [x] Endereço gravado em `aluno.endereco` (objeto aninhado)
  - [x] Aba Responsável: Nome, Parentesco, Telefone, Email, Consentimento LGPD
  - [x] Seleção de Turma e Ano Letivo
  - [x] Criar atomicamente: `/alunos` + `/responsaveis` + `/matriculas`
- [x] Botão "Ver Perfil" por aluno
- [x] Botão "Editar" cadastro do aluno
- [x] Modal de edição com dados pessoais, foto, saúde/acessibilidade e endereço
- [x] Edição de responsável/matrícula a partir do cadastro do aluno

### Perfil do Aluno
- [x] Modal expansivo com 5 abas (Dados / Histórico / Presença / Notas / Ocorrências)
- [x] Hero do aluno com avatar gradiente, status e turma atual
- [x] Dados pessoais (CPF mascarado: `***.NNN.***-**`)
- [x] Endereço completo formatado
- [x] Responsáveis vinculados com badges Financeiro/Pedagógico
- [x] Histórico de matrículas por ano
- [x] Aba Presença: cards com presença %, presentes/ausentes/justificados + alerta 25%
- [x] Aba Notas: tabela com situação por bimestre
- [x] Aba Ocorrências: lista cronológica com gravidade colorida
- [x] Click na linha da tabela de alunos abre o perfil
- [x] Exportação de dados individuais (PDF — LGPD)

### Serviços
- [x] `services/alunos.js`
- [x] `services/matriculas.js`
- [x] `services/turmas.js`
- [x] Mascaramento de CPF e telefone em `utils/mascaramento.js`

---

## FASE 3 — Módulo Pedagógico 🟠 ALTA

### Chamada / Presença
- [x] Dropdown de turmas (somente turmas do professor logado via `turmas_ids`)
- [x] Seletor de data (default: hoje)
- [x] Verificar `/calendario` se a data é dia letivo — aviso vermelho se feriado/recesso/fim de semana
- [x] Verificar se chamada do dia já existe (aviso visual)
- [x] Carregar alunos da turma via `/matriculas` ativas
- [x] Botões P (verde) / F (vermelho) / J (amarelo) por aluno
- [x] Campo obrigatório de justificativa para J (mín. 10 chars)
- [x] Indicador: X presentes / Y ausentes / Z justificados
- [x] Botão "Salvar Chamada" (batch write em `/presencas`)
- [x] Botão "Ver Histórico" de chamadas anteriores
- [x] Campos bloqueados após 48h (`editavel_ate`) — exibir "Solicitar edição ao Coordenador"
- [x] Aviso visual se chamada já salva no dia
- [ ] `hook/usePresenca.js`
- [x] `services/presencas.js`

### Lançamento de Notas
- [x] Dropdown: Turma | Disciplina | Bimestre
- [x] Listar avaliações do bimestre (`/avaliacoes`)
- [x] Botão "+ Nova Avaliação" (tipo, peso, data)
- [x] Grade: linhas = alunos | colunas = avaliações
- [x] Células editáveis (0.0 a 10.0)
- [x] Coluna calculada: Média Bimestral com pesos em tempo real
  - `media_bimestral = soma(nota_i × peso_i) / soma(peso_i)`
- [x] Coluna calculada: Situação (Aprovado ≥ 6.0 | Recuperação 4.0-5.9 | Reprovado < 4.0)
- [x] Ícone de alerta para alunos em risco de reprovação
- [x] Botão "Editar Notas" (desbloqueia grade)
- [x] Botão "Salvar Rascunho" (sem fechar bimestre)
- [x] Botão "Fechar Bimestre" (`fechado=true` + grava `historico_alteracoes`)
- [x] Bloqueio de edição para professor após fechar bimestre
- [x] Reabertura só por Coordenador/Diretor (UI placeholder)
- [x] Botão "Ver Boletim" por aluno (placeholder)
- [x] Campo `aprovado_conselho` para decisão colegiada
- [x] Nota de recuperação: `max(media_bimestral, nota_recuperacao)`
- [ ] `hook/useNotas.js`
- [x] `services/notas.js`

### Calendário Escolar
- [x] Tela de calendário mensal e lista de eventos
- [x] CRUD de feriados, recessos, eventos e reposições
- [x] Contagem de dias letivos
- [x] Filtro por ano letivo e tipo
- [x] Vinculação opcional de evento a uma turma específica
- [x] Regras Firestore específicas para permitir edição apenas por perfis autorizados

### Cloud Functions — KPIs
- [x] `recalcularIndicadores()` — callable + scheduled a cada 15 min
- [x] Trigger automático em `/financeiro_lancamentos` (onDespesaAprovada)
- [x] Calcular e gravar em `/indicadores/{ano}`:
  - [x] `total_alunos`
  - [x] `presenca_media`
  - [x] `taxa_aprovacao`
  - [x] `orcamento_previsto` e `orcamento_executado`
  - [x] `total_ocorrencias` por tipo

### Regras de Negócio — Presença
- [x] Alerta automático ao atingir 25% de faltas → `/notificacoes` para Coordenador
- [x] Frequência exclui feriados e recessos do `/calendario`
- [x] Falta justificada não conta para limite 25% mas conta na frequência real

### Regras de Negócio — Notas
- [x] Histórico de alterações: array `historico_alteracoes` em `/notas`
- [x] Recuperação final configurável em `/configuracoes`

---

## FASE 4 — Dashboard 🟠 ALTA

### Estrutura base
- [x] Leitura de APENAS 1 documento: `/indicadores/{ano}` (nunca queries brutas)
- [x] `onSnapshot` no `/indicadores` — atualização reativa
- [x] Header destacado com logo da escola, slogan, data atual, "Atualizado em HH:MM"
- [x] Botão "Exportar PDF do Dashboard"

### 6 KPIs principais (modelo referência)
- [x] Card: Alunos Matriculados (com "100% do previsto")
- [x] Card: Presença Média % (com Meta visível)
- [x] Card: Desempenho Médio (SAEB) — com meta visível
- [x] Card: Taxa de Aprovação % (com Meta visível)
- [x] Card: Colaboradores
- [x] Card: Execução Orçamentária %

### Presença dos Alunos
- [x] Gráfico Donut: 3 categorias (Presentes / Ausentes / Justificados) — com contagens
- [x] Legenda lateral com % e contagem absoluta
- [x] Indicador da meta de presença

### Desempenho Acadêmico (SAEB)
- [x] Gráfico Barras: SAEB histórico por ano (4 anos)
- [x] Linha de referência da Meta SAEB
- [x] Destaque do ano atual com cor diferenciada
- [x] Histórico real do SAEB editável em Configurações (UI dinâmica adicionar/remover ano)
- [x] FIX: input SAEB aceita vírgula e ponto, permite apagar para digitar (string interna, conversão no save)

### Situação Financeira
- [x] Gauge radial: % de execução orçamentária
- [x] Lista: Orçamento Previsto | Executado | Saldo Disponível (formatado em R$)

### Projetos e Ações
- [x] Lista de até 5 projetos em andamento ou planejados
- [x] Ícone + nome + badge de status colorido
- [x] Link "Ver todos os projetos"

### Ocorrências
- [x] Lista de 5 tipos com contador circular colorido
- [x] Ícone específico por tipo (ShieldAlert, Heart, ArrowUpRight, Users2, Zap)
- [x] Botão "Ver todas as ocorrências →"

### Pendências e Prazos
- [x] Lista de até 5 pendências próximas do prazo
- [x] Mostra: título, data formatada, badge de status
- [x] Cores: vermelho (pendente), amarelo (em andamento), azul (planejado)

### Missão e Valores (Footer)
- [x] Card destacado com "Nossa Missão"
- [x] Card com "Nossos Valores"
- [x] Bloco "Juntos, fazemos a diferença"
- [x] Editáveis em `/configuracoes`

---

## FASE 5 — Ocorrências 🟠 ALTA

- [x] FIX: tabela mostrava ID do aluno e UID do registrador em vez dos nomes
  - [x] Denormalização: `criarOcorrencia` agora salva `aluno_nome` e `registrado_por_nome` no doc
  - [x] Enriquecimento retroativo: lookup com cache em memória para registros antigos
- [x] Contadores por tipo no topo (disciplinar | médico | encaminhamento | reunião | acidente)
- [x] Filtros: Tipo | Período | Status | Gravidade
- [x] Tabela: Data | Aluno | Tipo | Gravidade | Status | Responsável | Ações
- [x] **CRÍTICO:** Professor NÃO vê ocorrências do tipo `medico` e `acidente` (frontend + Firestore Rules)
- [x] Botão "+ Nova Ocorrência" (modal)
- [x] Modal Nova Ocorrência:
  - [x] Busca de aluno em tempo real (debounce 300ms)
  - [x] Campo Tipo (5 tipos — filtrado por perfil)
  - [x] Campo Gravidade (baixa | média | alta)
  - [x] Campos Descrição e Providência tomada
  - [x] Checkbox "Notificar responsável"
- [x] Botão "Ver Detalhes"
- [x] Botão "Marcar Resolvida"
- [x] Cloud Function: grava em `/auditoria` para ocorrências médicas e acidentes
- [x] `services/ocorrencias.js`

---

## FASE 6 — Financeiro / Orçamento 🟡 MÉDIA

- [x] Cards: Orçamento Previsto | Executado | Saldo Disponível
- [x] Gauge: % de execução orçamentária (barra de progresso)
- [x] Filtros: Categoria | Período | Status | Centro de custo
- [x] Tabela com todas as colunas
- [x] Botão "+ Nova Despesa" (modal — visible para Admin)
- [x] Botão "+ Nova Receita" (modal)
- [x] Botão "Aprovar" — visível SOMENTE para Diretor
- [x] Botão "Ver Comprovante" (abre PDF do Storage)
- [x] Botão "Exportar Relatório" (PDF + Excel)
- [x] Modal Nova Despesa:
  - [x] Campos: Categoria | Subcategoria | Valor | Descrição | Data | Centro de custo
  - [x] Upload de comprovante (obrigatório para despesas > R$500)
  - [x] Preview em tempo real: "Saldo após esta despesa: R$ X"
  - [x] Bloqueio se valor > saldo disponível
  - [x] Botão "Enviar para aprovação" (status=pendente)
- [x] Notificação automática para Diretor ao criar despesa pendente
- [x] Fluxo: Admin cria → status=pendente → Diretor aprova → status=aprovado
- [x] Cloud Function atualiza `/indicadores` a cada despesa aprovada (onDespesaAprovada)
- [x] Alerta PDDE: 15 dias antes do prazo → `/notificacoes` para Diretor e Admin
- [x] `services/financeiro.js`

---

## FASE 7 — Projetos & Pendências 🟡 MÉDIA

### Projetos (Kanban)
- [x] Kanban 3 colunas: Planejado | Em Andamento | Concluído
- [x] Card: Nome | Descrição | Categoria | Data fim | Indicador de sucesso
- [x] Botão "+ Novo Projeto" (modal expansivo)
- [x] Botão "Avançar →" no card (move para próxima coluna)
- [x] Drag & drop entre colunas
- [x] Modal de detalhes do projeto

### Pendências
- [x] Lista ordenada por `data_prazo`
- [x] Alerta visual: pendências vencendo em ≤ 7 dias (cor amber/vermelha)
- [x] Indicador "Venceu há Nd" / "Vence hoje" / "Em Nd"
- [x] Botão "+ Nova Pendência" (modal)
- [x] Atualização de status inline (dropdown)
- [x] Tipos pré-definidos: PDDE, Conselho PDE, Plano de Ação, Formação, Avaliação Institucional
- [x] Cloud Function `alertarPrazos` (deploy pendente — exige Blaze)

---

## FASE 8 — Relatórios & Exportação 🟡 MÉDIA

- [ ] **PARCIAL:** Boletim por aluno (PDF) — precisa validar cálculo com pesos, recuperação e conselho
- [ ] **PARCIAL:** Diário de classe (PDF + Excel) — precisa recorte correto por bimestre/período e cálculo oficial
- [ ] **PARCIAL:** Frequência por turma (PDF + Excel) — precisa filtrar por período/bimestre
- [ ] **PARCIAL:** Alunos em risco de reprovação (PDF + Excel) — precisa consumir média oficial consolidada
- [ ] **PARCIAL:** Faltas acima do limite 25% (PDF + Excel) — precisa validar regra de dias letivos/período
- [x] Ocorrências por período (PDF + Excel) — Coord., Diretor
- [x] Orçamento por categoria (PDF + Excel) — Admin, Diretor
- [x] Prestação de contas PDDE (PDF) — Admin, Diretor
- [x] Evolução SAEB / indicadores (PDF) — Todos
- [x] Exportação de dados do aluno (PDF — LGPD) — Diretor
- [x] Auditoria de ações (Excel) — Diretor, Admin
- [x] Resumo gerencial mensal (PDF) — Diretor
- [ ] Mascarar/omitir dados sensíveis conforme perfil do solicitante
- [x] `utils/exportPDF.js`
- [x] `utils/exportExcel.js`
- [ ] Validar relatórios com dados reais de produção/homologação
- [x] Code-splitting/lazy load para reduzir bundle após entrada de @react-pdf/xlsx

---

## FASE 9 — Auditoria 🟠 ALTA

- [x] Cloud Function `auditarAcao()` — grava em `/auditoria` (helper interna)
- [x] Cloud Function callable `auditarAcaoCallable` para auditoria iniciada pelo frontend
- [x] **QA:** `auditarAcaoCallable` usa `req.auth.uid` e busca perfil no servidor, sem aceitar identidade do cliente
- [x] **IMUTÁVEL:** Nenhum perfil pode criar, editar ou deletar registros de auditoria (Firestore Rules)
- [ ] Triggers obrigatórios:
  - [x] Alteração de nota após fechamento (notifica Diretor) — onNotaAlteradaAposFechamento
  - [ ] Fechamento/reabertura de bimestre (motivo obrigatório)
  - [ ] Aprovação por conselho de classe (motivo obrigatório, notifica Diretor)
  - [ ] Edição de presença após 48h (motivo obrigatório, notifica Coordenador)
  - [x] Aprovação de despesa — onDespesaAprovada
  - [ ] Despesa acima do limite (motivo obrigatório, notifica Diretor)
  - [ ] Inativação de aluno (motivo obrigatório, notifica Diretor)
  - [ ] Mudança de perfil de usuário (motivo obrigatório, notifica Admin)
  - [ ] Leitura de ocorrência médica
  - [ ] Exclusão lógica de qualquer dado (motivo obrigatório, notifica Diretor)
- [x] `services/auditoria.js` (listar, observar realtime, buscar por id)
- [x] Tela de auditoria completa:
  - [x] 4 stat cards (Total, Módulos, Críticas, Mais frequente)
  - [x] Filtros: Módulo, Usuário, Ação, Data início/fim
  - [x] Busca textual em ação/usuário/motivo
  - [x] Timeline de registros com ícone + cor por tipo de ação
  - [x] Modal de detalhe com Antes vs Depois (diff JSON)
  - [x] Metadados técnicos (ID, IP, timestamp)
  - [x] Acesso somente Diretor e Admin (página + Firestore Rules)
  - [x] Limite de 100 registros mais recentes

---

## FASE 10 — LGPD & Conformidade 🟠 ALTA

- [ ] Mascaramento de CPF: `***.***.***-**` via Firestore Rules (nunca expor inteiro)
- [ ] Mascaramento de telefone via Firestore Rules
- [x] Consentimento LGPD coletado na matrícula (`consentimento_lgpd`, `consentimento_data`)
- [x] Log de acesso a dados médicos em `/auditoria`
- [x] Soft delete em todos os módulos (status=inativo, nunca deletar fisicamente)
- [ ] Retenção de 5 anos para dados de alunos inativos
- [ ] URLs temporárias assinadas para arquivos no Firebase Storage
- [x] Separação de ocorrências médicas (campo `tipo=medico`)
- [x] Exportação de dados individuais do aluno (LGPD — Diretor)
- [x] Campo `base_legal` em `/alunos`
- [x] Campo `ip_consentimento` em `/usuarios`
- [ ] Processo documentado de notificação de violação (ANPD)

---

## FASE 11 — Configurações da Escola 🟢 BAIXA

- [x] Tela de Configurações (Diretor e Admin)
- [x] Dados da escola: Nome, CNPJ, Slogan, Ano Letivo
- [x] Missão e Valores editáveis (afeta o Dashboard)
- [x] Metas: Presença % | Aprovação % | SAEB
- [x] Regras de nota: pesos por tipo de avaliação
- [x] Limite de valor para comprovante obrigatório (padrão R$500)
- [x] Histórico SAEB dinâmico (alimenta o gráfico do Dashboard)
- [x] Upload de Logo (Firebase Storage)
- [x] Endereço completo (CEP, rua, número, cidade, estado)
- [x] Regras de recuperação final
- [x] Alerta PDDE: dias de antecedência (padrão 15)

---

## FASE 12 — Implantação de Funcionalidades do SisEduc Atual 🟠 ALTA
> Referência visual: telas do SisEduc capturadas em 12/05/2026. Objetivo: migrar os fluxos úteis para uma experiência mais profissional, integrada ao design atual, com menos menus profundos e mais painéis contextuais.

### FASE 12.0 — Arquitetura de Execução Antes das Telas 🔴 CRÍTICO
- [ ] Criar mapa de módulos/rotas do novo escopo SisEduc antes de implementar telas
- [ ] Adicionar rotas agrupadas: `/secretaria`, `/diario`, `/saude`, `/nutricao`, `/colegio`, `/paesp`, `/integracoes`, `/supervisao`
- [ ] Definir modelo de dados inicial para: unidade escolar, matrículas avançadas, diário, saúde, nutrição, documentos, funcionários e PAESP
- [ ] Revisar `MODULOS_POR_PERFIL` para novos módulos e submódulos
- [ ] Criar matriz de permissões por perfil operacional: Diretor, Coordenador, Professor, Secretaria, Supervisor, NDPD/Saúde, Nutrição, Transporte e Admin
- [ ] Definir política de auditoria por módulo sensível antes de criar telas de Saúde, Documentos e Diário
- [ ] Definir padrões de Storage seguro para documentos/anexos antes de upload em Saúde, Documentos e Funcionários
- [ ] Criar plano de índices Firestore para filtros densos de secretaria, diário, relatórios e saúde

### FASE 12.1 — Contexto Escolar / Unidade 🟠 ALTA
- [ ] Criar seletor de escola/unidade atual inspirado em "Você está acessando"
- [ ] Persistir `escola_id`/`unidade_id` nos principais documentos
- [ ] Filtrar todas as queries por escola/unidade ativa
- [ ] Atualizar Firestore Rules para impedir acesso cruzado entre unidades
- [ ] Permitir usuário vinculado a múltiplas unidades

### Diretriz de Produto / UX
- [ ] Consolidar o menu legado em áreas claras: Secretaria, Pedagógico, Saúde, Nutrição, Relatórios, Gestão Escolar, Integrações e Administração
- [ ] Evitar replicar o menu profundo do SisEduc; usar hubs por módulo com cards de ações, filtros salvos e atalhos recentes
- [ ] Padronizar telas de busca com: ano letivo, turma/série, situação/status, nome, RA, filtros avançados e ações de exportação
- [ ] Criar componente reutilizável `SearchPanel` para filtros densos de secretaria e relatórios
- [ ] Criar componente reutilizável `DataActionTable` com paginação, seleção, ações por linha, ícones com tooltip e exportação
- [ ] Criar componente reutilizável `ModuleHub` para agrupar submódulos com cards compactos e indicadores
- [ ] Padronizar estados vazios: nenhum resultado, sem permissão, sem configuração e erro de carregamento, sempre com ação recomendada
- [ ] Criar autocomplete reutilizável para aluno, professor, funcionário e turma; não usar select nativo gigante
- [ ] Salvar último ano letivo/turma/filtros do usuário quando aplicável
- [ ] Criar breadcrumb/contexto de módulo para telas profundas
- [ ] Criar busca global de módulos/telas
- [ ] Criar política visual para integrações externas: abrir em nova aba, registrar auditoria e exibir aviso de ambiente externo

### Dashboard / Visão Geral
- [x] Card de Próximos Eventos no dashboard
- [ ] Card/painel de Notificações institucionais com estado vazio profissional
- [ ] Blocos de plataformas externas: Educação Modelo, Saúde na Escola, Centro de Mídias e Site do Colégio
- [ ] Cards gerenciais inspirados no SisEduc: alunos sem RA, frequência inferior a 75%, níveis de escrita/leitura
- [ ] Ação "Detalhes" nos cards críticos levando para relatórios filtrados
- [ ] Ajustar dashboard para perfis: Diretor, Coordenador, Professor, Secretaria/Admin e Saúde/Nutrição

### Matrículas / Secretaria Escolar
- [x] Nova matrícula integrada a aluno, responsável, endereço e turma
- [ ] Tela de busca de matrículas com filtros: ano letivo, ensino, ano/série, situação e nome
- [ ] Tela de intenção de vaga com filtros: ano letivo, ensino, ano/série, situação e busca
- [ ] Cadastro de nova intenção de vaga com dados do estudante, responsável, endereço, escola atual/origem e série pretendida
- [ ] Workflow de homologação de intenção de vaga: homologado, exceção, pendente, cancelado e encaminhado
- [ ] Controle "matriculado em outro colégio?" com destaque visual e histórico de encaminhamento
- [ ] Ações por intenção de vaga: etiquetar/classificar, encaminhar, imprimir, cancelar e auditar
- [ ] Conversão de intenção de vaga homologada em matrícula, preservando histórico e documentos
- [ ] Fluxo de deferimento/indeferimento de matrícula com motivo e auditoria
- [ ] Histórico de situação da matrícula: solicitada, deferida, ativa, transferida, evadida, cancelada, concluída
- [ ] Controle de movimentação escolar: transferência, evasão, remanejamento, retorno e justificativa
- [ ] Justificativa de alunos evadidos com documento/anexo e responsável pela decisão
- [ ] Geração de declaração de matrícula e documentos oficiais do aluno
- [ ] Importação de fotos em lote por RA/matrícula
- [ ] Carteirinha do aluno com foto, RA, turma, QR Code e validade
- [ ] Inscrição ENEM/indicadores externos como campo/registro administrativo quando aplicável

### Alunos / Documentos / Autorizações
- [x] Cadastro do aluno com foto, saúde, deficiência, doenças, alergias e restrições
- [ ] Relação de alunos por turma/classe com filtros e exportação PDF/Excel
- [ ] Mapa de ausência por turma, período e aluno
- [ ] Registro de entrada e saída de alunos com responsável/autorizado, horário e motivo
- [ ] Conselho de aluno: registros de decisões, encaminhamentos e responsáveis
- [ ] Termo de consentimento livre e esclarecido
- [ ] Termo de autorização de vacinação
- [ ] Termo de inquérito epidemiológico / saúde bucal
- [ ] Encaminhamento de pronto atendimento
- [ ] Ficha PAEB / ficha de acompanhamento pedagógico do aluno
- [ ] Ficha de rendimento
- [ ] Ficha de observação
- [ ] Ficha de acompanhamento da educação infantil
- [ ] Ficha de levantamento socioeconômico-cultural
- [ ] Quadro de visitas e quadro de rotina

### Diário de Classe Avançado
- [x] Chamada diária
- [x] Lançamento de notas
- [ ] Tela "Diário de Classe - Lançamento" com visão por professor, turma e dias da semana
- [ ] Visão semanal do professor com abas: Todos, 2ª, 3ª, 4ª, 5ª e 6ª feira
- [ ] Atribuição de sala/turma ao professor para liberar lançamentos
- [ ] Pendências do diário: chamadas não realizadas, notas incompletas, bimestres não fechados
- [ ] Deferimento/aprovação de lançamentos pelo coordenador/diretor
- [ ] Fechamento de diário com assinatura/histórico para assinar
- [ ] Reabertura de diário com motivo obrigatório e auditoria
- [ ] Diário de classe detalhado por professor/aluno para consulta de gestão

### Quadro Escolar / Turmas / Salas
- [x] Gestão de turmas
- [x] Gestão de disciplinas
- [ ] Tela de Quadro Escolar com lista tabular de salas regulares e salas PAC
- [ ] Campos de turma: código externo/Prodesp, ensino, período, sala, capacidade e tipo de atendimento
- [ ] Colunas por turno no Quadro Escolar: manhã, tarde e noite
- [ ] Indicadores por turma/turno: A.P., A.E., total, AEE, matriculados, capacidade e vagas
- [ ] Cálculo automático de vagas: capacidade - matriculados, com alerta para superlotação
- [ ] Totais por turno e total geral de alunos/salas ao final da tabela
- [ ] Resumo superior: quantidade de salas físicas, salas ocupadas e salas disponíveis
- [ ] Abas do Quadro Escolar: Resumo, Encaminhamentos, Configuração de Turnos e visualização definitiva/rascunho
- [ ] Botão "Gerar PDF" do Quadro Escolar com cabeçalho oficial e filtros aplicados
- [ ] Ações por turma: professores, alunos, atribuir professor, editar, sincronizar/atualizar classe
- [ ] Atualização/importação de classes por ano letivo a partir de base externa
- [ ] Gestão de sala de aula física: número, capacidade, turno, acessibilidade e status
- [ ] Períodos escolares: bimestres, semestres, datas de fechamento, datas de conselho e bloqueios
- [ ] Tratar AEE/PAC como tipo de atendimento/sala, sem misturar com turmas regulares

### Funcionários / Professores / Atribuição
- [x] Gestão básica de usuários
- [ ] Cadastro/consulta de funcionários por nome, prontuário e status ativo
- [ ] Associação de funcionário ao colégio/unidade
- [ ] Cadastro de prontuário, vínculo, função, cargo e lotação
- [ ] Atribuição de horário do professor por turma, disciplina e dia da semana
- [ ] Atribuição de salas pelo coordenador
- [ ] Aulas observadas: registro de observação, devolutiva e plano de ação
- [ ] Ficha de acompanhamento do estudante vinculada ao professor
- [ ] Declaração de acúmulo de cargo para funcionário/professor

### Saúde na Escola / NDPD
- [ ] Módulo Saúde na Escola como área própria, separada dos dados sensíveis do cadastro do aluno
- [ ] Convênio médico estudante: busca por ano, sala, CID, estudante e RA
- [ ] Cadastro de atendimento/convênio com CID, data, profissional, encaminhamento e anexos
- [ ] Projeto Águia e Projeto Águia Gestão
- [ ] Ficha de atividade coletiva
- [ ] Marcadores de consumo / respostas
- [ ] Controle de acesso restrito por perfil para dados de saúde
- [ ] Auditoria obrigatória para leitura, criação e alteração de registros de saúde

### Nutrição
- [ ] Módulo Nutrição com cardápio por período/turma
- [ ] Relatório de inspeção de alimentação escolar
- [ ] Registro de restrições alimentares integrado ao cadastro do aluno
- [ ] Indicadores de alunos com alergias/restrições para equipe autorizada

### Relatórios Oficiais / Formulários
- [x] Relatórios principais em PDF/Excel
- [ ] Hub de relatórios oficiais por categoria: Alunos, Diário, Saúde, Gerenciais, PAESP, Formulários e Colégio
- [ ] Atas
- [ ] Boletins oficiais por turma/aluno
- [ ] Carômetro com fotos por turma
- [ ] Lista de alunos
- [ ] Relação de alunos por classe
- [ ] Mapa de ausência
- [ ] Entrada e saída de alunos
- [ ] Quadro administrativo
- [ ] Relatório de acompanhamento pedagógico/NDPD
- [ ] Desempenho por sala de aula
- [ ] Nível de escrita
- [ ] Nível de SND
- [ ] Níveis de leitura
- [ ] Levantamento de visitas
- [ ] Planejamento: movimentação escolar
- [ ] Planejamento: alunos evadidos com justificativa
- [ ] Formulário de encaminhamento para psicopedagogo
- [ ] Formulário/ficha de rendimento
- [ ] Formulário/ficha de observação
- [ ] Formulário/ficha de acompanhamento do ensino infantil
- [ ] Formulário de leite materno na creche
- [ ] Formulário de levantamento socioeconômico-cultural
- [ ] Declaração de acúmulo de cargo
- [ ] Exportação com cabeçalho oficial da escola e controle de quem gerou

### PAESP / Avaliações Externas
- [ ] Módulo PAESP com navegação própria
- [ ] Dashboard TRI com velocímetro percentual e gráfico comparativo por faixa
- [ ] TRI por escola e por turma, alternando visualização com radio/segmentado
- [ ] TRI Matemática, TRI Língua Portuguesa e TRI Geral
- [ ] Classificação por faixas: Insuficiente, Básico, Proficiente e Avançado
- [ ] Comparativo escola/turma versus rede de ensino
- [ ] Ranking/listagem com pontuação, medalha/destaque e ação de detalhes
- [ ] Habilidades
- [ ] Evolução
- [ ] Provas
- [ ] Respostas
- [ ] Consolidado
- [ ] Indicadores por turma, habilidade, componente e período
- [ ] Importação de planilhas/resultados externos
- [ ] Histórico por avaliação/ano para comparação evolutiva
- [ ] Exportação PDF/Excel dos indicadores PAESP

### Colégio / Administração da Unidade
- [x] Configurações da escola com dados básicos
- [ ] Informações institucionais do colégio em página consultável
- [ ] Calendário de eventos institucional vinculado ao dashboard
- [ ] Documentos do colégio com categorias, anexos e controle de validade
- [ ] Funcionários da unidade
- [ ] Cadastro do colégio ampliado: endereço, contatos, códigos externos, equipe gestora e horários
- [ ] Transporte escolar: cadastro, alunos atendidos, rota, veículo, motorista e relatórios

### Integrações Externas
- [ ] G Suite / Google Workspace: gerenciar e-mails, status e informações
- [ ] Links oficiais configuráveis para Educação Modelo, Saúde na Escola, Centro de Mídias e site do colégio
- [ ] Registro de acesso a integrações externas em auditoria
- [ ] Permissões por perfil para integrações

### Permissões e Perfis Inspirados no SisEduc
- [ ] Revisar matriz de perfis para papéis adicionais: Secretaria, Supervisor, NDPD/Saúde, Nutrição e Transporte
- [ ] Diretor: liberar lançamento do diário e históricos para assinar
- [ ] Coordenador: atribuição de salas, aulas observadas e acompanhamento pedagógico
- [ ] Supervisor/NDPD: relatórios e acompanhamento pedagógico restrito
- [ ] Professor: atribuição de horário, diário, ficha de acompanhamento e consultas permitidas
- [ ] Secretaria/Admin: matrícula, aluno, funcionário, documentos, transporte e cadastros

---

## Componentes Transversais 🔴 CRÍTICO (fazer junto às fases)

### Design System / UI Primitives 🟠 ALTA
- [x] `Button` (variantes primary, secondary, ghost, danger, success, accent + tamanhos sm/md/lg)
- [x] `Input` / `Select` / `Textarea` com label, hint, error e ícone
- [x] `Modal` com backdrop blur, animações, footer customizado
- [x] `Drawer` lateral com header, body, footer
- [x] `Card` / `CardHeader` / `CardBody` / `KpiCard` / `Badge` / `EmptyState` / `Spinner`
- [x] `PageHeader` (título + descrição + ícone + ações)
- [x] Tema base com Tailwind v4 + animações
- [x] `Toast` para feedback de ações (success / error / info)
- [x] `Tabs` reutilizável
- [x] `Avatar` com fallback de iniciais

### Notificações
- [x] Coleção `/notificacoes` e modelo de dados
- [x] Sino de notificações no Sidebar com badge de não lidas (até 99+)
- [x] Painel dropdown com últimas 20 notificações
- [x] Marcar como lida (clique individual)
- [x] Marcar todas como lidas (botão `CheckCheck`)
- [x] Ícones contextuais por tipo (faltas/prazos/notas/despesas)
- [x] Tempo relativo (Agora, 5min, 2h, 3d)
- [x] Realtime via `onSnapshot`
- [x] Cloud Function `alertarPrazos()` — pendências ≤ 7 dias
- [x] Cloud Function `onPresencaSalva` — faltas ≥ 25%
- [x] Cloud Function monitora ocorrências graves
- [x] Cloud Function monitora despesas pendentes de aprovação

### Gestão de Usuários (Diretor/Admin) 🟠 ALTA
- [x] Tela de listagem de usuários por perfil com cards de contagem
- [x] Filtros: busca por nome/email, status (ativo/inativo)
- [x] Criação de documento `/usuarios` (UID precisa vir do Auth Console)
- [x] Edição de nome e perfil
- [x] Ativar/Desativar usuário (toggle)
- [x] Atribuição de turmas para professores (multi-seleção visual)
- [ ] Criar usuário direto via Cloud Function (sem precisar do Auth Console)
- [ ] Alteração de perfil com auditoria obrigatória
- [ ] Reset de senha por administrador

### Configurações da Escola — campos para alimentar o Dashboard 🟠 ALTA NOVO
- [x] Tela com formulário de edição em `/configuracoes/escola`
- [x] Campo: nome_escola, cnpj, slogan, ano_letivo_atual
- [x] Campo: missao, valores (array dinâmico)
- [x] Campo: meta_presenca, meta_aprovacao, meta_saeb
- [x] Campo: orcamento_previsto, limite_comprovante
- [x] Campo: saeb_historico (map ano→nota — input dinâmico)
- [x] Campo: regras_nota (pesos por tipo de avaliação)
- [x] Upload de logo_url (Firebase Storage)
- [x] Endereço completo (CEP, rua, cidade, estado)

---

## Regras Críticas — Não Esquecer

| Regra | Onde aplicar |
|---|---|
| Professor só vê turmas em `turmas_ids` do seu `/usuarios` | Firestore Rules + frontend |
| CPF e telefone mascarados em TODAS as leituras | Firestore Rules |
| `/auditoria` imutável — só Cloud Functions gravam | Firestore Rules |
| `/indicadores` — só Cloud Functions escrevem, frontend só lê | Firestore Rules |
| Bimestre fechado bloqueia edição do professor | Firestore Rules + frontend |
| Presença editável apenas 48h (`editavel_ate`) | Firestore Rules |
| Ocorrências médicas — professor sem acesso | Firestore Rules |
| Admin não acessa `/alunos`, `/notas`, `/presencas`, `/ocorrencias` | Firestore Rules |
| Soft delete universal — nunca deletar fisicamente | Todos os services |
| Comprovante obrigatório para despesas > R$500 | Frontend + Cloud Function |
| `.env` nunca vai para o git | `.gitignore` |

---

## Resumo de Prioridades para MVP

```
🔴 FASE 1 → Base, Auth, Security Rules         ✅ CONCLUÍDA + Indexes deployados
🔴 FASE 2 → Gestão de Alunos + Turmas         ✅ CRUDs + Perfil 5-abas + CEP + soft delete
🟠 FASE 3 → Pedagógico (Chamada + Notas)       ✅ Telas + integração com /calendario
🟠 FASE 4 → Dashboard nível referência         ✅ Todas as 8 seções + dados reais
🟠 FASE 5 → Ocorrências                       ✅ Tela + service + filtro por perfil
🟡 FASE 6 → Financeiro                        ✅ Tela + service + Cloud Function de aprovação
🟡 FASE 7 → Projetos & Pendências             ✅ Kanban + lista de pendências
🟠 FASE 9 → Auditoria                         🔄 UI pronta, triggers/auditorias obrigatórias pendentes
🟠 FASE 10 → LGPD                             🔄 Consentimento + mascaramento (Storage URLs faltando)
🟡 FASE 8 → Relatórios                        🔄 Base pronta + Boletim/Diário implementados
🟢 FASE 11 → Configurações                    ✅ Tela completa + edição em tempo real
🟠 EXTRA → Gestão de Usuários                ✅ CRUD + multi-vínculo de turmas
🟠 EXTRA → Sino de Notificações              ✅ Realtime + marcar lida/todas
🟠 EXTRA → Modal expansivo (não drawer)      ✅ Padrão revisado em todo o app
🔴 FIX → Indexes + Error handlers             ✅ Corrigido infinito loading
```

### 🚀 Deploy
- [x] GitHub repo: https://github.com/joaodamas/gestaoescolar
- [x] Firebase Hosting: https://gestaoescolar-jpproject.web.app
- [x] Firestore Rules deployadas
- [x] Firestore Indexes deployados (22 índices compostos)
- [x] Storage Rules deployadas
- [x] Cloud Functions (Blaze ativo) — 6 functions deployadas:
  - [x] `recalcularIndicadoresCallable` + `recalcularIndicadoresScheduled` (15 min)
  - [x] `alertarPrazos` (diário 08:00)
  - [x] `onPresencaSalva` (trigger Firestore — alerta 25% faltas)
  - [x] `onDespesaAprovada` (trigger Firestore — recalcula + auditoria)
  - [x] `onNotaAlteradaAposFechamento` (trigger Firestore — auditoria)
  - [ ] `auditarAcaoCallable` — criado no código, deploy pendente

### Próximas prioridades imediatas:
1. **🔴 Corrigir permissões/modelagem do professor** — criar caminho seguro via `/matriculas` ou `/alunos_resumo` para Chamada, Notas, Diário e Relatórios
2. **🔴 Corrigir rules críticas apontadas pelo QA** — Financeiro Admin cria/Diretor aprova, soft delete em projetos/pendências e callable de auditoria sem identidade enviada pelo cliente
3. **🔴 Arquitetar Fase 12 antes de criar telas** — rotas, perfis, unidade escolar, models, índices, storage seguro e auditoria por módulo sensível
4. **🟠 Diário de Classe Avançado** — visão semanal, atribuição de horário, pendências, deferimento, fechamento e assinatura
5. **🟠 Secretaria/Matrículas** — busca dedicada, deferimento, timeline de situação e movimentação escolar
6. **🟠 Saúde/NDPD** — módulo separado, permissão própria, auditoria obrigatória e convênio médico estudante
7. **🟡 Relatórios oficiais** — revalidar cálculos de notas/frequência e criar hub com carômetro, mapa de ausência, atas e documentos
8. **🟡 Limpar lint e criar smoke tests** — rotas principais, PDF/Excel e fluxos críticos

### Fora do checklist original — pendências encontradas em 11/05/2026
- [x] Centralizar a matriz `MODULOS_POR_PERFIL` para não duplicar em `Sidebar.jsx` e `PrivateRoute.jsx`
- [x] Revisar permissões reais de professor para disciplinas/relatórios: menu não mostra Disciplinas, mas Notas depende delas
- [x] Revisar performance do bundle: build principal reduzido com lazy loading; chunk pesado de PDF isolado
- [x] Implementar lazy loading das páginas pesadas (`Relatorios`, `Financeiro`, dashboards com gráficos)
- [x] Mapear funcionalidades do SisEduc atual a partir das telas de referência
- [x] Adicionar Fase 12 com backlog de implantação SisEduc melhorada
- [ ] Criar testes mínimos de smoke para rotas principais e geração de PDF/Excel
- [ ] Confirmar deploy dos novos índices e da nova callable antes de homologar

> **Atenção:** Auditoria e LGPD foram movidos para antes de Ocorrências e Financeiro porque o sistema armazena dados de menores de idade — a conformidade é obrigatória desde o início, não pode ser deixada para o final.

---

*Atualizado em: 11/05/2026 · Baseado na Documentação Técnica v2.0 + design de referência*
