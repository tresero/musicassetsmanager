const API = '/api';

export default {
  login: async ({ username, password }) => {
    const res = await fetch(`${API}/rpc/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: username, pass: password }),
    });
    if (!res.ok) throw new Error('Invalid credentials');
    const { token } = await res.json();
    if (!token) throw new Error('Invalid credentials');
    localStorage.setItem('token', token);
  },
  logout: () => {
    localStorage.removeItem('token');
    return Promise.resolve();
  },
  checkAuth: () =>
    localStorage.getItem('token') ? Promise.resolve() : Promise.reject(),
  checkError: ({ status }) => {
    if (status === 401) {
      localStorage.removeItem('token');
      return Promise.reject();
    }
    return Promise.resolve();
  },
  getIdentity: () => Promise.resolve({ id: 'me' }),
  getPermissions: () => Promise.resolve(''),
};