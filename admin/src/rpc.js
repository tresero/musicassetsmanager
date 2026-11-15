// Calls a PostgREST function in the api schema as the signed-in user, and
// returns its JSON. Errors carry the database's message.
export const rpc = async (name, body) => {
  const res = await fetch(`/api/rpc/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message || `Request failed (${res.status})`);
  return json;
};
