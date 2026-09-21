import {
  List, Datagrid, TextField, ReferenceField, SearchInput,
  Edit, Create, TabbedForm, TextInput, NumberInput, BooleanInput,
  ArrayInput, SimpleFormIterator, ReferenceInput, AutocompleteInput,
} from 'react-admin';
import { RichTextInput } from 'ra-input-rich-text';
import { EditToolbar } from './formToolbar';
import { QuickCreateName } from './quickCreate';
import { DocumentsInput } from './documentsTab';
import { byName, byCode, proOptionText, proInputText } from './vocab';
import { IsniInput } from './IsniInput';

const filters = [<SearchInput source="sort_name@ilike" alwaysOn />];

// No divider between rows, and fields centered so a Select does not sit
// below an Autocomplete.
const iteratorSx = {
  '& .RaSimpleFormIterator-line': {
    borderBottom: 'none',
    paddingTop: 1,
    paddingBottom: 1,
  },
  '& .RaSimpleFormIterator-form': {
    alignItems: 'center',
  },
  '& .RaSimpleFormIterator-form .MuiFormControl-root': {
    marginTop: 0,
    marginBottom: 0,
  },
};

const ContactList = () => (
  <List filters={filters} sort={{ field: 'sort_name', order: 'ASC' }} perPage={50}>
    <Datagrid rowClick="edit">
      <TextField source="display_name" label="Name" />
      <TextField source="credit_name" label="Credited as" emptyText="—" />
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
      <TextInput source="first_name" label="First name"
                 sx={{ width: { xs: '100%', md: 260 } }} />
      <TextInput source="last_name" label="Last name"
                 sx={{ width: { xs: '100%', md: 260 } }} />
      <TextInput source="credit_name" label="Credited as"
                 helperText="Performing name, if different. Used on every recording unless a credit overrides it."
                 sx={{ width: { xs: '100%', md: 360 } }} />
      <ReferenceInput source="pro_code" reference="pro" perPage={500}
                      sort={{ field: 'code', order: 'ASC' }}>
        <AutocompleteInput label="PRO"
                           optionText={proOptionText}
                           inputText={proInputText}
                           filterToQuery={byCode}
                           sx={{ width: { xs: '100%', md: 260 } }} />
      </ReferenceInput>
      <TextInput source="member_ipi" label="IPI name number"
                 sx={{ width: { xs: '100%', md: 220 } }} />
      <IsniInput source="isni" label="ISNI"
                 sx={{ width: { xs: '100%', md: 260 } }} />
      <RichTextInput source="notes" />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Email">
      <ArrayInput source="emails" label={false}>
        <SimpleFormIterator inline sx={iteratorSx}>
          <TextInput source="email" type="email" label="Address" helperText={false}
                     sx={{ width: { xs: '100%', md: 320 } }} />
          <BooleanInput source="is_primary" label="Primary" helperText={false} />
          <TextInput source="note" label="Note" helperText={false}
                     sx={{ width: { xs: '100%', md: 240 } }} />
        </SimpleFormIterator>
      </ArrayInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Phone">
      <ArrayInput source="phones" label={false}>
        <SimpleFormIterator inline sx={iteratorSx}>
          <NumberInput source="country_code" label="CC" defaultValue={1}
                       helperText={false}
                       sx={{ width: { xs: '100%', md: 90 } }} />
          <TextInput source="number" label="Number" helperText={false}
                     sx={{ width: { xs: '100%', md: 200 } }} />
          <TextInput source="extension" label="Ext" helperText={false}
                     sx={{ width: { xs: '100%', md: 100 } }} />
          <BooleanInput source="is_primary" label="Primary" helperText={false} />
          <TextInput source="note" label="Note" helperText={false}
                     sx={{ width: { xs: '100%', md: 240 } }} />
        </SimpleFormIterator>
      </ArrayInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Companies">
      <ArrayInput source="organizations" label={false}>
        <SimpleFormIterator inline sx={iteratorSx}>
          <ReferenceInput source="organization_id" reference="organization" perPage={200}
                          sort={{ field: 'name', order: 'ASC' }}>
            <AutocompleteInput optionText="name" label="Company"
                               filterToQuery={byName}
                               create={<QuickCreateName resource="organization" />}
                               createLabel="Type to search or add a company"
                               helperText={false}
                               sx={{ width: { xs: '100%', md: 280 } }} />
          </ReferenceInput>
          <TextInput source="title" label="Title" helperText={false}
                     sx={{ width: { xs: '100%', md: 220 } }} />
          <BooleanInput source="is_primary" label="Primary" helperText={false} />
        </SimpleFormIterator>
      </ArrayInput>
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Documents">
      <DocumentsInput />
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
