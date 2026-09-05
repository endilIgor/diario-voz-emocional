export type MoodKey =
  | 'animado'
  | 'tranquilo'
  | 'neutro'
  | 'sobrecarregado'
  | 'triste'
  | 'ansioso';

export type ThemeKey =
  | 'trabalho'
  | 'relacionamento'
  | 'saude'
  | 'estudos'
  | 'autoestima'
  | 'geral';

export type SubscriptionPlan = 'free' | 'premium';

export type AnalysisResult = {
  mood: MoodKey;
  score: number;
  mainTheme: ThemeKey;
  summary: string;
  positiveSignal: string;
  reflectionQuestion: string;
};

export type JournalEntry = {
  id: string;
  createdAt: string;
  audioUri?: string;
  transcript: string;
  mood: MoodKey;
  score: number;
  mainTheme: ThemeKey;
  summary: string;
  positiveSignal: string;
  reflectionQuestion: string;
};
