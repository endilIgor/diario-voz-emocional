export function unreferencedRecordings(recordingUris: string[], savedUris: string[]) {
  const saved = new Set(savedUris);
  return recordingUris.filter((uri) => !saved.has(uri));
}
