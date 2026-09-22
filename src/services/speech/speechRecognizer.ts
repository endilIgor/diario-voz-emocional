import { speechSessionReducer, initialSpeechSessionState } from './session';
import type { SpeechSessionState } from './session';

export type SpeechEngineListener<T> = (payload: T) => void;
export type SpeechEventPayload = {
  uri?: string;
  timestamp?: number;
  results?: { transcript: string }[];
  isFinal?: boolean;
  error?: string;
  message?: string;
};

export type SpeechEnginePermissionResult = { granted: boolean };

/**
 * The subset of `ExpoSpeechRecognitionModule` this app depends on, isolated
 * behind an interface so the orchestration logic can be unit tested without a
 * native module (mirrors the existing AudioRecorder/StorageAdapter pattern).
 */
export type SpeechEngine = {
  isRecognitionAvailable(): boolean;
  requestPermissionsAsync(): Promise<SpeechEnginePermissionResult>;
  start(options: Record<string, unknown>): void;
  stop(): void;
  abort(): void;
  addListener(event: string, listener: SpeechEngineListener<SpeechEventPayload | undefined>): { remove(): void };
};

export type RecordingDestination = {
  outputDirectory: string;
  outputFileName: string;
};

export type StartResult =
  | { ok: true }
  | { ok: false; reason: 'recognizer-unavailable' | 'permission-denied' | 'already-starting' | 'cancelled' };

export type SpeechRecognizer = {
  start(): Promise<StartResult>;
  stop(): void;
  cancel(): void;
  dispose(): void;
};

const SESSION_TIMEOUT_MS = 3 * 60 * 1000;
const LOCALE = 'pt-BR';

const FORWARDED_EVENTS = ['audiostart', 'audioend', 'result', 'nomatch', 'error', 'end'] as const;

export function createSpeechRecognizer(deps: {
  engine: SpeechEngine;
  onStateChange: (state: SpeechSessionState) => void;
  onCancelledAudio?: (uri: string) => void;
  getRecordingDestination?: () => RecordingDestination | null;
  timeoutMs?: number;
  setTimeoutFn?: (cb: () => void, ms: number) => number;
  clearTimeoutFn?: (id: number) => void;
}): SpeechRecognizer {
  const {
    engine,
    onStateChange,
    onCancelledAudio,
    getRecordingDestination,
    timeoutMs = SESSION_TIMEOUT_MS,
    setTimeoutFn = (cb, ms) => setTimeout(cb, ms) as unknown as number,
    clearTimeoutFn = (id) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>),
  } = deps;

  let state = initialSpeechSessionState;
  let timeoutId: number | null = null;
  let subscriptions: { remove(): void }[] = [];
  let starting = false;
  let generation = 0;

  function dispatch(event: Parameters<typeof speechSessionReducer>[1]) {
    state = speechSessionReducer(state, event);
    onStateChange(state);
  }

  function clearSessionTimeout() {
    if (timeoutId !== null) {
      clearTimeoutFn(timeoutId);
      timeoutId = null;
    }
  }

  function teardownListeners() {
    for (const subscription of subscriptions) subscription.remove();
    subscriptions = [];
  }

  async function start(): Promise<StartResult> {
    if (starting || state.status === 'listening') return { ok: false, reason: 'already-starting' };
    starting = true;
    const thisGeneration = generation;
    try {
      if (!engine.isRecognitionAvailable()) return { ok: false, reason: 'recognizer-unavailable' };
      const permission = await engine.requestPermissionsAsync();
      if (generation !== thisGeneration) return { ok: false, reason: 'cancelled' };
      if (!permission.granted) return { ok: false, reason: 'permission-denied' };

      teardownListeners();
      dispatch({ type: 'start' });
      subscriptions = FORWARDED_EVENTS.map((event) =>
        engine.addListener(event, (payload) => {
          if (event === 'audioend' && (state.wasCancelled || state.status === 'error' || state.status === 'unavailable' || state.status === 'permission-denied') && payload?.uri) onCancelledAudio?.(payload.uri);
          if (event === 'end') clearSessionTimeout();
          dispatch(toSessionEvent(event, payload));
          if (event === 'end') teardownListeners();
        })
      );

      const destination = getRecordingDestination?.() ?? null;
      engine.start({
        lang: LOCALE,
        interimResults: true,
        continuous: true,
        requiresOnDeviceRecognition: false,
        recordingOptions: destination
          ? { persist: true, outputDirectory: destination.outputDirectory, outputFileName: destination.outputFileName }
          : { persist: false },
      });
      if (subscriptions.length > 0) {
        timeoutId = setTimeoutFn(() => {
          dispatch({ type: 'timeout' });
          engine.stop();
        }, timeoutMs);
      }
      return { ok: true };
    } catch (error) {
      clearSessionTimeout();
      teardownListeners();
      dispatch({ type: 'start-failed' });
      throw error;
    } finally {
      starting = false;
    }
  }

  function stop() {
    engine.stop();
  }

  function cancel() {
    generation++;
    dispatch({ type: 'cancel' });
    clearSessionTimeout();
    engine.abort();
  }

  function dispose() {
    generation++;
    clearSessionTimeout();
    teardownListeners();
    if (state.status === 'listening') engine.abort();
  }

  return { start, stop, cancel, dispose };
}

function toSessionEvent(
  event: (typeof FORWARDED_EVENTS)[number],
  payload: SpeechEventPayload | undefined
): Parameters<typeof speechSessionReducer>[1] {
  switch (event) {
    case 'audiostart':
      return { type: 'audiostart', uri: payload?.uri ?? null };
    case 'audioend':
      return { type: 'audioend', uri: payload?.uri ?? null };
    case 'result':
      return {
        type: 'result',
        transcript: payload?.results?.[0]?.transcript ?? '',
        isFinal: !!payload?.isFinal,
      };
    case 'nomatch':
      return { type: 'nomatch' };
    case 'error':
      return { type: 'error', code: payload?.error ?? 'unknown', message: payload?.message };
    case 'end':
      return { type: 'end' };
  }
}
