import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, Checkbox, FormControlLabel, LinearProgress,
  MenuItem, Paper, Stack, Step, StepLabel, Stepper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/CloudUpload';

/*
 * A step-by-step import of a CSV, TSV, XLS or XLSX file: read the file,
 * pick its header row, say which columns hold the fields the target needs,
 * check the rows, then hand them to onImport.
 *
 * fields: [{ key, label, help, required, multiple, amount, period, date, guess }].
 * A multiple field takes several columns; an amount field's columns are
 * added together, read with the decimal mark the file uses (see
 * detectDecimal). A period field's columns give each row's own period (see
 * readPeriod), passed on as <key>_start and <key>_end, null when blank or
 * unreadable. A date field is one date for the whole file: the Check step
 * shows the latest date in its column, or asks for one when no column is
 * chosen, and onImport gets it in dates[key]. A required date field needs
 * the date, not the column.
 *
 * Every row is passed on as the file had it: data is keyed by header with
 * every value as text, so the import keeps a faithful copy for audit.
 * Spreadsheet numbers keep their full precision rather than the rounding
 * of their display format, and spreadsheet dates are written yyyy-mm-dd.
 *
 * initialMapping pre-fills the columns, as { key: [header, ...] }; a header
 * the file doesn't have is dropped. Columns with no saved mapping are
 * guessed from header names: guess lists header names in order of
 * preference, and an entry that is itself a list picks all its columns, only
 * when the file has every one.
 *
 * warn(dates), when given, returns a warning for the Check step, such as a
 * statement that looks already imported, or nothing. While it warns, the
 * import waits for the user to tick that they mean it.
 */

const TEXT_EXT = /\.(csv|tsv|tab|txt)$/i;

const decodeText = (buf) => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder('windows-1252').decode(buf);
  }
};

const readSheets = async (file) => {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = TEXT_EXT.test(file.name)
    ? XLSX.read(decodeText(buf).replace(/^﻿/, ''), {
        type: 'string', raw: true,
        ...(/\.(tsv|tab)$/i.test(file.name) ? { FS: '\t' } : {}),
      })
    : XLSX.read(buf, { type: 'array', cellNF: true });

  const cellText = (cell) => {
    if (!cell) return '';
    switch (cell.t) {
      case 'n':
        if (cell.z && XLSX.SSF.is_date(cell.z)) {
          return XLSX.SSF.format(Number.isInteger(cell.v) ? 'yyyy-mm-dd' : 'yyyy-mm-dd hh:mm:ss', cell.v);
        }
        return String(cell.v);
      case 'b': return cell.v ? 'TRUE' : 'FALSE';
      case 'd': return cell.v instanceof Date ? cell.v.toISOString().slice(0, 10) : String(cell.v);
      case 'e': return cell.w ?? '';
      case 'z': return '';
      default: return cell.v == null ? '' : String(cell.v);
    }
  };

  return wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    if (!ws['!ref']) return { name, firstRow: 1, rows: [] };
    const range = XLSX.utils.decode_range(ws['!ref']);
    const rows = [];
    for (let r = range.s.r; r <= range.e.r; r += 1) {
      const row = [];
      for (let c = range.s.c; c <= range.e.c; c += 1) {
        row.push(cellText(ws[XLSX.utils.encode_cell({ r, c })]).trim());
      }
      rows.push(row);
    }
    return { name, firstRow: range.s.r + 1, rows };
  });
};

const blank = (row) => row.every((v) => v === '');

// A totals row, as statements such as Curve's end with: a cell that reads
// Total, Totals, Grand total or Subtotal.
const TOTAL = /^(grand\s+|sub)?totals?:?$/i;
const isTotalRow = (row) => row.some((v) => TOTAL.test(String(v ?? '').trim()));

// How many rows at the end of the file to leave out so that its trailing
// totals rows, and any blank rows among or after them, are not imported.
// 0 when the file does not end with one.
const trailingTotals = (rows, headerIndex) => {
  const body = rows.slice(headerIndex + 1);
  let count = 0;
  let found = 0;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    if (blank(body[i])) { count += 1; continue; }
    if (!isTotalRow(body[i])) break;
    count += 1;
    found = count;
  }
  return found;
};

