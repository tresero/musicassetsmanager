import { useState } from 'react';
import { Confirm, useGetMany } from 'react-admin';
import { RichTextInput } from 'ra-input-rich-text';
import { useFormContext, useWatch } from 'react-hook-form';
import { Box, Button, Typography } from '@mui/material';
import ContentCopy from '@mui/icons-material/ContentCopy';

// Whether rich text holds any words, not just the empty paragraph an
// emptied editor leaves.
const hasText = (html) => !!(html || '')
  .replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();

const escape = (text) => text
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/*
 * A recording's own lyrics (#48). Left blank, the song's lyrics stand for it,
 * in search too. Copy from song starts from the song's, for a recording
 * whose lyrics are the same or differ only in places; a medley copies each
 * song's under its title. Copying over lyrics already here asks first.
 */
export const RecordingLyricsInput = () => {
  const { setValue } = useFormContext();
  const [songs, lyrics] = useWatch({ name: ['songs', 'lyrics'] });
  const ids = (songs ?? []).map((s) => s?.song_id).filter(Boolean);
  const { data = [] } = useGetMany('song', { ids }, { enabled: ids.length > 0 });
  const withLyrics = data.filter((s) => hasText(s.lyrics));
  const [asking, setAsking] = useState(false);

  const fromSongs = withLyrics.length === 1
    ? withLyrics[0].lyrics
    : withLyrics.map((s) => `<h3>${escape(s.title)}</h3>${s.lyrics}`).join('');
  const copy = () => {
    setValue('lyrics', fromSongs, { shouldDirty: true });
    setAsking(false);
  };
  const label = withLyrics.length > 1 ? 'Copy from songs' : 'Copy from song';

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Leave blank when this recording sings the song&apos;s lyrics as written;
        the song&apos;s are used then, in search too. Enter them here when they
        differ: verses cut, ad libs, another language. {label} starts from the
        song&apos;s.
      </Typography>
      {withLyrics.length > 0 && (
        <Button startIcon={<ContentCopy />} sx={{ mb: 1 }}
                disabled={lyrics === fromSongs}
                onClick={() => (hasText(lyrics) ? setAsking(true) : copy())}>
          {label}
        </Button>
      )}
      {ids.length > 0 && withLyrics.length === 0 && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          {ids.length > 1 ? 'Its songs have' : 'Its song has'} no lyrics to copy yet.
        </Typography>
      )}
      <RichTextInput source="lyrics" label={false} />
      <Confirm isOpen={asking} title="Replace these lyrics?"
               content="The lyrics on this recording will be replaced by the song's. Nothing is saved until you save."
               confirm="Replace" onConfirm={copy} onClose={() => setAsking(false)} />
    </Box>
  );
};
