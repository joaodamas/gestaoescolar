# QA Report — Gestão Escolar À Vista
Data: 11/05/2026
Revisor: QA Engineer (automated review)
Escopo: AuthContext, PrivateRoute, firebase.js, firestore.rules, LoginPage, AlunosPage, ChamadaPage, alunos.js, presencas.js, mascaramento.js

---

## CRITICOS (bloqueiam producao)

### C-1 — CPF parcialmente exposto no mascaramento (LGPD)
Arquivo: `src/utils/mascaramento.js`, linha 5
Funcao `mascararCPF` exibe os 9 primeiros digitos: `123.456.789-**`.
Os 6 digitos do meio ficam visiveis, o que permite reidentificacao combinada com nome. Conforme LGPD art. 5, I e ANPD, o correto para listagens e `***.456.***-**` (so o bloco do meio) ou `***.***.***.--**` dependendo da politica interna. O padrao atual expoe demais para um dado de menor de idade.
Impacto: Todos os registros de alunos na tabela de `AlunosPage` exibem esse formato (linha 228 de AlunosPage.jsx).

### C-2 — Consentimento LGPD gravado incorretamente no servico de alunos
Arquivo: `src/services/alunos.js`, linha 26
`criarAluno` grava `LGPD: { base_legal: 'obrigacao_legal', consentimento_responsavel: false }` — hardcoded `false` independentemente de o responsavel ter marcado o checkbox.
O consentimento real capturado em `AlunosPage.jsx` (linha 127, campo `resp_consentimento`) e gravado apenas no documento de `responsaveis`, nao no documento do `aluno`. Isso significa que o campo `LGPD.consentimento_responsavel` no documento do aluno sera sempre `false`, tornando inuteis auditorias de consentimento baseadas nesse campo.
Correcao: passar o valor de `resp_consentimento` como parametro para `criarAluno` e gravar corretamente.

### C-3 — Race condition com memory leak no useEffect de AlunosPage
Arquivo: `src/pages/Alunos/AlunosPage.jsx`, linhas 54-80
O `onSnapshot` dispara um callback assincrono que chama `Promise.all` com N queries de matriculas. Se o componente for desmontado enquanto as queries estao em andamento, `setMatriculasMap` e `setCarregando` serao chamados em um componente desmontado. Alem disso, se `filtroStatus` mudar rapidamente, multiplas execucoes concorrentes do `Promise.all` podem gerar race conditions, onde uma execucao mais antiga sobrescreve resultados de uma mais recente. Nao ha `abortController` ou flag de montagem.

### C-4 — Professor pode acessar turmas de outros professores via filtro de turma no frontend
Arquivo: `src/pages/Chamada/ChamadaPage.jsx`, linhas 33-39 e `firestore.rules` linha 73
As regras de `turmas` permitem `read` para qualquer usuario ativo (`allow read: if isAtivo()`). A restricao de turmas do professor e feita apenas no frontend (linha 36: `todas.filter(t => perfil?.turmas_ids?.includes(t.id))`). Um professor com acesso direto ao Firestore via SDK ou console pode listar qualquer turma e, em seguida, usar o `turmaSel` para carregar `matriculas` e dados de `alunos`. As Firestore Rules de `/matriculas` (linha 64) restringem corretamente, mas as de `/turmas` nao. Resultado: o professor ve nomes de todas as turmas da escola — dado organizacional sensivel.

---

## SERIOS (corrigir antes do deploy)

### S-1 — `salvarChamada` sempre cria novos documentos, nunca atualiza os existentes
Arquivo: `src/services/presencas.js`, linhas 15-37
A funcao usa `doc(collection(db, 'presencas'))` (novo ID aleatorio) em todos os casos, mesmo quando `jaExiste === true` em `ChamadaPage`. Isso cria registros duplicados para o mesmo aluno/turma/data cada vez que o professor salva uma chamada ja existente. O historico de presenças fica corrompido com entradas duplicadas, e `buscarChamadaDoDia` retornara multiplos registros por aluno.
Correcao: verificar se ja existe um documento para `aluno_id + turma_id + data` e usar `updateDoc` nesse caso.

