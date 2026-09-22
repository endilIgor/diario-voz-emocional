import { createSpeechRecognizer } from './speechRecognizer';
import type { SpeechEngine, SpeechEngineListener, SpeechEventPayload } from './speechRecognizer';
import type { SpeechSessionState } from './session';

function createFakeEngine(overrides: Partial<SpeechEngine> = {}) {
  const listeners = new Map<string, Set<SpeechEngineListener<SpeechEventPayload | undefined>>>();

  const engine: SpeechEngine = {
    isRecognitionAvailable: jest.fn(() => true),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
    addListener: jest.fn((event, listener) => {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      set.add(listener);
      return { remove: () => set!.delete(listener) };
    }),
    ...overrides,
  };

  function emit(event: string, payload?: SpeechEventPayload) {
    for (const listener of listeners.get(event) ?? []) listener(payload);
  }

  return { engine, emit };
}

function createFakeClock() {
  const timers = new Map<number, () => void>();
  let nextId = 1;
  const setTimeoutFn = jest.fn((cb: () => void) => {
    const id = nextId++;
    timers.set(id, cb);
    return id;
  });
  const clearTimeoutFn = jest.fn((id: number) => {
    timers.delete(id);
  });
  return {
    setTimeoutFn,
    clearTimeoutFn,
    fire(id: number) {
      timers.get(id)?.();
    },
  };
}

