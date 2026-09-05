# Diário por Voz Emocional MVP Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Criar um micro-app mobile-first de diário por voz que grava, transcreve, analisa o relato e mostra uma reflexão emocional simples.

**Architecture:** App mobile-first com fluxo único: gravação → transcrição → análise → resultado → histórico. O MVP pode começar com análise por regras e evoluir para IA real na geração de resumo/reflexão, sem vender IA falsa se ela não existir.

**Tech Stack:** React Native/Expo ou PWA React para frontend; backend Node/FastAPI/Supabase; armazenamento em Postgres/Supabase; transcrição via Whisper/Deepgram/AssemblyAI; IA opcional via modelo barato para plano pago.

---

## Contexto / Assumptions

- Produto inicialmente para Brasil.
- Preço recomendado: R$ 14,90/mês e R$ 99,90/ano.
- Funcionalidade central única: check-in por voz.
- Linguagem de marketing deve evitar diagnóstico clínico.
- Se não houver IA real, usar “análise automática” em vez de “IA”.
- Documentos base já criados em:
  - `README.md`
  - `docs/product-plan.md`
  - `docs/design-spec.md`
  - `docs/pricing.md`
  - `prototype/index.html`

## Proposed Approach

1. Validar proposta e design com protótipo estático.
2. Implementar MVP com armazenamento local ou Supabase.
3. Lançar versão freemium com limite de check-ins.
4. Medir retenção antes de adicionar funcionalidades extras.
5. Só adicionar IA generativa se melhorar conversão/retensão ou justificar preço maior.

## Step-by-step Plan

### Task 1: Escolher stack e criar projeto

**Objective:** Definir se será app mobile Expo ou PWA.

**Files:**
- Create: `package.json`
- Create: `src/` ou `app/`
- Modify: `README.md`

**Steps:**
1. Decidir plataforma inicial:
   - Expo se o objetivo for app store/mobile nativo.
   - PWA se o objetivo for validar rápido por link.
2. Criar projeto base.
3. Adicionar tema visual do `docs/design-spec.md`.
4. Rodar app localmente.

**Verification:**
- App abre com tela inicial.
- Estilo base reflete paleta e tipografia planejadas.

### Task 2: Implementar tela Hoje

**Objective:** Criar tela principal com botão de gravação como elemento central.

**Files:**
- Create/Modify: `src/screens/TodayScreen.*`
- Create: `src/components/RecordButton.*`
- Create: `src/components/InsightCard.*`

**Steps:**
1. Criar layout mobile-first.
2. Adicionar saudação, pergunta e botão circular.
3. Adicionar card do último check-in.
4. Adicionar navegação Hoje/Histórico/Tendências.

**Verification:**
- Tela deve ficar próxima ao protótipo `prototype/index.html`.
- Um único CTA principal visível.

### Task 3: Implementar gravação de áudio

**Objective:** Permitir gravar, parar e salvar áudio temporariamente.

**Files:**
- Create: `src/services/audioRecorder.*`
- Modify: `src/screens/RecordingScreen.*`

**Steps:**
1. Pedir permissão de microfone.
2. Iniciar gravação.
3. Mostrar timer.
4. Parar gravação.
5. Guardar URI/arquivo temporário.

**Verification:**
- Microfone pede permissão.
- Timer conta corretamente.
- Arquivo de áudio é gerado.

### Task 4: Integrar transcrição

**Objective:** Enviar áudio para serviço de transcrição e receber texto.

**Files:**
- Create: `src/services/transcription.*`
- Create backend endpoint: `api/transcribe.*` se necessário.

**Steps:**
1. Escolher provedor: Whisper, Deepgram ou AssemblyAI.
2. Enviar áudio para backend.
3. Backend chama serviço de transcrição.
4. Retornar texto.
5. Exibir transcrição para debug interno.

**Verification:**
- Gravação curta retorna texto correto.
- Erros de rede mostram mensagem amigável.

### Task 5: Implementar análise emocional por regras

**Objective:** Gerar humor, tema e pergunta sem depender de IA generativa.

**Files:**
- Create: `src/services/emotionalAnalysis.*`
- Test: `src/services/emotionalAnalysis.test.*`

**Rules:**
- Contar palavras positivas/negativas.
- Detectar temas: trabalho, relacionamento, saúde, estudos, família.
- Gerar pontuação de 1 a 10.
- Usar templates acolhedores.

**Verification:**
- Texto com “cansado, trabalho, pressão” retorna sobrecarregado/trabalho.
- Texto com “feliz, consegui, tranquilo” retorna positivo/tranquilo.
- Resultado nunca usa diagnóstico.

