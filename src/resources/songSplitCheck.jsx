import { List, Datagrid, TextField, NumberField } from 'react-admin';

const SplitCheckList = () => (
  <List sort={{ field: 'title', order: 'ASC' }} perPage={100}
        filter={{ 'writer_total@neq': 100 }}
        title="Splits that don't total 100">
    <Datagrid rowClick={false}>
      <TextField source="title" />
      <NumberField source="writer_total" label="Writer %" />
      <NumberField source="publisher_total" label="Publisher %" />
    </Datagrid>
  </List>
);

export default { list: SplitCheckList };
