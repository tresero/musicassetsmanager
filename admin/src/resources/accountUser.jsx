import {
  List, Datagrid, TextField, DateField, ReferenceField, FunctionField,
  Edit, SimpleForm, Toolbar, SaveButton, DeleteButton,
  ReferenceInput, SelectInput, required, TopToolbar, CreateButton,
} from 'react-admin';

// The account's users. Owners change roles and remove users here and invite
// new ones through account_invite. The database keeps at least one Owner and refuses
// anyone without the users.manage permission.
const UserListActions = () => (
  <TopToolbar>
    <CreateButton resource="account_invite" label="Invite someone" />
  </TopToolbar>
);

const AccountUserList = () => (
  <List sort={{ field: 'email', order: 'ASC' }} perPage={100} exporter={false}
        title="Users" actions={<UserListActions />}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <FunctionField label="Email"
                     render={(u) => (u.is_me ? `${u.email} (you)` : u.email)} />
      <ReferenceField source="role_id" reference="account_role" label="Role"
                      link={false} />
      <DateField source="created_at" label="Added" />
    </Datagrid>
  </List>
);

const roleText = (r) => `${r.name}: ${r.description}`;

const AccountUserToolbar = () => (
  <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
    <SaveButton />
    <DeleteButton mutationMode="pessimistic" label="Remove from account"
                  confirmTitle="Remove this user from the account?"
                  confirmContent="They will no longer be able to sign in to this account." />
  </Toolbar>
);

const AccountUserEdit = () => (
  <Edit mutationMode="pessimistic" title="User">
    <SimpleForm toolbar={<AccountUserToolbar />}>
      <TextField source="email" />
      <ReferenceInput source="role_id" reference="account_role">
        <SelectInput optionText={roleText} label="Role" validate={required()}
                     helperText="What this user may do in the account. An account always keeps at least one Owner."
                     sx={{ width: { xs: '100%', md: 640 } }} />
      </ReferenceInput>
    </SimpleForm>
  </Edit>
);

export default {
  list: AccountUserList,
  edit: AccountUserEdit,
  recordRepresentation: 'email',
};
