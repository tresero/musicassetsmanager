import { useWatch } from 'react-hook-form';
import { useNotify } from 'react-admin';
import { useSourceContext } from 'ra-core';
import { Button } from '@mui/material';
import OpenIcon from '@mui/icons-material/OpenInNew';
import { fileUrl } from './uploadClient';

const extOf = (key) => {
  const m = /\.([a-z0-9]{1,10})$/i.exec(key || '');
  return m ? `.${m[1].toLowerCase()}` : '';
};

/*
 * Opens a stored file under a readable name: the record's title, then the
 * row's own title when it adds something, then the extension. Stored keys
 * are content hashes, so the name has to come from here.
 *
 * The window is opened before the link is fetched; opening it afterwards
 * gets blocked as a popup in Safari.
 */
export const FileLink = ({ scoped = false, sx = { alignSelf: 'flex-start', mt: 1, mb: 0.5 } }) => {
  const notify = useNotify();
  const sourceCtx = useSourceContext();
  const path = (f) => (scoped && sourceCtx ? sourceCtx.getSource(f) : f);

  const kind = useWatch({ name: path('storage_kind') });
  const uri = useWatch({ name: path('storage_uri') });
  const recordTitle = useWatch({ name: 'title' });
  const rowTitle = useWatch({ name: path('title') });

  if (!uri) return null;

  if (kind === 'url' || /^https?:\/\//i.test(uri)) {
    return (
      <Button variant="outlined" size="small" startIcon={<OpenIcon />}
              href={uri} target="_blank" rel="noreferrer" sx={sx}>
        Open
      </Button>
    );
  }

  const name = () => {
    const parts = [recordTitle];
    if (scoped && rowTitle && rowTitle !== recordTitle) parts.push(rowTitle);
    const base = parts.filter(Boolean).join(' - ').replace(/[/\\]/g, '-').trim();
    return (base || 'file') + extOf(uri);
  };

  const open = async () => {
    const win = window.open('', '_blank');
    try {
      const url = await fileUrl(uri, name());
      if (win) {
        win.opener = null;
        win.location = url;
      } else {
        window.location.assign(url);
      }
    } catch (e) {
      win?.close();
      notify(e.message || 'Could not open the file', { type: 'error' });
    }
  };

  return (
    <Button variant="outlined" size="small" startIcon={<OpenIcon />}
            onClick={open} sx={sx}>
      Open
    </Button>
  );
};
