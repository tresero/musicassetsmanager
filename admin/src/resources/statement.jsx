import {
  List, Datagrid, TextField, DateField, NumberField, FunctionField,
  ReferenceInput, AutocompleteInput, Show, SimpleShowLayout, Edit, SimpleForm,
  DateInput, TextInput, NumberInput, RadioButtonGroupInput, Form, Title, Toolbar, SaveButton, DeleteButton,
  TopToolbar, EditButton, CreateButton, ExportButton, ReferenceManyField, Pagination, Labeled, Button,
  useRecordContext, useNotify, useRedirect, useRefresh, useGetList,
  required,
} from 'react-admin';
import { useFormContext, useWatch } from 'react-hook-form';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import OpenIcon from '@mui/icons-material/OpenInNew';
import RematchIcon from '@mui/icons-material/Sync';
import { useEffect, useMemo, useState } from 'react';
import { CompanyInput } from './partyInputs';
import { ImportWizard } from './ImportWizard';
import { uploadFile, fileUrl } from './uploadClient';
import { useCan, useAccountCurrency } from '../permissions';
import { rpc } from '../rpc';
import { CurrencyInput } from './shared';
import { MatchMethodField, MatchField, RefField, UsageField, WhoField } from './statementLine';

const money = (v) =>
  v == null ? '' : Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const sides = [
  { id: 'publishing', name: 'Publishing: lines are on songs' },
  { id: 'master', name: 'Master: lines are on recordings' },
];
const sideName = { publishing: 'Publishing', master: 'Master' };

// The fields an imported statement needs from its file, for either side or
// one (side). The guesses are header names seen on BMI, ASCAP, MLC,
// publisher, distributor and Curve statements.
const statementFields = [
  {
    key: 'amount', label: 'Amount', amount: true, multiple: true, required: true,
    help: 'What each line paid you, complete. Choose several columns to add them together, such as dollars and premium dollars. On a label statement, the amount payable to you, after the royalty rate.',
    guess: ['net payable', 'distributed amount', 'royalty amount', 'dollars', 'amount', 'net amount', 'royalty', 'earnings'],
  },
  {
    key: 'work_ref', label: 'Work number',
    help: 'The payer\'s own number for the work, such as a BMI title number, ASCAP work ID or MLC song code. Once one line is matched, later lines with the same number match on their own.',
    guess: ['title number', 'title #', 'work id', 'mlc song code', 'song code', 'work number', 'track code', 'work code'],
  },
  {
    key: 'iswc', label: 'ISWC', side: 'publishing',
    help: 'Matched against the songs\' ISWCs first.',
    guess: ['iswc', 'work iswc'],
  },
  {
    key: 'isrc', label: 'ISRC', side: 'master',
    help: 'Matched against the recordings\' ISRCs first. A line matched by hand teaches its ISRC, so later statements match it on their own.',
    guess: ['isrc', 'track isrc'],
  },
  {
    key: 'upc', label: 'Barcode', side: 'master',
    help: 'The release\'s UPC or EAN. A line with no ISRC, such as an album download, matches the release with this barcode.',
    guess: ['barcode', 'upc', 'ean', 'release upc', 'product upc'],
  },
  {
    key: 'title', label: 'Title',
    help: 'Matched against song or recording titles when nothing else matches.',
    guess: ['title name', 'work title', 'work primary title', 'track title', 'song title', 'title'],
  },
  {
    key: 'artist', label: 'Artist', side: 'master',
    help: 'Shown on the line, and ranks the suggested recordings when matching by hand.',
    guess: ['track artist', 'artist', 'artist name', 'release artist'],
  },
  {
    key: 'writers', label: 'Writers', side: 'publishing',
    help: 'A title match also needs one of the song\'s writers\' last names here. Leave it empty to match on title alone.',
    guess: ['work writer list', 'composer name', 'writers', 'composers', 'writer'],
  },
  {
    key: 'usage', label: 'Usage period', period: true, multiple: true,
    help: 'The columns with each line\'s usage period, such as the MLC\'s Usage Period Start Date and Usage Period End Date. Each line keeps its own, for reports.',
    guess: [
      ['usage period start date', 'usage period end date'],
      ['performance start date', 'performance end date'],
      'perf period',
      'sale date',
    ],
  },
  {
    key: 'statement_date', label: 'Statement date', date: true, required: true,
    help: 'The column with the date of the statement, such as the MLC\'s Distribution Date. Income is reported by this date. If the file has none, leave this empty and enter the date at the next step.',
    guess: ['distribution date', 'statement date', 'period', 'transaction date'],
  },
];

