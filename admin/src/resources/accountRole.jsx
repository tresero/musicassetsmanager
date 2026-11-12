import {
  List, Datagrid, TextField, ReferenceArrayField, SingleFieldList, FunctionField,
  Create, Edit, SimpleForm, TextInput, ReferenceArrayInput, CheckboxGroupInput,
  Toolbar, SaveButton, DeleteButton, TopToolbar, CreateButton, required,
  useRecordContext, useChoicesContext, ChoicesContextProvider,
  useNotify, useRedirect,
} from 'react-admin';
import { Chip } from '@mui/material';

// The roles an Owner gives their users, the same for every account, for the
// site admin. The database refuses anyone else, keeps the Owner role's name
// and its users.manage permission, and refuses to delete a role any user or
// open invite holds.

const OWNER = 'Owner';
const isOwner = (record) => record?.name === OWNER;

// A permission's description completes "Your role does not allow ...", so it
// starts lower case; as a label it starts with a capital.
const permissionText = (p) => (p?.description
  ? p.description.charAt(0).toUpperCase() + p.description.slice(1) : '');

const AccountRoleListActions = () => (
  <TopToolbar><CreateButton label="New role" /></TopToolbar>
);

const AccountRoleList = () => (
  <List sort={{ field: 'id', order: 'ASC' }} perPage={100} pagination={false}
        exporter={false} title="Account roles" actions={<AccountRoleListActions />}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <TextField source="name" />
      <TextField source="description" />
      <ReferenceArrayField source="permission_ids" reference="permission"
                           label="Permissions" sortable={false}>
        <SingleFieldList linkType={false}>
          <FunctionField render={(p) => <Chip label={permissionText(p)} size="small" sx={{ m: 0.25 }} />} />
        </SingleFieldList>
      </ReferenceArrayField>
    </Datagrid>
  </List>
);

// On the Owner role, the users.manage box is checked and cannot be cleared.
const LockOwnerPermissions = ({ children }) => {
  const record = useRecordContext();
  const context = useChoicesContext();
  if (!isOwner(record)) return children;
  const lock = (list) => list?.map((c) => (c.code === 'users.manage' ? { ...c, disabled: true } : c));
  const value = {
    ...context,
    allChoices: lock(context.allChoices),
    availableChoices: lock(context.availableChoices),
  };
  return <ChoicesContextProvider value={value}>{children}</ChoicesContextProvider>;
};

const RoleInputs = () => {
  const record = useRecordContext();
  const owner = isOwner(record);
  return (<>
    <TextInput source="name" validate={required()} disabled={owner}
               helperText={owner
                 ? 'The Owner role keeps its name: every new account gets its first user with it.'
                 : 'Shown in the role picker on the Users and Invites pages. Must differ from every other role, in any case.'}
               sx={{ width: { xs: '100%', md: 640 } }} />
    <TextInput source="description" validate={required()} multiline
               helperText="Shown next to the name when an Owner picks a role, so say what the role can and cannot do."
               sx={{ width: { xs: '100%', md: 640 } }} />
    <ReferenceArrayInput source="permission_ids" reference="permission"
                         sort={{ field: 'id', order: 'ASC' }} perPage={100}>
      <LockOwnerPermissions>
        <CheckboxGroupInput optionText={permissionText} label="Permissions" row={false}
                            helperText={owner
                              ? 'The Owner role always keeps managing users, so every account has someone who can.'
                              : 'Everyone can read the whole account. Each box lets the role do one more thing.'} />
      </LockOwnerPermissions>
    </ReferenceArrayInput>
  </>);
};

// Only these are written; the database fills in the rest.
const strip = ({ name, description, permission_ids }) =>
  ({ name, description, permission_ids: permission_ids ?? [] });

// Owner is never deleted. Any other role is refused while someone holds it,
// with the counts in the error.
const AccountRoleToolbar = () => {
  const record = useRecordContext();
  return (
    <Toolbar sx={{ justifyContent: 'space-between' }}>
      <SaveButton />
      {!isOwner(record) && (
        <DeleteButton mutationMode="pessimistic"
                      confirmTitle={`Delete the ${record?.name} role?`}
                      confirmContent="It can be deleted only when no user or open invite, in any account, has it." />
      )}
    </Toolbar>
  );
};

// An onSuccess replaces the form's own redirect, so these redirect themselves.
const AccountRoleEdit = () => {
  const notify = useNotify();
  const redirect = useRedirect();
  return (
    <Edit title="Edit account role" mutationMode="pessimistic" transform={strip}
          mutationOptions={{
            onSuccess: (data) => {
              notify(`Saved ${data.name}`, { type: 'info' });
              redirect('list', 'account_role');
            },
          }}>
      <SimpleForm toolbar={<AccountRoleToolbar />}>
        <RoleInputs />
      </SimpleForm>
    </Edit>
  );
};

const AccountRoleCreate = () => {
  const notify = useNotify();
  const redirect = useRedirect();
  return (
    <Create title="New account role" transform={strip}
            mutationOptions={{
              onSuccess: (data) => {
                notify(`Created ${data.name}`, { type: 'info' });
                redirect('list', 'account_role');
              },
            }}>
      <SimpleForm defaultValues={{ permission_ids: [] }}>
        <RoleInputs />
      </SimpleForm>
    </Create>
  );
};

export default {
  list: AccountRoleList,
  create: AccountRoleCreate,
  edit: AccountRoleEdit,
  recordRepresentation: 'name',
};
