import { TextInput, TextArrayInput } from 'react-admin';
import {
  compactCode, iswcValid, isrcValid, gtinValid, isniValid, ipiValid, CODE_MESSAGES as M,
} from '../codes';

// Inputs for ISWC, ISRC, UPC, ISNI and IPI. A pasted code keeps working
// however it was written: spaces, dashes and dots are dropped and letters
// uppercased as you type, and a wrong format or check digit marks the field
// when you save. The database checks the same rules; when it refuses one,
// dbErrors.js marks the same field with the same message.

const asList = (v) => (v == null ? [] : [].concat(v));

// A code input: parse cleans what was typed, check returns a message or
// nothing, and the caller's own validate rules run after it.
const codeInput = ({ source, label, parse, check, placeholder, ...defaults }) => {
  const Input = ({ validate, ...props }) => (
    <TextInput source={source} label={label} parse={parse} placeholder={placeholder}
               validate={[(v) => (v ? check(v) : undefined), ...asList(validate)]}
               {...defaults} {...props} />
  );
  return Input;
};

const compact = (v) => compactCode(v) || null;
const digits = (v) => (v || '').replace(/[^0-9]/g, '') || null;

export const IswcInput = codeInput({
  source: 'iswc', label: 'ISWC', placeholder: 'T0345246801',
  // Ten digits typed without the T get one.
  parse: (v) => { const c = compactCode(v); return (/^[0-9]{10}$/.test(c) ? `T${c}` : c) || null; },
  check: (v) => (!/^T[0-9]{10}$/.test(v) ? M.iswcShape : !iswcValid(v) ? M.iswcDigit : undefined),
});

export const IsrcInput = codeInput({
  source: 'isrc', label: 'ISRC', placeholder: 'USABC2400001', parse: compact,
  check: (v) => (isrcValid(v) ? undefined : M.isrcShape),
});

export const UpcInput = codeInput({
  source: 'upc', label: 'UPC or EAN', parse: digits,
  check: (v) => (!/^[0-9]{12,13}$/.test(v) ? M.upcShape : !gtinValid(v) ? M.upcDigit : undefined),
});

export const IpiInput = codeInput({
  source: 'member_ipi', label: 'IPI name number', parse: digits,
  check: (v) => (ipiValid(v) ? undefined : M.ipiShape),
});

// ISNI is shown in groups of four, as isni.org prints it, and stored compact.
export const IsniInput = codeInput({
  source: 'isni', label: 'ISNI', placeholder: '0000 0000 3618 9600',
  parse: (v) => (v || '').toUpperCase().replace(/[^0-9X]/g, '').slice(0, 16) || null,
  format: (v) => (v || '').replace(/(.{4})(?=.)/g, '$1 '),
  inputProps: { maxLength: 19 },
  check: (v) => (isniValid(v) ? undefined : M.isniShape),
});

// Other ISRCs: each one typed is checked, and the first bad one is named.
export const IsrcArrayInput = ({ validate, ...props }) => (
  <TextArrayInput
    validate={[(list) => {
      const bad = asList(list).find((v) => !isrcValid(compactCode(v)));
      return bad ? `${bad}: ${M.isrcShape}` : undefined;
    }, ...asList(validate)]}
    {...props} />
);
