import {
  List, Datagrid, TextField, ReferenceField, SearchInput,
  Edit, Create, TabbedForm, TextInput,
  ReferenceInput, AutocompleteInput,
} from 'react-admin';
import { RichTextInput } from 'ra-input-rich-text';
import { EditToolbar } from './formToolbar';
import { DocumentsInput } from './documentsTab';
import { IsniInput } from './IsniInput';
import { byName, byCode, proOptionText, proInputText } from './vocab';

const filters = [<SearchInput source="name@ilike" alwaysOn />];

const OrgList = () => (
  <List filters={filters} sort={{ field: 'name', order: 'ASC' }} perPage={50}>
    <Datagrid rowClick="edit">
      <TextField source="name" />
      <ReferenceField source="pro_code" reference="pro" label="PRO" emptyText="—">
        <TextField source="code" />
      </ReferenceField>
      <TextField source="member_ipi" label="IPI" emptyText="—" />
      <TextField source="isni" label="ISNI" emptyText="—" />
      <ReferenceField source="country" reference="country" emptyText="—" />
    </Datagrid>
  </List>
);

const OrgForm = () => (
  <TabbedForm toolbar={<EditToolbar />}>
    <TabbedForm.Tab label="Details">
      <TextInput source="name" required
                 sx={{ width: { xs: '100%', md: 360 } }} />
      <ReferenceInput source="pro_code" reference="pro" perPage={500}
                      sort={{ field: 'code', order: 'ASC' }}>
        <AutocompleteInput label="PRO"
                           optionText={proOptionText}
                           inputText={proInputText}
                           filterToQuery={byCode}
                           sx={{ width: { xs: '100%', md: 280 } }} />
      </ReferenceInput>
      <TextInput source="member_ipi" label="IPI name number"
                 sx={{ width: { xs: '100%', md: 240 } }} />
      <IsniInput source="isni" label="ISNI"
                 sx={{ width: { xs: '100%', md: 260 } }} />
      <ReferenceInput source="country" reference="country" perPage={500}
                      sort={{ field: 'name', order: 'ASC' }}>
        <AutocompleteInput optionText="name" label="Country"
                           filterToQuery={byName}
                           sx={{ width: { xs: '100%', md: 300 } }} />
      </ReferenceInput>
      <RichTextInput source="notes" />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Documents">
      <DocumentsInput />
    </TabbedForm.Tab>
  </TabbedForm>
);

const strip = ({ created_at, updated_at, ...rest }) => rest;

export default {
  list: OrgList,
  edit: () => <Edit transform={strip} mutationMode="pessimistic"><OrgForm /></Edit>,
  create: () => <Create transform={strip}><OrgForm /></Create>,
  recordRepresentation: 'name',
};
