import {
  List, TextField, ReferenceField, Edit, Create, TabbedForm,
  TextInput, ReferenceInput, AutocompleteInput,
} from 'react-admin';
import { RichTextInput } from 'ra-input-rich-text';
import { EditToolbar } from './formToolbar';
import { DocumentsInput } from './documentsTab';
import { IsniInput } from './IsniInput';
import { byCode, proOptionText, proInputText } from './vocab';
import { CatalogDatagrid, CountryInput, searchFilter } from './shared';

const filters = [searchFilter];

const OrgList = () => (
  <List filters={filters} sort={{ field: 'name', order: 'ASC' }} perPage={50}>
    <CatalogDatagrid rowClick="edit">
      <TextField source="name" />
      <ReferenceField source="pro_code" reference="pro" label="PRO" emptyText="—">
        <TextField source="code" />
      </ReferenceField>
      <TextField source="member_ipi" label="IPI" emptyText="—" />
      <TextField source="isni" label="ISNI" emptyText="—" />
      <ReferenceField source="country" reference="country" emptyText="—" />
    </CatalogDatagrid>
  </List>
);

const OrgForm = () => (
  <TabbedForm toolbar={<EditToolbar />}>
    <TabbedForm.Tab label="Details">
      <TextInput source="name" required
                 helperText="Used once per account. If two companies share a name, add the country or entity type."
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
      <CountryInput source="country" sx={{ width: { xs: '100%', md: 300 } }} />
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