### S-2 — Bloqueio de edicao de chamada (48h) so existe no frontend
Arquivo: `src/pages/Chamada/ChamadaPage.jsx`, linhas 79-81 e `firestore.rules` linhas 104-110
O frontend verifica `editavel_ate` corretamente. As Firestore Rules tambem verificam `resource.data.editavel_ate > request.time` para professores. Porem, `salvarChamada` (presencas.js) usa `batch.set` com novos documentos — o que significa que a regra de `update` nunca e avaliada. Um professor pode burlar o bloqueio chamando `salvarChamada` diretamente (que faz `set` de um novo documento), criando um registro duplicado para apos as 48h. A regra de `create` nao verifica o prazo de 48h.
Correcao: a regra de `create` deve checar se ja existe chamada para o mesmo aluno/turma/data (ou mover a logica de upsert para Cloud Function).

### S-3 — Dynamic import desnecessario e custoso dentro de loop
Arquivo: `src/pages/Chamada/ChamadaPage.jsx`, linhas 63-65
```js
const { getDoc, doc: docRef } = await import('firebase/firestore')
```
Este `import()` dinamico esta dentro de um `Promise.all` que itera sobre cada aluno. Embora o bundler armazene em cache o modulo, o `await import()` em loop e um anti-padrao que prejudica legibilidade e pode introduzir overhead. `getDoc` e `doc` ja estao disponiveis via import estatico no topo do arquivo (o `aq` na linha 62 usa `query`, `collection` e `where` importados estaticamente). A linha 62 com `aq` nem sequer e usada — e codigo morto.
Correcao: remover o import dinamico e o `aq` inutilizado; usar os imports estaticos do topo.

### S-4 — `ocorrencias`: professor pode criar ocorrencia medica/acidente sem restricao
Arquivo: `firestore.rules`, linha 159
`allow create: if isAtivo() && isAnyOf(['diretor', 'coordenador', 'professor'])` — professor pode criar qualquer tipo de ocorrencia, incluindo `tipo: 'medico'` e `tipo: 'acidente'`. A restricao de tipo so existe na leitura (linha 154-157), nao na criacao. Isso contraria o requisito: "Ocorrencias medicas: so diretor e coordenador".
Correcao: adicionar validacao de tipo na regra de `create`.

### S-5 — `AlunosPage` acessa `db` diretamente em vez de usar o service layer
Arquivo: `src/pages/Alunos/AlunosPage.jsx`, linhas 117-128
A criacao do responsavel e feita com `addDoc(collection(db, 'responsaveis'), ...)` diretamente na pagina, bypassando qualquer service. Isso viola separacao de responsabilidades e impede reutilizacao. Nao ha validacao de formato do telefone antes de gravar (apenas formatacao visual). Nao ha `serverTimestamp()` em `created_at` para o responsavel.
Arquivo importa `addDoc` separadamente na linha 8 enquanto o mesmo ja poderia vir do service.

### S-6 — Ausencia de rate limiting / protecao contra brute-force no login
Arquivo: `src/pages/Login/LoginPage.jsx`, linhas 18-29
Nao ha mecanismo de rate limiting no frontend (contagem de tentativas, lockout temporario, CAPTCHA). O Firebase Authentication tem protecao basica, mas ela e opaca ao usuario. Para um sistema com dados de menores de idade, recomenda-se pelo menos um backoff exponencial no frontend e habilitacao do App Check no Firebase.

### S-7 — Ausencia de validacao de CPF no frontend antes de gravar
Arquivo: `src/pages/Alunos/AlunosPage.jsx`, linha 310 / `src/utils/mascaramento.js`
O campo CPF e opcional no formulario (sem `required`) e nao ha validacao do digito verificador. O service `criarAluno` grava o que vier. Um CPF invalido gravado no banco compromete tanto a integridade dos dados quanto a conformidade com a LGPD (principio da qualidade dos dados, art. 6, V).

---

## MELHORIAS RECOMENDADAS