// Headers must be unique keys; a repeated header gets " (2)", " (3)".
const uniqueHeaders = (row) => {
  const seen = {};
  return row.map((h, i) => {
    const base = h || `Column ${i + 1}`;
    seen[base] = (seen[base] || 0) + 1;
    return seen[base] === 1 ? base : `${base} (${seen[base]})`;
  });
};

// The first row with the most filled cells among the first 30 is most
// likely the header.
const guessHeaderRow = (rows) => {
  let best = 0;
  let most = -1;
  rows.slice(0, 30).forEach((row, i) => {
    const n = row.filter((v) => v !== '').length;
    if (n > most) { most = n; best = i; }
  });
  return best;
};

const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');

// A guess takes the earliest entry in the field's guess list that the file
// has. A plain name picks one column, so two amount columns are never added
// together unless the user chooses both; a list of names picks them all.
const guessColumns = (field, headers) => {
  const find = (name) => headers.find((h) => fold(h) === fold(name));
  for (const entry of field.guess || []) {
    const hits = (Array.isArray(entry) ? entry : [entry]).map(find);
    if (hits.every(Boolean)) return hits;
  }
  return [];
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const dayRange = (y, m, d) =>
  (m >= 1 && m <= 12 && d >= 1 && d <= lastDay(y, m) ? [iso(y, m, d), iso(y, m, d)] : null);
const monthRange = (y, m) => (m >= 1 && m <= 12 ? [iso(y, m, 1), iso(y, m, lastDay(y, m))] : null);
const quarterRange = (y, q) => [iso(y, q * 3 - 2, 1), iso(y, q * 3, lastDay(y, q * 3))];

const readOne = (s) => {
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})([ T].*)?$/))) return dayRange(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})( .*)?$/))) {
    return +m[1] > 12 ? dayRange(+m[3], +m[2], +m[1]) : dayRange(+m[3], +m[1], +m[2]);
  }
  if ((m = s.match(/^(\d{4})(\d{2})(\d{2})$/))) return dayRange(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{4})[ /-]?Q([1-4])$/) || s.match(/^(\d{4})([1-4])$/))) return quarterRange(+m[1], +m[2]);
  if ((m = s.match(/^Q([1-4])[ /-]?(\d{4})$/))) return quarterRange(+m[2], +m[1]);
  if ((m = s.match(/^(\d{4})[-/](\d{1,2})$/) || s.match(/^(\d{4})(\d{2})$/))) return monthRange(+m[1], +m[2]);
  if ((m = s.match(/^([A-Z]{3})[A-Z]*\.?[ -](\d{4})$/)) && MONTHS.includes(m[1])) {
    return monthRange(+m[2], MONTHS.indexOf(m[1]) + 1);
  }
  if ((m = s.match(/^(\d{4})$/))) return [iso(+m[1], 1, 1), iso(+m[1], 12, 31)];
  return null;
};

/*
 * The dates a period value covers, as [start, end] in yyyy-mm-dd, or null
 * when it can't be read: a date (2023-07-15, 20230715, or 7/15/2023, month
 * first unless the first number is above 12), a month (2023-07, 202307,
 * July 2023), a quarter (2023Q3, 2023 Q3, Q3 2023, or 20233 as BMI writes
 * it), a year, or two of these joined by " - " or " to ".
 */
export const readPeriod = (text) => {
  const s = (text || '').trim().toUpperCase();
  const parts = s.split(/\s+(?:-|–|TO)\s+/);
  if (parts.length > 2) return null;
  const ranges = parts.map(readOne);
  if (ranges.some((r) => !r)) return null;
  const start = ranges[0][0];
  const end = ranges[ranges.length - 1][1];
  const year = +start.slice(0, 4);
  return end >= start && year >= 1900 && year <= 2200 ? [start, end] : null;
};

// The period of one row from its period columns. A bare year and a bare
// quarter (3 or Q3) in separate columns, as ASCAP gives its distribution
// year and quarter, are read as that quarter. Returns null when the columns
// are blank, false when they can't be read.
const rowPeriod = (values) => {
  let rest = values.map((v) => (v || '').trim()).filter(Boolean);
  if (!rest.length) return null;
  const ranges = [];
  const y = rest.findIndex((v) => /^\d{4}$/.test(v));
  const q = rest.findIndex((v) => /^Q?[1-4]$/i.test(v));
  if (y >= 0 && q >= 0) {
    ranges.push(quarterRange(+rest[y], +rest[q].replace(/q/i, '')));
    rest = rest.filter((v, i) => i !== y && i !== q);
  }
  for (const v of rest) {
    const r = readPeriod(v);
    if (!r) return false;
    ranges.push(r);
  }
  return [ranges.map((r) => r[0]).sort()[0], ranges.map((r) => r[1]).sort().at(-1)];
};

