import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useNotify } from 'react-admin';
import { useSourceContext } from 'ra-core';
import { parseBlob } from 'music-metadata';
import { uploadFile } from './uploadClient';
import { useAudioFileTypes } from './AudioPlayer';
import { DropZone } from './DropZone';

/*
 * Drop an audio file on the row, or click to pick one.
 *
 * The file goes from the browser straight to storage, so the server never
 * sees it. The header is therefore read here, before the upload, and the
 * technical fields are filled in from it. The stored key is the file's
 * hash, so dropping the same file again reuses the stored copy. Only the header is parsed, so a
 * multi-gigabyte master reads as quickly as an MP3.
 *
 * Every file gets a bitrate. Bit depth only means something for lossless
 * audio, so a lossy file leaves it empty.
 *
 * The library's own lossless flag cannot be trusted for uncompressed
 * files. A WAV carrying a fact chunk is reported as lossy, and many DAWs
 * write one for plain PCM; so is AIFF-C, which Logic and Pro Tools write
 * for uncompressed audio. The codec name is reliable where the flag is
 * not, so an uncompressed codec wins over the flag.
 *
 * Duration also falls back to size over byte rate, for the WAVs whose
 * fact chunk carries a sample count of zero.
 *
 * If the recording has no duration yet and this is the full mix rather
 * than an alternate or a stem, the recording's duration is taken from
 * this file as well.
 *
 * A zip of stems has no header to read. It uploads anyway, typed as Stem.
 *
 * The file's own name is kept in file_name, since the stored key is only
 * its hash. Dropping a file that another row already has refuses it, but
 * if that row has no name yet, it takes this file's name: that is how
 * files uploaded before names were kept get theirs.
 */

const extOf = (name) => (name.split('.').pop() || '').toUpperCase();

// Codec names the parser reports for uncompressed audio. WAVE_FORMAT_
// EXTENSIBLE (tag 65534) is how 24-bit WAV is usually written; sowt is
// little-endian PCM in AIFF-C. Anything else falls back to the library's
// flag, which is right for FLAC, ALAC, and the lossy formats.
const UNCOMPRESSED =
  /^(pcm|ieee_float|not compressed|sowt|pcm \(byte swapped\)|non-pcm \(65534\))$/i;

const isLossless = (f) =>
  UNCOMPRESSED.test(f.codec || '') ? true : (f.lossless ?? null);

const durationOf = (f, file) => {
  if (f.duration) return f.duration;
  if (f.bitrate) return (file.size * 8) / f.bitrate;
  return null;
};

