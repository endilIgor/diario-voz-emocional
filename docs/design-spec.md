# Design Spec — Diário por Voz Emocional

## Direção visual

O app deve parecer calmo, íntimo e premium. A experiência precisa transmitir segurança, acolhimento e simplicidade.

Referências de sensação:

- Wellness app.
- Diário privado.
- Meditação leve.
- Produto premium minimalista.

Evitar:

- Visual médico/hospitalar.
- Excesso de métricas.
- Cores agressivas.
- Dashboard complexo.
- Promessas clínicas.

## Paleta sugerida

### Tema claro premium

- Fundo principal: `#F7F1EA` — bege quente.
- Cartão: `#FFFFFF`.
- Texto principal: `#25212B`.
- Texto secundário: `#766E7D`.
- Roxo emocional: `#7C5CFF`.
- Lilás suave: `#E8DFFF`.
- Verde calma: `#88BFA3`.
- Alerta suave: `#D87C70`.

### Tema escuro opcional

- Fundo: `#15131C`.
- Cartão: `#211E2B`.
- Texto principal: `#F8F3EF`.
- Texto secundário: `#B9ADBF`.
- Destaque: `#A891FF`.

## Tipografia

- Fonte recomendada: Inter, Satoshi, SF Pro ou Nunito Sans.
- Títulos: peso 700, espaçamento levemente negativo.
- Corpo: peso 400/500, leitura confortável.
- Frases emocionais: usar tamanho maior e bastante espaço.

## Princípios de interface

1. **Um botão principal por tela.**
2. **Pouco texto, muita respiração.**
3. **Nada deve parecer julgamento.**
4. **A análise deve soar como hipótese, não verdade absoluta.**
5. **A privacidade deve estar visível.**

## Navegação

MVP com 3 abas:

1. Hoje
2. Histórico
3. Tendências

Mas a aba principal deve dominar a experiência.

## Tela 1 — Onboarding

### Tela 1

Título:

> Fale. Respire. Entenda seu dia.

Texto:

> Um diário por voz para transformar seus pensamentos em reflexões simples.

CTA:

> Começar

### Tela 2

Título:

> Não precisa escrever nada

Texto:

> Grave um check-in de até 3 minutos e deixe o app organizar o que você sentiu.

### Tela 3

Título:

> Privado e feito para reflexão

Texto:

> Seus relatos são seus. O app ajuda a perceber padrões, sem diagnósticos ou julgamentos.

CTA:

> Fazer meu primeiro check-in

## Tela 2 — Hoje

Objetivo: levar o usuário a gravar.

Layout:

```text
Bom noite, Jean

Como você está se sentindo hoje?

        [círculo grande]
          Gravar

Leva menos de 1 minuto

Último check-in
Ontem você parecia mais tranquilo.
```

Componentes:

- Saudação.
- Pergunta emocional.
- Botão circular grande.
- Microcopy de segurança.
- Card do último check-in.
- Sequência de dias.

Microcopy perto do botão:

> Fale livremente. Ninguém vai julgar.

## Tela 3 — Gravando

Objetivo: fazer o usuário se sentir ouvido.

Layout:

```text
Estou ouvindo...

00:47

[onda de áudio animada]

Fale do jeito que vier.
Você pode parar quando quiser.

[Parar e analisar]
```

Detalhes:

- Fundo levemente mais escuro.
- Onda de áudio suave.
- Timer grande.
- Botão de parar claro.

## Tela 4 — Resultado

Objetivo: entregar valor imediatamente.

Layout:

```text
Seu check-in de hoje

Humor provável
Levemente sobrecarregado

Resumo
Você falou sobre trabalho, cansaço e falta de tempo para si.

Ponto positivo
Mesmo cansado, você percebeu o que está te afetando.

Pergunta para amanhã
O que você pode tornar 10% mais leve amanhã?

[Salvar no diário]
```

Importante:

- Usar "provável", "parece", "sinais de".
- Não dizer "você está deprimido" ou diagnósticos.
- Resultado precisa parecer humano e acolhedor.

## Tela 5 — Histórico

Layout:

```text
Histórico

Setembro

Hoje
Sobrecarregado · Trabalho

Ontem
Tranquilo · Família

03 Set
Ansioso · Estudos
```

Cada entrada deve abrir detalhes:

- Transcrição.
- Resumo.
- Humor.
- Tags.
- Pergunta reflexiva.

## Tela 6 — Tendências

Layout:

```text
Sua semana

Humor médio
6.8/10

Tema mais citado
Trabalho

Palavra recorrente
"cansaço"

Padrão percebido
Você mencionou pressão em 4 dos últimos 5 check-ins.
```

Essa tela aumenta valor percebido no plano premium.

## Componentes principais

### RecordButton

- Círculo grande.
- Gradiente lilás/roxo.
- Sombra suave.
- Ícone de microfone.
- Animação de pulso lenta.

### InsightCard

- Card branco arredondado.
- Ícone pequeno.
- Título curto.
- Texto acolhedor.

### MoodPill

Estados:

- Tranquilo — verde.
- Neutro — cinza/lilás.
- Sobrecarregado — âmbar.
- Triste — azul.
- Ansioso — laranja suave.
- Animado — roxo.

### SafetyNotice

Texto fixo no onboarding ou resultado:

> Este app oferece reflexões pessoais e não substitui apoio profissional.

## Animações

- Botão de gravação com pulso leve.
- Onda de áudio durante gravação.
- Resultado aparecendo por cards em sequência.
- Transições de 180ms a 240ms.

## Tom de voz

O app deve falar como alguém calmo e respeitoso.

Usar:

- "Parece que..."
- "Seu relato trouxe sinais de..."
- "Talvez valha refletir sobre..."
- "Uma pergunta possível para amanhã..."

Evitar:

- "Você está..."
- "Você tem..."
- "Você precisa..."
- "Diagnóstico"
- "Tratamento"

## Critério de qualidade visual

O app deve parecer bom mesmo com apenas uma funcionalidade. Para isso:

- Botão de gravação deve ser memorável.
- Tela de resultado deve parecer premium.
- Cards devem ter muito espaço.
- Nada de lista poluída.
- Histórico deve ser bonito, não uma tabela.
