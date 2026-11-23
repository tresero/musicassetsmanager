import {
  List, Datagrid, TextField, DateField, FunctionField, NumberField,
  Edit, Create, TabbedForm, SimpleForm, Toolbar, SaveButton, DeleteButton,
  TextInput, DateInput, NumberInput, BooleanInput, SelectInput, RadioButtonGroupInput,
  ReferenceInput, AutocompleteInput, ArrayInput, FormDataConsumer,
  SearchInput, TopToolbar, CreateButton, ExportButton,
  required, minValue, useRecordContext,
} from 'react-admin';
import { useWatch } from 'react-hook-form';
import { Stack, Typography } from '@mui/material';
import { PersonOrCompanyInput } from './partyInputs';
import { QuickCreateName } from './quickCreate';
import { CurrencyInput, RowIterator } from './shared';
import { DocumentsInput } from './documentsTab';
import { useCan, useAccountCurrency } from '../permissions';

const money = (v) =>
  v == null ? '' : Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const kinds = [
  { id: 'expense', name: 'Expense' },
  { id: 'income', name: 'Income' },
];
const kindName = { expense: 'Expense', income: 'Income' };

const splitTargets = [
  { id: 'song', name: 'Song', source: 'song_id', reference: 'song' },
  { id: 'recording', name: 'Recording', source: 'recording_id', reference: 'recording' },
  { id: 'release', name: 'Release', source: 'release_id', reference: 'release' },
];

const today = () => new Date().toISOString().slice(0, 10);

const filters = [
  <SearchInput key="q" source="q" alwaysOn />,
  <SelectInput key="kind" source="kind" label="Kind" choices={kinds} alwaysOn />,
  <ReferenceInput key="cat" source="category_id" reference="transaction_category"
                  perPage={200} sort={{ field: 'name', order: 'ASC' }} alwaysOn>
    <AutocompleteInput optionText="name" label="Category" />
  </ReferenceInput>,
  <DateInput key="from" source="transaction_date@gte" label="From" alwaysOn />,
  <DateInput key="to" source="transaction_date@lte" label="To" alwaysOn />,
];

const ListActions = () => {
  const canEdit = useCan('money.edit');
  return (
    <TopToolbar>
      {canEdit && <CreateButton label="New transaction" />}
      <ExportButton />
    </TopToolbar>
  );
};

// The amount in the account currency, which reports use, with the amount as
// paid when it was in another currency.
const AmountField = (props) => (
  <FunctionField {...props} render={(r) => {
    const own = `${money(r.account_amount)} ${r.account_currency}`;
    return r.currency_code === r.account_currency ? own : `${own} (${money(r.amount)} ${r.currency_code})`;
  }} />
);

const TransactionList = () => {
  const canEdit = useCan('money.edit');
  return (
    <List filters={filters} sort={{ field: 'transaction_date', order: 'DESC' }}
          perPage={50} actions={<ListActions />}>
      <Datagrid rowClick={canEdit ? 'edit' : false} bulkActionButtons={canEdit ? undefined : false}>
        <DateField source="transaction_date" label="Date" />
        <FunctionField source="kind" label="Kind" render={(r) => kindName[r.kind]} />
        <TextField source="description" />
        <TextField source="category_name" label="Category" sortBy="category_id" />
        <TextField source="party_name" label="Paid to or by" emptyText="" sortable={false} />
        <TextField source="applies_to" label="For" sortable={false} />
        <AmountField source="account_amount" label="Amount" />
        <FunctionField label="Recouped from" sortable={false}
                       render={(r) => (r.recoupable ? r.recoup_name : '')} />
      </Datagrid>
    </List>
  );
};

// Asked only when the transaction is in another currency than the
// account's; otherwise the database copies the amount.
const AccountAmountInput = () => {
  const accountCurrency = useAccountCurrency();
  const currency = useWatch({ name: 'currency_code' });
  if (!currency || currency === accountCurrency) return null;
  return (
    <NumberInput source="account_amount" label={`Amount in ${accountCurrency}`}
                 validate={required()}
                 helperText={`What it came to in ${accountCurrency}, at the rate actually paid or received. Reports use this amount.`} />
  );
};

const RecoupInputs = () => {
  const kind = useWatch({ name: 'kind' });
  const recoupable = useWatch({ name: 'recoupable' });
  if (kind !== 'expense') return null;
  return (
    <>
      <BooleanInput source="recoupable" label="Recoupable"
                    helperText="Recouped from someone's royalties, such as recording costs recouped from an artist." />
      {recoupable && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <PersonOrCompanyInput personSource="recoup_contact_id"
                                companySource="recoup_organization_id"
                                personLabel="Recouped from: person" required
                                personHelperText="Who it is recouped from" />
        </Stack>
      )}
    </>
  );
};

const DetailsTab = () => (
  <>
    <RadioButtonGroupInput source="kind" label="Kind" choices={kinds} validate={required()}
                           helperText="A refund is entered as a negative amount of the same kind." />
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ width: '100%' }}>
      <DateInput source="transaction_date" label="Date" validate={required()}
                 helperText="The date it is reported by, such as the invoice or receipt date." />
      <ReferenceInput source="category_id" reference="transaction_category" perPage={200}
                      sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteInput optionText="name" label="Category" validate={required()}
                           create={<QuickCreateName resource="transaction_category" />}
                           createLabel="Type to search or add a category"
                           helperText="Such as Mastering, Artwork or Sync fee. Type a new one to add it."
                           sx={{ width: { xs: '100%', md: 320 } }} />
      </ReferenceInput>
    </Stack>
    <TextInput source="description" validate={required()} fullWidth
               helperText="What it was, as it should read in a list or report." />
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      <PersonOrCompanyInput personLabel="Paid to or by: person"
                            personHelperText="Who was paid, or who paid. Optional." />
    </Stack>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ width: '100%' }}>
      <CurrencyInput source="currency_code" validate={required()} sx={{ minWidth: 320 }}
                     helperText="The currency of the bill or payment" />
      <NumberInput source="amount" validate={required()}
                   helperText="As on the bill or receipt" />
      <AccountAmountInput />
    </Stack>
    <RecoupInputs />
    <TextInput source="notes" multiline fullWidth />
  </>
);

