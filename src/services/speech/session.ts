export type SpeechSessionStatus = 'idle' | 'listening' | 'done' | 'permission-denied' | 'unavailable' | 'error';

export type SpeechSessionErrorReason = 'no-speech' | 'other';

export type SpeechSessionState = {
  status: SpeechSessionStatus;
  transcript: string;
  interimTranscript: string;
  audioUri: string | null;
  pendingAudioUri: string | null;
  errorReason: SpeechSessionErrorReason | null;
  errorMessage: string | null;
  wasCancelled: boolean;
  timedOut: boolean;
};

export const initialSpeechSessionState: SpeechSessionState = {
  status: 'idle',
  transcript: '',
  interimTranscript: '',
  audioUri: null,
  pendingAudioUri: null,
  errorReason: null,
  errorMessage: null,
  wasCancelled: false,
  timedOut: false,
};

export type SpeechSessionEvent =
  | { type: 'start' }
  | { type: 'start-failed' }
  | { type: 'audiostart'; uri: string | null }
  | { type: 'audioend'; uri: string | null }
  | { type: 'result'; transcript: string; isFinal: boolean }
  | { type: 'nomatch' }
  | { type: 'error'; code: string; message?: string }
  | { type: 'end' }
  | { type: 'timeout' }
  | { type: 'cancel' };

function appendFinalTranscript(current: string, addition: string): string {
  const trimmedAddition = addition.trim();
  if (!trimmedAddition) return current;
  return current ? `${current} ${trimmedAddition}` : trimmedAddition;
}

const TERMINAL_STATUSES: SpeechSessionStatus[] = ['permission-denied', 'unavailable', 'error'];

export function speechSessionReducer(
  state: SpeechSessionState,
  event: SpeechSessionEvent
): SpeechSessionState {
  if (event.type === 'start-failed') return initialSpeechSessionState;
  if (event.type === 'cancel') return { ...initialSpeechSessionState, wasCancelled: true };
  if (state.wasCancelled && event.type !== 'start') return state;
  if (TERMINAL_STATUSES.includes(state.status) && event.type !== 'start') {
    return state;
  }

  switch (event.type) {
    case 'start':
      return { ...initialSpeechSessionState, status: 'listening' };

    case 'audiostart':
      return { ...state, pendingAudioUri: event.uri };

    case 'audioend':
      return { ...state, audioUri: event.uri, pendingAudioUri: null };

    case 'result':
      if (event.isFinal) {
        return {
          ...state,
          transcript: appendFinalTranscript(state.transcript, event.transcript),
          interimTranscript: '',
        };
      }
      return { ...state, interimTranscript: event.transcript };

    case 'nomatch':
      return state;

    case 'error': {
      if (event.code === 'not-allowed') {
        return { ...state, status: 'permission-denied', errorReason: null, errorMessage: event.message ?? null };
      }
      if (event.code === 'service-not-allowed' || event.code === 'language-not-supported') {
        return { ...state, status: 'unavailable', errorReason: null, errorMessage: event.message ?? null };
      }
      if (event.code === 'aborted') {
        return { ...initialSpeechSessionState, wasCancelled: true };
      }
      if (event.code === 'no-speech' || event.code === 'speech-timeout') {
        return { ...state, errorReason: 'no-speech', errorMessage: event.message ?? null };
      }
      return {
        ...state,
        status: 'error',
        errorReason: 'other',
        errorMessage: event.message ?? event.code,
      };
    }

    case 'timeout':
      return { ...state, timedOut: true };

    case 'end': {
      if (state.status === 'error') return state;
      if (state.wasCancelled) return { ...initialSpeechSessionState, wasCancelled: true };

      const transcript = state.transcript || state.interimTranscript.trim();
      return { ...state, status: 'done', transcript, interimTranscript: '' };
    }

    default:
      return state;
  }
}
