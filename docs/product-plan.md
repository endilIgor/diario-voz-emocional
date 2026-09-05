# Plano de Produto — Diário por Voz Emocional

## Objetivo

Criar um micro-app mobile-first onde o usuário grava um áudio diário e recebe uma análise/reflexão emocional simples, com histórico de entradas e tendências básicas.

## Persona inicial

**Pessoa ocupada, ansiosa ou cansada que quer registrar o dia, mas não tem paciência para escrever.**

Características:

- Quer desabafar rápido.
- Usa celular à noite ou depois do trabalho.
- Gosta de produtos de autocuidado.
- Não quer um app complexo.
- Valoriza privacidade.

## Promessa do produto

> Um minuto por dia para entender melhor como você está se sentindo.

## O que o app é

- Diário por voz.
- Check-in emocional.
- Histórico de humor.
- Ferramenta de reflexão pessoal.

## O que o app não é

- Não é terapia.
- Não é diagnóstico.
- Não substitui psicólogo ou psiquiatra.
- Não deve afirmar que detecta depressão, ansiedade ou transtornos.

## Funcionalidade única

### Check-in por voz

O usuário grava um áudio curto. O app transforma isso em uma entrada estruturada:

- Transcrição.
- Humor provável.
- Resumo do relato.
- Temas detectados.
- Pontos positivos.
- Pergunta reflexiva.
- Tendência em relação aos dias anteriores.

## MVP v1

### Essencial

1. Onboarding de 3 telas.
2. Login simples ou entrada local anônima.
3. Permissão de microfone.
4. Gravação de áudio.
5. Transcrição.
6. Análise textual automática.
7. Tela de resultado.
8. Histórico básico.
9. Paywall simples.
10. Notificação diária.

### Não incluir no MVP

- Chat contínuo.
- Comunidade.
- Rede social.
- Gamificação pesada.
- Vários tipos de diário.
- Diagnóstico emocional.
- Conteúdo clínico.

## Fluxo principal

1. Usuário recebe uma notificação: "Quer soltar o que ficou preso hoje?"
2. Abre o app.
3. Vê a pergunta: "Como foi seu dia?"
4. Aperta em "Gravar check-in".
5. Fala por até 3 minutos.
6. Confirma o áudio.
7. App mostra "Analisando seu relato...".
8. Resultado aparece com humor, resumo e pergunta.
9. Usuário salva.
10. App atualiza histórico.

## Análise sem IA generativa

Caso o MVP comece sem IA, usar análise por regras:

### Sinais positivos

Palavras/padrões como:

- feliz
- tranquilo
- grato
- consegui
- orgulho
- animado
- esperança
- aliviado
- melhor
- leve

### Sinais negativos

Palavras/padrões como:

- cansado
- triste
- ansioso
- preocupado
- medo
- raiva
- pressão
- sozinho
- desanimado
- fracasso

### Temas

- Trabalho: chefe, reunião, prazo, cliente, emprego, dinheiro.
- Relacionamento: namorado, namorada, família, amigo, discussão.
- Saúde: sono, dor, academia, remédio, consulta.
- Estudos: prova, faculdade, curso, tarefa.
- Autoestima: culpa, orgulho, insegurança, comparação.

### Saída do algoritmo

```json
{
  "mood": "sobrecarregado",
  "score": 4,
  "energy": "baixa",
  "main_theme": "trabalho",
  "summary_template": "Seu relato teve sinais de cansaço e pressão, principalmente ligados a trabalho.",
  "reflection_question": "Qual pequena coisa você pode simplificar amanhã?"
}
```

## Se usar IA real

Recomendado usar IA real pelo menos na reflexão final, porque aumenta muito o valor percebido.

Arquitetura barata:

1. Transcrição via Whisper, Deepgram ou AssemblyAI.
2. Análise inicial por regras para reduzir custo.
3. Modelo barato gera resumo e pergunta reflexiva.
4. Guardrails impedem diagnóstico ou conselho médico.

Prompt seguro para IA:

```text
Você é um assistente de reflexão pessoal, não terapeuta. Com base no relato abaixo, gere:
1. um resumo em até 2 frases;
2. um humor provável em linguagem simples;
3. um ponto positivo percebido;
4. uma pergunta reflexiva para amanhã.
Não diagnostique. Não dê conselho médico. Seja acolhedor e breve.
Relato: {{transcricao}}
```

## Métricas do MVP

- Ativação: % de usuários que fazem o primeiro check-in.
- Retenção D1/D7: usuários que voltam no dia seguinte e na semana.
- Sequência média: quantos dias seguidos gravam.
- Conversão: grátis → premium.
- Uso pago: check-ins por usuário premium/mês.

## Riscos

### Confiança

Usuário precisa sentir que o diário é privado. Mostrar isso no onboarding.

### Ética

Não vender IA falsa. Se não usa IA, vender como análise automática.

### App Store

Evitar alegações de saúde mental clínica sem base.

### Custo

Áudio e IA podem gerar custo variável. Limitar check-ins no grátis.

## Nome provisório

Sugestões:

- Voz Clara
- Aura Diário
- Reflexo
- Diário Voz
- Um Minuto
- Escuta
- Dentro
- Rose Voice

Meu favorito para Brasil: **Voz Clara**.
