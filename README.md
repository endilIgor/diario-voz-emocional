# Diário por Voz Emocional

Micro-app de diário por voz com transcrição e check-in emocional automático.

## Proposta em uma frase

> Grave 1 minuto por dia e receba uma reflexão simples sobre como você parece estar se sentindo.

## Escopo do MVP

Este app deve ter **uma funcionalidade central**: gravar um áudio curto, transcrever, analisar o texto e devolver um insight emocional.

Fluxo principal:

1. Usuário abre o app.
2. Aperta o botão grande de gravação.
3. Fala livremente por 30 segundos a 3 minutos.
4. O app transcreve o áudio.
5. O app identifica humor provável, temas recorrentes e sinais emocionais.
6. O app mostra uma reflexão curta.
7. A entrada é salva no histórico.

## Posicionamento recomendado

Não prometer "IA" se o produto não usa IA real. Usar termos seguros e vendáveis:

- Análise emocional automática.
- Insights baseados no seu relato.
- Check-in emocional guiado por voz.
- Reflexões personalizadas a partir da sua fala.
- Sistema inteligente de diário por voz.

Se for usada uma API de IA real para gerar a reflexão final, aí sim pode dizer:

> Com apoio de IA para transformar seu relato em reflexões personalizadas.

## Arquivos deste projeto

- `docs/product-plan.md` — plano de produto, escopo e estratégia.
- `docs/design-spec.md` — direção visual, telas e componentes.
- `docs/pricing.md` — estratégia de cobrança e planos.
- `prototype/index.html` — protótipo visual estático em HTML/CSS.

## Decisão principal

Começar simples, bonito e confiável. O produto não deve parecer terapia clínica nem prometer diagnóstico. A promessa é ajudar o usuário a criar um ritual diário de autoconsciência.

## Implementação Android

- Reconhecimento de voz em pt-BR pelo serviço disponível no aparelho. O serviço do sistema pode transmitir áudio para processamento; há alternativa de digitar o relato. Não funciona no Expo Go: requer build nativo.
- Gravação de áudio para reprodução, quando o aparelho suporta persistência durante o reconhecimento (Android 13+); nos demais aparelhos, o diário salva a transcrição sem arquivo de áudio.
- As entradas e gravações são guardadas no dispositivo; há exclusão por entrada ou total. Sem sincronização ou conta de usuário. A análise emocional é baseada em regras, não oferece diagnóstico.
- Sem chave de RevenueCat, todos os check-ins são gratuitos e o paywall não aparece. Para ativar compras reais, configurar Google Play Billing e RevenueCat e fornecer `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` no ambiente EAS. O entitlement esperado é `premium`; preços são lidos da loja.
- A política de privacidade pública é configurada via `EXPO_PUBLIC_PRIVACY_POLICY_URL`; as páginas em `docs/privacy.html` e `docs/terms.html` são **rascunhos com campos pendentes**, não devem ser publicadas assim.

Ver `docs/PLAY-STORE.md` para as ações necessárias antes do primeiro envio à Play Store. Verificação de código: `npm run test -- --runInBand`, `npm run lint`, `npm run typecheck` e `npx expo-doctor`.
