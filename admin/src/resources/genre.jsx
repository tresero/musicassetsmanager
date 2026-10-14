import {
  List, TextField, ReferenceField, TextInput, ReferenceInput, SelectInput, required,
} from 'react-admin';
import { SharedListGrid, sharedList } from './shared';

const GenreList = () => (
  <List sort={{ field: 'name', order: 'ASC' }} perPage={100}>
    <SharedListGrid>
      <TextField source="name" />
      <ReferenceField source="parent_id" reference="genre" label="Parent" emptyText="—" />
      <ReferenceField source="schema_class_id" reference="schema_type" label="Schema type" emptyText="—" />
      <TextField source="mo_term" label="MO term" emptyText="—" />
    </SharedListGrid>
  </List>
);

const GenreInputs = () => (<>
  <TextInput source="name" validate={required()} helperText="As it appears in the pickers" />
  <ReferenceInput source="parent_id" reference="genre" perPage={200} sort={{ field: 'name', order: 'ASC' }}>
    <SelectInput optionText="name" label="Parent genre"
                 helperText="Leave blank for a top-level genre" />
  </ReferenceInput>
  <ReferenceInput source="schema_class_id" reference="schema_type">
    <SelectInput optionText="curie" label="Schema type"
                 helperText="The linked-data class this genre maps to, if any" />
  </ReferenceInput>
  <TextInput source="mo_term" label="MO term" helperText="Music Ontology term, if one exists" />
</>);

export default sharedList({ list: GenreList, Inputs: GenreInputs });
