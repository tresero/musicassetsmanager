import { useState } from 'react';
import {
  Form, SaveButton, TextInput, NumberInput, SelectInput, required, email,
  useGetList, useCreate, useUpdate, useNotify, Loading,
} from 'react-admin';
import { useFormContext } from 'react-hook-form';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { sendTestMail } from './uploadClient';

// Settings for the providers most people use. Microsoft 365 often has SMTP
// sign-in switched off by the administrator; Gmail and iCloud need an app
// password when two-step sign-in is on.
const PRESETS = [
  { label: 'Gmail or Google Workspace', smtp_host: 'smtp.gmail.com', smtp_port: 587, smtp_security: 'starttls' },
  { label: 'Microsoft 365 or Outlook', smtp_host: 'smtp.office365.com', smtp_port: 587, smtp_security: 'starttls' },
  { label: 'iCloud', smtp_host: 'smtp.mail.me.com', smtp_port: 587, smtp_security: 'starttls' },
  { label: 'Fastmail', smtp_host: 'smtp.fastmail.com', smtp_port: 465, smtp_security: 'tls' },
];

const securities = [
  { id: 'starttls', name: 'STARTTLS (usually port 587)' },
  { id: 'tls', name: 'SSL/TLS (usually port 465)' },
];

const FIELDS = ['from_name', 'from_address', 'smtp_host', 'smtp_port', 'smtp_security', 'smtp_username'];

const Presets = () => {
  const { setValue, getValues } = useFormContext();
  const pick = (p) => {
    ['smtp_host', 'smtp_port', 'smtp_security'].forEach((f) => setValue(f, p[f], { shouldDirty: true }));
    if (!getValues('smtp_username') && getValues('from_address')) {
      setValue('smtp_username', getValues('from_address'), { shouldDirty: true });
    }
  };
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
      <Typography variant="body2" color="text.secondary">Fill in for:</Typography>
      {PRESETS.map((p) => <Button key={p.label} size="small" onClick={() => pick(p)}>{p.label}</Button>)}
    </Box>
  );
};

const setPassword = async (password) => {
  const res = await fetch('/api/rpc/set_mail_password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Could not save the password');
};

/*
 * Email sending (#70): the user's own mail account, which email sent from
 * the app goes out through. Nothing goes through the site's own mail server.
 * The password is saved on its own and never shown again; the upload
 * service reads it to send.
 */
export const UserMailCard = () => {
  const { data, isPending, refetch } = useGetList('user_mail', { pagination: { page: 1, perPage: 1 } });
  const [create, { isPending: creating }] = useCreate();
  const [update, { isPending: updating }] = useUpdate();
  const notify = useNotify();
  const [password, setPasswordValue] = useState('');
  const [busy, setBusy] = useState(null);

  if (isPending) return <Loading />;
  const row = data?.[0];
  const values = {
    from_name: row?.from_name ?? '',
    from_address: row?.from_address ?? '',
    smtp_host: row?.smtp_host ?? '',
    smtp_port: row?.smtp_port ?? 587,
    smtp_security: row?.smtp_security ?? 'starttls',
    smtp_username: row?.smtp_username ?? '',
  };

  const done = {
    onSuccess: () => { refetch(); notify('Email settings saved'); },
    onError: (err) => notify(err?.message || 'Could not save the email settings', { type: 'error' }),
  };
  const save = (form) => {
    const changes = Object.fromEntries(FIELDS.map((k) => [k, form[k] ?? null]));
    if (row) update('user_mail', { id: row.id, data: changes, previousData: row }, done);
    else create('user_mail', { data: changes }, done);
  };

  const run = async (label, fn, ok) => {
    setBusy(label);
    try {
      await fn();
      notify(ok, { type: 'info', autoHideDuration: 10000 });
      refetch();
    } catch (e) {
      notify(e.message, { type: 'error', autoHideDuration: 15000 });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Stack spacing={1} sx={{ maxWidth: 600 }}>
          <Typography variant="h6">Email sending</Typography>
          <Typography variant="body2" color="text.secondary">
            Email you send from the app, such as a document to a co-writer, goes out from your own
            address through your own mail provider, as if you had sent it yourself. Only you can see
            these settings.
          </Typography>
          <Form key={JSON.stringify(values)} defaultValues={values} onSubmit={save} resource="user_mail">
            <Stack spacing={1}>
              <TextInput source="from_address" label="Your email address" validate={[required(), email()]}
                         helperText="Mail is sent from this address" />
              <TextInput source="from_name" label="Your name"
                         helperText="Shown as the sender, for example Ada Example" />
              <Presets />
              <TextInput source="smtp_host" label="Mail server" validate={required()}
                         helperText="Your provider's outgoing (SMTP) server, for example smtp.gmail.com" />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <SelectInput source="smtp_security" label="Encryption" choices={securities}
                             validate={required()} helperText={false} sx={{ minWidth: 260 }} />
                <NumberInput source="smtp_port" label="Port" validate={required()} helperText={false}
                             sx={{ width: 120 }} />
              </Box>
              <TextInput source="smtp_username" label="Username" validate={required()}
                         helperText="Usually your email address" />
              <Box><SaveButton label="Save email settings" disabled={creating || updating} /></Box>
            </Stack>
          </Form>

          {row && (
            <>
              <Typography variant="subtitle2" sx={{ pt: 1 }}>
                Password {row.password_set ? '(saved)' : '(not saved yet)'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                With Gmail, Google Workspace or iCloud, use an app password made in your account&apos;s
                security settings, not your usual password. It is never shown again once saved.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <TextField type="password" size="small" label="Password" value={password} autoComplete="new-password"
                           onChange={(e) => setPasswordValue(e.target.value)} sx={{ minWidth: 260 }} />
                <Button disabled={!password || !!busy}
                        onClick={() => run('password', () => setPassword(password).then(() => setPasswordValue('')), 'Password saved')}>
                  Save password
                </Button>
                {row.password_set && (
                  <Button color="error" disabled={!!busy}
                          onClick={() => run('password', () => setPassword(''), 'Password removed')}>
                    Remove password
                  </Button>
                )}
              </Box>
              <Box>
                <Button variant="outlined" disabled={!row.password_set || !!busy}
                        onClick={() => run('test', sendTestMail, `Test email sent to ${row.from_address}. Check your inbox.`)}>
                  {busy === 'test' ? 'Sending…' : 'Send me a test email'}
                </Button>
              </Box>
              {!row.password_set && (
                <Alert severity="info">Save your password, then send yourself a test email.</Alert>
              )}
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
