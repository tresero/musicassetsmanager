import { useState, useEffect } from 'react';
import { useInput } from 'react-admin';
import { TextField } from '@mui/material';
import { useSourceContext } from 'ra-core';

const toDisplay = (ms) => {
  if (ms === null || ms === undefined || ms === '') return '';
  const total = Math.round(Number(ms) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const toMs = (text) => {
  const t = (text || '').trim();
  if (!t) return null;
  const parts = t.split(':').map((p) => p.trim());
  if (parts.some((p) => p === '' || Number.isNaN(Number(p)))) return undefined;
  const nums = parts.map(Number);
  let seconds;
  if (nums.length === 1) seconds = nums[0];
  else if (nums.length === 2) seconds = nums[0] * 60 + nums[1];
  else if (nums.length === 3) seconds = nums[0] * 3600 + nums[1] * 60 + nums[2];
  else return undefined;
  return Math.round(seconds * 1000);
};

/*
 * Duration typed as m:ss, stored as milliseconds. Nobody knows what
 * 225000 is, and the database wants integer ms for sorting and totals.
 *
 * scoped=true resolves the field name through SourceContext so it works
 * inside an ArrayInput row.
 */
export const DurationInput = ({ source = 'duration_ms', label = 'Duration',
                                scoped = false, sx }) => {
  const sourceCtx = useSourceContext();
  const name = scoped && sourceCtx ? sourceCtx.getSource(source) : source;

  const { field, fieldState } = useInput({ source: name });
  const [text, setText] = useState(toDisplay(field.value));
  const [bad, setBad] = useState(false);

  // follow external changes, e.g. a value filled in by an upload
  useEffect(() => {
    setText(toDisplay(field.value));
  }, [field.value]);

  const commit = (value) => {
    const ms = toMs(value);
    if (ms === undefined) {
      setBad(true);
      return;
    }
    setBad(false);
    field.onChange(ms);
    setText(toDisplay(ms));
  };

  return (
    <TextField
      label={label}
      value={text}
      placeholder="3:45"
      error={bad || !!fieldState.error}
      helperText={bad ? 'Use m:ss' : false}
      onChange={(e) => setText(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      sx={sx}
    />
  );
};
