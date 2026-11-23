import {
  Form, Title, SaveButton, ReferenceArrayInput, AutocompleteArrayInput, SelectInput,
  useGetList, useCreate, useUpdate, useNotify, usePermissions, Loading,
} from 'react-admin';
import { useNavigate } from 'react-router';
import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { CountryInput } from './shared';
import { parentalWarnings } from './vocab';
import { UserMailCard } from './userMail';

const FIELDS = ['country_code', 'language_codes', 'parental_warning'];

/*
 * My settings: one page, the form itself, with the user's saved values or,
 * before anything is saved, the defaults the app already uses (United
 * States, English, explicit content not set). Saving creates the user's row
 * the first time and updates it after. The values travel with the
 * permissions from api.me, which are cached, so a save fetches them again
 * and the new defaults apply at once.
 */
const UserPreferencePage = () => {
  const { data, isPending, refetch: reload } = useGetList('user_preference', { pagination: { page: 1, perPage: 1 } });
  const { permissions, refetch } = usePermissions();
  const [create, { isPending: creating }] = useCreate();
  const [update, { isPending: updating }] = useUpdate();
  const notify = useNotify();
  const navigate = useNavigate();

  if (isPending) return <Loading />;
  const row = data?.[0];
  const values = {
    country_code: row?.country_code ?? permissions?.country ?? 'US',
    language_codes: row?.language_codes?.length ? row.language_codes : (permissions?.languages ?? ['en']),
    parental_warning: row?.parental_warning ?? null,
  };

  const done = {
    onSuccess: () => { refetch(); reload(); notify('Settings saved'); },
    onError: (err) => notify(err?.message || 'Could not save the settings', { type: 'error' }),
  };
  const save = (form) => {
    const changes = Object.fromEntries(FIELDS.map((k) => [k, form[k] ?? null]));
    if (row) update('user_preference', { id: row.id, data: changes, previousData: row }, done);
    else create('user_preference', { data: changes }, done);
  };

  return (
    <>
    <Card sx={{ mt: 2 }}>
      <Title title="My settings" />
      <CardContent>
        <Form key={JSON.stringify(values)} defaultValues={values} onSubmit={save}>
          <Stack spacing={1} sx={{ maxWidth: 600 }}>
            <Typography variant="body2" color="text.secondary">
              Your own defaults. They apply only to you, whatever your role.
            </Typography>
            <CountryInput source="country_code" label="Default country"
                          helperText="Listed first in every country picker, filled in on new recordings, and the calling code a new phone number starts on."
                          sx={{ width: '100%' }} />
            <ReferenceArrayInput source="language_codes" reference="language" perPage={300}
                                 sort={{ field: 'name', order: 'ASC' }}>
              <AutocompleteArrayInput optionText="name" label="Languages listed first"
                                      helperText="Listed first in every language picker, in the order chosen here."
                                      sx={{ width: '100%' }} />
            </ReferenceArrayInput>
            <SelectInput source="parental_warning" label="New recordings start as"
                         emptyText="Not set" choices={parentalWarnings}
                         helperText="The explicit content a new recording starts on. Each recording can still be changed."
                         sx={{ width: '100%' }} />
            <Stack direction="row" spacing={1}>
              <SaveButton disabled={creating || updating} />
              <Button onClick={() => navigate(-1)}>Cancel</Button>
            </Stack>
          </Stack>
        </Form>
      </CardContent>
    </Card>
    <UserMailCard />
    </>
  );
};

export default {
  list: UserPreferencePage,
};
