import { Toolbar, SaveButton, DeleteButton, useNotify } from 'react-admin';

export const EditToolbar = () => {
  const notify = useNotify();
  return (
    <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <SaveButton
          type="button"
          label="Save & continue"
          variant="outlined"
          mutationOptions={{
            onSuccess: () => notify('ra.notification.updated', {
              type: 'info', messageArgs: { smart_count: 1 },
            }),
          }}
        />
        <SaveButton label="Save & close" />
      </div>
      <DeleteButton mutationMode="pessimistic" />
    </Toolbar>
  );
};