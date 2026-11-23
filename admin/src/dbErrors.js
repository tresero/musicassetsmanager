import { HttpError } from 'react-admin';
import { CODE_MESSAGES as M } from './codes';

// When the database refuses a save over a named constraint, mark the field it
// belongs to, in red with a plain message, instead of showing PostgreSQL's
// wording in a notification. React Admin reads body.errors on a refused save
// (pessimistic edits and creates) and sets those fields' errors.
//
// field is the view column the form edits; an object picks it per resource.
// Constraints with no field still get the plain message, as a notification.
// A constraint not listed keeps the database's own message.
const CONSTRAINTS = {
  iswc_format: { field: 'iswc', message: M.iswcShape },
  iswc_check_digit: { field: 'iswc', message: M.iswcDigit },
  song_iswc_key: { field: 'iswc', message: 'Another song already has this ISWC' },
  isrc_format: { field: 'isrc', message: M.isrcShape },
  recording_isrc_key: { field: 'isrc', message: 'Another recording already has this ISRC' },
  recording_isrc_unique: { field: 'other_isrcs', message: 'One of these ISRCs is already on another recording' },
  release_upc_valid: { field: 'upc', message: M.upcDigit },
  release_upc_unique: { field: 'upc', message: 'Another release already has this UPC' },
  release_distribution_upc_valid: { message: `A distributor's UPC is wrong. ${M.upcDigit}` },
  isni_format: { field: { artist: 'isni_own', default: 'isni' }, message: M.isniShape },
  artist_isni_key: { field: 'isni_own', message: 'Another artist already has this ISNI' },
  contact_isni_key: { field: 'isni', message: 'Another person already has this ISNI' },
  organization_isni_key: { field: 'isni', message: 'Another company already has this ISNI' },
  isni_check_digit: { field: { artist: 'isni_own', default: 'isni' }, message: M.isniDigit },
  ipi_format: { field: 'member_ipi', message: M.ipiShape },
  ipi_check_digit: { field: 'member_ipi', message: M.ipiDigit },
  contact_ipi_key: { field: 'member_ipi', message: 'Another person already has this IPI name number' },
  organization_ipi_key: { field: 'member_ipi', message: 'Another company already has this IPI name number' },
  email_format: { field: { account_mail: 'from_address' }, message: 'This is not an email address' },
  account_mail_port_check: { field: 'smtp_port', message: 'A port is a number from 1 to 65535, usually 587 or 465' },
  account_mail_security_check: { field: 'smtp_security', message: 'Choose STARTTLS or SSL/TLS' },
  account_mail_business_address_check: { field: 'from_address', message: 'Use an address at your own domain. Personal addresses such as Gmail, iCloud or Outlook.com cannot send from the app' },
  account_mail_service_check: { field: 'smtp_host', message: 'That is a mailbox server (Google Workspace, Microsoft 365 and the like), which cannot send in bulk. Use a sending service such as Amazon SES' },
};

const fieldFor = (field, resource) =>
  (field && typeof field === 'object' ? field[resource] ?? field.default : field);

export const explainDbError = (resource, error) => {
  const name = /constraint "([^"]+)"/.exec(error?.body?.message ?? error?.message ?? '')?.[1];
  const known = name && CONSTRAINTS[name];
  if (!known) return error;
  const field = fieldFor(known.field, resource);
  return new HttpError(known.message, error.status,
    field ? { ...error.body, errors: { [field]: known.message } } : error.body);
};
