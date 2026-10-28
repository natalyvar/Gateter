let currentUser = null;
const listeners = new Set();

export const getUser = () => currentUser;

export const isOwner = (username) =>
  currentUser !== null && currentUser.username.toLowerCase() === username.toLowerCase();

export function setUser(user) {
  currentUser = user;
  listeners.forEach((listener) => listener(currentUser));
}

/** @returns {() => void} función para cancelar la suscripción */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
