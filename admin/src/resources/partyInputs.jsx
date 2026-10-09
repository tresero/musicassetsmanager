import { ReferenceInput, AutocompleteInput } from 'react-admin';
import { useSourceContext } from 'ra-core';
import { useFormContext } from 'react-hook-form';
import { QuickCreateContact, QuickCreateName, QuickCreateArtist } from './quickCreate';
import { bySortName, byName } from './vocab';

/*
 * Every place a person or company is chosen uses these, so they all search,
 * sort, and quick-add the same way. People are picked from People and
 * companies from Companies; neither is ever typed as free text.
 */

const width = (w) => ({ width: { xs: '100%', md: w } });

export const PersonInput = ({
  source = 'contact_id', label = 'Person', helperText = false, w = 260, ...rest
}) => (
  <ReferenceInput source={source} reference="contact" perPage={200}
                  sort={{ field: 'sort_name', order: 'ASC' }}>
    <AutocompleteInput optionText="sort_name" label={label}
                       filterToQuery={bySortName}
                       create={<QuickCreateContact />}
                       createLabel="Type to search or add a person"
                       helperText={helperText} sx={width(w)} {...rest} />
  </ReferenceInput>
);

export const CompanyInput = ({
  source = 'organization_id', label = 'Company', helperText = false, w = 260, ...rest
}) => (
  <ReferenceInput source={source} reference="organization" perPage={200}
                  sort={{ field: 'name', order: 'ASC' }}>
    <AutocompleteInput optionText="name" label={label}
                       filterToQuery={byName}
                       create={<QuickCreateName resource="organization" />}
                       createLabel="Type to search or add a company"
                       helperText={helperText} sx={width(w)} {...rest} />
  </ReferenceInput>
);

export const ArtistInput = ({
  source = 'artist_id', label = 'Artist', helperText = false, w = 300, ...rest
}) => (
  <ReferenceInput source={source} reference="artist" perPage={200}
                  sort={{ field: 'sort_name', order: 'ASC' }}>
    <AutocompleteInput optionText="name" label={label}
                       filterToQuery={byName}
                       create={<QuickCreateArtist />}
                       createLabel="Type to search or add an artist"
                       helperText={helperText} sx={width(w)} {...rest} />
  </ReferenceInput>
);

/*
 * A party that is either a person or a company. Choosing one clears the
 * other, so a row can't end up with both, which the database refuses.
 * With required, saving is refused until one of the two is chosen.
 * Works at the top of a form and inside list rows alike.
 */
export const PersonOrCompanyInput = ({
  personSource = 'contact_id', companySource = 'organization_id',
  personLabel = 'Person', companyLabel = 'or Company',
  personHelperText = false, companyHelperText = false,
  companyFirst = false, w = 260, required = false,
}) => {
  const { setValue, getValues } = useFormContext();
  const ctx = useSourceContext();
  const path = (s) => (ctx ? ctx.getSource(s) : s);
  const clear = (s) => (value) => {
    if (value) setValue(path(s), null, { shouldDirty: true, shouldValidate: true });
  };
  const either = (other) => (value) =>
    value || getValues(path(other)) ? undefined : 'Choose a person or a company';
  const validate = (other) => (required ? either(other) : undefined);

  const person = (
    <PersonInput key="person" source={personSource} label={personLabel}
                 helperText={personHelperText} w={w} onChange={clear(companySource)}
                 validate={validate(companySource)} />
  );
  const company = (
    <CompanyInput key="company" source={companySource} label={companyLabel}
                  helperText={companyHelperText} w={w} onChange={clear(personSource)}
                  validate={validate(personSource)} />
  );
  return <>{companyFirst ? [company, person] : [person, company]}</>;
};
