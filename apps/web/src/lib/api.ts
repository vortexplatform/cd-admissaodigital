import axios from 'axios';

const apiUrl =
  import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:5011`;

const api = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
});

export default api;
