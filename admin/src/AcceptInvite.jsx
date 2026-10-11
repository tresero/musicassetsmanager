import { useState } from 'react';
import { Form, PasswordInput, required, minLength, useNotify } from 'react-admin';
import { Box, Card, CardContent, Typography, Alert, Button } from '@mui/material';

// The page an invite email links to, shown without signing in. The code in
// the link is checked by api.accept_invite, which creates the user and
// returns a sign-in token.

const token = () =>
  new URLSearchParams(window.location.hash.split('?')[1] || '').get('token');

const matches = (value, all) =>
  value === all.pass ? undefined : 'The passwords do not match';

export default function AcceptInvite() {
  const notify = useNotify();
  const [busy, setBusy] = useState(false);
  const code = token();

  const accept = async ({ pass }) => {
    setBusy(true);
    try {
      const res = await fetch('/api/rpc/accept_invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: code, pass }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.token) throw new Error(body.message || 'Could not accept the invite');
      localStorage.setItem('token', body.token);
      // A full load so the new user's role is read fresh.
      window.location.replace(window.location.pathname);
    } catch (e) {
      notify(e.message, { type: 'error' });
      setBusy(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
               justifyContent: 'center', bgcolor: 'grey.100', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 440 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Accept your invite</Typography>
          {code ? (
            <Form onSubmit={accept}>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Choose a password. You will sign in with the email address the
                invite was sent to.
              </Typography>
              <PasswordInput source="pass" label="Password" fullWidth
                             validate={[required(), minLength(10)]}
                             helperText="At least 10 characters." />
              <PasswordInput source="confirm" label="Password again" fullWidth
                             validate={[required(), matches]} />
              <Button type="submit" variant="contained" disabled={busy}
                      sx={{ mt: 1 }}>Join</Button>
            </Form>
          ) : (
            <Alert severity="warning">
              This link is missing its invite code. Open the link from the
              email again, or ask for a new invite.
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
