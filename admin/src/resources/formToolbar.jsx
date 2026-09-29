import {
  Toolbar, SaveButton, DeleteButton,
  useRecordContext, useResourceContext, useNotify, useRedirect,
  useGetResourceLabel, useRefresh,
} from 'react-admin';

/*
 * An onSuccess in mutationOptions replaces the form's default side
 * effects, including its redirect to the list.
 *
 * Save & continue on an existing record does not navigate at all, so you
 * stay on the tab you were editing. On a new record there is no edit
 * screen to stay on yet, so it goes to the one just created; otherwise
 * each click would make another record.
 *
 * After a save that stays on the record, the record is reloaded, because
 * values the database computes (P line, one stop, split totals) are not in
 * the save's reply.
 *
 * Delete names what it deletes, since "Delete" alone on a form full of
 * child rows reads as though it might take more than the record.
 */
export const EditToolbar = () => {
  const record = useRecordContext();
  const resource = useResourceContext();
  const notify = useNotify();
  const redirect = useRedirect();
  const getResourceLabel = useGetResourceLabel();
  const refresh = useRefresh();
  const saved = !!record?.id;

  const saveMessage = () =>
    notify(saved ? 'ra.notification.updated' : 'ra.notification.created',
           { type: 'info', messageArgs: { smart_count: 1 } });

  const stay = {
    onSuccess: (data) => {
      saveMessage();
      if (!saved) redirect('edit', resource, data.id);
      else refresh();
    },
  };

  const leave = {
    onSuccess: () => {
      saveMessage();
      redirect('list', resource);
    },
  };

  return (
    <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <SaveButton label="Save & continue" type="button" mutationOptions={stay} />
        <SaveButton label="Save & close" type="button" mutationOptions={leave} />
      </div>
      {saved && (
        <DeleteButton
          mutationMode="pessimistic"
          label={`Delete this ${getResourceLabel(resource, 1).toLowerCase()}`}
        />
      )}
    </Toolbar>
  );
};
