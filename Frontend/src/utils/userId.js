export const USER_ID_STORAGE_KEY = "fill-the-hole-user-id";

export function getUserId() {
  let userId = window.localStorage.getItem(USER_ID_STORAGE_KEY);
  if (!userId) {
    userId = window.crypto.randomUUID();
    window.localStorage.setItem(USER_ID_STORAGE_KEY, userId);
  }
  return userId;
}
