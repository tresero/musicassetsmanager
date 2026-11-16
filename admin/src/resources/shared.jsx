import { useMemo, useState } from 'react';
import {
  List, Datagrid, DataTable, TextField, Edit, Create, SimpleForm, TextInput,
  required, AutocompleteInput, AutocompleteArrayInput, SearchInput,
  ReferenceInput, useChoicesContext, ChoicesContextProvider, DateInput, NumberInput,
  useRecordContext,
} from 'react-admin';
import { Alert, Button, Stack, TextField as MuiTextField } from '@mui/material';
import { useWatch } from 'react-hook-form';
import { useCan, useIsSiteAdmin, useDefaultCountry, useAccountCurrency, useFirstLanguages } from '../permissions';
import { QuickCreateName } from './quickCreate';

// A shared list. Only the site admin opens rows to edit and bulk deletes; the
// database refuses everyone else.
export const SharedListGrid = (props) => {
  const siteAdmin = useIsSiteAdmin();
  return <Datagrid rowClick={siteAdmin ? 'edit' : false}
                   bulkActionButtons={siteAdmin ? undefined : false} {...props} />;
};

export const NameList = () => (
  <List sort={{ field: 'name', order: 'ASC' }} perPage={100}>
    <SharedListGrid>
      <TextField source="name" />
    </SharedListGrid>
  </List>
);

const NameInputs = () => (
  <TextInput source="name" validate={required()}
             helperText="As it appears in the pickers. Must be unique." />
);

// The whole resource for a shared list: its list page plus Edit and Create
// built around its inputs. App.jsx keeps Edit and Create for the site admin.
// Call it at module level, never inside a render.
export const sharedList = ({ list = NameList, Inputs = NameInputs } = {}) => ({
  list,
  edit: () => <Edit mutationMode="pessimistic"><SimpleForm><Inputs /></SimpleForm></Edit>,
  create: () => <Create redirect="list"><SimpleForm><Inputs /></SimpleForm></Create>,
  recordRepresentation: 'name',
});

// The picker for a shared list that needs only a name, inside its
// ReferenceInput or ReferenceArrayInput. The site admin can add a missing
// entry from the picker without leaving the form; nobody else sees Create.
// Create is not offered when the typed name matches an entry in any case:
// typing rock picks Rock.
export const SharedListPicker = ({ multiple = false, onInputChange, ...props }) => {
  const { resource, allChoices } = useChoicesContext();
  const siteAdmin = useIsSiteAdmin();
  const [typed, setTyped] = useState('');
  const key = typed.trim().toLowerCase();
  const exists = !!key && !!allChoices?.some((c) => c.name?.toLowerCase() === key);
  const Input = multiple ? AutocompleteArrayInput : AutocompleteInput;
  return <Input optionText="name"
                create={siteAdmin && !exists ? <QuickCreateName resource={resource} /> : undefined}
                onInputChange={(e, value, reason) => {
                  setTyped(value || '');
                  onInputChange?.(e, value, reason);
                }}
                {...props} />;
};

// Lists the choices whose `by` field is in pin first, in pin's order, ahead of
// the rest in their usual order. Goes between a ReferenceInput and its picker;
// typed searches still go to the database.
export const PinFirst = ({ pin, by = 'id', children }) => {
  const context = useChoicesContext();
  const rank = (c) => {
    const i = pin.indexOf(c[by]);
    return i < 0 ? pin.length : i;
  };
  const order = (list) => list && [...list].sort((a, b) => rank(a) - rank(b));
  const value = {
    ...context,
    allChoices: order(context.allChoices),
    availableChoices: order(context.availableChoices),
  };
  return <ChoicesContextProvider value={value}>{children}</ChoicesContextProvider>;
};

// A country picker with the user's default country (My settings) first. With
// prefill, a new record starts on it; a saved record left blank stays blank.
export const CountryInput = ({ source, label = 'Country', helperText, prefill = false, sx }) => {
  const country = useDefaultCountry();
  return (
    <ReferenceInput source={source} reference="country" perPage={500}
                    sort={{ field: 'name', order: 'ASC' }}>
      <PinFirst pin={[country]}>
        <AutocompleteInput optionText="name" label={label} helperText={helperText}
                           defaultValue={prefill ? country : undefined} sx={sx} />
      </PinFirst>
    </ReferenceInput>
  );
};

// A language picker (ISO 639 codes from the language list), with the user's
// languages from My settings first, in their order, and the rest by name.
export const LanguageInput = ({ source = 'language_code', label = 'Language', helperText = false, sx }) => {
  const first = useFirstLanguages();
  return (
    <ReferenceInput source={source} reference="language" perPage={300}
                    sort={{ field: 'name', order: 'ASC' }}>
      <PinFirst pin={first} by="code">
        <AutocompleteInput optionText="name" label={label} helperText={helperText} sx={sx} />
      </PinFirst>
    </ReferenceInput>
  );
};

