import { analyzeTranscript } from './emotionalAnalysis';

const FORBIDDEN_CLINICAL_TERMS = [
  'diagnóstico',
  'diagnostico',
  'transtorno',
  'depressão clínica',
  'doença mental',
  'tratamento médico',
  'você tem depressão',
  'você tem ansiedade',
];

describe('analyzeTranscript', () => {
  it('identifica sobrecarga e tema de trabalho em relato negativo', () => {
    const result = analyzeTranscript(
      'Hoje eu estava muito cansado, o trabalho colocou muita pressão em cima de mim.'
    );

    expect(result.mood).toBe('sobrecarregado');
    expect(result.mainTheme).toBe('trabalho');
    expect(result.score).toBeLessThan(5);
  });

  it('identifica humor tranquilo em relato positivo', () => {
    const result = analyzeTranscript(
      'Eu me senti muito feliz hoje, consegui terminar tudo e fiquei tranquilo.'
    );

    expect(result.mood).toBe('tranquilo');
    expect(result.score).toBeGreaterThan(5);
  });

  it('retorna humor neutro quando não há sinais claros', () => {
    const result = analyzeTranscript('Hoje foi um dia comum, fui ao mercado e voltei para casa.');

    expect(result.mood).toBe('neutro');
    expect(result.score).toBe(5);
  });

  it('detecta tema de relacionamento', () => {
    const result = analyzeTranscript(
      'Tive uma discussão com meu namorado hoje e isso mexeu comigo.'
    );

    expect(result.mainTheme).toBe('relacionamento');
  });

  it('detecta humor ansioso quando há sinais de medo e preocupação', () => {
    const result = analyzeTranscript(
      'Estou muito ansioso e preocupado, tenho medo do que pode acontecer na prova amanhã.'
    );

    expect(result.mood).toBe('ansioso');
  });

  it('detecta palavras positivas que começam com letra acentuada', () => {
    const result = analyzeTranscript('Hoje acordei com muito ânimo e vontade de fazer tudo.');

    expect(result.mood).toBe('tranquilo');
    expect(result.score).toBeGreaterThan(5);
  });

  it('nunca usa linguagem de diagnóstico clínico', () => {
    const samples = [
      'Estou muito cansado, triste e ansioso, sinto raiva e medo o tempo todo.',
      'Fiquei muito feliz e grato, consegui tudo que queria com tranquilidade.',
      'Foi um dia qualquer, sem nada de especial para contar.',
    ];

    for (const transcript of samples) {
      const result = analyzeTranscript(transcript);
      const combinedText = [
        result.summary,
        result.positiveSignal,
        result.reflectionQuestion,
      ]
        .join(' ')
        .toLowerCase();

      for (const term of FORBIDDEN_CLINICAL_TERMS) {
        expect(combinedText).not.toContain(term);
      }
    }
  });

  it('sempre inclui um ponto positivo e uma pergunta reflexiva', () => {
    const result = analyzeTranscript('Foi mais um dia difícil de trabalho.');

    expect(result.positiveSignal.length).toBeGreaterThan(0);
    expect(result.reflectionQuestion.length).toBeGreaterThan(0);
    expect(result.reflectionQuestion.endsWith('?')).toBe(true);
  });

  it('mantém a pontuação entre 1 e 10', () => {
    const veryNegative = analyzeTranscript(
      'cansado triste ansioso preocupado medo raiva pressão sozinho desanimado fracasso'
    );
    const veryPositive = analyzeTranscript(
      'feliz tranquilo grato consegui orgulho animado esperança aliviado melhor leve'
    );

    expect(veryNegative.score).toBeGreaterThanOrEqual(1);
    expect(veryPositive.score).toBeLessThanOrEqual(10);
  });
});
