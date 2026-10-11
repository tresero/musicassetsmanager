import {
  List, Datagrid, TextField, DateField, ReferenceField, FunctionField,
  Create, SimpleForm, TextInput, ReferenceInput, SelectInput, DeleteButton,
  TopToolbar, CreateButton, Button, required, email,
  useRecordContext, useUpdate, useNotify,
} from 'react-admin';
import SendIcon from '@mui/icons-material/Send';

// Invites to the account. Saving one emails a link; the person picks a
// password there and joins with the role chosen here. The database keeps one
// open invite per email and refuses anyone without users.manage.

const ResendButton = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const [update, { isPending }] = useUpdate();
  if (!record || record.status === 'Accepted') return null;
  const resend = (e) => {
    e.stopPropagation();
    update('account_invite',
      { id: record.id, data: { resend: true }, previousData: record },
      {
        mutationMode: 'pessimistic',
        onSuccess: () => notify(`New link sent to ${record.email}`, { type: 'info' }),
        onError: (err) => notify(err.message, { type: 'error' }),
      });
  };
  return <Button label="Resend" onClick={resend} disabled={isPending}><SendIcon /></Button>;
};

const CancelButton = () => {
  const record = useRecordContext();
  if (!record || record.status === 'Accepted') return null;
  return (
    <DeleteButton mutationMode="pessimistic" label="Cancel" redirect={false}
                  confirmTitle={`Cancel the invite to ${record.email}?`}
                  confirmContent="The emailed link will stop working." />
  );
};

const InviteListActions = () => (
  <TopToolbar><CreateButton label="Invite" /></TopToolbar>
);

const AccountInviteList = () => (
  <List sort={{ field: 'created_at', order: 'DESC' }} perPage={100} exporter={false}
        title="Invites" actions={<InviteListActions />}>
    <Datagrid rowClick={false} bulkActionButtons={false}>
      <TextField source="email" />
      <ReferenceField source="role_id" reference="account_role" label="Role"
                      link={false} />
      <TextField source="status" sortable={false} />
      <DateField source="sent_at" label="Sent" showTime />
      <FunctionField label="Link expires" sortBy="expires_at"
                     render={(r) => (r.status === 'Accepted'
                       ? '' : new Date(r.expires_at).toLocaleString())} />
      <ResendButton />
      <CancelButton />
    </Datagrid>
  </List>
);

const roleText = (r) => `${r.name}: ${r.description}`;

const AccountInviteCreate = () => {
  const notify = useNotify();
  return (
    <Create title="Invite someone" redirect="list"
            mutationOptions={{
              onSuccess: (data) => notify(`Invite sent to ${data.email}`, { type: 'info' }),
            }}>
      <SimpleForm>
        <TextInput source="email" type="email" validate={[required(), email()]}
                   helperText="Where the invite link is sent. They sign in with this address."
                   sx={{ width: { xs: '100%', md: 640 } }} />
        <ReferenceInput source="role_id" reference="account_role">
          <SelectInput optionText={roleText} label="Role" validate={required()}
                       helperText="What they may do in the account. You can change it later on the Users page."
                       sx={{ width: { xs: '100%', md: 640 } }} />
        </ReferenceInput>
      </SimpleForm>
    </Create>
  );
};

export default {
  list: AccountInviteList,
  create: AccountInviteCreate,
  recordRepresentation: 'email',
};