// A currency picker: ISO 4217 codes with their names, from the browser, with
// the account currency first. Not a database list, so it sorts its own
// choices rather than using PinFirst.
export const CurrencyInput = ({ source, label = 'Currency', helperText, validate, sx }) => {
  const account = useAccountCurrency();
  const choices = useMemo(() => {
    const names = new Intl.DisplayNames(['en'], { type: 'currency' });
    const codes = [...new Set([account, ...(Intl.supportedValuesOf?.('currency') ?? [])])];
    return codes.map((code) => ({ id: code, name: `${code}: ${names.of(code)}` }));
  }, [account]);
  return <AutocompleteInput source={source} label={label} choices={choices}
                            helperText={helperText} validate={validate} sx={sx} />;
};

// A list of whole records. Bulk delete shows only for roles that may delete.
export const CatalogDatagrid = ({ bulkActionButtons, ...props }) => {
  const canDelete = useCan('catalog.delete');
  return <Datagrid bulkActionButtons={canDelete ? bulkActionButtons : false} {...props} />;
};

// The same for lists whose columns the user chooses (with ListActions):
// list every useful column and name the ones that start hidden in
// hiddenColumns. A column sorts by its source, so show a name or time with
// render and sort by the value behind it.
export const CatalogDataTable = ({ bulkActionButtons, ...props }) => {
  const canDelete = useCan('catalog.delete');
  return <DataTable bulkActionButtons={canDelete ? bulkActionButtons : false} {...props} />;
};

// The search box at the top of a list. It sends q, which dataProvider turns
// into a search of the view's search value.
export const searchFilter = <SearchInput key="q" source="q" alwaysOn />;

// The registration that applies to a song, recording or release, from its
// computed copyright_status, as one line for lists and exports.
export const registrationText = (r) => {
  const c = r?.copyright_status;
  if (!c?.number) return '';
  const from = c.source === 'release' ? `, from the release ${c.source_title}`
    : c.source === 'document' ? ', from its document' : '';
  const differs = c.conflict ? ` (document says ${c.conflict})` : '';
  return `${c.number}${c.registered_on ? `, ${c.registered_on}` : ''}${from}${differs}`;
};

// A warning when the record's own number matches none of its attached
// Copyright Registration documents. It reflects the last save.
const CopyrightConflict = () => {
  const c = useRecordContext()?.copyright_status;
  if (c?.source !== 'own' || !c.conflict) return null;
  return (
    <Alert severity="warning">
      The attached Copyright Registration document says {c.conflict}, not {c.number}.
      This record's own number is the one used; correct whichever is wrong.
    </Alert>
  );
};

// The copyright registration and reversion fields songs, recordings and
// releases share. numberHelp names the registration each one holds. When the
// record has no number of its own but a registration applies through an
// attached document or a release, the number and date show that one, read
// only, as of the last save; nothing is copied onto the record. Giving the
// record its own registration opens the fields to type one, which then wins.
export const CopyrightInputs = ({ numberHelp }) => {
  const c = useRecordContext()?.copyright_status;
  const own = useWatch({ name: 'copyright_number' });
  const [ownRegistration, setOwnRegistration] = useState(false);
  const inherited = !!c?.number && c.source !== 'own' && !own && !ownRegistration;
  const from = inherited
    ? `From the ${c.source === 'release' ? 'release' : 'document'} ${c.source_title}`
    : null;
  return (
    <Stack spacing={2} sx={{ width: '100%' }}>
      <CopyrightConflict />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ width: '100%' }}>
        {inherited ? (
          <>
            <MuiTextField variant="filled" label="Registration number" value={c.number}
                          helperText={from} slotProps={{ input: { readOnly: true } }}
                          sx={{ width: { xs: '100%', md: 300 } }} />
            <MuiTextField variant="filled" label="Registration date" value={c.registered_on ?? ''}
                          helperText=" " slotProps={{ input: { readOnly: true } }}
                          sx={{ width: { xs: '100%', md: 200 } }} />
          </>
        ) : (
          <>
            <TextInput source="copyright_number" label="Registration number" helperText={numberHelp}
                       sx={{ width: { xs: '100%', md: 300 } }} />
            <DateInput source="copyright_date" label="Registration date" helperText={false}
                       sx={{ width: { xs: '100%', md: 200 } }} />
          </>
        )}
        <DateInput source="reversion_date" label="Reversion date"
                   helperText="When the rights come back"
                   sx={{ width: { xs: '100%', md: 200 } }} />
        <NumberInput source="reversion_lead" label="Lead (years)"
                     helperText="Notice before the reversion date"
                     sx={{ width: { xs: '100%', md: 160 } }} />
      </Stack>
      {inherited && (
        <Button onClick={() => setOwnRegistration(true)} sx={{ alignSelf: 'flex-start' }}>
          Give it its own registration
        </Button>
      )}
    </Stack>
  );
};
