import { useState } from 'react';
import {
  Form, SaveButton, TextInput, NumberInput, SelectInput, Title, required, email,
  useGetList, useCreate, useUpdate, useNotify, Loading,
} from 'react-admin';
import { useFormContext } from 'react-hook-form';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { sendTestMail } from './uploadClient';

// Sending services, reached over SMTP. Each one's own SMTP credentials go in
// Username and Password: SES's are made under SMTP settings in the SES
// console, not the AWS access key. Mailbox providers (Google Workspace,
// Microsoft 365) are refused by the database: they cannot send in bulk.
const PRESETS = [
  { label: 'Amazon SES', smtp_host: 'email-smtp.us-east-1.amazonaws.com', smtp_port: 587, smtp_security: 'starttls',
    hint: 'Change us-east-1 to the region your domain is verified in. Create the username and password under SMTP settings in the SES console. An IAM user\'s access key ID also works as the username, with an SMTP password made from its secret key (see "converting existing AWS credentials" in the SES guide); the secret key itself is not the password.' },
  { label: 'Postmark', smtp_host: 'smtp.postmarkapp.com', smtp_port: 587, smtp_security: 'starttls',
    hint: 'Use a server API token as both username and password, from a Broadcasts stream for bulk.' },
  { label: 'Mailgun', smtp_host: 'smtp.mailgun.org', smtp_port: 587, smtp_security: 'starttls',
    hint: 'For an EU account the server is smtp.eu.mailgun.org.' },
  { label: 'SendGrid', smtp_host: 'smtp.sendgrid.net', smtp_port: 587, smtp_security: 'starttls', smtp_username: 'apikey',
    hint: 'The username is the word apikey; the password is your API key.' },
  { label: 'Brevo', smtp_host: 'smtp-relay.brevo.com', smtp_port: 587, smtp_security: 'starttls',
    hint: 'Use the SMTP login and key from SMTP & API in Brevo.' },
  { label: 'SMTP2GO', smtp_host: 'mail.smtp2go.com', smtp_port: 587, smtp_security: 'starttls',
    hint: 'Use an SMTP user created in SMTP2GO.' },
];

const securities = [
  { id: 'starttls', name: 'STARTTLS (usually port 587)' },
  { id: 'tls', name: 'SSL/TLS (usually port 465)' },
];

const FIELDS = ['from_name', 'from_address', 'smtp_host', 'smtp_port', 'smtp_security', 'smtp_username'];

const Presets = ({ onHint }) => {
  const { setValue } = useFormContext();
  const pick = (p) => {
    ['smtp_host', 'smtp_port', 'smtp_security'].forEach((f) => setValue(f, p[f], { shouldDirty: true }));
    if (p.smtp_username) setValue('smtp_username', p.smtp_username, { shouldDirty: true });
    onHint(p.hint);
  };
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
      <Typography variant="body2" color="text.secondary">Fill in for:</Typography>
      {PRESETS.map((p) => <Button key={p.label} size="small" onClick={() => pick(p)}>{p.label}</Button>)}
    </Box>
  );
};

const setPassword = async (password) => {
  const res = await fetch('/api/rpc/set_account_mail_password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Could not save the password');
};

/*
 * Email sending (#70): the account's sending service, Amazon SES or one like
 * it, which every email from the app goes out through. Without one, nothing
 * is sent. Email comes from the address here, with whoever sent it as
 * Reply-To. The password is saved on its own and never shown again; the
 * upload service reads it to send.
 */
const AccountMailPage = () => {
  const { data, isPending, refetch } = useGetList('account_mail', { pagination: { page: 1, perPage: 1 } });
  const [create, { isPending: creating }] = useCreate();
  const [update, { isPending: updating }] = useUpdate();
  const notify = useNotify();
  const [password, setPasswordValue] = useState('');
  const [busy, setBusy] = useState(null);
  const [hint, setHint] = useState(null);
  const [passwordMissing, setPasswordMissing] = useState(false);

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

  // The settings are saved first, then the password on its own, since the
  // password can only be set once the settings exist.
  const save = async (form) => {
    if (!row?.password_set && !password) { setPasswordMissing(true); return; }
    const changes = Object.fromEntries(FIELDS.map((k) => [k, form[k] ?? null]));
    try {
      if (row) await update('account_mail', { id: row.id, data: changes, previousData: row }, { returnPromise: true });
      else await create('account_mail', { data: changes }, { returnPromise: true });
      if (password) { await setPassword(password); setPasswordValue(''); }
      notify('Email sending saved');
    } catch (err) {
      notify(err?.message || 'Could not save', { type: 'error' });
    } finally {
      refetch();
    }
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
      <Title title="Email sending" />
      <CardContent>
        <Stack spacing={1} sx={{ maxWidth: 600 }}>
          <Typography variant="body2" color="text.secondary">
            Email from the app, such as documents to writers or a playlist to a list of supervisors,
            goes out through a sending service built for bulk mail: Amazon SES or one like it. Until one
            is set up here, nothing can be sent. Mailbox providers such as Google Workspace or
            Microsoft 365 cannot send in bulk and are not accepted.
          </Typography>
          <Form key={JSON.stringify(values)} defaultValues={values} onSubmit={save} resource="account_mail">
            <Stack spacing={1}>
              <TextInput source="from_address" label="Send from" validate={[required(), email()]}
                         helperText="An address at your own domain, verified with the service. Replies go to whoever sent the email." />
              <TextInput source="from_name" label="Name"
                         helperText="Shown as the sender, for example your label's name" />
              <Presets onHint={setHint} />
              {hint && <Alert severity="info">{hint}</Alert>}
              <TextInput source="smtp_host" label="SMTP server" validate={required()}
                         helperText="The service's SMTP server, for example email-smtp.us-east-1.amazonaws.com" />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <SelectInput source="smtp_security" label="Encryption" choices={securities}
                             validate={required()} helperText={false} sx={{ minWidth: 260 }} />
                <NumberInput source="smtp_port" label="Port" validate={required()} helperText={false}
                             sx={{ width: 120 }} />
              </Box>
              <TextInput source="smtp_username" label="SMTP username" validate={required()}
                         helperText="From the service's SMTP settings" />
              <TextField type="password" label="SMTP password" value={password} autoComplete="new-password"
                         onChange={(e) => { setPasswordValue(e.target.value); setPasswordMissing(false); }}
                         error={passwordMissing} required={!row?.password_set} slotProps={{ htmlInput: { required: false } }}
                         helperText={passwordMissing ? 'Enter the SMTP password'
                           : row?.password_set ? 'Saved. Leave blank to keep it, or enter a new one.'
                             : 'From the service\'s SMTP settings. It is never shown again once saved.'} />
              <Box><SaveButton label="Save" disabled={creating || updating} alwaysEnable={!!password} /></Box>
            </Stack>
          </Form>

          {row && (
            <>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', pt: 1 }}>
                <Button variant="outlined" disabled={!row.password_set || !!busy}
                        onClick={() => run('test', sendTestMail, 'Test email sent to your sign-in address. Check your inbox.')}>
                  {busy === 'test' ? 'Sending…' : 'Send me a test email'}
                </Button>
                {row.password_set && (
                  <Button color="error" disabled={!!busy}
                          onClick={() => run('password', () => setPassword(''), 'Password removed')}>
                    Remove password
                  </Button>
                )}
              </Box>
              {!row.password_set && (
                <Alert severity="info">No password is saved, so nothing can be sent. Enter it above and save.</Alert>
              )}
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default {
  list: AccountMailPage,
};
