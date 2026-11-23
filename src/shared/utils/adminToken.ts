const KEY = "discovr.adminToken";
/** Fired when the API says the admin token is missing or expired, so the login screen can come back. */
export const ADMIN_SIGNED_OUT = "discovr-admin-signed-out";

export const readAdminToken = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
export const writeAdminToken = (token: string) => localStorage.setItem(KEY, token);
export const clearAdminToken = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {}
};
export const signOutAdmin = () => {
  clearAdminToken();
  window.dispatchEvent(new Event(ADMIN_SIGNED_OUT));
};
