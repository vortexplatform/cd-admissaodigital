import axios from 'axios';

const apiUrl =
  import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:3001`;

const api = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
});

export default api;
