import { useMemo, useState } from 'react';
import {
  List, Datagrid, DataTable, TextField, Edit, Create, SimpleForm, TextInput,
  required, AutocompleteInput, AutocompleteArrayInput, SearchInput,
  ReferenceInput, useChoicesContext, ChoicesContextProvider, DateInput,
  useRecordContext, useListContext,
  SimpleFormIterator, CreateButton,
} from 'react-admin';
import { Link as RouterLink } from 'react-router';
import { Alert, Box, Button, Link, Stack, TextField as MuiTextField } from '@mui/material';
import { useFormContext, useWatch } from 'react-hook-form';
import { useSourceContext } from 'ra-core';
import { useCan, useIsSiteAdmin, useDefaultCountry, useAccountCurrency, useFirstLanguages } from '../permissions';
import { QuickCreateName } from './quickCreate';
import { PersonOrCompanyInput } from './partyInputs';

// Copies one date field into another, such as a document's effective date
// into Signed. Both sources go through the source context, so inside an
// ArrayInput row they are that row's fields; fromRoot reads the date from
// the record itself instead, such as a release's date for a distribution row.
export const SameAsDateButton = ({ from, to, label, fromRoot = false }) => {
  const { getSource } = useSourceContext();
  const { setValue } = useFormContext();
  const date = useWatch({ name: fromRoot ? from : getSource(from) });
  return (
    <Button size="small" disabled={!date}
            onClick={() => setValue(getSource(to), date,
                                    { shouldDirty: true, shouldValidate: true })}>
      {label}
    </Button>
  );
};

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
// typing rock picks Rock. Below its own help text it says what to do when a
// value is missing: notListed, or asking for it to be added. A row input
// with helperText={false} stays without, to keep the row short.
export const SharedListPicker = ({
  multiple = false, onInputChange, helperText, notListed, ...props
}) => {
  const { resource, allChoices } = useChoicesContext();
  const siteAdmin = useIsSiteAdmin();
  const [typed, setTyped] = useState('');
  const key = typed.trim().toLowerCase();
  const exists = !!key && !!allChoices?.some((c) => c.name?.toLowerCase() === key);
  const Input = multiple ? AutocompleteArrayInput : AutocompleteInput;
  const missing = siteAdmin
    ? 'Not listed? Type it and choose Create.'
    : notListed ?? 'Not listed? Ask us to add it to the list.';
  const own = typeof helperText === 'string' && !/[.?!]$/.test(helperText)
    ? `${helperText}.` : helperText;
  const help = helperText === false ? false : [own, missing].filter(Boolean).join(' ');
  return <Input optionText="name"
                helperText={help}
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
// placeholder shows what a blank field means, such as an inherited country;
// the label stays raised so it is visible.
export const CountryInput = ({ source, label = 'Country', helperText, prefill = false, placeholder, sx }) => {
  const country = useDefaultCountry();
  const textField = placeholder
    ? { placeholder, slotProps: { inputLabel: { shrink: true } } } : undefined;
  return (
    <ReferenceInput source={source} reference="country" perPage={500}
                    sort={{ field: 'name', order: 'ASC' }}>
      <PinFirst pin={[country]}>
        <AutocompleteInput optionText="name" label={label} helperText={helperText}
                           defaultValue={prefill ? country : undefined}
                           TextFieldProps={textField} sx={sx} />
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
// Lyrics contain (#48): every word, matched at the start, in the lyrics only.
export const lyricsFilter = <TextInput key="lyrics" source="lyrics" label="Lyrics contain" alwaysOn />;

// Above a list whose Lyrics contain search matched nothing exactly and was
// run again with the closest words in the lyrics (dataProvider.js).
export const CloseLyricsNotice = () => {
  const { meta } = useListContext();
  if (!meta?.closeLyrics) return null;
  return (
    <Alert severity="info" sx={{ m: 1 }}>
      No lyrics match exactly. Showing close matches for <strong>{meta.closeLyrics}</strong>.
    </Alert>
  );
};

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

// The copyright registration fields songs, recordings and releases share:
// number, date and claimant. numberHelp names the registration each one holds. When the
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
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ width: '100%' }}>
        {inherited ? (
          <MuiTextField variant="filled" label="Claimant" value={c.claimant ?? ''}
                        helperText={from} slotProps={{ input: { readOnly: true } }}
                        sx={{ width: { xs: '100%', md: 300 } }} />
        ) : (
          <PersonOrCompanyInput personSource="claimant_contact_id"
                                companySource="claimant_organization_id"
                                personLabel="Claimant" companyLabel="or Company"
                                personHelperText="Who the registration is in, as on the certificate"
                                w={300} />
        )}
      </Stack>
      {inherited && (
        <Button onClick={() => setOwnRegistration(true)} sx={{ alignSelf: 'flex-start' }}>
          Give it its own registration
        </Button>
      )}
    </Stack>
  );
};

