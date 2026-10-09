import { List, Datagrid, TextField } from 'react-admin';
import { useCan } from '../permissions';

export const NameList = () => (
  <List sort={{ field: 'name', order: 'ASC' }} perPage={100}>
    <Datagrid rowClick={false} bulkActionButtons={false}>
      <TextField source="name" />
    </Datagrid>
  </List>
);

// A list of whole records. Bulk delete shows only for roles that may delete.
export const CatalogDatagrid = ({ bulkActionButtons, ...props }) => {
  const canDelete = useCan('catalog.delete');
  return <Datagrid bulkActionButtons={canDelete ? bulkActionButtons : false} {...props} />;
};
