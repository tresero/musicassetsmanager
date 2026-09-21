    import { TextInput } from 'react-admin';

// ISNI is 16 characters: 15 digits and a check character that may be X.
// The spaced grouping is a display convention, not part of the value, so
// strip it on the way in and put it back on the way out. That way the
// number can be pasted straight from isni.org.
const parse = (v) =>
  (v || '').toUpperCase().replace(/[^0-9X]/g, '').slice(0, 16) || null;

const format = (v) =>
  (v || '').replace(/(.{4})(?=.)/g, '$1 ');

export const IsniInput = (props) => (
  <TextInput
    parse={parse}
    format={format}
    placeholder="0000 0000 3618 9600"
    inputProps={{ maxLength: 19 }}
    {...props}
  />
);
