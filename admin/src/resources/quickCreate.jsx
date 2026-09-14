import { useState } from 'react';
import { useCreate, useCreateSuggestionContext } from 'react-admin';
import {
  Dialog, DialogActions, DialogContent, DialogTitle,
  Button, TextField, Stack,
} from '@mui/material';

/* one-field create: genre, mood, instrument, organization, document_type */
export const QuickCreateName = ({ resource }) => {
  const { filter, onCancel, onCreate } = useCreateSuggestionContext();
  const [value, setValue] = useState(filter || '');
  const [create] = useCreate();

  const submit = (e) => {
    e.preventDefault();
    create(resource, { data: { name: value } }, {
      onSuccess: (data) => { setValue(''); onCreate(data); },
    });
  };

  return (
    <Dialog open onClose={onCancel}>
      <form onSubmit={submit}>
        <DialogTitle>New {resource.replace('_', ' ')}</DialogTitle>
        <DialogContent>
          <TextField autoFocus label="Name" value={value}
                     onChange={(e) => setValue(e.target.value)} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="submit">Save</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

/* two-field create: contact */
export const QuickCreateContact = () => {
  const { filter, onCancel, onCreate } = useCreateSuggestionContext();
  const parts = (filter || '').trim().split(/\s+/);
  const [first, setFirst] = useState(parts[0] || '');
  const [last, setLast] = useState(parts.slice(1).join(' '));
  const [create] = useCreate();

  const submit = (e) => {
    e.preventDefault();
    create('contact', {
      data: {
        first_name: first || null,
        last_name: last || null,
        emails: [], phones: [], organizations: [], document_ids: [],
      },
    }, { onSuccess: (data) => onCreate(data) });
  };

  return (
    <Dialog open onClose={onCancel}>
      <form onSubmit={submit}>
        <DialogTitle>New person</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 320 }}>
            <TextField autoFocus label="First name" value={first}
                       onChange={(e) => setFirst(e.target.value)} />
            <TextField label="Last name" value={last}
                       onChange={(e) => setLast(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="submit">Save</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

/* document: needs a title and a location */
export const QuickCreateDocument = () => {
  const { filter, onCancel, onCreate } = useCreateSuggestionContext();
  const [title, setTitle] = useState(filter || '');
  const [uri, setUri] = useState('');
  const [create] = useCreate();

  const submit = (e) => {
    e.preventDefault();
    create('document', {
      data: {
        title,
        storage_kind: 'url',
        storage_uri: uri,
        song_ids: [], recording_ids: [],
        contact_ids: [], organization_ids: [],
      },
    }, { onSuccess: (data) => onCreate(data) });
  };

  return (
    <Dialog open onClose={onCancel}>
      <form onSubmit={submit}>
        <DialogTitle>New document</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 420 }}>
            <TextField autoFocus label="Title" value={title}
                       onChange={(e) => setTitle(e.target.value)} />
            <TextField label="URL or path" value={uri}
                       onChange={(e) => setUri(e.target.value)}
                       helperText="Type and storage settings can be edited later" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={!title || !uri}>Save</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