// Child rows edited in a form: writers, credits, owners, emails and the
// like, one record per row. Each record is a card, so a row whose fields wrap
// onto a second line still reads as one record:
// - its border is grey 600 (#757575), 4.6:1 on white, above the 3:1 WCAG 2.2
//   asks of a boundary you need to see (1.4.11); MUI's divider is about 1.3:1;
// - the card holding the focused field gets a primary outline, so a keyboard
//   user sees which record they are in (2.4.7, 2.4.13);
// - records are numbered in text, so the order is not shown by layout alone
//   and a screen reader announces it with the list item (1.3.1).
// RowIterator keeps a record's fields on one line, wrapping at the form's
// edge; BlockIterator is for records with more fields than fit a line, such
// as audio files, deals and distributions. Both take SimpleFormIterator's
// props.
const cardSx = (padding) => ({
  '& .RaSimpleFormIterator-list': {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  '& .RaSimpleFormIterator-line': {
    border: '1px solid',
    borderColor: 'grey.600',
    borderRadius: 1,
    bgcolor: 'background.paper',
    paddingTop: padding,
    paddingBottom: padding,
    paddingLeft: 1.5,
    paddingRight: 1,
  },
  '& .RaSimpleFormIterator-line:focus-within': {
    outline: '2px solid',
    outlineColor: 'primary.main',
    outlineOffset: 1,
  },
  '& .RaSimpleFormIterator-index': {
    fontWeight: 'bold',
    minWidth: '2em',
    alignSelf: 'center',
  },
  '& .RaSimpleFormIterator-form .MuiFormControl-root': {
    marginTop: 0,
    marginBottom: 0,
  },
});

const rowsSx = {
  ...cardSx(1),
  // The fields sit in a Stack (direction row) with no wrap of its own; flex 1
  // makes it as wide as the form, so it wraps at the form's edge.
  '& .RaSimpleFormIterator-form': {
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
    minWidth: 0,
  },
};

const blockSx = {
  ...cardSx(2),
  '& .RaSimpleFormIterator-form': {
    gap: 1.5,
    flex: 1,
    minWidth: 0,
  },
};

const withSx = (base, sx) => [base, ...(Array.isArray(sx) ? sx : [sx])].filter(Boolean);
const number = (index) => `${index + 1}.`;

export const RowIterator = ({ sx, ...props }) => (
  <SimpleFormIterator inline getItemLabel={number} sx={withSx(rowsSx, sx)} {...props} />
);

export const BlockIterator = ({ sx, ...props }) => (
  <SimpleFormIterator getItemLabel={number} sx={withSx(blockSx, sx)} {...props} />
);

// A catalog list with nothing in it yet: what to set up before the first
// record, for those who can, and the button to add it.
export const StartHere = () => {
  const canSettings = useCan('settings.edit');
  const canEdit = useCan('catalog.edit');
  return (
    <Alert severity="info" sx={{ m: 2 }}>
      Nothing here yet.
      {canSettings && <>
        {' '}Before adding the catalog, set up{' '}
        <Link component={RouterLink} to="/account_storage">Storage</Link>,
        where documents and audio are kept, and{' '}
        <Link component={RouterLink} to="/pitch_setting">Pitch settings</Link>,
        the contact named in a recording&apos;s pitch comment.
      </>}
      {canEdit && <Box sx={{ mt: 1 }}><CreateButton variant="contained" /></Box>}
    </Alert>
  );
};
