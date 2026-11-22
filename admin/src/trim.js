// Text pasted into a form often brings spaces or a line break at either end,
// as with an IPI copied from a society portal. Every create and update trims
// them before saving (dataProvider.js), child rows included. Text that is only
// whitespace counts as empty: null in a field, left out of a list.
export const trimText = (value) => {
  if (typeof value === 'string') {
    const t = value.trim();
    return t === '' ? null : t;
  }
  if (Array.isArray(value)) {
    return value
      .filter((v) => !(typeof v === 'string' && v.trim() === ''))
      .map(trimText);
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, trimText(v)]));
  }
  return value;
};
