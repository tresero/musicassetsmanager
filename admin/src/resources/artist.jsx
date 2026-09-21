import {
  List, Datagrid, TextField, NumberField, SearchInput,
  Edit, Create, TabbedForm, TextInput, SelectInput, DateInput,
  ArrayInput, SimpleFormIterator, ReferenceInput, AutocompleteInput,
} from 'react-admin';
import { useWatch } from 'react-hook-form';
import { RichTextInput } from 'ra-input-rich-text';
import { EditToolbar } from './formToolbar';
import { QuickCreateContact } from './quickCreate';
import { bySortName } from './vocab';
import { IsniInput } from './IsniInput';

const filters = [<SearchInput source="name@ilike" alwaysOn />];

const artistKinds = [
  { id: 'person', name: 'Person' },
  { id: 'group',  name: 'Group' },
];

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

const ArtistList = () => (
  <List filters={filters} sort={{ field: 'sort_name', order: 'ASC' }} perPage={50}>
    <Datagrid rowClick="edit">
      <TextField source="name" />
      <TextField source="sort_name" label="Sorts as" emptyText="—" />
      <TextField source="kind" label="Kind" />
      <TextField source="isni" label="ISNI" emptyText="—" />
      <NumberField source="member_count" label="Members" />
    </Datagrid>
  </List>
);

// The ISNI hint depends on whether the artist has one of their own.
const IsniHint = () => {
  const own = useWatch({ name: 'isni_own' });
  const inherited = useWatch({ name: 'isni_inherited' });
  if (own) return null;
  return inherited
    ? <span>Currently using the member's ISNI. Enter one here only if this
             identity has its own.</span>
    : <span>A pen name or band has its own ISNI. Someone performing under
            their own name uses the one on their contact record.</span>;
};

const ArtistForm = () => (
  <TabbedForm toolbar={<EditToolbar />}>
    <TabbedForm.Tab label="Details">
      <TextInput source="name" required
                 helperText="As it appears on the release"
                 sx={{ width: { xs: '100%', md: 360 } }} />
      <TextInput source="sort_name" label="Sorts as"
                 helperText="Beatles, The"
                 sx={{ width: { xs: '100%', md: 360 } }} />
      <SelectInput source="kind" choices={artistKinds} defaultValue="person"
                   label="Kind"
                   helperText="A group has several members; a person has one"
                   sx={{ width: { xs: '100%', md: 200 } }} />
      <IsniInput source="isni_own" label="ISNI"
                 helperText={<IsniHint />}
                 sx={{ width: { xs: '100%', md: 260 } }} />
      <RichTextInput source="notes" />
    </TabbedForm.Tab>

    <TabbedForm.Tab label="Members">
      <ArrayInput source="members" label={false}
                  helperText="The people behind this identity. A solo act under their own name has one member; a pen name has one too.">
        <SimpleFormIterator inline sx={iteratorSx}>
          <ReferenceInput source="contact_id" reference="contact" perPage={200}
                          sort={{ field: 'sort_name', order: 'ASC' }}>
            <AutocompleteInput optionText="sort_name" label="Person"
                               filterToQuery={bySortName}
                               create={<QuickCreateContact />}
                               createLabel="Type to search or add a person"
                               helperText={false}
                               sx={{ width: { xs: '100%', md: 280 } }} />
          </ReferenceInput>
          <DateInput source="begin_date" label="Joined" helperText={false}
                     sx={{ width: { xs: '100%', md: 170 } }} />
          <DateInput source="end_date" label="Left" helperText={false}
                     sx={{ width: { xs: '100%', md: 170 } }} />
          <TextInput source="notes" label="Note" helperText={false}
                     sx={{ width: { xs: '100%', md: 240 } }} />
        </SimpleFormIterator>
      </ArrayInput>
    </TabbedForm.Tab>
  </TabbedForm>
);

const strip = ({ isni, isni_inherited, member_count,
                 created_at, updated_at, ...rest }) => rest;

export default {
  list: ArtistList,
  edit: () => <Edit transform={strip} mutationMode="pessimistic"><ArtistForm /></Edit>,
  create: () => <Create transform={strip}><ArtistForm /></Create>,
  recordRepresentation: 'name',
};
