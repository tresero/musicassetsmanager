import { useState } from 'react';
import { useCreate, useCreateSuggestionContext, useNotify } from 'react-admin';
import {
  Dialog, DialogActions, DialogContent, DialogTitle,
  Button, TextField, Stack,
} from '@mui/material';

/*
 * Quick-create dialogs for the autocomplete inputs.
 *
 * Each sends the minimum the record needs. Everything else comes from
 * column defaults and the INSTEAD OF triggers, so a change to a view's
 * column set cannot break these.
 */

const useQuickCreate = (resource) => {
  const [create] = useCreate();
  const notify = useNotify();

  return (data, onCreate) =>
    create(resource, { data }, {
      onSuccess: (created) => onCreate(created),
      onError: (err) => {
        console.error(`${resource} create failed`, err);
        notify(err?.message || `Could not create the ${resource}`,
               { type: 'error' });
      },
    });
};

/* one field: genre, mood, instrument, organization, document_type */
export const QuickCreateName = ({ resource }) => {
  const { filter, onCancel, onCreate } = useCreateSuggestionContext();
  const [value, setValue] = useState(filter || '');
  const save = useQuickCreate(resource);

  const submit = (e) => {
    e.preventDefault();
    save({ name: value.trim() }, (created) => { setValue(''); onCreate(created); });
  };

  return (
    <Dialog open onClose={onCancel}>
      <form onSubmit={submit}>
        <DialogTitle>New {resource.replace(/_/g, ' ')}</DialogTitle>
        <DialogContent>
          <TextField autoFocus label="Name" value={value} fullWidth
                     onChange={(e) => setValue(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={!value.trim()}>Save</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

/* two fields: a person */
export const QuickCreateContact = () => {
  const { filter, onCancel, onCreate } = useCreateSuggestionContext();
  const parts = (filter || '').trim().split(/\s+/);
  const [first, setFirst] = useState(parts[0] || '');
  const [last, setLast] = useState(parts.slice(1).join(' '));
  const save = useQuickCreate('contact');

  const submit = (e) => {
    e.preventDefault();
    save({
      first_name: first.trim() || null,
      last_name: last.trim() || null,
    }, onCreate);
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
          <Button type="submit" disabled={!first.trim() && !last.trim()}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

/* a document needs a title and somewhere it lives */
export const QuickCreateDocument = () => {
  const { filter, onCancel, onCreate } = useCreateSuggestionContext();
  const [title, setTitle] = useState(filter || '');
  const [uri, setUri] = useState('');
  const save = useQuickCreate('document');

  const submit = (e) => {
    e.preventDefault();
    save({
      title: title.trim(),
      storage_kind: 'url',
      storage_uri: uri.trim(),
    }, onCreate);
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
          <Button type="submit" disabled={!title.trim() || !uri.trim()}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};