const statementFilters = [
  <ReferenceInput key="org" source="organization_id" reference="organization"
                  perPage={200} sort={{ field: 'name', order: 'ASC' }} alwaysOn>
    <AutocompleteInput optionText="name" label="Payer" />
  </ReferenceInput>,
];

const ListActions = () => {
  const canEdit = useCan('money.edit');
  return (
    <TopToolbar>
      {canEdit && <CreateButton label="Import a statement" />}
      <ExportButton />
    </TopToolbar>
  );
};

const StatementList = () => {
  const canEdit = useCan('money.edit');
  return (
    <List filters={statementFilters} sort={{ field: 'imported_at', order: 'DESC' }}
          perPage={50} actions={<ListActions />}>
      <Datagrid rowClick="show" bulkActionButtons={canEdit ? undefined : false}>
        <TextField source="payer_name" label="Payer" />
        <DateField source="statement_date" label="Date" />
        <FunctionField source="side" label="Side" render={(r) => sideName[r.side]} />
        <FunctionField source="total" label="Total"
                       render={(r) => `${money(r.total)} ${r.currency_code}`} />
        <FunctionField source="total_converted" label="Paid"
                       render={(r) => `${money(r.total_converted)} ${r.account_currency}`} />
        <NumberField source="line_count" label="Lines" />
        <NumberField source="unmatched_count" label="Unmatched" />
        <DateField source="imported_at" label="Imported" />
      </Datagrid>
    </List>
  );
};

const OpenFileButton = () => {
  const record = useRecordContext();
  const notify = useNotify();
  if (!record?.storage_uri) return null;
  const open = async () => {
    const win = window.open('', '_blank');
    try {
      const url = await fileUrl(record.storage_uri, record.file_name);
      if (win) { win.opener = null; win.location = url; } else window.location.assign(url);
    } catch (e) {
      win?.close();
      notify(e.message || 'Could not open the file', { type: 'error' });
    }
  };
  return <Button label="Original file" onClick={open}><OpenIcon /></Button>;
};

const RematchButton = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  if (!record?.unmatched_count) return null;
  const run = async () => {
    setBusy(true);
    try {
      const n = await rpc('match_statement', { statement_id: record.id });
      notify(`${n} more lines matched`, { type: 'info' });
      refresh();
    } catch (e) {
      notify(e.message, { type: 'error' });
    } finally {
      setBusy(false);
    }
  };
  return <Button label="Match again" onClick={run} disabled={busy}><RematchIcon /></Button>;
};

const ShowActions = () => {
  const canEdit = useCan('money.edit');
  return (
    <TopToolbar>
      <OpenFileButton />
      {canEdit && <RematchButton />}
      {canEdit && <EditButton />}
    </TopToolbar>
  );
};

