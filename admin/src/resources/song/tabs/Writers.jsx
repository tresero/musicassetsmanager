import {
  ArrayInput, SimpleFormIterator, TextInput, NumberInput, BooleanInput,
  SelectInput, ReferenceInput, AutocompleteInput,
  required,
} from 'react-admin';
import { useSourceContext } from 'ra-core';
import { useFormContext } from 'react-hook-form';
import { PersonInput } from '../../partyInputs';
import { byCode, proOptionText, proInputText, useRoleId } from '../../vocab';
import { PinFirst } from '../../shared';

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

/*
 * Picking a writer fills the row's PRO from the person's record. It stays
 * editable, for a writer registered differently on this song.
 */
const WriterInput = () => {
  const { setValue } = useFormContext();
  const sourceCtx = useSourceContext();
  const fillPro = (value, person) => {
    if (value) {
      setValue(sourceCtx.getSource('pro_code'), person?.pro_code ?? null,
               { shouldDirty: true });
    }
  };
  return <PersonInput label="Writer" onChange={fillPro} validate={required()} />;
};

// The writing roles, found by DDEX code so the site admin can rename them,
// listed in this order. A new row starts on Composer Lyricist.
const writerRoles = ['Composer', 'ComposerAndOrLyricist', 'ComposerLyricist', 'Lyricist', 'Arranger'];
const writerRoleFilter = { 'ddex_code@in': `(${writerRoles.join(',')})` };

const WritersFields = () => {
  const composerLyricist = useRoleId('ComposerLyricist');
  return (
    <ArrayInput source="writers" label={false}>
      <SimpleFormIterator inline sx={iteratorSx}>
        <WriterInput />

        <ReferenceInput source="role_id" reference="role" filter={writerRoleFilter}
                        defaultValue={composerLyricist}>
          <PinFirst pin={writerRoles} by="ddex_code">
            <SelectInput optionText="name" label="Role" helperText={false} validate={required()}
                         sx={{ width: { xs: '100%', md: 150 } }} />
          </PinFirst>
        </ReferenceInput>

        <ReferenceInput source="pro_code" reference="pro" perPage={500}
                        sort={{ field: 'code', order: 'ASC' }}>
          <AutocompleteInput label="PRO"
                             optionText={proOptionText}
                             inputText={proInputText}
                             filterToQuery={byCode}
                             helperText={false}
                             sx={{ width: { xs: '100%', md: 170 } }} />
        </ReferenceInput>

        <NumberInput source="share" label="Share %" step={0.0001}
                     helperText={false}
                     sx={{ width: { xs: '100%', md: 110 } }} />

        <BooleanInput source="controlled" label="Controlled" helperText={false} />

        <TextInput source="notes" label="Note" helperText={false}
                   sx={{ width: { xs: '100%', md: 220 } }} />
      </SimpleFormIterator>
    </ArrayInput>
  );
};

export default WritersFields;