describe('createSpeechRecognizer', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });
  it('recusa iniciar quando o reconhecedor está indisponível no aparelho', async () => {
    const { engine } = createFakeEngine({ isRecognitionAvailable: jest.fn(() => false) });
    const onStateChange = jest.fn();
    const recognizer = createSpeechRecognizer({ engine, onStateChange });

    const result = await recognizer.start();

    expect(result).toEqual({ ok: false, reason: 'recognizer-unavailable' });
    expect(engine.start).not.toHaveBeenCalled();
  });

  it('recusa iniciar quando a permissão é negada, sem chamar o reconhecedor nativo', async () => {
    const { engine } = createFakeEngine({
      requestPermissionsAsync: jest.fn(async () => ({ granted: false })),
    });
    const onStateChange = jest.fn();
    const recognizer = createSpeechRecognizer({ engine, onStateChange });

    const result = await recognizer.start();

    expect(result).toEqual({ ok: false, reason: 'permission-denied' });
    expect(engine.start).not.toHaveBeenCalled();
  });

  it('não inicia duas sessões durante um pedido de permissão pendente', async () => {
    let grantPermission: ((value: { granted: boolean }) => void) | undefined;
    const { engine } = createFakeEngine({
      requestPermissionsAsync: () => new Promise((resolve) => { grantPermission = resolve; }),
    });
    const recognizer = createSpeechRecognizer({ engine, onStateChange: jest.fn() });

    const first = recognizer.start();
    const second = await recognizer.start();
    grantPermission?.({ granted: true });
    await first;

    expect(second).toEqual({ ok: false, reason: 'already-starting' });
    expect(engine.start).toHaveBeenCalledTimes(1);
  });

  it('não liga o microfone se a permissão for concedida após cancelar', async () => {
    let grantPermission: ((value: { granted: boolean }) => void) | undefined;
    const { engine } = createFakeEngine({
      requestPermissionsAsync: () => new Promise((resolve) => { grantPermission = resolve; }),
    });
    const recognizer = createSpeechRecognizer({ engine, onStateChange: jest.fn() });

    const pendingStart = recognizer.start();
    recognizer.cancel();
    grantPermission?.({ granted: true });

    expect(await pendingStart).toEqual({ ok: false, reason: 'cancelled' });
    expect(engine.start).not.toHaveBeenCalled();
  });

  it('inicia o reconhecimento em pt-BR com resultados intermediários e modo contínuo', async () => {
    const { engine } = createFakeEngine();
    const recognizer = createSpeechRecognizer({ engine, onStateChange: jest.fn() });

    const result = await recognizer.start();

    expect(result).toEqual({ ok: true });
    expect(engine.start).toHaveBeenCalledWith(
      expect.objectContaining({
        lang: 'pt-BR',
        interimResults: true,
        continuous: true,
        requiresOnDeviceRecognition: false,
      })
    );
  });

  it('repassa eventos nativos para o estado da sessão através de onStateChange', async () => {
    const { engine, emit } = createFakeEngine();
    const states: SpeechSessionState[] = [];
    const recognizer = createSpeechRecognizer({ engine, onStateChange: (s) => states.push(s) });

    await recognizer.start();
    emit('result', { isFinal: true, results: [{ transcript: 'Hoje foi um bom dia.' }] });
    emit('end');

    const last = states[states.length - 1];
    expect(last.status).toBe('done');
    expect(last.transcript).toBe('Hoje foi um bom dia.');
  });

  it('quando recordingOptions.persist é fornecido, grava no diretório informado e expõe o uri após o audioend', async () => {
    const { engine, emit } = createFakeEngine();
    const states: SpeechSessionState[] = [];
    const recognizer = createSpeechRecognizer({
      engine,
      onStateChange: (s) => states.push(s),
      getRecordingDestination: () => ({
        outputDirectory: 'file:///documents/recordings/',
        outputFileName: 'entry-1.wav',
      }),
    });

    await recognizer.start();

    expect(engine.start).toHaveBeenCalledWith(
      expect.objectContaining({
        recordingOptions: expect.objectContaining({
          persist: true,
          outputDirectory: 'file:///documents/recordings/',
          outputFileName: 'entry-1.wav',
        }),
      })
    );

    emit('audiostart', { uri: 'file:///documents/recordings/entry-1.wav', timestamp: 1 });
    expect(states[states.length - 1].audioUri).toBeNull();

    emit('audioend', { uri: 'file:///documents/recordings/entry-1.wav', timestamp: 2 });
    expect(states[states.length - 1].audioUri).toBe('file:///documents/recordings/entry-1.wav');
  });

  it('para automaticamente após o tempo limite de 3 minutos chamando stop (não abort)', async () => {
    const { engine } = createFakeEngine();
    const clock = createFakeClock();
    const recognizer = createSpeechRecognizer({
      engine,
      onStateChange: jest.fn(),
      setTimeoutFn: clock.setTimeoutFn,
      clearTimeoutFn: clock.clearTimeoutFn,
    });

    await recognizer.start();

    expect(clock.setTimeoutFn).toHaveBeenCalledWith(expect.any(Function), 180000);
    const timerId = clock.setTimeoutFn.mock.results[0].value as number;
    clock.fire(timerId);

    expect(engine.stop).toHaveBeenCalled();
    expect(engine.abort).not.toHaveBeenCalled();
  });

  it('stop() encerra a captura chamando o stop nativo', async () => {
    const { engine } = createFakeEngine();
    const recognizer = createSpeechRecognizer({ engine, onStateChange: jest.fn() });

    await recognizer.start();
    recognizer.stop();

    expect(engine.stop).toHaveBeenCalledTimes(1);
  });

  it('cancel() aborta a captura chamando o abort nativo', async () => {
    const { engine } = createFakeEngine();
    const recognizer = createSpeechRecognizer({ engine, onStateChange: jest.fn() });

    await recognizer.start();
    recognizer.cancel();

    expect(engine.abort).toHaveBeenCalledTimes(1);
  });

  it('cancelar limpa a sessão e impede que um resultado posterior seja usado', async () => {
    const { engine, emit } = createFakeEngine();
    const states: SpeechSessionState[] = [];
    const recognizer = createSpeechRecognizer({ engine, onStateChange: (state) => states.push(state) });

    await recognizer.start();
    emit('result', { isFinal: true, results: [{ transcript: 'Descartar' }] });
    recognizer.cancel();
    emit('end');

    expect(states[states.length - 1].transcript).toBe('');
    expect(states[states.length - 1].wasCancelled).toBe(true);
  });

  it('descarta o áudio finalizado após cancelamento', async () => {
    const { engine, emit } = createFakeEngine();
    const onCancelledAudio = jest.fn();
    const recognizer = createSpeechRecognizer({ engine, onStateChange: jest.fn(), onCancelledAudio });

    await recognizer.start();
    recognizer.cancel();
    emit('audioend', { uri: 'file:///documents/recordings/aborted.wav' });

    expect(onCancelledAudio).toHaveBeenCalledWith('file:///documents/recordings/aborted.wav');
  });

  it('limpa o temporizador de timeout quando a sessão termina antes do limite', async () => {
    const { engine, emit } = createFakeEngine();
    const clock = createFakeClock();
    const recognizer = createSpeechRecognizer({
      engine,
      onStateChange: jest.fn(),
      setTimeoutFn: clock.setTimeoutFn,
      clearTimeoutFn: clock.clearTimeoutFn,
    });

    await recognizer.start();
    emit('end');

    expect(clock.clearTimeoutFn).toHaveBeenCalled();
  });

  it('permite tentar novamente quando o início nativo falha', async () => {
    const { engine } = createFakeEngine({ start: jest.fn().mockImplementationOnce(() => { throw new Error('native start failed'); }) });
    const recognizer = createSpeechRecognizer({ engine, onStateChange: jest.fn() });

    await expect(recognizer.start()).rejects.toThrow('native start failed');
    expect(await recognizer.start()).toEqual({ ok: true });
    expect(engine.start).toHaveBeenCalledTimes(2);
  });

  it('não mantém um timeout se o reconhecedor terminar dentro de start', async () => {
    const clock = createFakeClock();
    const { engine, emit } = createFakeEngine();
    engine.start = jest.fn(() => emit('end'));
    const recognizer = createSpeechRecognizer({
      engine,
      onStateChange: jest.fn(),
      setTimeoutFn: clock.setTimeoutFn,
      clearTimeoutFn: clock.clearTimeoutFn,
    });

    await recognizer.start();
    expect(clock.setTimeoutFn).not.toHaveBeenCalled();
    expect(engine.stop).not.toHaveBeenCalled();
  });
});
