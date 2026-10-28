import { request } from "./client.js";

/** @returns {Promise<{user: {id: number, username: string} | null}>} */
export const getSession = () => request("/auth/session/");

export const register = (username, password) =>
  request("/auth/register/", { method: "POST", body: { username, password } });

export const login = (username, password) =>
  request("/auth/login/", { method: "POST", body: { username, password } });

export const logout = () => request("/auth/logout/", { method: "POST" });
