import {
  List, TextField, BooleanField, ReferenceField, Edit, Create,
  TabbedForm, TextInput, NumberInput, BooleanInput, ArrayInput,
  ReferenceInput, AutocompleteInput, required,
} from 'react-admin';
import { RichTextInput } from 'ra-input-rich-text';
import { EditToolbar } from './formToolbar';
import { CompanyInput } from './partyInputs';
import { DocumentsInput } from './documentsTab';
import { byCode, proOptionText, proInputText } from './vocab';
import { IsniInput, IpiInput } from './codeInputs';
import { CatalogDatagrid, searchFilter, RowIterator } from './shared';
import { ChangeHistory } from './changeHistory';
import { useDefaultCallingCode } from '../permissions';

const filters = [searchFilter];

// No divider between rows, and fields centered so a Select does not sit
// below an Autocomplete.
const ContactList = () => (
  <List filters={filters} sort={{ field: 'sort_name', order: 'ASC' }} perPage={50}>
    <CatalogDatagrid rowClick="edit">
      <TextField source="display_name" label="Name" />
      <TextField source="credit_name" label="Credited as" emptyText="—" />
      <TextField source="primary_email" label="Email" emptyText="—" />
      <ReferenceField source="pro_code" reference="pro" label="PRO" emptyText="—">
        <TextField source="code" />
      </ReferenceField>
      <TextField source="member_ipi" label="IPI" emptyText="—" />
    </CatalogDatagrid>
  </List>
);

const ContactForm = () => {
  const callingCode = useDefaultCallingCode();
  return (
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
                             helperText="The performing rights society they belong to, such as BMI or ASCAP. Their writer rows start on it."
                             sx={{ width: { xs: '100%', md: 260 } }} />
        </ReferenceInput>
        <IpiInput helperText="From their society membership. Needed to register works."
                  sx={{ width: { xs: '100%', md: 220 } }} />
        <IsniInput source="isni" label="ISNI"
                   helperText="Their public identity number, from isni.org. Optional."
                   sx={{ width: { xs: '100%', md: 260 } }} />
        <RichTextInput source="notes" />
      </TabbedForm.Tab>

      <TabbedForm.Tab label="Email">
        <ArrayInput source="emails" label={false}>
          <RowIterator>
            <TextInput source="email" type="email" label="Address" helperText={false}
                       validate={required()}
                       sx={{ width: { xs: '100%', md: 320 } }} />
            <BooleanInput source="is_primary" label="Primary" helperText={false} />
            <TextInput source="note" label="Note" helperText={false}
                       sx={{ width: { xs: '100%', md: 240 } }} />
          </RowIterator>
        </ArrayInput>
      </TabbedForm.Tab>

      <TabbedForm.Tab label="Phone">
        <ArrayInput source="phones" label={false}>
          <RowIterator>
            <NumberInput source="country_code" label="CC" defaultValue={callingCode}
                         helperText={false}
                         sx={{ width: { xs: '100%', md: 90 } }} />
            <TextInput source="number" label="Number" helperText={false}
                       validate={required()}
                       sx={{ width: { xs: '100%', md: 200 } }} />
            <TextInput source="extension" label="Ext" helperText={false}
                       sx={{ width: { xs: '100%', md: 100 } }} />
            <BooleanInput source="is_primary" label="Primary" helperText={false} />
            <TextInput source="note" label="Note" helperText={false}
                       sx={{ width: { xs: '100%', md: 240 } }} />
          </RowIterator>
        </ArrayInput>
      </TabbedForm.Tab>

      <TabbedForm.Tab label="Companies">
        <ArrayInput source="organizations" label={false}>
          <RowIterator>
            <CompanyInput w={280} validate={required()} />
            <TextInput source="title" label="Title" helperText={false}
                       sx={{ width: { xs: '100%', md: 220 } }} />
            <BooleanInput source="is_primary" label="Primary" helperText={false} />
          </RowIterator>
        </ArrayInput>
      </TabbedForm.Tab>

      <TabbedForm.Tab label="Documents">
        <DocumentsInput />
      </TabbedForm.Tab>

      <TabbedForm.Tab label="History">
        <ChangeHistory recordType="contact" />
      </TabbedForm.Tab>
    </TabbedForm>
  );
};

const strip = ({ display_name, sort_name, primary_email,
                 created_at, updated_at, ...rest }) => rest;

export default {
  list: ContactList,
  edit: () => <Edit transform={strip} mutationMode="pessimistic"><ContactForm /></Edit>,
  create: () => <Create transform={strip}><ContactForm /></Create>,
  recordRepresentation: 'display_name',
};