const StatementShow = () => {
  const canEdit = useCan('money.edit');
  return (
    <Show actions={<ShowActions />}>
      <SimpleShowLayout>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
          <Labeled label="Payer"><TextField source="payer_name" /></Labeled>
          <Labeled label="Date"><DateField source="statement_date" /></Labeled>
          <Labeled label="Side">
            <FunctionField render={(r) => sideName[r.side]} />
          </Labeled>
          <Labeled label="Usage">
            <UsageField emptyText="—" />
          </Labeled>
          <Labeled label="Total">
            <FunctionField render={(r) => `${money(r.total)} ${r.currency_code}`} />
          </Labeled>
          <Labeled label="Paid">
            <FunctionField render={(r) => `${money(r.total_converted)} ${r.account_currency}`} />
          </Labeled>
          <Labeled label="Lines"><NumberField source="line_count" /></Labeled>
          <Labeled label="Unmatched"><NumberField source="unmatched_count" /></Labeled>
          <Labeled label="Not in catalog"><NumberField source="not_in_catalog_count" /></Labeled>
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
          <Labeled label="File"><TextField source="file_name" /></Labeled>
          <Labeled label="Imported"><DateField source="imported_at" showTime /></Labeled>
          <Labeled label="Notes"><TextField source="notes" emptyText="—" /></Labeled>
        </Stack>
        <ReferenceManyField reference="statement_line" target="statement_id" label="Lines"
                            sort={{ field: 'row_number', order: 'ASC' }} perPage={50}
                            pagination={<Pagination rowsPerPageOptions={[50, 100, 250]} />}>
          <Datagrid rowClick={canEdit ? 'edit' : false} bulkActionButtons={false}>
            <NumberField source="row_number" label="Row" />
            <TextField source="title" emptyText="" />
            <WhoField label="Writers or artist" />
            <RefField label="Work number or ISRC" />
            <UsageField label="Usage" />
            <NumberField source="amount" options={{ maximumFractionDigits: 6 }} />
            <NumberField source="amount_converted" label="Paid"
                         options={{ maximumFractionDigits: 6 }} />
            <MatchField label="Matched to" />
            <MatchMethodField label="Matched by" />
          </Datagrid>
        </ReferenceManyField>
      </SimpleShowLayout>
    </Show>
  );
};

const PayoutInput = ({ accountCurrency }) => {
  const currency = useWatch({ name: 'currency_code' });
  if (!currency || currency === accountCurrency) return null;
  return (
    <NumberInput source="payout_amount" label={`Payout in ${accountCurrency}`}
                 validate={required()}
                 helperText={`What the statement paid in ${accountCurrency}. Each line is converted at the payout over the statement total.`} />
  );
};

// The statement date is read from the file on import, so only the edit page
// shows it here.
const StatementDetails = ({ accountCurrency, withDate = false }) => (
  <>
    <CompanyInput source="organization_id" label="Payer" validate={required()}
                  helperText="The company that sent the statement: a society, the MLC, a publisher, an administrator or a distributor. Choose it first: the columns from its last statement are reused." />
    <RadioButtonGroupInput source="side" label="Side" choices={sides} validate={required()}
                           helperText={withDate
                             ? 'Changing it unmatches every line, including lines matched by hand, and matches them again.'
                             : 'Publishing statements (societies, the MLC, publishers) are matched to songs; master statements (labels, distributors) to recordings and releases. The payer\'s last statement sets it.'} />
    {withDate && (
      <DateInput source="statement_date" label="Statement date" validate={required()}
                 helperText="The date of the statement as the payer gives it. Income is reported by this date." />
    )}
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      <CurrencyInput source="currency_code" validate={required()} sx={{ minWidth: 320 }}
                     helperText="The currency of the statement's amounts" />
      <PayoutInput accountCurrency={accountCurrency} />
    </Stack>
    <TextInput source="notes" multiline fullWidth />
  </>
);

