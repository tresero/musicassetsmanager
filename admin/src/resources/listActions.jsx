import {
  TopToolbar, FilterButton, CreateButton, ExportButton, ColumnsButton, Button,
  useListContext, useResourceDefinition,
} from 'react-admin';
import FilterOffIcon from '@mui/icons-material/FilterAltOff';

// React Admin keeps a list's filters between visits, so one click to put a
// list back to everything saves hunting down each filter.
const ClearFiltersButton = () => {
  const { filterValues, setFilters } = useListContext();
  const active = Object.keys(filterValues || {}).length > 0;
  return (
    <Button label="Clear filters" onClick={() => setFilters({}, {})} disabled={!active}>
      <FilterOffIcon />
    </Button>
  );
};

// The toolbar of a CatalogDataTable list. Columns shows, hides and reorders
// the columns; the choice is kept in the browser.
export const ListActions = () => {
  const { hasCreate } = useResourceDefinition();
  return (
    <TopToolbar>
      <ColumnsButton />
      <ClearFiltersButton />
      <FilterButton />
      {hasCreate && <CreateButton />}
      <ExportButton />
    </TopToolbar>
  );
};