### Task 6: Implementar tela Resultado

**Objective:** Mostrar reflexão com aparência premium.

**Files:**
- Create/Modify: `src/screens/ResultScreen.*`
- Create: `src/components/MoodPill.*`
- Create: `src/components/SafetyNotice.*`

**Steps:**
1. Mostrar humor provável.
2. Mostrar resumo.
3. Mostrar ponto positivo.
4. Mostrar pergunta reflexiva.
5. Incluir aviso discreto: não substitui apoio profissional.
6. CTA: salvar no diário.

**Verification:**
- Resultado é claro e acolhedor.
- Nenhum texto faz diagnóstico.

### Task 7: Persistir histórico

**Objective:** Salvar check-ins e listar entradas passadas.

**Files:**
- Create: `src/services/journalStore.*`
- Create/Modify: `src/screens/HistoryScreen.*`

**Data model:**
```ts
type JournalEntry = {
  id: string;
  createdAt: string;
  audioUri?: string;
  transcript: string;
  mood: string;
  score: number;
  mainTheme: string;
  summary: string;
  positiveSignal: string;
  reflectionQuestion: string;
};
```

**Verification:**
- Entrada salva aparece no histórico.
- Ao tocar, abre detalhes completos.

### Task 8: Implementar tendências premium

**Objective:** Criar tela simples de padrões semanais.

**Files:**
- Create/Modify: `src/screens/TrendsScreen.*`
- Create: `src/services/trends.*`

**Steps:**
1. Calcular humor médio.
2. Detectar tema mais citado.
3. Detectar palavra recorrente.
4. Mostrar padrão percebido.

**Verification:**
- Com 3+ entradas, tendências aparecem.
- Sem dados suficientes, tela mostra empty state bonito.

### Task 9: Implementar paywall

**Objective:** Cobrar depois que o usuário experimentar valor.

**Files:**
- Create: `src/screens/PaywallScreen.*`
- Create: `src/services/subscription.*`

**Rules:**
- Grátis: 3 check-ins/mês.
- Premium: check-ins ilimitados + histórico completo + tendências.
- Anual destacado.

**Verification:**
- Após 3 check-ins grátis, app mostra paywall.
- Usuário premium não vê bloqueio.

### Task 10: Revisão ética, UX e lançamento

**Objective:** Garantir que o app é honesto, seguro e vendável.

**Files:**
- Modify: copies do app, onboarding e paywall.
- Modify: landing page/app store copy.

**Checklist:**
- Não afirmar IA se não usa IA.
- Não afirmar diagnóstico.
- Não prometer terapia.
- Política de privacidade clara.
- Explicar armazenamento de áudio/transcrição.
- CTA e preço claros.

**Verification:**
- Todos os textos usam “parece”, “provável”, “sinais”.
- App tem aviso de não substituição profissional.

## Files likely to change in implementation

- `src/screens/TodayScreen.*`
- `src/screens/RecordingScreen.*`
- `src/screens/ResultScreen.*`
- `src/screens/HistoryScreen.*`
- `src/screens/TrendsScreen.*`
- `src/screens/PaywallScreen.*`
- `src/components/RecordButton.*`
- `src/components/InsightCard.*`
- `src/components/MoodPill.*`
- `src/components/SafetyNotice.*`
- `src/services/audioRecorder.*`
- `src/services/transcription.*`
- `src/services/emotionalAnalysis.*`
- `src/services/journalStore.*`
- `src/services/trends.*`
- `src/services/subscription.*`

## Tests / validation

- Testar análise emocional com textos positivos, negativos e neutros.
- Testar que textos de resultado não contêm termos clínicos proibidos.
- Testar limite de check-ins grátis.
- Testar persistência de entradas.
- Testar fluxo completo: gravar → transcrever → analisar → salvar → histórico.
- Fazer QA visual mobile em tela pequena.

## Risks, tradeoffs, and open questions

### Risks

- Usuário não confiar no app se não houver clareza de privacidade.
- App parecer simples demais se design não for premium.
- Custo de transcrição/IA escalar sem limite.
- Problemas de app store se parecer produto clínico.

### Tradeoffs

- Análise por regras é barata, mas menos personalizada.
- IA real é mais vendável, mas cria custo recorrente.
- PWA valida rápido, mas app nativo parece mais premium.

### Open questions

1. O primeiro lançamento será PWA ou app mobile Expo?
2. O áudio será armazenado ou só a transcrição?
3. Vai usar IA real já no plano pago?
4. Nome final será Voz Clara ou outro?
5. O público será mais autocuidado, produtividade ou saúde emocional?
