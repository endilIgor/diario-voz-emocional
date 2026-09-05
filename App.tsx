import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { analyzeTranscript } from './src/services/emotionalAnalysis';
import { createJournalStore } from './src/services/journalStore';
import { createAudioRecorder } from './src/services/audioRecorder';
import { createAsyncStorageAdapter } from './src/services/storage/asyncStorageAdapter';
import { canRecordCheckIn, checkinsRemaining, countCheckInsInMonth } from './src/services/subscription';
import { computeTrends } from './src/services/trends';
import { colors, moodColors, moodLabels, radii, spacing } from './src/theme';
import type { AnalysisResult, JournalEntry, SubscriptionPlan } from './src/types';

type Screen = 'today' | 'recording' | 'result' | 'history' | 'trends' | 'paywall';

const sampleTranscripts = [
  'Hoje foi puxado no trabalho. Fiquei cansado com a pressão, mas consegui parar um pouco para respirar.',
  'Me senti tranquilo e grato hoje. Consegui terminar uma tarefa importante e fiquei mais leve.',
  'Estou ansioso com a prova e preocupado com tudo que preciso estudar amanhã.',
];

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

  const store = useMemo(() => createJournalStore(createAsyncStorageAdapter()), []);
  const recorder = useMemo(() => createAudioRecorder(), []);

  const loadEntries = useCallback(async () => {
    const storedEntries = await store.getEntries();
    setEntries(storedEntries);
  }, [store]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    if (screen !== 'recording') return;

    setRecordingSeconds(0);
    const timer = setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [screen]);

  const usedThisMonth = countCheckInsInMonth(entries, new Date());
  const remaining = checkinsRemaining(plan, usedThisMonth);
  const lastEntry = entries[0];

  async function startRecording() {
    if (!canRecordCheckIn(plan, usedThisMonth)) {
      setScreen('paywall');
      return;
    }

    const allowed = await recorder.requestPermission();
    if (!allowed) return;
    await recorder.startRecording();
    setScreen('recording');
  }

  async function finishRecording() {
    const audio = await recorder.stopRecording();
    const transcript = sampleTranscripts[entries.length % sampleTranscripts.length];
    setDraft(makeEntry(transcript, audio.uri));
    setScreen('result');
  }

  async function saveDraft() {
    if (!draft) return;
    await store.addEntry(draft);
    setDraft(null);
    await loadEntries();
    setScreen('history');
  }

  function openEntry(entry: JournalEntry) {
    setSelectedEntry(entry);
    setDraft(entry);
    setScreen('result');
  }

  function renderToday() {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topbar}>
          <Text style={styles.brand}>Voz Clara</Text>
          <Text style={styles.privacy}>Privado</Text>
        </View>

        <Text style={styles.heroTitle}>Como foi seu dia?</Text>
        <Text style={styles.subtitle}>
          Grave um check-in rápido. O app organiza seu relato em uma reflexão simples e acolhedora.
        </Text>

        <TouchableOpacity style={styles.recordButton} onPress={startRecording} activeOpacity={0.86}>
          <Text style={styles.mic}>🎙</Text>
          <Text style={styles.recordText}>Gravar</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>Fale livremente por até 3 minutos. Ninguém vai julgar.</Text>

        <InsightCard label="Plano grátis">
          <Text style={styles.cardTitle}>
            {plan === 'premium'
              ? 'Premium ativo — check-ins ilimitados'
              : `${remaining ?? 0} check-ins grátis restantes este mês`}
          </Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setPlan(plan === 'free' ? 'premium' : 'free')}>
            <Text style={styles.secondaryButtonText}>
              {plan === 'free' ? 'Simular Premium' : 'Voltar para grátis'}
            </Text>
          </TouchableOpacity>
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
        <Text style={styles.timer}>00:{String(recordingSeconds).padStart(2, '0')}</Text>
        <View style={styles.waveRow}>
          {[32, 54, 82, 46, 68, 38, 74].map((height, index) => (
            <View key={index} style={[styles.waveBar, { height }]} />
          ))}
        </View>
        <Text style={styles.subtitleCenter}>Fale do jeito que vier. Você pode parar quando quiser.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={finishRecording}>
          <Text style={styles.primaryButtonText}>Parar e analisar</Text>
        </TouchableOpacity>
      </View>
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
          <Text style={styles.cardCopy}>{entry.transcript}</Text>
        </InsightCard>
        <Text style={styles.safetyNotice}>
          Este app oferece reflexões pessoais e não substitui apoio profissional.
        </Text>
        {selectedEntry ? (
          <TouchableOpacity style={styles.primaryButton} onPress={() => { setSelectedEntry(null); setDraft(null); setScreen('history'); }}>
            <Text style={styles.primaryButtonText}>Voltar ao histórico</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={saveDraft}>
            <Text style={styles.primaryButtonText}>Salvar no diário</Text>
          </TouchableOpacity>
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
          Você usou seus 3 check-ins grátis este mês. No Premium, você pode gravar todos os dias e acompanhar padrões emocionais.
        </Text>
        <InsightCard label="Premium mensal">
          <Text style={styles.price}>R$ 14,90/mês</Text>
          <Text style={styles.cardCopy}>Check-ins ilimitados, histórico completo, tendências e exportação futura.</Text>
        </InsightCard>
        <InsightCard label="Premium anual">
          <Text style={styles.price}>R$ 99,90/ano</Text>
          <Text style={styles.cardCopy}>Menos de R$ 0,28 por dia para manter seu ritual.</Text>
        </InsightCard>
        <TouchableOpacity style={styles.primaryButton} onPress={() => { setPlan('premium'); setScreen('today'); }}>
          <Text style={styles.primaryButtonText}>Simular assinatura Premium</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const currentScreen = screen === 'today'
    ? renderToday()
    : screen === 'recording'
      ? renderRecording()
      : screen === 'result'
        ? renderResult()
        : screen === 'history'
          ? renderHistory()
          : screen === 'trends'
            ? renderTrends()
            : renderPaywall();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appShell}>
        {currentScreen}
        {screen !== 'recording' && screen !== 'result' && screen !== 'paywall' ? (
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
  content: {
    padding: spacing.lg,
    paddingBottom: 110,
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
  mic: {
    fontSize: 34,
    marginBottom: spacing.sm,
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
