import {
  TopToolbar, FilterButton, CreateButton, ExportButton, Button, useListContext,
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

export const ListActions = () => (
  <TopToolbar>
    <ClearFiltersButton />
    <FilterButton />
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);