import { useSimpleFormIteratorItem } from 'react-admin';
import { Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';

/*
 * The iterator's own remove button is a small icon at the end of a row.
 * This one says what it does and sits with the fields.
 *
 * Removing a row and saving takes the file out of the record. The stored
 * copy is deleted by the sweep, which only removes files nothing refers
 * to; a file can be shared by more than one row, since keys are made from
 * the file's contents.
 */
export const RemoveFileButton = ({ label = 'Remove' }) => {
  const { remove } = useSimpleFormIteratorItem();
  return (
    <Button size="small" color="error" startIcon={<DeleteIcon />}
            onClick={() => remove()} sx={{ alignSelf: 'center' }}>
      {label}
    </Button>
  );
};
