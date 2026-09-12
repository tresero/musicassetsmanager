import {
  List, Datagrid, TextField, ReferenceField, SearchInput,
  Edit, Create, SimpleForm, TextInput, ReferenceInput, AutocompleteInput,
} from 'react-admin';
import { RichTextInput } from 'ra-input-rich-text';
import { EditToolbar } from './formToolbar';

const filters = [<SearchInput source="name@ilike" alwaysOn />];

const byName = (q) => ({ 'name@ilike': `*${q}*` });
const byCode = (q) => ({ 'code@ilike': `*${q}*` });

const proOptionText = (r) => (r ? `${r.code} — ${r.name}` : '');
const proInputText  = (r) => (r ? r.code : '');

const OrgList = () => (
  <List filters={filters} sort={{ field: 'name', order: 'ASC' }} perPage={50}>
    <Datagrid rowClick="edit">
      <TextField source="name" />
      <ReferenceField source="pro_code" reference="pro" label="PRO" emptyText="—">
        <TextField source="code" />
      </ReferenceField>
      <TextField source="member_ipi" label="IPI" emptyText="—" />
      <ReferenceField source="country" reference="country" emptyText="—" />
    </Datagrid>
  </List>
);

const OrgForm = () => (
  <SimpleForm toolbar={<EditToolbar />}>
    <TextInput source="name" required />
    <ReferenceInput source="pro_code" reference="pro" perPage={25}
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
    <ReferenceInput source="country" reference="country" perPage={25}
                    sort={{ field: 'name', order: 'ASC' }}>
      <AutocompleteInput optionText="name" filterToQuery={byName} />
    </ReferenceInput>
    <RichTextInput source="notes" />
  </SimpleForm>
);

const strip = ({ created_at, updated_at, account_id, ...rest }) => rest;

export default {
  list: OrgList,
  edit: () => <Edit transform={strip}><OrgForm /></Edit>,
  create: () => <Create transform={strip}><OrgForm /></Create>,
  recordRepresentation: 'name',
};