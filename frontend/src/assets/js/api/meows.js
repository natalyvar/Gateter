import { request } from "./client.js";

export const createMeow = (content) => request("/meows/", { method: "POST", body: { content } });
