import { useEffect, useState } from 'react';
import {
  AuthLayout, Form, TextInput, PasswordInput, Button,
  required, minLength, email, useNotify,
} from 'react-admin';
import { CardContent, Typography, Alert, Button as SubmitButton } from '@mui/material';

// The page an invite email links to, shown without signing in. The link's
// code is checked first with api.check_invite, so a used, expired or replaced
// link says so before anyone types a password. An open invite is accepted
// with api.accept_invite, which creates the user and returns a sign-in token.
// Anything else offers to email a new link with api.request_invite_link,
// which answers the same whether or not an invite exists.

const token = () =>
  new URLSearchParams(window.location.hash.split('?')[1] || '').get('token');

const matches = (value, all) =>
  value === all.pass ? undefined : 'The passwords do not match';

const rpc = async (name, args) => {
  const res = await fetch(`/api/rpc/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || 'Something went wrong. Try again.');
  return body;
};

const Submit = ({ busy, children }) => (
  <SubmitButton type="submit" variant="contained" disabled={busy} fullWidth sx={{ mt: 1 }}>
    {children}
  </SubmitButton>
);

const JoinForm = ({ code, invite }) => {
  const notify = useNotify();
  const [busy, setBusy] = useState(false);
  const accept = async ({ pass }) => {
    setBusy(true);
    try {
      const body = await rpc('accept_invite', { token: code, pass });
      if (!body.token) throw new Error('Could not accept the invite. Try again.');
      localStorage.setItem('token', body.token);
      // A full load so the new user's role is read fresh.
      window.location.replace(window.location.pathname);
    } catch (e) {
      notify(e.message, { type: 'error' });
      setBusy(false);
    }
  };
  return (
    <Form onSubmit={accept} mode="onChange">
      <Typography variant="body2" sx={{ mb: 2 }}>
        Join <strong>{invite.account}</strong> as {invite.role}. Choose a
        password; you will sign in as <strong>{invite.email}</strong>.
      </Typography>
      <PasswordInput source="pass" label="Password" fullWidth autoFocus
                     autoComplete="new-password"
                     validate={[required(), minLength(10, 'Use at least 10 characters')]}
                     helperText="At least 10 characters." />
      <PasswordInput source="confirm" label="Password again" fullWidth
                     autoComplete="new-password"
                     validate={[required(), matches]}
                     helperText="Type it again to catch typos." />
      <Submit busy={busy}>Join</Submit>
    </Form>
  );
};

const NewLinkForm = ({ reason }) => {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const notify = useNotify();
  const request = async (values) => {
    setBusy(true);
    try {
      await rpc('request_invite_link', { email: values.email });
      setSent(true);
    } catch (e) {
      notify(e.message, { type: 'error' });
    } finally {
      setBusy(false);
    }
  };
  if (sent) {
    return (
      <Alert severity="success">
        If there is an open invite for that address, a new link is on its way.
        Use the newest email; earlier links stop working. If nothing arrives,
        ask the person who invited you.
      </Alert>
    );
  }
  return (
    <Form onSubmit={request}>
      <Alert severity="warning" sx={{ mb: 2 }}>{reason}</Alert>
      <TextInput source="email" label="Your email" type="email" fullWidth autoFocus
                 validate={[required(), email()]}
                 helperText="The address the invite was sent to." />
      <Submit busy={busy}>Send me a new link</Submit>
    </Form>
  );
};

const reasons = {
  missing: 'This link is missing its invite code.',
  expired: 'This invite link has expired.',
  invalid: 'This invite link no longer works. A newer link may have been sent, or the invite was cancelled.',
};

export default function AcceptInvite() {
  const code = token();
  const [invite, setInvite] = useState(code ? null : { status: 'missing' });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!code) return;
    rpc('check_invite', { token: code }).then(setInvite, (e) => setError(e.message));
  }, [code]);

  let content;
  if (error) {
    content = <Alert severity="error">{error}</Alert>;
  } else if (!invite) {
    content = <Typography variant="body2">Checking your invite…</Typography>;
  } else if (invite.status === 'open') {
    content = <JoinForm code={code} invite={invite} />;
  } else if (invite.status === 'accepted') {
    content = (
      <>
        <Alert severity="info" sx={{ mb: 2 }}>
          This invite was already accepted. Sign in with your email and password.
        </Alert>
        <Button to="/login" label="Sign in" variant="contained" fullWidth />
      </>
    );
  } else {
    content = <NewLinkForm reason={reasons[invite.status] || reasons.invalid} />;
  }

  return (
    <AuthLayout>
      <CardContent sx={{ maxWidth: 420 }}>
        <Typography variant="h6" gutterBottom>Accept your invite</Typography>
        {content}
      </CardContent>
    </AuthLayout>
  );
}
