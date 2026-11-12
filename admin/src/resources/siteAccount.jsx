import { useState } from 'react';
import {
  List, Datagrid, TextField, DateField, NumberField, FunctionField,
  Create, Edit, SimpleForm, TextInput, Toolbar, SaveButton,
  TopToolbar, CreateButton, Button, required, email,
  useRecordContext, useUpdate, useDelete, useNotify, useRedirect,
} from 'react-admin';
import {
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  TextField as MuiTextField,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';

// Every account, for the site admin. Creating one emails its first Owner an
// invite; the Owner then sets up storage, pitch settings and staff. The
// database refuses anyone but the site admin, refuses to resend once someone
// has signed in, and never deletes the site admin's own account. Editing
// renames the account and, until someone signs in, moves the Owner invite to a
// corrected email.

const ResendButton = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const [update, { isPending }] = useUpdate();
  if (!record || record.user_count > 0 || record.status === 'No invite') return null;
  const resend = (e) => {
    e.stopPropagation();
    update('site_account',
      { id: record.id, data: { resend: true }, previousData: record },
      {
        mutationMode: 'pessimistic',
        onSuccess: () => notify(`New link sent to ${record.owner_email}`, { type: 'info' }),
        onError: (err) => notify(err.message, { type: 'error' }),
      });
  };
  return <Button label="Resend" onClick={resend} disabled={isPending}><SendIcon /></Button>;
};

// Deleting an account in use takes its users and catalog with it, so the
// name must be typed first. Clicks inside the dialog stop at the dialog, or
// they would reach the row and open the edit page.
const RemoveButton = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [remove, { isPending }] = useDelete();
  if (!record || record.is_mine) return null;
  const inUse = record.user_count > 0;
  const ready = !inUse || typed.trim() === record.name;
  const close = () => { setOpen(false); setTyped(''); };
  const confirm = () => remove('site_account', { id: record.id, previousData: record }, {
    mutationMode: 'pessimistic',
    onSuccess: () => { close(); notify(`Deleted ${record.name}`, { type: 'info' }); },
    onError: (err) => notify(err.message, { type: 'error' }),
  });
  return (
    <>
      <Button label="Delete" color="error"
              onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        <DeleteIcon />
      </Button>
      <Dialog open={open} onClose={close} onClick={(e) => e.stopPropagation()}>
        <DialogTitle>Delete the account {record.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: inUse ? 2 : 0 }}>
            {inUse
              ? `This permanently deletes its ${record.user_count} user${record.user_count === 1 ? '' : 's'} and all of its songs, recordings, releases, people, companies, artists and documents. Files in the account's own storage are not touched.`
              : 'Nobody has signed in to it yet. The emailed link will stop working.'}
          </DialogContentText>
          {inUse && (
            <MuiTextField label="Account name" fullWidth autoFocus value={typed}
                          onChange={(e) => setTyped(e.target.value)}
                          helperText={`Type ${record.name} to confirm.`} />
          )}
        </DialogContent>
        <DialogActions>
          <Button label="Cancel" onClick={close} />
          <Button label="Delete" color="error" variant="contained"
                  disabled={!ready || isPending} onClick={confirm} />
        </DialogActions>
      </Dialog>
    </>
  );
};

const SiteAccountListActions = () => (
  <TopToolbar><CreateButton label="New account" /></TopToolbar>
);

const SiteAccountList = () => (
  <List sort={{ field: 'name', order: 'ASC' }} perPage={100} exporter={false}
        title="Accounts" actions={<SiteAccountListActions />}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <TextField source="name" />
      <TextField source="status" />
      <TextField source="owner_email" label="Owner" />
      <NumberField source="user_count" label="Users" />
      <DateField source="created_at" label="Created" />
      <FunctionField label="Link expires" sortBy="invite_expires_at"
                     render={(r) => (r.invite_expires_at
                       ? new Date(r.invite_expires_at).toLocaleString() : '')} />
      <ResendButton />
      <RemoveButton />
    </Datagrid>
  </List>
);

const nameHelp = 'The label or publisher as its users will see it. Must differ from every other account.';

// Only these two are written; everything else in the row is computed.
const strip = ({ name, owner_email }) => ({ name, owner_email });

const OwnerEmailInput = () => {
  const record = useRecordContext();
  const signedIn = record?.user_count > 0;
  return (
    <TextInput source="owner_email" label="Owner's email" type="email"
               disabled={signedIn} validate={signedIn ? undefined : [required(), email()]}
               helperText={signedIn
                 ? "Someone has signed in, so the account's Owners manage its users on their Users page."
                 : 'Correcting it moves the invite to this address and sends a new link; the old link stops working.'}
               sx={{ width: { xs: '100%', md: 640 } }} />
  );
};

// An onSuccess replaces the form's own redirect, so these redirect themselves.
const SiteAccountEdit = () => {
  const notify = useNotify();
  const redirect = useRedirect();
  return (
    <Edit title="Edit account" mutationMode="pessimistic" transform={strip}
          mutationOptions={{
            onSuccess: (data) => {
              notify(`Saved ${data.name}`, { type: 'info' });
              redirect('list', 'site_account');
            },
          }}>
      <SimpleForm toolbar={<Toolbar><SaveButton /></Toolbar>}>
        <TextInput source="name" validate={required()} helperText={nameHelp}
                   sx={{ width: { xs: '100%', md: 640 } }} />
        <OwnerEmailInput />
      </SimpleForm>
    </Edit>
  );
};

const SiteAccountCreate = () => {
  const notify = useNotify();
  const redirect = useRedirect();
  return (
    <Create title="New account" transform={strip}
            mutationOptions={{
              onSuccess: (data) => {
                notify(`Account created; invite sent to ${data.owner_email}`, { type: 'info' });
                redirect('list', 'site_account');
              },
            }}>
      <SimpleForm>
        <TextInput source="name" validate={required()} helperText={nameHelp}
                   sx={{ width: { xs: '100%', md: 640 } }} />
        <TextInput source="owner_email" label="Owner's email" type="email"
                   validate={[required(), email()]}
                   helperText="Gets an invite link and becomes the account's first Owner. It must not already have a login."
                   sx={{ width: { xs: '100%', md: 640 } }} />
      </SimpleForm>
    </Create>
  );
};

export default {
  list: SiteAccountList,
  create: SiteAccountCreate,
  edit: SiteAccountEdit,
  recordRepresentation: 'name',
};