const ShareText = ({ split }) =>
  (split?.share != null ? (
    <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
      {`${(Number(split.share) * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`}
    </Typography>
  ) : null);

const SplitsTab = () => (
  <ArrayInput source="splits" label={false}
              helperText="Leave empty for overhead: costs or income for the catalog as a whole. Each row's share is its weight over the total; shares show after saving.">
    <RowIterator disableReordering>
      <SelectInput source="target" label="For a" choices={splitTargets} defaultValue="song"
                   validate={required()} helperText={false} />
      <FormDataConsumer>
        {({ scopedFormData }) => {
          const t = splitTargets.find((x) => x.id === (scopedFormData?.target ?? 'song'));
          return (
            <ReferenceInput key={t.id} source={t.source} reference={t.reference} perPage={50}
                            sort={{ field: 'title', order: 'ASC' }}>
              <AutocompleteInput optionText="title" label={t.name} validate={required()}
                                 helperText={false} sx={{ width: { xs: '100%', md: 360 } }} />
            </ReferenceInput>
          );
        }}
      </FormDataConsumer>
      <NumberInput source="weight" label="Weight" defaultValue={1}
                   validate={[required(), minValue(0.000001)]} helperText={false}
                   sx={{ width: 120 }} />
      <FormDataConsumer>
        {({ scopedFormData }) => <ShareText split={scopedFormData} />}
      </FormDataConsumer>
    </RowIterator>
  </ArrayInput>
);

const FormToolbar = () => {
  const record = useRecordContext();
  return (
    <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <SaveButton />
      {record?.id && <DeleteButton mutationMode="pessimistic" />}
    </Toolbar>
  );
};

const TransactionForm = () => (
  <TabbedForm toolbar={<FormToolbar />}>
    <TabbedForm.Tab label="Details"><DetailsTab /></TabbedForm.Tab>
    <TabbedForm.Tab label="For"><SplitsTab /></TabbedForm.Tab>
    <TabbedForm.Tab label="Receipts"><DocumentsInput /></TabbedForm.Tab>
  </TabbedForm>
);

// Computed columns are dropped; the database fills the account amount for
// the account currency, and only an expense can be recoupable.
const useTransform = () => {
  const accountCurrency = useAccountCurrency();
  return ({ category_name, party_name, account_currency, recoup_name, applies_to,
            created_by, created_at, updated_at, splits, ...rest }) => {
    const recoupable = rest.kind === 'expense' && !!rest.recoupable;
    return {
      ...rest,
      account_amount: rest.currency_code === accountCurrency ? null : rest.account_amount,
      recoupable,
      recoup_contact_id: recoupable ? rest.recoup_contact_id ?? null : null,
      recoup_organization_id: recoupable ? rest.recoup_organization_id ?? null : null,
      splits: (splits ?? []).map(({ target, song_id, recording_id, release_id, weight }) => ({
        target, song_id: song_id ?? null, recording_id: recording_id ?? null,
        release_id: release_id ?? null, weight,
      })),
    };
  };
};

const TransactionEdit = () => (
  <Edit transform={useTransform()} mutationMode="pessimistic" redirect="list">
    <TransactionForm />
  </Edit>
);

const TransactionCreate = () => {
  const accountCurrency = useAccountCurrency();
  return (
    <Create transform={useTransform()} redirect="list"
            record={{ kind: 'expense', transaction_date: today(), currency_code: accountCurrency,
                      recoupable: false, splits: [], documents: [] }}>
      <TransactionForm />
    </Create>
  );
};

export default {
  list: TransactionList,
  edit: TransactionEdit,
  create: TransactionCreate,
  recordRepresentation: 'description',
};

// The account's own categories. A category in use cannot be deleted.
const CategoryList = () => {
  const canEdit = useCan('money.edit');
  return (
    <List sort={{ field: 'name', order: 'ASC' }} perPage={100}>
      <Datagrid rowClick={canEdit ? 'edit' : false} bulkActionButtons={false}>
        <TextField source="name" />
        <NumberField source="transaction_count" label="Transactions" />
      </Datagrid>
    </List>
  );
};

const CategoryToolbar = () => {
  const record = useRecordContext();
  return (
    <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <SaveButton />
      {record?.id && !record.transaction_count && <DeleteButton mutationMode="pessimistic" />}
    </Toolbar>
  );
};

const CategoryInputs = () => (
  <TextInput source="name" validate={required()}
             helperText="As it appears in the category picker. Must be unique." />
);

export const transactionCategory = {
  list: CategoryList,
  edit: () => (
    <Edit mutationMode="pessimistic" transform={({ name }) => ({ name })}>
      <SimpleForm toolbar={<CategoryToolbar />}><CategoryInputs /></SimpleForm>
    </Edit>
  ),
  create: () => (
    <Create redirect="list"><SimpleForm><CategoryInputs /></SimpleForm></Create>
  ),
  recordRepresentation: 'name',
};