// Description names what a file is, not its specs, which have fields of
// their own. A zip is all the stems. Otherwise use a title embedded in the
// file, as MP3s usually carry, but only when it says more than the
// recording's title does; a tag that repeats the song name adds nothing.
const norm = (t) => (t || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const describeFile = (ext, tagTitle, recordingTitle) => {
  if (ext === 'ZIP') return 'All stems';
  if (tagTitle && norm(tagTitle) !== norm(recordingTitle)) return tagTitle;
  return null;
};

export const AudioUploadInput = ({ scoped = false }) => {
  const notify = useNotify();
  const { setValue, getValues } = useFormContext();
  const sourceCtx = useSourceContext();

  const path = (f) => (scoped && sourceCtx ? sourceCtx.getSource(f) : f);
  const storageUri = useWatch({ name: path('storage_uri') });

  const { typeId, typeName } = useAudioFileTypes();

  const [phase, setPhase] = useState(null);
  const [pct, setPct] = useState(0);

  const upload = async ([file]) => {
    setPct(0);
    try {
      // 1. read the header; a zip of stems has none, and still uploads
      const ext = extOf(file.name);
      let f = {};
      let tagTitle = null;
      if (ext !== 'ZIP') {
        let why = 'no sample rate in the header';
        try {
          const meta = await parseBlob(file, { duration: true });
          f = meta.format || {};
          tagTitle = meta.common?.title?.trim() || null;
        } catch (e) {
          console.error('Reading the audio header failed', file.name, e);
          why = e?.message || String(e);
          f = {};
        }
        if (!f.sampleRate) {
          notify(`Could not read the audio details of ${file.name} (${why}). `
                 + 'It still uploads; fill in the details by hand.',
                 { type: 'warning', autoHideDuration: 15000 });
        }
      }
      const lossless = ext === 'ZIP' ? null : isLossless(f);
      const seconds = durationOf(f, file);
      const info = {
        format: extOf(file.name),
        lossless,
        rate: f.sampleRate ?? null,
        bits: lossless ? (f.bitsPerSample ?? null) : null,
        kbps: f.bitrate ? Math.round(f.bitrate / 1000) : null,
        channels: f.numberOfChannels ?? null,
        ms: seconds ? Math.round(seconds * 1000) : null,
      };

      // 2. hash, then send unless an identical file is already stored
      setPhase('Checking file');
      const plan = await uploadFile(file, {
        kind: 'audio',
        onHashProgress: (p) => setPct(Math.round(p * 100)),
        onUploadProgress: (p) => { setPhase('Uploading'); setPct(Math.round(p * 100)); },
      });

      // 3. refuse a file this recording already has on another row, but
      //    name that row if it has no name yet
      const opts = { shouldDirty: true };
      const here = path('storage_uri');
      const rows = getValues('audio_files') || [];
      const twin = rows.findIndex((r, i) =>
        r?.storage_uri === plan.key && `audio_files.${i}.storage_uri` !== here);
      if (twin >= 0) {
        const label = rows[twin]?.title ? ` (${rows[twin].title})` : '';
        if (!rows[twin]?.file_name) {
          setValue(`audio_files.${twin}.file_name`, file.name, opts);
          notify(`Row ${twin + 1}${label} already has that file; it is now named ${file.name}. `
                 + (getValues(here) ? 'Save to keep it.' : 'Remove this empty row and save.'),
                 { type: 'info' });
        } else {
          notify(`That file is already on this recording, row ${twin + 1}${label}.`,
                 { type: 'warning' });
        }
        return;
      }

      // 4. fill the row
      setValue(path('storage_kind'), plan.backend, opts);
      setValue(path('storage_uri'), plan.key, opts);
      setValue(path('file_name'), file.name, opts);
      setValue(path('format'), info.format, opts);
      setValue(path('is_lossless'), info.lossless, opts);
      setValue(path('sample_rate'), info.rate, opts);
      setValue(path('bit_depth'), info.bits, opts);
      setValue(path('bit_rate_kbps'), info.kbps, opts);
      setValue(path('channels'), info.channels, opts);
      setValue(path('duration_ms'), info.ms, opts);
      if (!getValues(path('file_type_id'))) {
        setValue(path('file_type_id'),
                 typeId(ext === 'ZIP' ? 'Stem' : 'Full Mix'), opts);
      }
      if (!getValues(path('title'))) {
        const desc = describeFile(ext, tagTitle, getValues('title'));
        if (desc) setValue(path('title'), desc, opts);
      }

      const isMainMix = typeName(getValues(path('file_type_id'))) === 'Full Mix';
      if (info.ms && isMainMix && !getValues('duration_ms')) {
        setValue('duration_ms', info.ms, opts);
      }

      notify(plan.exists ? 'Already stored; linked to the existing copy. Save to record it.'
                         : 'Uploaded. Save to record it.', { type: 'info' });
    } catch (e) {
      notify(e.message || 'Upload failed', { type: 'error' });
    } finally {
      setPhase(null);
    }
  };

  return (
    <DropZone
      onFiles={upload}
      busy={!!phase}
      pct={pct}
      accept="audio/*,.zip"
      dense
      label={phase ?? (storageUri ? 'Drop to replace' : 'Drop audio or click')}
      sx={{ width: { xs: '100%', md: 240 }, flexShrink: 0 }}
    />
  );
};
