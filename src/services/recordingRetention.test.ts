import { unreferencedRecordings } from './recordingRetention';

describe('unreferencedRecordings', () => {
  it('descarta apenas gravações que não pertencem a entradas salvas', () => {
    expect(unreferencedRecordings(
      ['file:///recordings/unsaved.wav', 'file:///recordings/saved.wav'],
      ['file:///recordings/saved.wav']
    )).toEqual(['file:///recordings/unsaved.wav']);
  });
});
