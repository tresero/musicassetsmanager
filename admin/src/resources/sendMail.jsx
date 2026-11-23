import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetList, useNotify } from 'react-admin';
import { useSourceContext } from 'ra-core';
import { useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert, Autocomplete, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import { sendMail } from './uploadClient';
import { useCan } from '../permissions';
import { attachable, defaultSubject, linkLines, mailbox, shownAddress, typedAddresses } from '../mail';

/*
 * Emailing documents from a record (#70). The email goes out through the
 * account's sending service (Settings, Email sending), from its address with
 * the user as Reply-To; with none set up, sending is refused. The upload
 * service sends it and attaches the files from the account's storage. A document kept at a web
 * address is sent as a link. Every send is logged and listed under Sent by
 * email on the record, on each person and company it went to, and on each
 * document it attached.
 */

const recipientsFor = async (recordType, recordId) => {
  const q = new URLSearchParams({ p_record_type: recordType, p_record_id: recordId });
  const res = await fetch(`/api/rpc/mail_recipients?${q}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
  return res.ok ? res.json() : [];
};

const label = (o) => (o.name ? `${o.name} <${o.email}>` : o.email);

// To or Cc: suggested people and companies, or any address typed or pasted.
const AddressInput = ({ label: fieldLabel, value, onChange, options, helperText }) => {
  const [input, setInput] = useState('');
  const add = (list) => {
    const typed = list.flatMap((v) => (typeof v === 'string' ? typedAddresses(v).map((email) => ({ email })) : [v]));
    const seen = new Set();
    onChange(typed.filter((v) => !seen.has(v.email.toLowerCase()) && seen.add(v.email.toLowerCase())));
  };
  return (
    <Autocomplete
      multiple freeSolo
      options={options}
      value={value}
      inputValue={input}
      onInputChange={(e, v) => setInput(v)}
      onChange={(e, v) => add(v)}
      onBlur={() => { if (input.trim()) { add([...value, input]); setInput(''); } }}
      filterSelectedOptions
      isOptionEqualToValue={(o, v) => o.email.toLowerCase() === v.email.toLowerCase()}
      getOptionLabel={(o) => (typeof o === 'string' ? o : label(o))}
      renderOption={({ key, ...props }, o) => (
        <li key={key} {...props}>
          <Box>
            <Typography variant="body2">{o.name} &lt;{o.email}&gt;</Typography>
            {o.why && o.why !== o.name && (
              <Typography variant="caption" color="text.secondary">{o.why}</Typography>
            )}
          </Box>
        </li>
      )}
      renderValue={(vals, getItemProps) => vals.map((o, index) => {
        const { key, ...props } = getItemProps({ index });
        return <Chip key={key} size="small" label={label(o)} {...props} />;
      })}
      renderInput={(params) => (
        <TextField {...params} label={fieldLabel} helperText={helperText} />
      )}
    />
  );
};

// Without a sending service nothing is sent: email goes out only through one
// that can send in bulk.
const NotSetUp = ({ onClose }) => {
  const canSettings = useCan('settings.edit');
  return (
    <>
      <DialogContent>
        <Alert severity="warning">
          Email is not set up for this account, so it cannot be sent.{' '}
          {canSettings
            ? 'Set up a sending service, such as Amazon SES, under Settings, Email sending.'
            : 'Ask the account owner to set up a sending service under Settings, Email sending.'}
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {canSettings && (
          <Button component={Link} to="/account_mail" variant="contained">Open Email sending</Button>
        )}
      </DialogActions>
    </>
  );
};

export const SendMailDialog = ({ open, onClose, recordType, recordId, recordTitle, documents, initialIds }) => {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { data: mailRows, isPending: mailPending } =
    useGetList('account_mail', { pagination: { page: 1, perPage: 1 } }, { enabled: open });
  const sender = mailRows?.[0];
  const ready = !!sender?.password_set;

  const [options, setOptions] = useState([]);
  const [to, setTo] = useState([]);
  const [cc, setCc] = useState([]);
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [picked, setPicked] = useState(new Set());
  const [sending, setSending] = useState(false);

  const sendable = documents.filter((d) => d?.id != null);

  useEffect(() => {
    if (!open) return;
    const start = sendable.filter((d) => initialIds.includes(d.id));
    setPicked(new Set(start.map((d) => d.id)));
    setSubject(defaultSubject(recordTitle, start));
    setTo([]); setCc([]); setText('');
    recipientsFor(recordType, recordId).then(setOptions);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id) => setPicked((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const chosen = sendable.filter((d) => picked.has(d.id));
  const tooBig = chosen.filter(attachable).reduce((n, d) => n + (d.byte_size || 0), 0) > 20 * 1024 * 1024;

  const send = async () => {
    setSending(true);
    try {
      const links = linkLines(chosen);
      await sendMail({
        to: to.map((o) => mailbox(o.name, o.email)),
        cc: cc.map((o) => mailbox(o.name, o.email)),
        subject,
        text: [text.trim(), links].filter(Boolean).join('\n\n'),
        record_type: recordType,
        record_id: recordId,
        document_ids: chosen.filter(attachable).map((d) => d.id),
      });
      notify(`Sent to ${to.length + cc.length === 1 ? label([...to, ...cc][0]) : `${to.length + cc.length} people`}`, { type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['mail_sent'] });
      onClose();
    } catch (e) {
      notify(e.message, { type: 'error', autoHideDuration: 10000 });
      queryClient.invalidateQueries({ queryKey: ['mail_sent'] });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={sending ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>{!mailPending && !ready ? 'Email is not set up' : 'Email documents'}</DialogTitle>
      {!mailPending && !ready ? <NotSetUp onClose={onClose} /> : (
        <>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                From {sender?.from_name ? `${sender.from_name} <${sender.from_address}>` : sender?.from_address}. Replies come to you.
              </Typography>
              <AddressInput label="To" value={to} onChange={setTo} options={options}
                            helperText={options.length
                              ? 'Pick the people and companies on this record, or type any address'
                              : 'Type an address. People and companies with an email on this record are suggested here.'} />
              <AddressInput label="Cc" value={cc} onChange={setCc} options={options} />
              <TextField label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
              <TextField label="Message" value={text} onChange={(e) => setText(e.target.value)}
                         multiline minRows={4} />
              <Box>
                <Typography variant="subtitle2">Attach</Typography>
                {sendable.length === 0 && (
                  <Typography variant="body2" color="text.secondary">Save the record first, then its documents can be sent.</Typography>
                )}
                {sendable.map((d) => (
                  <FormControlLabel key={d.id} sx={{ display: 'flex' }}
                    control={<Checkbox checked={picked.has(d.id)} onChange={() => toggle(d.id)} />}
                    label={attachable(d) ? d.title : `${d.title} (kept at a web address, sent as a link)`} />
                ))}
                {tooBig && (
                  <Alert severity="warning">Over 20 MB in all. Most mail providers refuse that; send fewer at once.</Alert>
                )}
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={sending}>Cancel</Button>
            <Button variant="contained" startIcon={<EmailIcon />} onClick={send}
                    disabled={sending || to.length === 0 || !subject.trim() || tooBig}>
              {sending ? 'Sending…' : 'Send'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

export const EmailDocumentButton = ({ recordType, recordId, recordTitle, documents, documentId, sx }) => {
  const [open, setOpen] = useState(false);
  if (recordId == null || documentId == null) return null;
  return (
    <>
      <Button variant="outlined" size="small" startIcon={<EmailIcon />} onClick={() => setOpen(true)}
              sx={sx ?? { alignSelf: 'flex-start', mt: 1, mb: 0.5 }}>
        Email
      </Button>
      <SendMailDialog open={open} onClose={() => setOpen(false)}
                      recordType={recordType} recordId={recordId} recordTitle={recordTitle}
                      documents={documents} initialIds={[documentId]} />
    </>
  );
};

// The Email button on one row of a record's Documents tab.
export const RowEmailButton = ({ recordType, recordId, recordTitle }) => {
  const sourceCtx = useSourceContext();
  const documentId = useWatch({ name: sourceCtx.getSource('id') });
  const documents = useWatch({ name: 'documents' }) || [];
  return (
    <EmailDocumentButton recordType={recordType} recordId={recordId} recordTitle={recordTitle}
                         documents={documents} documentId={documentId} sx={{}} />
  );
};

const when = (t) => new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

// Email sent from this record, to this person or company, or attaching this document.
export const SentMail = ({ recordType, recordId }) => {
  const { data = [] } = useGetList('mail_sent', {
    filter: { 'about@cs': `{${recordType}:${recordId}}` },
    sort: { field: 'sent_at', order: 'DESC' },
    pagination: { page: 1, perPage: 50 },
  }, { enabled: recordId != null });
  if (data.length === 0) return null;
  return (
    <Box sx={{ width: '100%', mt: 3 }}>
      <Typography variant="h6" gutterBottom>Sent by email</Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Sent</TableCell>
              <TableCell>From</TableCell>
              <TableCell>To</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Attached</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((m) => (
              <TableRow key={m.id}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{when(m.sent_at)}</TableCell>
                <TableCell>{shownAddress(m.from_address)}</TableCell>
                <TableCell>{[...m.to_addresses, ...m.cc_addresses].map(shownAddress).join(', ')}</TableCell>
                <TableCell>
                  {m.subject}
                  {m.error && <Typography variant="body2" color="error">Not sent: {m.error}</Typography>}
                </TableCell>
                <TableCell>{(m.attachments || []).map((a) => a.name).join(', ') || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
};
