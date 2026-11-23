import { describe, expect, test } from 'vitest';
import { AUDIO_LISTS, trackTitle, findStored, sizeText } from './audioFiles';

describe('audioFiles', () => {
  test('a dropped track is named from its file name', () => {
    expect(trackTitle('Kick In.wav')).toBe('Kick In');
    expect(trackTitle('03_Bass DI.aif')).toBe('03 Bass DI');
    expect(trackTitle('Lead Vox.final.wav')).toBe('Lead Vox.final');
    expect(trackTitle('noext')).toBe('noext');
  });

  test('sizes in words', () => {
    expect(sizeText(1.23e9)).toBe('1.2 GB');
    expect(sizeText(340e6)).toBe('340 MB');
    expect(sizeText(192044)).toBe('192 KB');
    expect(sizeText(null)).toBeNull();
  });

  test('a file already on the recording is found in any of its lists', () => {
    const values = {
      audio_files: [{ storage_uri: 'audio/a.wav', title: 'Main' }],
      stem_files: [{ storage_uri: 'audio/b.wav', title: 'Drums' }],
      multitrack_files: [],
    };
    expect(AUDIO_LISTS).toEqual(['audio_files', 'stem_files', 'multitrack_files']);
    expect(findStored(values, 'audio/b.wav')).toEqual({ list: 'stem_files', index: 0, row: values.stem_files[0] });
    expect(findStored(values, 'audio/z.wav')).toBeNull();
  });
});