/*
 * Whether a file writes amounts 1,234.56 or 1.234,56, from the values
 * themselves. In a value with both marks the later one is the decimal mark;
 * a mark that appears twice separates thousands; a lone mark followed by
 * other than three digits is the decimal mark. A lone mark followed by
 * exactly three digits says nothing. Period when nothing tells.
 */
export const detectDecimal = (values) => {
  let comma = 0;
  let period = 0;
  for (const v of values) {
    const s = (v || '').replace(/[^\d.,]/g, '');
    const c = s.lastIndexOf(',');
    const p = s.lastIndexOf('.');
    if (c >= 0 && p >= 0) {
      if (c > p) comma += 1; else period += 1;
    } else if (c >= 0) {
      if (s.indexOf(',') !== c) period += 1;
      else if (!/,\d{3}$/.test(s)) comma += 1;
    } else if (p >= 0) {
      if (s.indexOf('.') !== p) comma += 1;
      else if (!/\.\d{3}$/.test(s)) period += 1;
    }
  }
  return comma > period ? ',' : '.';
};

export const parseAmount = (text, decimal) => {
  let s = (text || '').trim();
  if (s === '' || s === '-') return { value: 0, blank: true };
  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
  if (/-$/.test(s)) { negative = true; s = s.slice(0, -1); }
  s = s.replace(/[\s$€£¥]/g, '').replace(/^[A-Z]{3}/, '').replace(/[A-Z]{3}$/, '');
  s = decimal === ',' ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return { error: true };
  const value = Number(s);
  return { value: negative ? -Math.abs(value) : value };
};

const steps = ['File', 'Rows', 'Columns', 'Check'];

