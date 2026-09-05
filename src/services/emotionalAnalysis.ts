import type { AnalysisResult, MoodKey, ThemeKey } from '../types';

const POSITIVE_WORDS = [
  'feliz',
  'tranquilo',
  'grato',
  'consegui',
  'orgulho',
  'animado',
  'esperança',
  'aliviado',
  'melhor',
  'leve',
];

const NEGATIVE_WORDS = [
  'cansado',
  'triste',
  'ansioso',
  'preocupado',
  'medo',
  'raiva',
  'pressão',
  'sozinho',
  'desanimado',
  'fracasso',
];

const ANXIOUS_WORDS = ['ansioso', 'preocupado', 'medo'];
const SAD_WORDS = ['triste', 'desanimado'];

const THEME_KEYWORDS: Record<Exclude<ThemeKey, 'geral'>, string[]> = {
  trabalho: ['trabalho', 'chefe', 'reunião', 'prazo', 'cliente', 'emprego', 'dinheiro'],
  relacionamento: ['relacionamento', 'namorado', 'namorada', 'família', 'amigo', 'discussão'],
  saude: ['saúde', 'sono', 'dor', 'academia', 'remédio', 'consulta'],
  estudos: ['estudos', 'prova', 'faculdade', 'curso', 'tarefa'],
  autoestima: ['autoestima', 'culpa', 'orgulho', 'insegurança', 'comparação'],
};

const REFLECTION_QUESTIONS: Record<ThemeKey, string> = {
  trabalho: 'O que você pode tornar 10% mais leve amanhã no trabalho?',
  relacionamento: 'O que você gostaria de dizer, mas ainda não disse?',
  saude: 'O que o seu corpo está pedindo essa semana?',
  estudos: 'Qual pequeno passo tornaria os estudos mais leves amanhã?',
  autoestima: 'O que você faria de diferente se confiasse mais em si mesmo?',
  geral: 'Qual pequena coisa você pode simplificar amanhã?',
};

function normalize(text: string): string {
  return text.toLowerCase();
}

function countMatches(words: string, list: string[]): number {
  return list.reduce((count, word) => {
    const pattern = new RegExp(`\\b${normalize(word)}\\b`, 'g');
    const matches = words.match(pattern);
    return count + (matches ? matches.length : 0);
  }, 0);
}

function detectTheme(normalizedText: string): ThemeKey {
  let bestTheme: ThemeKey = 'geral';
  let bestCount = 0;

  (Object.keys(THEME_KEYWORDS) as Exclude<ThemeKey, 'geral'>[]).forEach((theme) => {
    const count = countMatches(normalizedText, THEME_KEYWORDS[theme]);
    if (count > bestCount) {
      bestCount = count;
      bestTheme = theme;
    }
  });

  return bestTheme;
}

function detectMood(positiveCount: number, negativeCount: number, normalizedText: string): MoodKey {
  if (negativeCount > positiveCount) {
    if (countMatches(normalizedText, ANXIOUS_WORDS) > 0) return 'ansioso';
    if (countMatches(normalizedText, SAD_WORDS) > 0) return 'triste';
    return 'sobrecarregado';
  }

  if (positiveCount > negativeCount) {
    if (countMatches(normalizedText, ['animado']) > 0) return 'animado';
    return 'tranquilo';
  }

  return 'neutro';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const THEME_LABELS: Record<ThemeKey, string> = {
  trabalho: 'trabalho',
  relacionamento: 'relacionamento',
  saude: 'saúde',
  estudos: 'estudos',
  autoestima: 'autoestima',
  geral: 'seu dia',
};

function buildSummary(mood: MoodKey, theme: ThemeKey): string {
  const themeLabel = THEME_LABELS[theme];

  if (mood === 'tranquilo' || mood === 'animado') {
    return `Seu relato trouxe sinais de leveza, principalmente ligados a ${themeLabel}.`;
  }

  if (mood === 'neutro') {
    return `Seu relato pareceu tranquilo, sem sinais fortes de peso ou leveza sobre ${themeLabel}.`;
  }

  return `Seu relato teve sinais de cansaço e pressão, principalmente ligados a ${themeLabel}.`;
}

function buildPositiveSignal(mood: MoodKey): string {
  if (mood === 'tranquilo' || mood === 'animado') {
    return 'Você trouxe boas energias para o seu relato de hoje.';
  }

  return 'Mesmo com esses sinais, você conseguiu parar e colocar em palavras o que sentiu hoje.';
}

export function analyzeTranscript(transcript: string): AnalysisResult {
  const normalizedText = normalize(transcript);

  const positiveCount = countMatches(normalizedText, POSITIVE_WORDS);
  const negativeCount = countMatches(normalizedText, NEGATIVE_WORDS);

  const mood = detectMood(positiveCount, negativeCount, normalizedText);
  const mainTheme = detectTheme(normalizedText);
  const score = clamp(5 + positiveCount - negativeCount, 1, 10);

  return {
    mood,
    score,
    mainTheme,
    summary: buildSummary(mood, mainTheme),
    positiveSignal: buildPositiveSignal(mood),
    reflectionQuestion: REFLECTION_QUESTIONS[mainTheme],
  };
}
