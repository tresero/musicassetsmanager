import {
  List, TextField, NumberField, TextInput, NumberInput, SelectInput,
  required, minValue, maxValue,
} from 'react-admin';
import { SharedListGrid, sharedList } from './shared';

const KeyList = () => (
  <List sort={{ field: 'accidentals', order: 'ASC' }} perPage={100}>
    <SharedListGrid>
      <TextField source="name" />
      <TextField source="tonic" />
      <TextField source="mode" />
      <NumberField source="accidentals" />
    </SharedListGrid>
  </List>
);

const modes = [{ id: 'major', name: 'major' }, { id: 'minor', name: 'minor' }];

const KeyInputs = () => (<>
  <TextInput source="name" validate={required()}
             helperText="As it appears in the pickers, such as C or Am" />
  <TextInput source="tonic" validate={required()} helperText="The home note, such as C or F#" />
  <SelectInput source="mode" choices={modes} validate={required()} />
  <NumberInput source="accidentals" validate={[required(), minValue(-7), maxValue(7)]}
               helperText="Sharps as positive, flats as negative, from -7 to 7" />
</>);

export default sharedList({ list: KeyList, Inputs: KeyInputs });
