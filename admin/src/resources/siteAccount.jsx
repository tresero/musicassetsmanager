import {
  List, Datagrid, TextField, DateField, NumberField, FunctionField,
  Create, SimpleForm, TextInput, DeleteButton,
  TopToolbar, CreateButton, Button, required, email,
  useRecordContext, useUpdate, useNotify,
} from 'react-admin';
import SendIcon from '@mui/icons-material/Send';

// Every account, for the site admin. Creating one emails its first Owner an
// invite; the Owner then sets up storage, pitch settings and staff. The
// database refuses anyone but the site admin, and refuses to resend or delete
// once someone has signed in to the account.

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

const RemoveButton = () => {
  const record = useRecordContext();
  if (!record || record.user_count > 0) return null;
  return (
    <DeleteButton mutationMode="pessimistic" redirect={false}
                  confirmTitle={`Delete the account ${record.name}?`}
                  confirmContent="Nobody has signed in to it yet. The emailed link will stop working." />
  );
};

const SiteAccountListActions = () => (
  <TopToolbar><CreateButton label="New account" /></TopToolbar>
);

const SiteAccountList = () => (
  <List sort={{ field: 'name', order: 'ASC' }} perPage={100} exporter={false}
        title="Accounts" actions={<SiteAccountListActions />}>
    <Datagrid rowClick={false} bulkActionButtons={false}>
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

const SiteAccountCreate = () => {
  const notify = useNotify();
  return (
    <Create title="New account" redirect="list"
            mutationOptions={{
              onSuccess: (data) => notify(`Account created; invite sent to ${data.owner_email}`,
                                          { type: 'info' }),
            }}>
      <SimpleForm>
        <TextInput source="name" validate={required()}
                   helperText="The label or publisher as its users will see it. Must differ from every other account."
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
  recordRepresentation: 'name',
};
