import { StatusBar } from 'expo-status-bar';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { analyzeTranscript } from './src/services/emotionalAnalysis';
import { createJournalStore } from './src/services/journalStore';
import { cleanupUnreferencedRecordings, deleteAllRecordings, deleteRecording, recordingDestination } from './src/services/audioFiles';
import { billingAvailable, buyPremiumOffer, getPremiumOffers, getPremiumStatus, restorePremium } from './src/services/billing';
import { createSpeechRecognizer } from './src/services/speech/speechRecognizer';
import type { SpeechEngine } from './src/services/speech/speechRecognizer';
import { initialSpeechSessionState } from './src/services/speech/session';
import type { SpeechSessionState } from './src/services/speech/session';
import { createAsyncStorageAdapter } from './src/services/storage/asyncStorageAdapter';
import { canRecordCheckIn, checkinsRemaining, countCheckInsInMonth } from './src/services/subscription';
import { computeTrends } from './src/services/trends';
import { colors, moodColors, moodLabels, radii, spacing } from './src/theme';
import type { AnalysisResult, JournalEntry, SubscriptionPlan } from './src/types';
import type { PurchasesPackage } from 'react-native-purchases';

type Screen = 'today' | 'recording' | 'manual' | 'result' | 'history' | 'trends' | 'paywall' | 'privacy';
const privacyPolicyUrl = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL;

function makeEntry(transcript: string, audioUri?: string): JournalEntry {
  const analysis = analyzeTranscript(transcript);

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    audioUri,
    transcript,
    ...analysis,
  };
}

function MoodPill({ analysis }: { analysis: AnalysisResult }) {
  return (
    <View style={[styles.moodPill, { backgroundColor: `${moodColors[analysis.mood]}22` }]}>
      <View style={[styles.moodDot, { backgroundColor: moodColors[analysis.mood] }]} />
      <Text style={styles.moodText}>{moodLabels[analysis.mood]}</Text>
    </View>
  );
}

function InsightCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('today');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [draft, setDraft] = useState<JournalEntry | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan>('free');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speechSession, setSpeechSession] = useState<SpeechSessionState>(initialSpeechSessionState);
  const [manualTranscript, setManualTranscript] = useState('');
  const [editedTranscript, setEditedTranscript] = useState('');
  const [offers, setOffers] = useState<PurchasesPackage[]>([]);
  const [billingReady, setBillingReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState('');

  const store = useMemo(() => createJournalStore(createAsyncStorageAdapter()), []);
  const recognizer = useMemo(() => createSpeechRecognizer({
    engine: ExpoSpeechRecognitionModule as unknown as SpeechEngine,
    onStateChange: setSpeechSession,
    onCancelledAudio: deleteRecording,
    getRecordingDestination: () => ExpoSpeechRecognitionModule.supportsRecording() ? recordingDestination() : null,
  }), []);
  const player = useAudioPlayer(draft?.audioUri ?? null);

  useEffect(() => () => recognizer.dispose(), [recognizer]);

  const loadEntries = useCallback(async () => {
    const storedEntries = await store.getEntries();
    setEntries(storedEntries);
    return storedEntries;
  }, [store]);

  useEffect(() => {
    loadEntries()
      .then((stored) => cleanupUnreferencedRecordings(stored.map((entry) => entry.audioUri).filter((uri): uri is string => !!uri)))
      .catch(() => setNotice('Não foi possível carregar ou limpar o diário. Seus dados não foram apagados.'))
      .finally(() => setLoaded(true));
  }, [loadEntries]);

  useEffect(() => {
    if (!billingAvailable) return;
    Promise.all([getPremiumStatus(), getPremiumOffers()]).then(([active, availableOffers]) => {
      setPlan(active ? 'premium' : 'free');
      setOffers(availableOffers);
      setBillingReady(availableOffers.length > 0);
    }).catch(() => setNotice('Não foi possível verificar as compras. Os check-ins continuam disponíveis.'));
  }, []);

  useEffect(() => {
    if (screen !== 'recording') return;
    if (speechSession.status === 'done') {
      const transcript = speechSession.transcript.trim();
      if (transcript) {
        const entry = makeEntry(transcript, speechSession.audioUri ?? undefined);
        setDraft(entry);
        setEditedTranscript(transcript);
        setSelectedEntry(null);
        setScreen('result');
      } else {
        let message = 'Não foi possível transcrever. Tente novamente ou escreva seu relato.';
        try { deleteRecording(speechSession.audioUri); }
        catch { message = 'Não foi possível apagar o áudio descartado. Use “Apagar meus dados” na tela de privacidade.'; }
        setNotice(message);
        setScreen('manual');
      }
    } else if (speechSession.status === 'error' || speechSession.status === 'unavailable' || speechSession.status === 'permission-denied') {
      let message = 'O reconhecimento de voz não está disponível agora. Você pode escrever seu relato.';
      try { deleteRecording(speechSession.audioUri); }
      catch { message = 'Falha ao remover a gravação. Use “Apagar meus dados” na tela de privacidade.'; }
      setNotice(message);
      setScreen('manual');
    }
  }, [screen, speechSession]);

  useEffect(() => {
    if (screen !== 'recording') return;

    setRecordingSeconds(0);
    const timer = setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [screen]);

  const usedThisMonth = countCheckInsInMonth(entries, new Date());
  const remaining = billingReady ? checkinsRemaining(plan, usedThisMonth) : null;
  const lastEntry = entries[0];

  function confirmVoice() {
    if (!loaded) return;
    if (billingReady && !canRecordCheckIn(plan, usedThisMonth)) { openPaywall(); return; }
    Alert.alert(
      'Antes de usar sua voz',
      'O serviço de reconhecimento de fala do seu aparelho pode enviar sua voz ao fornecedor para transcrever. Sua transcrição só é salva no diário quando você confirmar. Quer continuar?',
      [
        { text: 'Escrever', onPress: () => setScreen('manual') },
        { text: 'Continuar', onPress: startRecording },
      ],
    );
  }

  async function startRecording() {
    if (billingReady && !canRecordCheckIn(plan, usedThisMonth)) {
      openPaywall();
      return;
    }
    setNotice('');
    try {
      const result = await recognizer.start();
      if (result.ok) setScreen('recording');
      else if (result.reason === 'already-starting' || result.reason === 'cancelled') return;
      else {
        setNotice(result.reason === 'permission-denied'
          ? 'Permita o microfone nas configurações ou escreva seu relato.'
          : 'Reconhecimento de voz indisponível neste aparelho. Escreva seu relato.');
        setScreen('manual');
      }
    } catch {
      setNotice('Não foi possível iniciar o microfone. Escreva seu relato ou tente novamente.');
      setScreen('manual');
    }
  }

  function finishRecording() {
    recognizer.stop();
  }

  function finishManual() {
    if (billingReady && !canRecordCheckIn(plan, usedThisMonth)) { openPaywall(); return; }
    const transcript = manualTranscript.trim();
    if (!transcript) return;
    const entry = makeEntry(transcript);
    setDraft(entry);
    setEditedTranscript(transcript);
    setSelectedEntry(null);
    setManualTranscript('');
    setScreen('result');
  }

  async function saveDraft() {
    if (!draft || !editedTranscript.trim() || busy) return;
    setBusy(true);
    try {
      await store.addEntry(makeEntry(editedTranscript.trim(), draft.audioUri));
      setDraft(null);
      await loadEntries();
      setScreen('history');
    } catch {
      setNotice('Erro ao salvar. Seu relato continua nesta tela; tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  function openEntry(entry: JournalEntry) {
    setSelectedEntry(entry);
    setDraft(entry);
    setEditedTranscript(entry.transcript);
    setScreen('result');
  }

  async function openPaywall() {
    setScreen('paywall');
    try {
      const availableOffers = await getPremiumOffers();
      setOffers(availableOffers);
      setBillingReady(availableOffers.length > 0);
    } catch {
      setNotice('Não foi possível carregar as ofertas. Verifique a conexão e tente novamente.');
    }
  }

  async function buyOffer(offer: PurchasesPackage) {
    if (busy) return;
    setBusy(true);
    try {
      if (await buyPremiumOffer(offer)) {
        setPlan('premium');
        setScreen('today');
      } else setNotice('A compra não ativou o Premium. Use Restaurar compras ou entre em contato com o suporte.');
    } catch (error) {
      if (!(typeof error === 'object' && error !== null && 'userCancelled' in error && error.userCancelled === true)) {
        setNotice('Compra não concluída. Nenhuma assinatura foi ativada.');
      }
    } finally { setBusy(false); }
  }

  async function restorePurchase() {
    setBusy(true);
    try {
      if (await restorePremium()) { setPlan('premium'); setScreen('today'); }
      else setNotice('Nenhuma assinatura ativa foi encontrada nesta conta Google.');
    } catch { setNotice('Não foi possível restaurar a compra. Tente novamente.'); }
    finally { setBusy(false); }
  }

  function eraseEverything() {
    Alert.alert('Apagar todos os dados?', 'Todas as entradas e gravações salvas neste aparelho serão excluídas sem possibilidade de desfazer. Sua assinatura não será cancelada.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: async () => {
        try {
          await store.clear();
          deleteAllRecordings();
          setDraft(null);
          setSelectedEntry(null);
          await loadEntries();
          setScreen('today');
          setNotice('Dados deste aparelho apagados.');
        } catch { setNotice('Não foi possível apagar todos os dados. Tente novamente.'); }
      } },
    ]);
  }

  function renderToday() {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topbar}>
          <Text style={styles.brand}>Voz Clara</Text>
          <TouchableOpacity onPress={() => setScreen('privacy')} accessibilityLabel="Privacidade e dados">
            <Text style={styles.privacy}>Privacidade</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.heroTitle}>Como foi seu dia?</Text>
        <Text style={styles.subtitle}>
          Grave um check-in rápido. O app organiza seu relato em uma reflexão simples e acolhedora.
        </Text>

        <TouchableOpacity style={styles.recordButton} onPress={confirmVoice} activeOpacity={0.86} disabled={!loaded}>
          <View style={styles.micIcon}>
            <View style={styles.micCapsule} />
            <View style={styles.micStem} />
            <View style={styles.micBase} />
          </View>
          <Text style={styles.recordText}>Gravar</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>{loaded ? 'Fale por até 3 minutos. O serviço de voz do aparelho pode processar o áudio.' : 'Carregando seu diário...'}</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => {
          if (!loaded) return;
          if (billingReady && !canRecordCheckIn(plan, usedThisMonth)) openPaywall();
          else setScreen('manual');
        }} disabled={!loaded}>
          <Text style={styles.secondaryButtonText}>Prefiro escrever meu relato</Text>
        </TouchableOpacity>

        <InsightCard label="Seu acesso">
          <Text style={styles.cardTitle}>
            {!billingReady ? 'Check-ins ilimitados nesta versão' : plan === 'premium'
              ? 'Premium ativo — check-ins ilimitados'
              : `${remaining ?? 0} check-ins grátis restantes este mês`}
          </Text>
          {billingReady && plan === 'free' ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={openPaywall}>
              <Text style={styles.secondaryButtonText}>Conhecer Premium</Text>
            </TouchableOpacity>
          ) : null}
        </InsightCard>

        <InsightCard label="Último check-in">
          <Text style={styles.cardTitle}>
            {lastEntry ? `${moodLabels[lastEntry.mood]} · ${lastEntry.mainTheme}` : 'Seu primeiro check-in começa aqui'}
          </Text>
          <Text style={styles.cardCopy}>
            {lastEntry ? lastEntry.summary : 'Toque em gravar e fale por alguns segundos para testar o ritual.'}
          </Text>
        </InsightCard>
      </ScrollView>
    );
  }

  function renderRecording() {
    return (
      <View style={[styles.content, styles.centerContent]}>
        <Text style={styles.heroTitle}>Estou ouvindo...</Text>
        <Text style={styles.timer}>{String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}</Text>
        <View style={styles.waveRow}>
          {[32, 54, 82, 46, 68, 38, 74].map((height, index) => (
            <View key={index} style={[styles.waveBar, { height }]} />
          ))}
        </View>
        <Text style={styles.subtitleCenter}>Fale do jeito que vier. Você pode parar quando quiser.</Text>
        <Text style={styles.cardCopy}>{speechSession.transcript} {speechSession.interimTranscript}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={finishRecording}>
          <Text style={styles.primaryButtonText}>Parar e analisar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => { recognizer.cancel(); setScreen('today'); }}>
          <Text style={styles.secondaryButtonText}>Cancelar sem salvar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderManual() {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heroTitle}>Escreva seu relato</Text>
        <Text style={styles.subtitle}>Você pode escrever mesmo sem acesso ao microfone. Nada é salvo até tocar em “Analisar”.</Text>
        <TextInput
          style={styles.input}
          multiline
          placeholder="Como foi seu dia?"
          placeholderTextColor={colors.textSecondary}
          value={manualTranscript}
          onChangeText={setManualTranscript}
          accessibilityLabel="Seu relato"
        />
        <TouchableOpacity style={styles.primaryButton} onPress={finishManual} disabled={!manualTranscript.trim()}>
          <Text style={styles.primaryButtonText}>Analisar meu relato</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setScreen('today')}>
          <Text style={styles.secondaryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  function renderResult() {
    const entry = draft;
    if (!entry) return null;

    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heroTitle}>{selectedEntry ? 'Entrada do diário' : 'Seu check-in de hoje'}</Text>
        <MoodPill analysis={entry} />
        <InsightCard label="Resumo">
          <Text style={styles.cardCopy}>{entry.summary}</Text>
        </InsightCard>
        <InsightCard label="Ponto positivo">
          <Text style={styles.cardCopy}>{entry.positiveSignal}</Text>
        </InsightCard>
        <InsightCard label="Pergunta para amanhã">
          <Text style={styles.question}>{entry.reflectionQuestion}</Text>
        </InsightCard>
        <InsightCard label="Transcrição">
          {selectedEntry ? <Text style={styles.cardCopy}>{entry.transcript}</Text> : (
            <TextInput
              style={styles.input}
              multiline
              value={editedTranscript}
              onChangeText={(text) => {
                setEditedTranscript(text);
                if (text.trim()) setDraft({ ...entry, transcript: text, ...analyzeTranscript(text.trim()) });
              }}
              accessibilityLabel="Corrigir transcrição"
            />
          )}
        </InsightCard>
        {entry.audioUri ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={() => { player.seekTo(0); player.play(); }}>
            <Text style={styles.secondaryButtonText}>Ouvir gravação</Text>
          </TouchableOpacity>
        ) : null}
        <Text style={styles.safetyNotice}>
          Este app oferece reflexões pessoais e não substitui apoio profissional.
        </Text>
        {selectedEntry ? (
          <>
            <TouchableOpacity style={styles.primaryButton} onPress={() => { player.pause(); setSelectedEntry(null); setDraft(null); setScreen('history'); }}>
              <Text style={styles.primaryButtonText}>Voltar ao histórico</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => Alert.alert('Apagar entrada?', 'Esta entrada e a gravação serão apagadas permanentemente.', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Apagar', style: 'destructive', onPress: async () => {
                try {
                  await store.removeEntry(entry.id);
                  player.pause();
                  deleteRecording(entry.audioUri);
                  setSelectedEntry(null);
                  setDraft(null);
                  await loadEntries();
                  setScreen('history');
                } catch { setNotice('Não foi possível apagar esta entrada.'); }
              } },
            ])}>
              <Text style={styles.secondaryButtonText}>Apagar esta entrada</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.primaryButton} onPress={saveDraft} disabled={busy || !editedTranscript.trim()}>
              <Text style={styles.primaryButtonText}>Salvar no diário</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => {
              player.pause(); deleteRecording(draft.audioUri); setDraft(null); setScreen('today');
            }}>
              <Text style={styles.secondaryButtonText}>Descartar sem salvar</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    );
  }

  function renderHistory() {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heroTitle}>Histórico</Text>
        <Text style={styles.subtitle}>Suas entradas ficam organizadas para você perceber padrões com calma.</Text>
        {entries.length === 0 ? (
          <InsightCard label="Ainda vazio">
            <Text style={styles.cardCopy}>Faça seu primeiro check-in para começar o histórico.</Text>
          </InsightCard>
        ) : (
          entries.map((entry) => (
            <TouchableOpacity key={entry.id} style={styles.entryRow} onPress={() => openEntry(entry)}>
              <View>
                <Text style={styles.cardTitle}>{moodLabels[entry.mood]}</Text>
                <Text style={styles.cardCopy}>{entry.mainTheme} · {new Date(entry.createdAt).toLocaleDateString('pt-BR')}</Text>
              </View>
              <Text style={styles.entryScore}>{entry.score}/10</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    );
  }

  function renderTrends() {
    const trends = computeTrends(entries);

    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heroTitle}>Sua semana</Text>
        <Text style={styles.subtitle}>Tendências simples aparecem depois de 3 check-ins salvos.</Text>
        {!trends ? (
          <InsightCard label="Dados insuficientes">
            <Text style={styles.cardCopy}>Você precisa de pelo menos 3 check-ins para ver padrões.</Text>
          </InsightCard>
        ) : (
          <>
            <InsightCard label="Humor médio">
              <Text style={styles.metric}>{trends.averageScore.toFixed(1)}/10</Text>
            </InsightCard>
            <InsightCard label="Tema mais citado">
              <Text style={styles.cardTitle}>{trends.mostCommonTheme}</Text>
            </InsightCard>
            <InsightCard label="Padrão percebido">
              <Text style={styles.cardCopy}>{trends.perceivedPattern}</Text>
            </InsightCard>
          </>
        )}
      </ScrollView>
    );
  }

  function renderPaywall() {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heroTitle}>Continue seu ritual diário</Text>
        <Text style={styles.subtitle}>
          O Premium permite check-ins ilimitados. Escolha uma oferta disponível na Google Play.
        </Text>
        {offers.length ? offers.map((offer) => (
          <TouchableOpacity key={offer.identifier} style={styles.card} onPress={() => buyOffer(offer)} disabled={busy}>
            <Text style={styles.cardTitle}>{offer.product.title}</Text>
            <Text style={styles.cardCopy}>{offer.product.priceString} · {offer.product.description}</Text>
            <Text style={styles.secondaryButtonText}>Assinar pela Google Play</Text>
          </TouchableOpacity>
        )) : <Text style={styles.cardCopy}>Ofertas indisponíveis. Nenhuma compra pode ser feita agora.</Text>}
        <TouchableOpacity style={styles.primaryButton} onPress={restorePurchase} disabled={busy}>
          <Text style={styles.primaryButtonText}>Restaurar compras</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setScreen('today')}>
          <Text style={styles.secondaryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  function renderPrivacy() {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heroTitle}>Privacidade e dados</Text>
        <Text style={styles.cardCopy}>Seu texto e gravações salvas ficam neste aparelho. As reflexões são geradas por regras no próprio aplicativo, não por um profissional de saúde.</Text>
        <Text style={styles.cardCopy}>Para transformar fala em texto, o serviço de reconhecimento de voz do aparelho pode processar e transmitir o áudio conforme as configurações do Android. Você também pode usar o diário sem microfone, escrevendo.</Text>
        <Text style={styles.cardCopy}>Se ativadas, compras Premium são processadas pela Google Play e RevenueCat. Apagar o diário não cancela a assinatura.</Text>
        {privacyPolicyUrl ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={() => Linking.openURL(privacyPolicyUrl).catch(() => setNotice('Não foi possível abrir a política.'))}>
            <Text style={styles.secondaryButtonText}>Ler política de privacidade completa</Text>
          </TouchableOpacity>
        ) : <Text style={styles.cardCopy}>A página pública da política de privacidade precisa ser configurada antes da publicação.</Text>}
        <TouchableOpacity style={styles.primaryButton} onPress={eraseEverything}>
          <Text style={styles.primaryButtonText}>Apagar meus dados neste aparelho</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setScreen('today')}>
          <Text style={styles.secondaryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const currentScreen = screen === 'today'
    ? renderToday()
    : screen === 'recording'
      ? renderRecording()
      : screen === 'manual'
        ? renderManual()
      : screen === 'result'
        ? renderResult()
      : screen === 'history'
        ? renderHistory()
        : screen === 'trends'
          ? renderTrends()
          : screen === 'paywall' ? renderPaywall() : renderPrivacy();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appShell}>
        {notice ? <TouchableOpacity style={styles.notice} onPress={() => setNotice('')}>
          <Text style={styles.noticeText}>{notice}  ✕</Text>
        </TouchableOpacity> : null}
        {currentScreen}
        {screen !== 'recording' && screen !== 'manual' && screen !== 'result' && screen !== 'paywall' && screen !== 'privacy' ? (
          <View style={styles.tabs}>
            <TouchableOpacity style={[styles.tab, screen === 'today' && styles.activeTab]} onPress={() => setScreen('today')}>
              <Text style={[styles.tabText, screen === 'today' && styles.activeTabText]}>Hoje</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, screen === 'history' && styles.activeTab]} onPress={() => setScreen('history')}>
              <Text style={[styles.tabText, screen === 'history' && styles.activeTabText]}>Histórico</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, screen === 'trends' && styles.activeTab]} onPress={() => setScreen('trends')}>
              <Text style={[styles.tabText, screen === 'trends' && styles.activeTabText]}>Tendências</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  appShell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  notice: { backgroundColor: '#FFF0D9', padding: spacing.md },
  noticeText: { color: colors.textPrimary, fontWeight: '700' },
  input: {
    minHeight: 130,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radii.card,
    borderColor: '#D4C9C1',
    color: colors.textPrimary,
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
    fontSize: 16,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 150,
  },
  centerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  brand: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
  privacy: {
    backgroundColor: '#DDEFE5',
    color: '#49765E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.button,
    fontWeight: '800',
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1.2,
    fontWeight: '900',
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  subtitleCenter: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  recordButton: {
    width: 196,
    height: 196,
    borderRadius: 98,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xl,
    backgroundColor: colors.purple,
    shadowColor: colors.purple,
    shadowOpacity: 0.34,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 24,
    elevation: 8,
  },
  micIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  micCapsule: {
    width: 18,
    height: 26,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  micStem: {
    width: 3,
    height: 10,
    backgroundColor: '#FFFFFF',
    marginTop: -1,
  },
  micBase: {
    width: 24,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  recordText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
  },
  hint: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#EEE4DC',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    fontWeight: '900',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  cardCopy: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  secondaryButton: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  secondaryButtonText: {
    color: colors.purple,
    fontWeight: '900',
  },
  primaryButton: {
    backgroundColor: colors.textPrimary,
    borderRadius: radii.button,
    paddingVertical: 16,
    paddingHorizontal: 22,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  moodPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.button,
    marginBottom: spacing.md,
  },
  moodDot: {
    width: 9,
    height: 9,
    borderRadius: 99,
    marginRight: spacing.sm,
  },
  moodText: {
    color: colors.textPrimary,
    fontWeight: '900',
  },
  question: {
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '900',
  },
  safetyNotice: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginVertical: spacing.md,
  },
  timer: {
    color: colors.textPrimary,
    fontSize: 52,
    fontWeight: '900',
    marginVertical: spacing.xl,
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 100,
  },
  waveBar: {
    width: 12,
    borderRadius: 999,
    backgroundColor: colors.purple,
    opacity: 0.72,
  },
  entryRow: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#EEE4DC',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryScore: {
    color: colors.purple,
    fontWeight: '900',
    fontSize: 18,
  },
  metric: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontSize: 42,
  },
  price: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontSize: 28,
  },
  tabs: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    backgroundColor: '#FFFFFFDD',
    borderRadius: 24,
    padding: 8,
    borderWidth: 1,
    borderColor: '#EEE4DC',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 18,
  },
  activeTab: {
    backgroundColor: colors.textPrimary,
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: '900',
    fontSize: 12,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
});
