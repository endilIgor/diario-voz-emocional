# Publicação Android — Voz Clara

Este documento separa o que podemos preparar no repositório do que só o titular das contas consegue concluir. **Não publique nem envie uma política com campos pendentes.**

## Antes de qualquer envio

1. Confirmar o nome público do desenvolvedor, e-mail de privacidade, país/UF, e a URL pública estável da política. Publicar uma página HTML acessível sem login e adicionar seu link no app e na Play Console. Revisar o texto com os dados reais do build e de todos os SDKs.
2. Registrar o identificador Android permanente (`android.package`); depois da primeira publicação, não trocá-lo. Conferir ícone, nome, idioma pt-BR, versão e imagens reais de telas.
3. Testar em aparelho físico Android com microfone: permissão concedida/negada, transcrição em pt-BR, sem internet/serviço de reconhecimento, áudio salvo/reprodução se suportados, apagar entrada e apagar tudo, instalação e atualização. Conferir se o reconhecedor do sistema transmite áudio para seu provedor, e refletir isso na política e em Segurança dos dados. Não descrever o processamento como 100% local sem comprovação.
4. Executar `npm run lint`, `npm test -- --runInBand`, `npm run typecheck`, `npx expo-doctor`; criar build de produção AAB e inspecionar `targetSdkVersion`, permissões e assinatura na saída real.
5. Se houver assinatura: criar produtos na Play Console, habilitar perfil de pagamentos, configurar entitlement/ofertas no RevenueCat e sua chave **pública** Android via ambiente EAS; testar compra, renovação/restauração e cancelamento em teste de licença. Jamais mostrar paywall de compra simulada em produção.

## Build e envio (exige autenticação pessoal e revisão antes de publicar)

Um AAB local de validação foi gerado em `android/app/build/outputs/bundle/release/app-release.aab` (target SDK 36, backup desativado), mas está assinado com a chave **Android Debug**. **Não envie este arquivo à Play Console**; gere outro AAB com uma chave de upload de produção gerenciada pelo EAS.

Validação local: 58 testes, lint, typecheck e 21 verificações do Expo Doctor passaram. O manifesto de release mantém `RECORD_AUDIO` e `com.android.vending.BILLING`, mas não inclui sobreposição de tela, vibração nem leitura/escrita de armazenamento externo. Nenhum aparelho Android estava conectado à VPS; gravação e compra ainda precisam de teste real. Este build não possui URL pública de política nem chave RevenueCat configuradas.

- Vincular o projeto à conta Expo/EAS: `npx eas-cli login` e `npx eas-cli build:configure`. Confirmar que a configuração não mudou o identificador permanente do app. Fazer backup seguro das credenciais de assinatura gerenciadas pelo EAS.
- Gerar teste instalável: `npx eas-cli build --platform android --profile preview` (APK; **não** usar APK como release da Play).
- Gerar release: `npx eas-cli build --platform android --profile production` (AAB assinado). Não afirmar prontidão sem testar o resultado em um dispositivo/Play Internal Testing.
- Criar app na Play Console. Preencher ficha da loja: descrição precisa, screenshots autênticos, categoria, contato, política de privacidade, público-alvo, classificação de conteúdo, anúncios, declarações de saúde quando aplicáveis, Segurança dos dados, acesso ao app e demais pendências que o painel indicar.
- Primeira submissão: manualmente no teste interno **ou**, depois de criar conta de serviço com acesso mínimo e cadastrar sua chave de forma segura no EAS, `npx eas-cli submit --platform android --profile production`. Esta configuração deixa a release como rascunho no teste interno; **não** lança em produção automaticamente.
- Se a conta pessoal foi criada após 13/11/2023, checar no painel o requisito atual de teste fechado antes de solicitar acesso à produção; a documentação da Google descreve 12 pessoas opt-in por 14 dias contínuos. Depois, verificar relatório de pré-lançamento, corrigir bloqueios, solicitar acesso e lançar progressivamente com aprovação do titular.

## Declaração de dados — perguntas a confirmar, não respostas prontas

- Os relatos e análises permanecem somente no aparelho? O reconhecimento de fala escolhido envia áudio/transcrições ao provedor do serviço do Android ou opera offline? Isto pode variar com o aparelho/configuração; testar e declarar honestamente.
- Existe cópia de segurança do sistema operacional? Há áudio salvo? Onde e por quanto tempo? A exclusão remove também os arquivos de áudio?
- O SDK de pagamentos está ativo? Quais dados de compras/identificadores são transmitidos ao RevenueCat e à Google? Não responder “nenhum dado coletado” sem auditar SDKs e AAB final.
- Há conta de usuário? Se futuramente permitir cadastro, implementar exclusão de conta no app e solicitação por URL web conforme política da Play.

## Referências oficiais

- Dados do usuário/política: https://support.google.com/googleplay/android-developer/answer/9888076
- Segurança dos dados: https://support.google.com/googleplay/android-developer/answer/10787469
- Exclusão de contas: https://support.google.com/googleplay/android-developer/answer/13327111
- Testes de novas contas pessoais: https://support.google.com/googleplay/android-developer/answer/14151465
- API alvo: https://developer.android.com/google/play/requirements/target-sdk
- Envio via Expo: https://docs.expo.dev/submit/android/
