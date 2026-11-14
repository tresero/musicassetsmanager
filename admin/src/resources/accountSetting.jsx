import {
  List, Datagrid, TextField, Edit, SimpleForm, Toolbar, SaveButton, required,
  useRedirect, usePermissions,
} from 'react-admin';
import { Typography } from '@mui/material';
import { CurrencyInput } from './shared';
import { useCan } from '../permissions';

// The account's own settings: one row, the signed-in account. Changing the
// currency needs money.edit, and the database refuses it once statements are
// imported.
const AccountSettingList = () => {
  const canEdit = useCan('money.edit');
  return (
    <List pagination={false} exporter={false} title="Currency">
      <Datagrid rowClick={canEdit ? 'edit' : false} bulkActionButtons={false}>
        <TextField source="currency_code" label="Account currency" />
      </Datagrid>
    </List>
  );
};

// The currency reaches the rest of the app through api.me, which React
// Admin caches; a save reads it again so statement forms use the new one.
const AccountSettingEdit = () => {
  const { refetch } = usePermissions();
  const redirect = useRedirect();
  const onSuccess = () => {
    refetch();
    redirect('list', 'account_setting');
  };
  return (
  <Edit mutationMode="pessimistic" title="Currency" mutationOptions={{ onSuccess }}
        transform={({ currency_code }) => ({ currency_code })}>
    <SimpleForm toolbar={<Toolbar><SaveButton /></Toolbar>}>
      <Typography variant="body2" color="text.secondary">
        Set this before importing statements. Once a statement is imported the
        currency can no longer change, since its payout is recorded in it.
      </Typography>
      <CurrencyInput source="currency_code" label="Account currency" validate={required()}
                     sx={{ minWidth: 360 }}
                     helperText="The currency the account reports in. A statement in another currency records its payout in this one, and its lines are converted at that rate." />
    </SimpleForm>
  </Edit>
  );
};

export default {
  list: AccountSettingList,
  edit: AccountSettingEdit,
};
