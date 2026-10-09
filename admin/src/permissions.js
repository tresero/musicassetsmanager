import { usePermissions } from 'react-admin';

/*
 * The signed-in user's role, permission codes and site admin flag come from
 * api.me and are read fresh, so a role change applies without signing in
 * again. The database enforces every permission; these only hide what the
 * role can't use.
 */
export const fetchPermissions = async () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  const res = await fetch('/api/rpc/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok ? res.json() : null;
};

export const can = (permissions, code) =>
  !!permissions?.permissions?.includes(code);

export const useCan = (code) => can(usePermissions().permissions, code);

export const useIsSiteAdmin = () => !!usePermissions().permissions?.site_admin;
