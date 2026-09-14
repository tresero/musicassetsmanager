import {
  List, Datagrid, TextField, ReferenceField, SearchInput,
  Edit, Create, TabbedForm, TextInput, NumberInput, BooleanInput,
  ArrayInput, SimpleFormIterator, ReferenceInput, AutocompleteInput,
} from 'react-admin';
import { RichTextInput } from 'ra-input-rich-text';
import { EditToolbar } from './formToolbar';
import { QuickCreateName } from './quickCreate';

const filters = [<SearchInput source="sort_name@ilike" alwaysOn />];

const byName = (q) => ({ 'name@ilike': `*${q}*` });
const byCode = (q) => ({ 'code@ilike': `*${q}*` });

const proOptionText = (r) => (r ? `${r.code} — ${r.name}` : '');
const proInputText  = (r) => (r ? r.code : '');

const ContactList = () => (
  <List filters={filters} sort={{ field: 'sort_name', order: 'ASC' }} perPage={50}>
    <Datagrid rowClick="edit">
      <TextField source="display_name" label="Name" />
      <TextField source="primary_email" label="Email" emptyText="—" />
      <ReferenceField source="pro_code" reference="pro" label="PRO" emptyText="—">
        <TextField source="code" />
      </ReferenceField>
      <TextField source="member_ipi" label="IPI" emptyText="—" />
    </Datagrid>
  </List>
);

const ContactForm = () => (
  <TabbedForm toolbar={<EditToolbar />}>
    <TabbedForm.Tab label="Details">
      <TextInput source="first_name" />
      <TextInput source="last_name" />
      <ReferenceInput source="pro_code" reference="pro" perPage={500}
                      sort={{ field: 'code', order: 'ASC' }}>
        <AutocompleteInput
          label="PRO"
          optionText={proOptionText}
          inputText={proInputText}
          filterToQuery={byCode}
        />
      </ReferenceInput>
      <TextInput source="member_ipi" label="IPI name number" />
      <TextInput source="isni" label="ISNI" />
      <RichTextInput source="notes" />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Email">
      <ArrayInput source="emails" label={false}>
        <SimpleFormIterator inline>
          <TextInput source="email" type="email" label="Address" />
          <BooleanInput source="is_primary" label="Primary" />
          <TextInput source="note" label="Note" multiline />
        </SimpleFormIterator>
      </ArrayInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Phone">
      <ArrayInput source="phones" label={false}>
        <SimpleFormIterator inline>
          <NumberInput source="country_code" label="CC" defaultValue={1} sx={{ width: 90 }} />
          <TextInput source="number" label="Number" />
          <TextInput source="extension" label="Ext" sx={{ width: 100 }} />
          <BooleanInput source="is_primary" label="Primary" />
          <TextInput source="note" label="Note" multiline />
        </SimpleFormIterator>
      </ArrayInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Companies">
      <ArrayInput source="organizations" label={false}>
        <SimpleFormIterator inline>
          <ReferenceInput source="organization_id" reference="organization" perPage={200}
                          sort={{ field: 'name', order: 'ASC' }}>
            <AutocompleteInput optionText="name" label="Company"
                               filterToQuery={byName}
                               create={<QuickCreateName resource="organization" />}
                               createLabel="Type to search or add a company" />
          </ReferenceInput>
          <TextInput source="title" label="Title" />
          <BooleanInput source="is_primary" label="Primary" />
        </SimpleFormIterator>
      </ArrayInput>
    </TabbedForm.Tab>
    <TabbedForm.Tab label="Documents">
      <DocumentsInput label="Attached documents" />
    </TabbedForm.Tab>

  </TabbedForm>
);

const strip = ({ display_name, sort_name, primary_email,
                 created_at, updated_at, ...rest }) => rest;

export default {
  list: ContactList,
  edit: () => <Edit transform={strip} mutationMode="pessimistic"><ContactForm /></Edit>,
  create: () => <Create transform={strip}><ContactForm /></Create>,
  recordRepresentation: 'display_name',
};