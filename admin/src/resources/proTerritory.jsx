import { List, Datagrid, ReferenceField } from 'react-admin';

const ProTerritoryList = () => (
  <List perPage={100}>
    <Datagrid rowClick={false}>
      <ReferenceField source="pro_code" reference="pro" label="PRO" />
      <ReferenceField source="country_code" reference="country" label="Country" />
    </Datagrid>
  </List>
);

export default { list: ProTerritoryList };
