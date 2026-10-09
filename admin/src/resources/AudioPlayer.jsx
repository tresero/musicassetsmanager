import { useState, useRef } from 'react';
import { useWatch } from 'react-hook-form';
import { useNotify } from 'react-admin';
import { useSourceContext } from 'ra-core';
import { Box, Button } from '@mui/material';
import PlayIcon from '@mui/icons-material/PlayArrow';
import { fileUrl } from './uploadClient';

/*
 * Plays a stored audio file in place instead of opening a new window.
 *
 * The link is fetched on the first click, so a page of recordings does not
 * sign one per row. Signed links last five minutes; when one runs out
 * mid-play, a seek fails, so a fresh link is fetched once and playback
 * resumes where it stopped.
 *
 * Browsers play WAV, MP3, FLAC and M4A. Chrome and Firefox cannot play
 * AIFF; for those, use Open to download the file.
 */
export const AudioPlayer = ({ scoped = false }) => {
  const notify = useNotify();
  const sourceCtx = useSourceContext();
  const path = (f) => (scoped && sourceCtx ? sourceCtx.getSource(f) : f);
  const uri = useWatch({ name: path('storage_uri') });
  const kind = useWatch({ name: path('storage_kind') });
  const [loaded, setLoaded] = useState({ uri: null, url: null });
  const retried = useRef(false);
  const audioRef = useRef(null);

  if (!uri || kind === 'url' || /\.zip$/i.test(uri)) return null;
  const src = loaded.uri === uri ? loaded.url : null;

  const load = async () => {
    try {
      retried.current = false;
      setLoaded({ uri, url: await fileUrl(uri, '') });
    } catch (e) {
      notify(e.message || 'Could not load the file', { type: 'error' });
    }
  };

  const onError = async () => {
    if (retried.current) {
      notify('This file cannot be played in the browser. Use Open to download it.',
             { type: 'warning' });
      return;
    }
    retried.current = true;
    const at = audioRef.current?.currentTime || 0;
    try {
      const url = await fileUrl(uri, '');
      const el = audioRef.current;
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
              sx={{ alignSelf: 'center' }}>
        Play
      </Button>
    );
  }

  return (
    <Box component="audio" ref={audioRef} src={src} controls autoPlay
         onPlaying={() => { retried.current = false; }}
         onError={onError}
         sx={{ width: { xs: '100%', md: 360 }, alignSelf: 'center' }} />
  );
};