const StatementWizard = () => {
  const { trigger, getValues, setValue } = useFormContext();
  const payer = useWatch({ name: 'organization_id' });
  const side = useWatch({ name: 'side' });
  const fields = useMemo(() => statementFields.filter((f) => !f.side || f.side === side), [side]);
  const notify = useNotify();
  const redirect = useRedirect();
  // The payer's statements, latest first: the last one's mapping starts the
  // columns, and any with the same date warns of a duplicate. The same file
  // twice is refused by its hash, but the same statement downloaded again or
  // in another format is a different file.
  const { data: earlier } = useGetList('statement', {
    filter: { organization_id: payer },
    sort: { field: 'imported_at', order: 'DESC' },
    pagination: { page: 1, perPage: 1000 },
  }, { enabled: !!payer });
  const warn = ({ statement_date: date }) => {
    const same = (earlier ?? []).filter((s) => s.statement_date === date);
    if (!date || !same.length) return null;
    const files = same.map((s) => `${s.file_name}, imported ${s.imported_at.slice(0, 10)}`).join('; ');
    return `A statement from this payer dated ${date} is already imported (${files}). If this is the same statement in another file, importing it counts its income twice.`;
  };
  const lastSide = earlier?.[0]?.side;
  useEffect(() => { if (lastSide) setValue('side', lastSide); }, [lastSide, setValue]);

  const onImport = async ({ file, rows, mapping, dates }) => {
    if (!(await trigger())) throw new Error('Fill in the statement details above first.');
    const v = getValues();
    const plan = await uploadFile(file, { kind: 'statements' });
    const used = Object.fromEntries(Object.entries(mapping).filter(([, h]) => h.length));
    const result = await rpc('import_statement', {
      statement: {
        organization_id: v.organization_id,
        statement_date: dates.statement_date,
        side: v.side,
        currency_code: v.currency_code,
        payout_amount: v.payout_amount ?? null,
        mapping: used,
        file_name: file.name,
        storage_kind: plan.backend,
        storage_uri: plan.key,
        sha256: plan.sha256,
        notes: v.notes ?? null,
      },
      lines: rows.map((r) => ({
        row_number: r.row_number, data: r.data, amount: r.amount,
        usage_start: r.usage_start, usage_end: r.usage_end,
      })),
    });
    notify(`Imported ${result.lines} lines; ${result.matched} matched to ${v.side === 'master' ? 'recordings and releases' : 'songs'}.`, { type: 'info' });
    redirect('show', 'statement', result.id);
  };

  return (
    <ImportWizard fields={fields}
                  initialMapping={earlier?.[0]?.mapping} onImport={onImport} warn={warn}
                  importLabel="Import statement" />
  );
};

const StatementImport = () => {
  const accountCurrency = useAccountCurrency();
  return (
    <Card sx={{ mt: 2 }}>
      <Title title="Import a statement" />
      <CardContent>
        <Form defaultValues={{ currency_code: accountCurrency, side: 'publishing' }} onSubmit={() => {}}>
          <Stack spacing={1} sx={{ maxWidth: 900 }}>
            <Typography variant="body2" color="text.secondary">
              The file is kept as it is, and each row is stored exactly as it reads.
              Columns are pre-filled from the last statement from the same payer. If the
              file ends with a total row, set Rows to leave out at the end so it isn't
              counted as a line.
            </Typography>
            <StatementDetails accountCurrency={accountCurrency} />
            <StatementWizard />
          </Stack>
        </Form>
      </CardContent>
    </Card>
  );
};

const editable = ({ organization_id, statement_date, side, currency_code, payout_amount, notes }) =>
  ({ organization_id, statement_date, side, currency_code, payout_amount: payout_amount ?? null, notes });

const StatementToolbar = () => (
  <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
    <SaveButton />
    <DeleteButton mutationMode="pessimistic" label="Delete this statement and its lines" />
  </Toolbar>
);

const StatementEdit = () => {
  const accountCurrency = useAccountCurrency();
  return (
    <Edit transform={editable} mutationMode="pessimistic" redirect="show">
      <SimpleForm toolbar={<StatementToolbar />}>
        <Typography variant="body2" color="text.secondary">
          The file and its lines stay as imported. To read the file differently, delete the
          statement and import it again.
        </Typography>
        <StatementDetails accountCurrency={accountCurrency} withDate />
      </SimpleForm>
    </Edit>
  );
};

export default {
  list: StatementList,
  show: StatementShow,
  edit: StatementEdit,
  create: StatementImport,
  recordRepresentation: (r) => `${r.payer_name} ${r.statement_date}`,
};
