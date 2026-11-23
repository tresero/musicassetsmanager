import {
  List, TextField, ReferenceField, Edit, Create, TabbedForm,
  TextInput, ReferenceInput, AutocompleteInput,
} from 'react-admin';
import { RichTextInput } from 'ra-input-rich-text';
import { EditToolbar } from './formToolbar';
import { DocumentsInput } from './documentsTab';
import { IsniInput, IpiInput } from './codeInputs';
import { byCode, proOptionText, proInputText } from './vocab';
import { CatalogDatagrid, CountryInput, searchFilter, SlugEdit } from './shared';
import { ChangeHistory } from './changeHistory';

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
                           helperText="For a publisher, the society it is affiliated with"
                           sx={{ width: { xs: '100%', md: 280 } }} />
      </ReferenceInput>
      <IpiInput helperText="The company's IPI name number, from its society. Needed to register works."
                sx={{ width: { xs: '100%', md: 240 } }} />
      <IsniInput source="isni" label="ISNI"
                 helperText="Its public identity number, from isni.org. Optional."
                 sx={{ width: { xs: '100%', md: 260 } }} />
      <CountryInput source="country" helperText="Where it is based"
                    sx={{ width: { xs: '100%', md: 300 } }} />
      <RichTextInput source="notes" />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Documents">
      <DocumentsInput />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="History">
      <ChangeHistory recordType="organization" />
    </TabbedForm.Tab>
  </TabbedForm>
);

const strip = ({ created_at, updated_at, ...rest }) => rest;

export default {
  list: OrgList,
  edit: () => <SlugEdit transform={strip} mutationMode="pessimistic"><OrgForm /></SlugEdit>,
  create: () => <Create transform={strip}><OrgForm /></Create>,
  recordRepresentation: 'name',
};