### M-1 — `AuthContext`: ausencia de tratamento de erro no `onAuthStateChanged`
Arquivo: `src/context/AuthContext.jsx`, linhas 14-31
Se `getDoc` falhar (ex: regra do Firestore negar por usuario recentemente desativado), a promise rejeita silenciosamente dentro do callback do `onAuthStateChanged`. Adicionar `try/catch` dentro do callback e essencial para evitar que `loading` fique `true` para sempre.

### M-2 — `AuthContext`: `updateDoc` de `ultimo_acesso` nao e aguardado antes do redirect
Arquivo: `src/context/AuthContext.jsx`, linha 36
`login()` chama `updateDoc` e aguarda antes de retornar. Se o Firestore estiver lento, o usuario fica bloqueado no spinner de login. Considerar fazer o update de `ultimo_acesso` de forma "fire and forget" (sem `await`), pois nao e critico para o fluxo de autenticacao.

### M-3 — `PrivateRoute`: perfil desconhecido nao e tratado
Arquivo: `src/components/PrivateRoute.jsx`, linha 27
Se `perfil.perfil` contiver um valor nao mapeado em `MODULOS_POR_PERFIL` (ex: typo no Firestore), `MODULOS_POR_PERFIL[perfil.perfil]` sera `undefined` e o optional chaining retornara `undefined`. O comportamento e redirecionar para `/dashboard`, o que pode dar acesso indevido se `/dashboard` nao tiver seu proprio `PrivateRoute` com `modulo`. Considerar redirecionar para `/login` ou exibir erro explicito.

### M-4 — `historicoChamadas` carrega todos os documentos sem paginacao
Arquivo: `src/services/presencas.js`, linhas 50-65
A query nao usa `limit()` no Firestore — ela baixa TODOS os registros de presenca da turma e fatia no cliente com `.slice(0, limite)`. Para turmas com anos de historico, isso pode transferir milhares de documentos desnecessariamente.
Correcao: usar `limit(limite * maxAlunosPorTurma)` na query ou reestruturar para paginar por data.

### M-5 — `listarAlunos` em alunos.js nao e usado por AlunosPage
Arquivo: `src/services/alunos.js`, linha 7 / `src/pages/Alunos/AlunosPage.jsx`, linha 54
`AlunosPage` usa `onSnapshot` diretamente com `db` importado, ignorando a funcao `listarAlunos` do service. Duplicacao de logica de query (filtro por status, orderBy) entre o service e a pagina. Unificar para facilitar manutencao.

### M-6 — Falta de `label htmlFor` nos inputs da ChamadaPage
Arquivo: `src/pages/Chamada/ChamadaPage.jsx`, linhas 162, 170
Os `<select>` de turma e o `<input>` de data tem `<label>` visualmente associados, mas sem `htmlFor` e sem `id` nos inputs. Isso quebra acessibilidade para leitores de tela (WCAG 2.1, criterio 1.3.1).

### M-7 — Botao "Exportar" sem implementacao
Arquivo: `src/pages/Alunos/AlunosPage.jsx`, linha 153
O botao exportar nao tem handler `onClick`. Clicar nele nao faz nada. Se o export estiver previsto, um botao sem acao pode confundir o usuario. Se nao estiver pronto, deve ser removido ou desabilitado com `disabled`.

### M-8 — `mascararCPF` nao e usado no detail drawer de aluno selecionado
Arquivo: `src/pages/Alunos/AlunosPage.jsx`, linha 243
`setAlunoSelecionado(aluno)` armazena o objeto completo do aluno (com CPF em texto puro) em estado. Se o drawer de detalhes (nao implementado ainda, baseado no estado `alunoSelecionado`) exibir esse dado diretamente, o CPF sera exibido sem mascaramento. Garantir que qualquer exibicao futura use `mascararCPF`.

### M-9 — `consentimento_data` gravado com `new Date()` em vez de `serverTimestamp()`
Arquivo: `src/pages/Alunos/AlunosPage.jsx`, linha 127
`consentimento_data: new Date()` usa o clock do cliente, que pode estar errado. Para dados LGPD auditaveis, usar `serverTimestamp()` e obrigatorio.