const Preview = ({ headers, rows, max = 8 }) => (
  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 360 }}>
    <Table size="small" stickyHeader>
      <TableHead>
        <TableRow>
          <TableCell>Row</TableCell>
          {headers.map((h) => <TableCell key={h} sx={{ whiteSpace: 'nowrap' }}>{h}</TableCell>)}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.slice(0, max).map((r) => (
          <TableRow key={r.rowNumber}>
            <TableCell>{r.rowNumber}</TableCell>
            {r.cells.map((v, i) => <TableCell key={i} sx={{ whiteSpace: 'nowrap' }}>{v}</TableCell>)}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

export const ImportWizard = ({ fields, initialMapping, onImport, warn, importLabel = 'Import' }) => {
  const inputRef = useRef(null);
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [headerIndex, setHeaderIndex] = useState(0);
  const [skipEnd, setSkipEnd] = useState(0);
  const [autoSkip, setAutoSkip] = useState(0);
  const [mapping, setMapping] = useState({});
  const [dates, setDates] = useState({});
  const [leaveOut, setLeaveOut] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [over, setOver] = useState(false);

  const sheet = sheets[sheetIndex];
  const headers = useMemo(
    () => (sheet ? uniqueHeaders(sheet.rows[headerIndex] || []) : []),
    [sheet, headerIndex]);

  // A file that ends with a totals row starts with it left out; the user
  // can set the count back to keep it.
  useEffect(() => {
    const n = sheet ? trailingTotals(sheet.rows, headerIndex) : 0;
    setSkipEnd(n);
    setAutoSkip(n);
  }, [sheet, headerIndex]);

  const dataRows = useMemo(() => {
    if (!sheet) return [];
    const body = sheet.rows
      .map((cells, i) => ({ cells, rowNumber: sheet.firstRow + i }))
      .slice(headerIndex + 1);
    const kept = skipEnd > 0 ? body.slice(0, Math.max(0, body.length - skipEnd)) : body;
    return kept.filter((r) => !blank(r.cells));
  }, [sheet, headerIndex, skipEnd]);

  // The first value in each column, shown beside its name in the pickers.
  const samples = useMemo(() => {
    const out = {};
    headers.forEach((h, i) => {
      out[h] = dataRows.find((r) => (r.cells[i] ?? '') !== '')?.cells[i] ?? '';
    });
    return out;
  }, [headers, dataRows]);

  const startMapping = (hdrs) => {
    const next = {};
    fields.forEach((f) => {
      const saved = (initialMapping?.[f.key] || []).filter((h) => hdrs.includes(h));
      next[f.key] = saved.length ? saved : guessColumns(f, hdrs);
    });
    setMapping(next);
  };

  // The columns saved from an earlier import may arrive after the Columns
  // step opened, when the target they depend on is chosen late.
  useEffect(() => {
    if (step === 2 && initialMapping) startMapping(headers);
  }, [initialMapping]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = async (f) => {
    if (!f) return;
    setError(null);
    setBusy('Reading the file');
    try {
      const read = await readSheets(f);
      const first = Math.max(0, read.findIndex((s) => s.rows.length > 0));
      if (!read[first]?.rows.length) throw new Error('The file has no rows.');
      setFile(f);
      setSheets(read);
      setSheetIndex(first);
      setHeaderIndex(guessHeaderRow(read[first].rows));
      setStep(1);
    } catch (e) {
      setError(e.message || 'Could not read the file.');
    } finally {
      setBusy(null);
      setOver(false);
    }
  };

  const checked = useMemo(() => {
    if (step < 3) return null;
    const amountFields = fields.filter((f) => f.amount);
    const amountColumns = amountFields.flatMap((f) => mapping[f.key] || [])
      .map((h) => headers.indexOf(h));
    const decimal = detectDecimal(dataRows.flatMap((r) => amountColumns.map((i) => r.cells[i])));
    const periodFields = fields.filter((f) => f.period);
    const dateFields = fields.filter((f) => f.date);
    const periods = Object.fromEntries(periodFields.map((f) =>
      [f.key, { start: null, end: null, read: 0, unread: 0 }]));
    const dateRead = Object.fromEntries(dateFields.map((f) => [f.key, null]));
    const problems = [];
    let blanks = 0;
    let total = 0;
    const rows = dataRows.map((r) => {
      const data = {};
      headers.forEach((h, i) => { data[h] = r.cells[i] ?? ''; });
      const row = { row_number: r.rowNumber, data, problems: [] };
      amountFields.forEach((f) => {
        let sum = 0;
        let allBlank = true;
        (mapping[f.key] || []).forEach((h) => {
          const a = parseAmount(data[h], decimal);
          if (a.error) row.problems.push(`${h} is not an amount: "${data[h]}"`);
          else { sum += a.value; if (!a.blank) allBlank = false; }
        });
        if (allBlank) blanks += 1;
        row[f.key] = sum;
        total += sum;
      });
      periodFields.forEach((f) => {
        const cols = mapping[f.key] || [];
        const p = cols.length ? rowPeriod(cols.map((h) => data[h])) : null;
        const t = periods[f.key];
        row[`${f.key}_start`] = p ? p[0] : null;
        row[`${f.key}_end`] = p ? p[1] : null;
        if (p === false) t.unread += 1;
        else if (p) {
          t.read += 1;
          if (!t.start || p[0] < t.start) t.start = p[0];
          if (!t.end || p[1] > t.end) t.end = p[1];
        }
      });
      dateFields.forEach((f) => {
        (mapping[f.key] || []).forEach((h) => {
          const p = readPeriod(data[h]);
          if (p && (!dateRead[f.key] || p[0] > dateRead[f.key])) dateRead[f.key] = p[0];
        });
      });
      fields.filter((f) => f.required && !f.amount && !f.period && !f.date).forEach((f) => {
        if (!(mapping[f.key] || []).some((h) => data[h] !== '')) {
          row.problems.push(`${f.label} is blank`);
        }
      });
      if (row.problems.length) problems.push(row);
      return row;
    });
    return { rows, problems, blanks, total, decimal, periods, dates: dateRead };
  }, [step, dataRows, headers, mapping, fields]);

  // Each date starts as read from its column whenever the check runs; the
  // user may correct it before importing.
  const datesRead = JSON.stringify(checked?.dates ?? {});
  useEffect(() => { setDates(JSON.parse(datesRead)); }, [datesRead]);
  const dateMissing = fields.some((f) => f.date && f.required && !dates[f.key]);

  const warning = step === 3 && warn ? warn(dates) : null;
  useEffect(() => { setConfirmed(false); }, [warning]);

  const missingFields = fields.filter((f) => f.required && !f.date && !(mapping[f.key] || []).length);

  const finish = async () => {
    setError(null);
    setBusy('Importing');
    try {
      const rows = checked.rows
        .filter((r) => !r.problems.length)
        .map(({ problems, ...r }) => r);
      await onImport({ file, rows, mapping, sheet: sheet.name, dates });
    } catch (e) {
      setError(e.body?.message || e.message || 'The import failed.');
    } finally {
      setBusy(null);
    }
  };

  const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
  const canImport = checked && checked.rows.length > 0
    && (checked.problems.length === 0 || leaveOut)
    && checked.rows.length > checked.problems.length
    && !dateMissing
    && (!warning || confirmed);

  return (
    <Stack spacing={2} sx={{ width: '100%' }}>
      <Stepper activeStep={step} alternativeLabel>
        {steps.map((s) => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
      </Stepper>

      {error && <Alert severity="error">{error}</Alert>}
      {busy && <LinearProgress />}

      {step === 0 && (
        <Box
          onClick={() => !busy && inputRef.current?.click()}
          onDragEnter={(e) => { stop(e); setOver(true); }}
          onDragOver={stop}
          onDragLeave={(e) => { stop(e); setOver(false); }}
          onDrop={(e) => { stop(e); pick(e.dataTransfer.files?.[0]); }}
          sx={{
            border: '2px dashed', borderColor: over ? 'primary.main' : 'divider',
            bgcolor: over ? 'action.hover' : 'transparent', borderRadius: 1,
            px: 2, py: 4, textAlign: 'center', cursor: busy ? 'default' : 'pointer',
          }}
        >
          <UploadIcon sx={{ color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {busy ?? 'Drop a CSV, TSV, XLS or XLSX file here, or click to browse'}
          </Typography>
          <input ref={inputRef} type="file" hidden
                 accept=".csv,.tsv,.tab,.txt,.xls,.xlsx"
                 onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        </Box>
      )}

      {step === 1 && sheet && (
        <Stack spacing={2}>
          <Typography variant="body2">
            {file.name}: {sheet.rows.length} rows. Pick the row that holds the column
            names. Rows above it are left out; blank rows are always left out.
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {sheets.length > 1 && (
              <TextField select label="Sheet" value={sheetIndex}
                         onChange={(e) => {
                           const i = Number(e.target.value);
                           setSheetIndex(i);
                           setHeaderIndex(guessHeaderRow(sheets[i].rows));
                         }}
                         sx={{ minWidth: 200 }}>
                {sheets.map((s, i) => <MenuItem key={s.name} value={i}>{s.name}</MenuItem>)}
              </TextField>
            )}
            <TextField select label="Header row" value={headerIndex}
                       onChange={(e) => setHeaderIndex(Number(e.target.value))}
                       helperText="The row with the column names"
                       sx={{ minWidth: 320 }}>
              {sheet.rows.slice(0, 50).map((row, i) => (
                <MenuItem key={i} value={i}>
                  {`Row ${sheet.firstRow + i}: ${row.filter(Boolean).slice(0, 4).join(', ')}`.slice(0, 80)}
                </MenuItem>
              ))}
            </TextField>
            <TextField type="number" label="Rows to leave out at the end" value={skipEnd}
                       onChange={(e) => setSkipEnd(Math.max(0, Number(e.target.value) || 0))}
                       helperText={autoSkip && skipEnd === autoSkip
                         ? 'The file ends with a totals row, so it is left out. Set 0 to keep it.'
                         : 'Such as a totals row'}
                       sx={{ width: 320 }} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {dataRows.length} rows to import. The first few:
          </Typography>
          <Preview headers={headers} rows={dataRows} />
          {dataRows.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              Last row: {dataRows[dataRows.length - 1].rowNumber}
            </Typography>
          )}
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setStep(0)}>Back</Button>
            <Button variant="contained" disabled={!dataRows.length}
                    onClick={() => { startMapping(headers); setStep(2); }}>
              Next
            </Button>
          </Stack>
        </Stack>
      )}

      {step === 2 && (
        <Stack spacing={2}>
          <Typography variant="body2">
            Say which column holds each field. Every column is kept with each row
            whatever you choose here; these only drive matching, totals and dates.
            The first rows of the file:
          </Typography>
          <Preview headers={headers} rows={dataRows} max={5} />
          {fields.map((f) => (
            <Autocomplete
              key={f.key}
              multiple
              options={headers}
              value={mapping[f.key] || []}
              onChange={(e, v) => setMapping({ ...mapping, [f.key]: f.multiple ? v : v.slice(-1) })}
              renderOption={({ key, ...props }, h) => (
                <Box component="li" key={key} {...props}
                     sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
                  <span>{h}</span>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: '50%' }}>
                    {samples[h]}
                  </Typography>
                </Box>
              )}
              renderInput={(params) => (
                <TextField {...params} label={f.label + (f.required && !f.date ? ' *' : '')}
                           helperText={f.help} />
              )}
              sx={{ maxWidth: 640 }}
            />
          ))}
          {missingFields.length > 0 && (
            <Alert severity="info">
              Required: {missingFields.map((f) => f.label).join(', ')}
            </Alert>
          )}
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setStep(1)}>Back</Button>
            <Button variant="contained" disabled={missingFields.length > 0}
                    onClick={() => { setLeaveOut(false); setStep(3); }}>
              Next
            </Button>
          </Stack>
        </Stack>
      )}

      {step === 3 && checked && (
        <Stack spacing={2}>
          <Typography variant="body2">
            {checked.rows.length} rows.
            {fields.some((f) => f.amount) && ` Total ${checked.total.toLocaleString(undefined, { maximumFractionDigits: 6 })}.`}
            {checked.blanks > 0 && ` ${checked.blanks} rows have a blank amount, counted as 0.`}
            {checked.decimal === ',' && ' Amounts are read with a decimal comma, as the file writes them (1.234,56).'}
          </Typography>
          {fields.filter((f) => f.date).map((f) => {
            const cols = mapping[f.key] || [];
            const read = checked.dates[f.key];
            return (
              <TextField key={f.key} type="date" label={f.label + (f.required ? ' *' : '')}
                         value={dates[f.key] || ''}
                         onChange={(e) => setDates({ ...dates, [f.key]: e.target.value })}
                         slotProps={{ inputLabel: { shrink: true } }}
                         error={f.required && !dates[f.key]}
                         helperText={read ? `From ${cols.join(', ')}; change it if it is wrong`
                           : cols.length ? `No date could be read from ${cols.join(', ')}; enter it`
                             : 'No column chosen for it; enter it'}
                         sx={{ width: 320 }} />
            );
          })}
          {fields.filter((f) => f.period && (mapping[f.key] || []).length).map((f) => {
            const t = checked.periods[f.key];
            return (
              <Alert key={f.key} severity={t.read ? 'info' : 'warning'}>
                {t.read
                  ? `${f.label}: ${t.read} rows read, from ${t.start} to ${t.end}. Each line keeps its own.`
                  : `${f.label}: nothing in ${(mapping[f.key]).join(', ')} could be read as a date, month, quarter or year.`}
                {t.read > 0 && t.unread > 0
                  && ` ${t.unread} rows could not be read and are imported without one.`}
              </Alert>
            );
          })}
          {warning && (
            <Alert severity="warning">
              {warning}
              <FormControlLabel sx={{ display: 'flex' }}
                control={<Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />}
                label="It is a different statement; import it anyway" />
            </Alert>
          )}
          {checked.problems.length > 0 ? (
            <>
              <Alert severity="warning">
                {checked.problems.length} rows have problems. Fix the file, or leave them out.
              </Alert>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow><TableCell>Row</TableCell><TableCell>Problem</TableCell></TableRow>
                  </TableHead>
                  <TableBody>
                    {checked.problems.slice(0, 200).map((r) => (
                      <TableRow key={r.row_number}>
                        <TableCell>{r.row_number}</TableCell>
                        <TableCell>{r.problems.join('; ')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <FormControlLabel
                control={<Checkbox checked={leaveOut} onChange={(e) => setLeaveOut(e.target.checked)} />}
                label={`Leave out these ${checked.problems.length} rows`} />
            </>
          ) : (
            <Alert severity="success">Every row reads cleanly.</Alert>
          )}
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setStep(2)} disabled={!!busy}>Back</Button>
            <Button variant="contained" onClick={finish} disabled={!canImport || !!busy}>
              {importLabel}
            </Button>
          </Stack>
        </Stack>
      )}
    </Stack>
  );
};
