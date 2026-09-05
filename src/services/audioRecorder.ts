export type RecordingResult = {
  uri: string;
  durationMs: number;
};

export type AudioRecorder = {
  requestPermission(): Promise<boolean>;
  startRecording(): Promise<void>;
  stopRecording(): Promise<RecordingResult>;
};

/**
 * Simulated recorder used until real microphone capture (expo-av / expo-audio)
 * is wired in. Isolated behind the AudioRecorder interface so screens never
 * depend on the concrete implementation.
 */
export function createMockAudioRecorder(): AudioRecorder {
  let startedAt = 0;

  return {
    async requestPermission() {
      return true;
    },

    async startRecording() {
      startedAt = Date.now();
    },

    async stopRecording() {
      const durationMs = Math.max(0, Date.now() - startedAt);
      return {
        uri: `mock-recording-${startedAt}.m4a`,
        durationMs,
      };
    },
  };
}

export function createAudioRecorder(): AudioRecorder {
  return createMockAudioRecorder();
}
