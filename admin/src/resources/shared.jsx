import {
  List, Datagrid, TextField, Edit, Create, SimpleForm, TextInput, required,
} from 'react-admin';
import { useCan, useIsSiteAdmin } from '../permissions';

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

// A list of whole records. Bulk delete shows only for roles that may delete.
export const CatalogDatagrid = ({ bulkActionButtons, ...props }) => {
  const canDelete = useCan('catalog.delete');
  return <Datagrid bulkActionButtons={canDelete ? bulkActionButtons : false} {...props} />;
};