### M-10 — Ausencia de index composto documentado para queries criticas
Arquivo: `src/pages/Alunos/AlunosPage.jsx`, linhas 55-59 / `src/services/presencas.js`, linha 41
Queries como `where('status') + orderBy('nome_completo')` e `where('turma_id') + where('data')` requerem indices compostos no Firestore. Se nao estiverem criados no `firestore.indexes.json`, as queries falham silenciosamente em producao (Firebase retorna erro apenas no console). Nao ha arquivo de indexes no escopo revisado.

---

## O que esta correto

- **API keys protegidas**: `firebase.js` usa exclusivamente variaveis de ambiente `VITE_*` — nenhuma chave hardcoded. Correto.
- **Soft delete implementado**: todas as colecoes em `firestore.rules` tem `allow delete: if false`. `inativarAluno` em `alunos.js` usa `updateDoc` com status. Conforme requisito.
- **Auditoria imutavel**: `/auditoria` tem `allow write: if false` — apenas Cloud Functions podem gravar. Correto.
- **Regra de 48h para edicao de chamada**: `firestore.rules` linha 108 verifica `resource.data.editavel_ate > request.time` para professores. Backend correto (o problema e no service que cria duplicatas — ver S-1/S-2).
- **Erro de login generico**: `LoginPage` linha 26 retorna "Credenciais invalidas" sem diferenciar usuario inexistente de senha errada. Correto do ponto de vista de seguranca.
- **Restricao de perfil em PrivateRoute**: `MODULOS_POR_PERFIL` mapeia corretamente os modulos por perfil. Professor nao tem acesso a `alunos`, `financeiro`, `ocorrencias` ou `configuracoes`.
- **Mascaramento de telefone implementado**: `mascararTelefone` em mascaramento.js existe e esta corretamente implementado.
- **Consentimento LGPD no formulario**: checkbox obrigatorio com texto legal (art. 7, II) presente em AlunosPage linha 388-398. Validacao frontend correta (linha 103).
- **Restricao de ocorrencias medicas na leitura**: `firestore.rules` linhas 154-157 impedem professor de ler `tipo: 'medico'` e `tipo: 'acidente'`. Correto para leitura.
- **Verificacao de usuario ativo**: `isAtivo()` e verificado nas regras do Firestore e no `onAuthStateChanged` do AuthContext. Dupla camada correta.
- **Cancelamento correto do listener**: `AuthContext` linha 31 retorna `unsubscribe` como cleanup do `useEffect`. Correto.
- **Formato de senha com toggle visivel/oculto**: `LoginPage` implementa corretamente com botao acessivel.

---

## Proximos passos sugeridos

1. **Imediato (C-1, C-2)**: Corrigir `mascararCPF` para ocultar mais digitos e passar `consentimento_responsavel` real para `criarAluno`.
2. **Imediato (S-1)**: Refatorar `salvarChamada` para fazer upsert (verificar existencia antes de criar novo documento) — isso resolve tambem o gap de S-2.
3. **Pre-deploy (S-4)**: Adicionar validacao de `tipo` na regra de `create` de `/ocorrencias` para bloquear professores de criar ocorrencias medicas.
4. **Pre-deploy (C-3)**: Adicionar flag de montagem ou `AbortController` no `useEffect` de `AlunosPage` para evitar memory leak e race condition.
5. **Pre-deploy (C-4)**: Adicionar restricao nas Firestore Rules de `/turmas` para que professores so leiam turmas contidas em `usuarios/{uid}.turmas_ids`.
6. **Curto prazo**: Criar `responsaveis.js` no service layer; remover `addDoc` direto de `AlunosPage`; usar `serverTimestamp()` em `consentimento_data`.
7. **Curto prazo (M-4)**: Adicionar `limit()` na query de `historicoChamadas`.
8. **Curto prazo**: Adicionar validacao de CPF (digito verificador) no frontend antes de gravar.
9. **Medio prazo**: Habilitar Firebase App Check para prevenir abuso de API; revisar se rate limiting de autenticacao esta configurado no console do Firebase.
10. **Acessibilidade**: Adicionar `id` e `htmlFor` correspondentes nos inputs de ChamadaPage (M-6).
