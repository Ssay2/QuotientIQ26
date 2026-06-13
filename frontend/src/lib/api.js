import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// All auth is via httpOnly cookies (set by backend with SameSite=None; Secure).
// withCredentials ensures the browser sends them on every cross-origin request.
export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export { API };
