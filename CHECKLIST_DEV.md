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

### Estrutura de Pastas
- [x] Criar estrutura conforme documentação (`/components`, `/pages`, `/hooks`, `/services`, `/firebase`, `/utils`, `/context`)
- [x] Setup React + Vite
- [x] Setup Tailwind CSS
- [x] Setup Recharts
- [ ] Setup react-pdf ou jsPDF
- [x] Setup SheetJS (xlsx)

---

## FASE 2 — Gestão de Alunos 🔴 CRÍTICO

### Coleções Firestore
- [x] Modelagem `/alunos` (sem `turma_id` direto — vínculo via `/matriculas`)
- [x] Modelagem `/responsaveis`
- [x] Modelagem `/matriculas` (com `ano_letivo`, `status`, `numero_matricula` auto-gerado)
- [x] Modelagem `/turmas`
- [ ] Modelagem `/disciplinas`
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
- [ ] Atribuição de múltiplos professores (`professores_ids` array)
- [ ] Vincular disciplinas à turma

### Tela Gestão de Alunos
- [x] Listagem de alunos com status=ativo
- [x] Join com `/matriculas` para exibir turma atual
- [x] Barra de busca por nome
- [x] Filtros: Turma / Status / Ano letivo
- [x] Tabela: Nome | Matrícula | Turma | Presença % | Status | Ações
- [ ] Botão "Exportar Lista" (Excel)
- [x] Modal expansivo "+ Nova Matrícula" com 3 abas: Aluno + Endereço + Responsável
  - [x] Aba Aluno: Nome, Data Nasc., CPF, Sexo, Necessidades Especiais
  - [x] **Aba Endereço com auto-preenchimento por CEP (ViaCEP API)**
    - [x] Campo CEP com busca automática on-blur
    - [x] Logradouro, Número, Complemento, Bairro, Cidade, UF
    - [x] Endereço gravado em `aluno.endereco` (objeto aninhado)
  - [x] Aba Responsável: Nome, Parentesco, Telefone, Email, Consentimento LGPD
  - [x] Seleção de Turma e Ano Letivo
  - [x] Criar atomicamente: `/alunos` + `/responsaveis` + `/matriculas`
- [ ] Botão "Ver Perfil" por aluno

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
- [ ] Exportação de dados individuais (PDF — LGPD) — botão presente, falta implementar

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
- [ ] Botão "Ver Histórico" de chamadas anteriores
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
- [ ] Campo `aprovado_conselho` para decisão colegiada
- [ ] Nota de recuperação: `max(media_bimestral, nota_recuperacao)`
- [ ] `hook/useNotas.js`
- [x] `services/notas.js`

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
- [ ] Alerta automático ao atingir 25% de faltas → `/notificacoes` para Coordenador
- [ ] Frequência exclui feriados e recessos do `/calendario`
- [ ] Falta justificada não conta para limite 25% mas conta na frequência real

### Regras de Negócio — Notas
- [ ] Histórico de alterações: array `historico_alteracoes` em `/notas`
- [ ] Recuperação final configurável em `/configuracoes`

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
- [ ] Histórico real do SAEB no `/configuracoes.saeb_historico` (UI de edição)

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
- [ ] Editáveis em `/configuracoes`

---

## FASE 5 — Ocorrências 🟠 ALTA

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
- [ ] Cloud Function: grava em `/auditoria` para ocorrências médicas e acidentes
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
- [ ] Botão "Exportar Relatório" (PDF + Excel)
- [x] Modal Nova Despesa:
  - [x] Campos: Categoria | Subcategoria | Valor | Descrição | Data | Centro de custo
  - [x] Upload de comprovante (obrigatório para despesas > R$500)
  - [x] Preview em tempo real: "Saldo após esta despesa: R$ X"
  - [x] Bloqueio se valor > saldo disponível
  - [x] Botão "Enviar para aprovação" (status=pendente)
- [ ] Notificação automática para Diretor ao criar despesa pendente
- [x] Fluxo: Admin cria → status=pendente → Diretor aprova → status=aprovado
- [x] Cloud Function atualiza `/indicadores` a cada despesa aprovada (onDespesaAprovada)
- [ ] Alerta PDDE: 15 dias antes do prazo → `/notificacoes` para Diretor e Admin
- [x] `services/financeiro.js`

---

## FASE 7 — Projetos & Pendências 🟡 MÉDIA

### Projetos (Kanban)
- [x] Kanban 3 colunas: Planejado | Em Andamento | Concluído
- [x] Card: Nome | Descrição | Categoria | Data fim | Indicador de sucesso
- [x] Botão "+ Novo Projeto" (modal expansivo)
- [x] Botão "Avançar →" no card (move para próxima coluna)
- [ ] Drag & drop entre colunas
- [ ] Modal de detalhes do projeto

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

