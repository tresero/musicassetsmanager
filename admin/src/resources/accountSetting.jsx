import {
  Form, Title, SaveButton, required, useGetList, useUpdate, useNotify, usePermissions, Loading,
} from 'react-admin';
import { useNavigate } from 'react-router';
import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { CurrencyInput } from './shared';
import { useCan } from '../permissions';

/*
 * The account's own settings: one page, the form itself, for the one row of
 * the signed-in account. Changing the currency needs money.edit, and the
 * database refuses it once statements or transactions exist. The currency
 * reaches the rest of the app through api.me, which React Admin caches; a
 * save reads it again so money forms use the new one.
 */
const AccountSettingPage = () => {
  const canEdit = useCan('money.edit');
  const { data, isPending, refetch: reload } = useGetList('account_setting', { pagination: { page: 1, perPage: 1 } });
  const { refetch } = usePermissions();
  const [update, { isPending: saving }] = useUpdate();
  const notify = useNotify();
  const navigate = useNavigate();

  if (isPending) return <Loading />;
  const row = data?.[0];
  if (!row) return null;

  const save = ({ currency_code }) =>
    update('account_setting', { id: row.id, data: { currency_code }, previousData: row }, {
      mutationMode: 'pessimistic',
      onSuccess: () => { refetch(); reload(); notify('Currency saved'); },
      onError: (err) => notify(err?.message || 'Could not change the currency', { type: 'error' }),
    });

  return (
    <Card sx={{ mt: 2 }}>
      <Title title="Currency" />
      <CardContent>
        {canEdit ? (
          <Form key={row.currency_code} defaultValues={{ currency_code: row.currency_code }} onSubmit={save}>
            <Stack spacing={1} sx={{ maxWidth: 600 }}>
              <Typography variant="body2" color="text.secondary">
                Set this before importing statements or entering transactions. Once
                either exists the currency can no longer change, since their amounts
                are recorded in it.
              </Typography>
              <CurrencyInput source="currency_code" label="Account currency" validate={required()}
                             sx={{ width: '100%' }}
                             helperText="The currency the account reports in. A statement or transaction in another currency records its amount in this one too." />
              <Stack direction="row" spacing={1}>
                <SaveButton disabled={saving} />
                <Button onClick={() => navigate(-1)}>Cancel</Button>
              </Stack>
            </Stack>
          </Form>
        ) : (
          <Typography variant="body2">
            The account reports in {row.currency_code}.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default {
  list: AccountSettingPage,
};
