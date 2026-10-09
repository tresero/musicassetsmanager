import { useState, useRef } from 'react';
import { useWatch } from 'react-hook-form';
import { useNotify, useGetList, useGetOne, RemoveItemButton } from 'react-admin';
import { useSourceContext } from 'ra-core';
import { Box, Button } from '@mui/material';
import PlayIcon from '@mui/icons-material/PlayArrow';
import { fileUrl } from './uploadClient';

/*
 * Audio file types by name and id, for code that needs Full Mix or Stem.
 */
export const useAudioFileTypes = () => {
  const { data: types = [] } = useGetList('audio_file_type', {
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'name', order: 'ASC' },
  });
  return {
    typeId: (name) => types.find((t) => t.name === name)?.id ?? null,
    typeName: (id) => types.find((t) => t.id === id)?.name ?? null,
  };
};

const playerSx = { alignSelf: 'center', verticalAlign: 'middle', visibility: 'visible' };

const isPlayable = (uri) => !!uri && !/\.zip$/i.test(uri);
const isExternal = (uri, kind) => kind === 'url' || /^https?:\/\//i.test(uri || '');

/*
 * Plays an audio file in place instead of opening a new window. Give it
 * the file's storage_uri and storage_kind; the wrappers below find those
 * from a form row or a recording.
 *
 * A stored file's link is signed on the first click, so a list of tracks
 * does not sign one per row. Signed links last five minutes; when one runs
 * out mid-play, a seek fails, so a fresh link is fetched once and playback
 * resumes where it stopped. An external URL plays as it is.
 *
 * Browsers play WAV, MP3, FLAC and M4A. Chrome and Firefox cannot play
 * AIFF; for those, use Open to download the file.
 *
 * It stays visible when placed among a row's buttons, which React Admin
 * hides until the row is hovered.
 */
export const AudioPlayer = ({ uri, kind }) => {
  const notify = useNotify();
  const [loaded, setLoaded] = useState({ uri: null, url: null });
  const retried = useRef(false);
  const audioRef = useRef(null);

  if (!isPlayable(uri)) return null;
  const src = loaded.uri === uri ? loaded.url : null;

  const sign = () => (isExternal(uri, kind) ? Promise.resolve(uri) : fileUrl(uri, ''));

  const load = async () => {
    try {
      retried.current = false;
      setLoaded({ uri, url: await sign() });
    } catch (e) {
      notify(e.message || 'Could not load the file', { type: 'error' });
    }
  };

  const onError = async () => {
    if (retried.current || isExternal(uri, kind)) {
      notify('This file cannot be played in the browser. Use Open to download it.',
             { type: 'warning' });
      return;
    }
    retried.current = true;
    const el = audioRef.current;
    const at = el?.currentTime || 0;
    try {
      const url = await fileUrl(uri, '');
      setLoaded({ uri, url });
      el?.addEventListener('loadedmetadata', () => {
        el.currentTime = at;
        el.play();
      }, { once: true });
    } catch (e) {
      notify(e.message || 'Could not load the file', { type: 'error' });
    }
  };

  if (!src) {
    return (
      <Button size="small" startIcon={<PlayIcon />} onClick={load}
              sx={playerSx}>
        Play
      </Button>
    );
  }

  return (
    <Box component="audio" ref={audioRef} src={src} controls autoPlay
         onPlaying={() => { retried.current = false; }}
         onError={onError}
         sx={{ ...playerSx, width: { xs: '100%', md: 360 } }} />
  );
};

/*
 * The player for one row of a recording's audio files.
 */
export const AudioFilePlayer = () => {
  const sourceCtx = useSourceContext();
  const uri = useWatch({ name: sourceCtx.getSource('storage_uri') });
  const kind = useWatch({ name: sourceCtx.getSource('storage_kind') });
  return <AudioPlayer uri={uri} kind={kind} />;
};

/*
 * The player for a recording: its Full Mix, or its first playable file
 * when it has no Full Mix. Nothing shows when it has no audio.
 */
export const RecordingPlayer = ({ recordingId }) => {
  const { typeId } = useAudioFileTypes();
  const { data: recording } = useGetOne('recording', { id: recordingId },
                                        { enabled: !!recordingId });
  const files = (recording?.audio_files || []).filter((f) => isPlayable(f.storage_uri));
  const file = files.find((f) => f.file_type_id === typeId('Full Mix')) ?? files[0];
  if (!file) return null;
  return <AudioPlayer uri={file.storage_uri} kind={file.storage_kind} />;
};

/*
 * The player for a form row that picks a recording, such as a track.
 */
export const RecordingInputPlayer = ({ source = 'recording_id' }) => {
  const sourceCtx = useSourceContext();
  const id = useWatch({ name: sourceCtx.getSource(source) });
  return <RecordingPlayer recordingId={id} />;
};

/*
 * A row's remove button followed by a player, so the player sits after
 * the row's own buttons:
 * <SimpleFormIterator removeButton={<RemoveAndPlay player={<RecordingInputPlayer />} />}>
 */
export const RemoveAndPlay = ({ player }) => (
  <>
    <RemoveItemButton />
    {player}
  </>
);
