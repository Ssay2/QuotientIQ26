import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("qiq_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export { API };
