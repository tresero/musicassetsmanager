import { useWatch } from 'react-hook-form';
import { useNotify } from 'react-admin';
import { useSourceContext } from 'ra-core';
import { Button } from '@mui/material';
import OpenIcon from '@mui/icons-material/OpenInNew';

export const FileLink = ({ scoped = false }) => {
  const notify = useNotify();
  const sourceCtx = useSourceContext();
  const path = (f) => (scoped && sourceCtx ? sourceCtx.getSource(f) : f);

  const kind = useWatch({ name: path('storage_kind') });
  const uri = useWatch({ name: path('storage_uri') });

  if (!uri) return null;

  // a plain URL needs no signing
  if (kind === 'url' || /^https?:\/\//.test(uri)) {
    return (
      <Button size="small" startIcon={<OpenIcon />}
              href={uri} target="_blank" rel="noreferrer"
              sx={{ alignSelf: 'flex-start' }}>
        Open
      </Button>
    );
  }

  const open = async () => {
    try {
      const res = await fetch(
        `/upload/download?key=${encodeURIComponent(uri)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
      if (!res.ok) throw new Error(await res.text());
      window.open(res.url, '_blank', 'noreferrer');
    } catch (e) {
      notify(e.message || 'Could not open the file', { type: 'error' });
    }
  };

  return (
    <Button size="small" startIcon={<OpenIcon />} onClick={open}
            sx={{ alignSelf: 'flex-start' }}>
      Open
    </Button>
  );
};