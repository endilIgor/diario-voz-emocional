import { initialSpeechSessionState, speechSessionReducer } from './session';
import type { SpeechSessionState } from './session';

function reduceAll(events: Parameters<typeof speechSessionReducer>[1][]): SpeechSessionState {
  return events.reduce(speechSessionReducer, initialSpeechSessionState);
}

describe('speechSessionReducer', () => {
  it('começa no estado idle sem transcrição', () => {
    expect(initialSpeechSessionState.status).toBe('idle');
    expect(initialSpeechSessionState.transcript).toBe('');
  });

  it('start coloca a sessão em listening', () => {
    const state = speechSessionReducer(initialSpeechSessionState, { type: 'start' });
    expect(state.status).toBe('listening');
  });

  it('restaura estado inicial quando o início nativo falha', () => {
    const state = reduceAll([{ type: 'start' }, { type: 'start-failed' }]);
    expect(state).toEqual(initialSpeechSessionState);
  });

  it('resultado parcial atualiza apenas a transcrição intermediária', () => {
    const state = reduceAll([{ type: 'start' }, { type: 'result', transcript: 'oi tudo', isFinal: false }]);

    expect(state.interimTranscript).toBe('oi tudo');
    expect(state.transcript).toBe('');
  });

  it('resultado final consolida a transcrição e limpa o texto intermediário', () => {
    const state = reduceAll([
      { type: 'start' },
      { type: 'result', transcript: 'oi tudo bem', isFinal: false },
      { type: 'result', transcript: 'Hoje foi um bom dia.', isFinal: true },
    ]);

    expect(state.transcript).toBe('Hoje foi um bom dia.');
    expect(state.interimTranscript).toBe('');
  });

  it('concatena segmentos finais sucessivos (segmentação contínua do Android)', () => {
    const state = reduceAll([
      { type: 'start' },
      { type: 'result', transcript: 'Primeira parte.', isFinal: true },
      { type: 'result', transcript: 'Segunda parte.', isFinal: true },
    ]);

    expect(state.transcript).toBe('Primeira parte. Segunda parte.');
  });

  it('só expõe o áudio persistido depois do audioend, não do audiostart', () => {
    const afterStart = reduceAll([
      { type: 'start' },
      { type: 'audiostart', uri: 'file:///tmp/rec.wav' },
    ]);
    expect(afterStart.audioUri).toBeNull();
    expect(afterStart.pendingAudioUri).toBe('file:///tmp/rec.wav');

    const afterEnd = speechSessionReducer(afterStart, { type: 'audioend', uri: 'file:///tmp/rec.wav' });
    expect(afterEnd.audioUri).toBe('file:///tmp/rec.wav');
    expect(afterEnd.pendingAudioUri).toBeNull();
  });

  it('permissão negada leva a um estado terminal permission-denied', () => {
    const state = reduceAll([
      { type: 'start' },
      { type: 'error', code: 'not-allowed', message: 'denied' },
      { type: 'end' },
    ]);

    expect(state.status).toBe('permission-denied');
  });

  it('reconhecedor indisponível leva a um estado terminal unavailable', () => {
    const state = reduceAll([
      { type: 'start' },
      { type: 'error', code: 'service-not-allowed', message: 'unavailable' },
      { type: 'end' },
    ]);

    expect(state.status).toBe('unavailable');
  });

  it('cancelamento (abort) some sem criar rascunho — cancelamento vazio', () => {
    const state = reduceAll([
      { type: 'start' },
      { type: 'result', transcript: 'algo', isFinal: true },
      { type: 'error', code: 'aborted' },
      { type: 'end' },
    ]);

    expect(state.status).toBe('idle');
    expect(state.transcript).toBe('');
  });

  it('nenhuma fala detectada termina em done com transcrição vazia', () => {
    const state = reduceAll([
      { type: 'start' },
      { type: 'error', code: 'no-speech' },
      { type: 'end' },
    ]);

    expect(state.status).toBe('done');
    expect(state.transcript).toBe('');
    expect(state.errorReason).toBe('no-speech');
  });

  it('nomatch sem transcrição final termina em done com transcrição vazia', () => {
    const state = reduceAll([{ type: 'start' }, { type: 'nomatch' }, { type: 'end' }]);

    expect(state.status).toBe('done');
    expect(state.transcript).toBe('');
  });

  it('erro genérico permanece em estado de erro após o end', () => {
    const state = reduceAll([
      { type: 'start' },
      { type: 'error', code: 'network', message: 'sem conexão' },
      { type: 'end' },
    ]);

    expect(state.status).toBe('error');
    expect(state.errorReason).toBe('other');
    expect(state.errorMessage).toBe('sem conexão');
  });

  it('não expõe áudio descartado depois de um erro genérico', () => {
    const state = reduceAll([
      { type: 'start' },
      { type: 'error', code: 'network' },
      { type: 'audioend', uri: 'file:///recordings/discarded.wav' },
    ]);
    expect(state.status).toBe('error');
    expect(state.audioUri).toBeNull();
  });

  it('timeout marca a sessão sem interromper o resultado final que ainda chega', () => {
    const state = reduceAll([
      { type: 'start' },
      { type: 'timeout' },
      { type: 'result', transcript: 'Consegui falar até o limite de tempo.', isFinal: true },
      { type: 'end' },
    ]);

    expect(state.timedOut).toBe(true);
    expect(state.status).toBe('done');
    expect(state.transcript).toBe('Consegui falar até o limite de tempo.');
  });
});
