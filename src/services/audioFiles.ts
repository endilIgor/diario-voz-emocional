import { Directory, File, Paths } from 'expo-file-system';
import { unreferencedRecordings } from './recordingRetention';

const recordings = () => new Directory(Paths.document, 'recordings');

export function recordingDestination() {
  const directory = recordings();
  directory.create({ idempotent: true });
  return {
    outputDirectory: directory.uri,
    outputFileName: `recording-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`,
  };
}

export function deleteRecording(uri?: string | null) {
  if (!uri) return;
  const prefix = `${recordings().uri.replace(/\/$/, '')}/`;
  if (!uri.startsWith(prefix)) return;
  const file = new File(uri);
  if (file.exists) file.delete();
}

export function deleteAllRecordings() {
  const directory = recordings();
  if (directory.exists) directory.delete();
}

/** Discard interrupted/unsaved sessions from a previous app launch. */
export function cleanupUnreferencedRecordings(savedUris: string[]) {
  const directory = recordings();
  if (!directory.exists) return;
  const files = directory.list().filter((entry): entry is File => entry instanceof File);
  for (const uri of unreferencedRecordings(files.map((file) => file.uri), savedUris)) {
    deleteRecording(uri);
  }
}
