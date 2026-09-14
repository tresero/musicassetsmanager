import { useState } from 'react';
import {
  List, Datagrid, TextField, BooleanField,
  Edit, Create, SimpleForm, TextInput, SelectInput,
  useRecordContext, useNotify, useRefresh,
} from 'react-admin';
import { Button, TextField as MuiTextField, Stack, Alert } from '@mui/material';
import { EditToolbar } from './formToolbar';

const kinds = [
  { id: 'local',  name: 'Local disk' },
  { id: 's3',     name: 'S3 compatible' },
  { id: 'webdav', name: 'WebDAV' },
  { id: 'sftp',   name: 'SFTP' },
];

/* Write-only. The API never returns a secret, so this posts to an RPC
   rather than going through the normal form save. */
const SecretKeyField = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  if (!record?.account_id) return null;

  const save = async (secret) => {
    setBusy(true);
    try {
      const res = await fetch('/api/rpc/set_storage_secret', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ secret }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Could not save the key');
      }
      setValue('');
      notify(secret ? 'Secret key saved' : 'Secret key cleared', { type: 'info' });
      refresh();
    } catch (e) {
      notify(e.message, { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={1} sx={{ width: '100%', mb: 2 }}>
      {record.key_set
        ? <Alert severity="success" sx={{ py: 0 }}>
            A secret key is stored. Enter a new one to replace it.
          </Alert>
        : <Alert severity="warning" sx={{ py: 0 }}>
            No secret key stored.
          </Alert>}
      <Stack direction="row" spacing={1} alignItems="center">
        <MuiTextField label="Secret access key" type="password" fullWidth
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      helperText="Write only. Never returned by the API." />
        <Button variant="outlined" disabled={!value || busy}
                onClick={() => save(value)}>Save key</Button>
        {record.key_set && (
          <Button color="error" disabled={busy}
                  onClick={() => save('')}>Clear</Button>
        )}
      </Stack>
    </Stack>
  );
};

const StorageList = () => (
  <List title="Storage settings">
    <Datagrid rowClick="edit">
      <TextField source="kind" label="Backend" />
      <TextField source="endpoint" emptyText="—" />
      <TextField source="bucket" emptyText="—" />
      <TextField source="base_path" label="Path" emptyText="—" />
      <BooleanField source="key_set" label="Key" />
    </Datagrid>
  </List>
);

const StorageFields = () => (
  <>
    <Alert severity="info" sx={{ width: '100%', mb: 2 }}>
      <strong>S3 is recommended.</strong> Large uploads go straight from the
      browser to the bucket, so they never pass through this server. Works with
      AWS, Hetzner Object Storage, Backblaze B2, Cloudflare R2, Wasabi, and
      MinIO. Leave the endpoint blank for AWS; set it to the provider's URL for
      anything else.
      <br /><br />
      <strong>Local disk</strong> needs no account and nothing to configure
      beyond a path, but every upload and download passes through this server.
      Fine for documents, slow for audio masters.
    </Alert>
    <SelectInput source="kind" choices={kinds} label="Backend" required />
    <TextInput source="endpoint" fullWidth
               helperText="S3 only. Hetzner: https://fsn1.your-objectstorage.com. Blank for AWS." />
    <TextInput source="region" helperText="S3 only" />
    <TextInput source="bucket" helperText="S3 only" />
    <TextInput source="access_key_id" label="Access key ID" fullWidth
               helperText="Not a secret on its own" />
    <TextInput source="base_path" label="Path prefix" fullWidth
               helperText="Directory for local, key prefix for S3" />
    <TextInput source="public_base_url" label="Public URL base" fullWidth
               helperText="If public objects are served from a different hostname" />
    <TextInput source="notes" multiline fullWidth />
  </>
);

const StorageEditForm = () => (
  <SimpleForm toolbar={<EditToolbar />}>
    <StorageFields />
    <SecretKeyField />
  </SimpleForm>
);

const StorageCreateForm = () => (
  <SimpleForm>
    <StorageFields />
    <Alert severity="info" sx={{ width: '100%' }}>
      Save first, then add the secret key on the edit screen.
    </Alert>
  </SimpleForm>
);

const strip = ({ key_set, ...rest }) => rest;

export default {
  list: StorageList,
  edit: () => <Edit transform={strip} mutationMode="pessimistic"><StorageEditForm /></Edit>,
  create: () => <Create transform={strip}><StorageCreateForm /></Create>,
  recordRepresentation: 'kind',
};
