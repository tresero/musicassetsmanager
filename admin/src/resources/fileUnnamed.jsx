import { useState } from 'react';
import {
  List, Datagrid, TextField, DateField, useGetList, useNotify, useRefresh,
} from 'react-admin';
import { Alert, Box } from '@mui/material';
import { DropZone } from './DropZone';
import { sha256File } from './uploadClient';
import { rpc } from '../rpc';
import { useCan } from '../permissions';

const extOf = (name) => {
  const m = /\.([a-z0-9]{1,10})$/i.exec(name || '');
  return m ? m[1].toLowerCase() : '';
};

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/*
 * Drop the original files, or the folders holding them, to give stored
 * files their names. Each file is hashed here and nothing is uploaded; a
 * file whose hash matches a stored file without a name names it. Files
 * that cannot match one of the rows listed, by extension and, where it is
 * known, by size, are skipped without being read.
 */
const NameFromOriginals = () => {
  const notify = useNotify();
  const refresh = useRefresh();
  const [phase, setPhase] = useState(null);
  const [pct, setPct] = useState(0);

  const { data: rows = [] } = useGetList('file_unnamed', {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: 'id', order: 'ASC' },
  });

  const couldMatch = (file) => {
    const ext = extOf(file.name);
    return rows.some((r) => extOf(r.storage_uri) === ext
                         && (r.byte_size == null || Number(r.byte_size) === file.size));
  };

  if (!rows.length) return null;

  const name = async (dropped) => {
    const files = dropped.filter(couldMatch);
    const skipped = dropped.length - files.length;
    if (!files.length) {
      notify(`None of the ${plural(dropped.length, 'file', 'files')} could be one of these.`,
             { type: 'warning' });
      return;
    }

    try {
      const total = files.reduce((n, f) => n + f.size, 0) || 1;
      let done = 0;
      const hashed = [];
      for (const [i, file] of files.entries()) {
        setPhase(`Reading ${i + 1} of ${files.length}: ${file.name}`);
        const sha256 = await sha256File(file, (p) =>
          setPct(Math.round(((done + p * file.size) / total) * 100)));
        done += file.size;
        hashed.push({ sha256, file_name: file.name });
      }

      setPhase('Naming');
      const result = await rpc('name_files', { files: hashed });
      const named = result.audio + result.documents;
      const unmatched = files.length - result.matched.length;
      const parts = [
        named
          ? `Named ${plural(result.audio, 'audio file', 'audio files')} and ${plural(result.documents, 'document', 'documents')}.`
          : 'Nothing was named.',
      ];
      if (unmatched) parts.push(`${plural(unmatched, 'file', 'files')} matched none of these.`);
      if (skipped) parts.push(`${plural(skipped, 'file', 'files')} skipped without reading.`);
      notify(parts.join(' '), { type: named ? 'info' : 'warning' });
      refresh();
    } catch (e) {
      notify(e.message || 'Naming failed', { type: 'error' });
    } finally {
      setPhase(null);
      setPct(0);
    }
  };

  return (
    <DropZone
      multiple
      onFiles={name}
      busy={!!phase}
      pct={pct}
      label={phase ?? 'Drop the original files or their folders here to name these. They are read here, not uploaded.'}
      sx={{ mt: 2 }}
    />
  );
};

const Empty = () => (
  <Alert severity="success" sx={{ m: 2 }}>
    Every stored file has its name.
  </Alert>
);

const goTo = (id, resource, record) =>
  (record.recording_id ? `/recording/${record.recording_id}` : `/document/${record.document_id}`);

// Audio files and documents uploaded before original file names were kept.
const UnnamedFileList = () => {
  const canEdit = useCan('catalog.edit');
  return (
    <Box>
      {canEdit && <NameFromOriginals />}
      <List sort={{ field: 'title', order: 'ASC' }} perPage={100}
            title="Files without names" empty={<Empty />}>
        <Datagrid rowClick={goTo} bulkActionButtons={false}>
          <TextField source="kind" label="Kind" />
          <TextField source="title" />
          <TextField source="version_label" label="Version" emptyText="" />
          <TextField source="detail" label="Type" emptyText="" />
          <TextField source="storage_uri" label="Location" />
          <DateField source="created_at" label="Added" />
        </Datagrid>
      </List>
    </Box>
  );
};

export default { list: UnnamedFileList };