- [ ] Boletim por aluno (PDF) — Coord., Diretor
- [ ] Diário de classe (PDF) — Professor, Coord.
- [ ] Frequência por turma (PDF + Excel) — Coord., Diretor
- [ ] Alunos em risco de reprovação (PDF + Excel) — Coord., Diretor
- [ ] Faltas acima do limite 25% (PDF + Excel) — Coord., Diretor
- [ ] Ocorrências por período (PDF + Excel) — Coord., Diretor
- [ ] Orçamento por categoria (PDF + Excel) — Admin, Diretor
- [ ] Prestação de contas PDDE (PDF) — Admin, Diretor
- [ ] Evolução SAEB / indicadores (PDF) — Todos
- [ ] Exportação de dados do aluno (PDF — LGPD) — Diretor
- [ ] Auditoria de ações (Excel) — Diretor, Admin
- [ ] Resumo gerencial mensal (PDF) — Diretor
- [ ] Mascarar/omitir dados sensíveis conforme perfil do solicitante
- [ ] `utils/exportPDF.js`
- [ ] `utils/exportExcel.js`

---

## FASE 9 — Auditoria 🟠 ALTA

- [x] Cloud Function `auditarAcao()` — grava em `/auditoria` (helper interna)
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
- [ ] `services/auditoria.js`
- [ ] Tela de auditoria com filtros (Módulo, Usuário, Período) — acesso Diretor e Admin

---

## FASE 10 — LGPD & Conformidade 🟠 ALTA

- [ ] Mascaramento de CPF: `***.***.***-**` via Firestore Rules (nunca expor inteiro)
- [ ] Mascaramento de telefone via Firestore Rules
- [x] Consentimento LGPD coletado na matrícula (`consentimento_lgpd`, `consentimento_data`)
- [ ] Log de acesso a dados médicos em `/auditoria`
- [ ] Soft delete em todos os módulos (status=inativo, nunca deletar fisicamente)
- [ ] Retenção de 5 anos para dados de alunos inativos
- [ ] URLs temporárias assinadas para arquivos no Firebase Storage
- [ ] Separação de ocorrências médicas (campo `tipo=medico`)
- [ ] Exportação de dados individuais do aluno (LGPD — Diretor)
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
- [ ] Upload de Logo (Firebase Storage)
- [ ] Endereço completo (CEP, rua, número, cidade, estado)
- [ ] Regras de recuperação final
- [ ] Alerta PDDE: dias de antecedência (padrão 15)

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
- [ ] `Toast` para feedback de ações (success / error / info)
- [ ] `Tabs` reutilizável
- [ ] `Avatar` com fallback de iniciais

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
- [ ] Cloud Function monitora ocorrências graves
- [ ] Cloud Function monitora despesas pendentes de aprovação

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
- [ ] Upload de logo_url (Firebase Storage)
- [ ] Endereço completo (CEP, rua, cidade, estado)

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
🔴 FASE 1 → Base, Auth, Security Rules         ✅ CONCLUÍDA
🔴 FASE 2 → Gestão de Alunos + Turmas         ✅ CRUDs prontos (faltam perfil aluno + exportar)
🟠 FASE 3 → Pedagógico (Chamada + Notas)       ✅ Telas prontas (faltam validações de calendário)
🟠 FASE 4 → Dashboard nível referência         ✅ Todas as 8 seções implementadas
🟠 FASE 9 → Auditoria                         🔄 Triggers parciais (Cloud Functions OK)
🟠 FASE 10 → LGPD                             🔄 EM PROGRESSO (consentimento + mascaramento C-1 OK)
🟠 FASE 5 → Ocorrências                       ✅ Tela + service prontos
🟡 FASE 6 → Financeiro                        ✅ Tela + service + Cloud Function prontos
🟡 FASE 7 → Projetos & Pendências             ✅ Kanban + lista de pendências prontos
🟡 FASE 8 → Relatórios                        ⏳ Pendente
🟢 FASE 11 → Configurações                    ✅ Tela completa de Configurações entregue
🟠 EXTRA → Gestão de Usuários                ✅ CRUD + vinculação de turmas
🟠 EXTRA → Modal expansivo (não drawer)      ✅ Padrão revisado
```

### 🚀 Deploy
- [x] GitHub repo: https://github.com/joaodamas/gestaoescolar
- [x] Firebase Hosting: https://gestaoescolar-jpproject.web.app
- [x] Firestore Rules deployadas
- [x] Storage Rules deployadas
- [x] Cloud Functions (Blaze ativo) — 6 functions deployadas:
  - [x] `recalcularIndicadoresCallable` + `recalcularIndicadoresScheduled` (15 min)
  - [x] `alertarPrazos` (diário 08:00)
  - [x] `onPresencaSalva` (trigger Firestore — alerta 25% faltas)
  - [x] `onDespesaAprovada` (trigger Firestore — recalcula + auditoria)
  - [x] `onNotaAlteradaAposFechamento` (trigger Firestore — auditoria)

### Próximas prioridades imediatas:
1. **🟠 Tela de Configurações** — sem ela o Dashboard não consegue meta_saeb, missão, valores
2. **🟠 Gestão de Usuários** — sem ela não cria professor para vincular a turma
3. **🟠 Tela de Projetos (Kanban) + Pendências** — usados no Dashboard
4. **🟠 Perfil do Aluno** (drawer detalhe) — completar fluxo de matrícula
5. **🟡 Tela de Relatórios** — boletins, frequência, ocorrências, financeiro

> **Atenção:** Auditoria e LGPD foram movidos para antes de Ocorrências e Financeiro porque o sistema armazena dados de menores de idade — a conformidade é obrigatória desde o início, não pode ser deixada para o final.

---

*Atualizado em: 11/05/2026 · Baseado na Documentação Técnica v2.0 + design de referência*
