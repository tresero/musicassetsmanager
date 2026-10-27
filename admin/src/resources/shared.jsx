import { useState } from 'react';
import {
  List, Datagrid, DataTable, TextField, Edit, Create, SimpleForm, TextInput,
  required, AutocompleteInput, AutocompleteArrayInput, SearchInput,
  useChoicesContext,
} from 'react-admin';
import { useCan, useIsSiteAdmin } from '../permissions';
import { QuickCreateName } from './quickCreate';

// A shared list. Only the site admin opens rows to edit and bulk deletes; the
// database refuses everyone else.
export const SharedListGrid = (props) => {
  const siteAdmin = useIsSiteAdmin();
  return <Datagrid rowClick={siteAdmin ? 'edit' : false}
                   bulkActionButtons={siteAdmin ? undefined : false} {...props} />;
};

export const NameList = () => (
  <List sort={{ field: 'name', order: 'ASC' }} perPage={100}>
    <SharedListGrid>
      <TextField source="name" />
    </SharedListGrid>
  </List>
);

const NameInputs = () => (
  <TextInput source="name" validate={required()}
             helperText="As it appears in the pickers. Must be unique." />
);

// The whole resource for a shared list: its list page plus Edit and Create
// built around its inputs. App.jsx keeps Edit and Create for the site admin.
// Call it at module level, never inside a render.
export const sharedList = ({ list = NameList, Inputs = NameInputs } = {}) => ({
  list,
  edit: () => <Edit mutationMode="pessimistic"><SimpleForm><Inputs /></SimpleForm></Edit>,
  create: () => <Create redirect="list"><SimpleForm><Inputs /></SimpleForm></Create>,
  recordRepresentation: 'name',
});

// The picker for a shared list that needs only a name, inside its
// ReferenceInput or ReferenceArrayInput. The site admin can add a missing
// entry from the picker without leaving the form; nobody else sees Create.
// Create is not offered when the typed name matches an entry in any case:
// typing rock picks Rock.
export const SharedListPicker = ({ multiple = false, onInputChange, ...props }) => {
  const { resource, allChoices } = useChoicesContext();
  const siteAdmin = useIsSiteAdmin();
  const [typed, setTyped] = useState('');
  const key = typed.trim().toLowerCase();
  const exists = !!key && !!allChoices?.some((c) => c.name?.toLowerCase() === key);
  const Input = multiple ? AutocompleteArrayInput : AutocompleteInput;
  return <Input optionText="name"
                create={siteAdmin && !exists ? <QuickCreateName resource={resource} /> : undefined}
                onInputChange={(e, value, reason) => {
                  setTyped(value || '');
                  onInputChange?.(e, value, reason);
                }}
                {...props} />;
};

// A list of whole records. Bulk delete shows only for roles that may delete.
export const CatalogDatagrid = ({ bulkActionButtons, ...props }) => {
  const canDelete = useCan('catalog.delete');
  return <Datagrid bulkActionButtons={canDelete ? bulkActionButtons : false} {...props} />;
};

// The same for lists whose columns the user chooses (with ListActions):
// list every useful column and name the ones that start hidden in
// hiddenColumns. A column sorts by its source, so show a name or time with
// render and sort by the value behind it.
export const CatalogDataTable = ({ bulkActionButtons, ...props }) => {
  const canDelete = useCan('catalog.delete');
  return <DataTable bulkActionButtons={canDelete ? bulkActionButtons : false} {...props} />;
};

// The search box at the top of a list. It sends q, which dataProvider turns
// into a search of the view's search value.
export const searchFilter = <SearchInput key="q" source="q" alwaysOn />;
