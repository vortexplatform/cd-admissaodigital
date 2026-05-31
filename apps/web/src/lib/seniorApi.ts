import axios from 'axios';

const seniorApiBaseURL = import.meta.env.VITE_SENIOR_API_URL ?? 'http://localhost:4401';
const seniorTokenStorageKey = 'senior_access_token';

const seniorApi = axios.create({
  baseURL: seniorApiBaseURL,
});

const seniorAuthApi = axios.create({
  baseURL: seniorApiBaseURL,
});

let tokenRequest: Promise<string> | null = null;

const signInSeniorApi = async () => {
  const cpf = import.meta.env.VITE_SENIOR_API_CPF;
  const password = import.meta.env.VITE_SENIOR_API_PASSWORD;

  if (!cpf || !password) {
    throw new Error('Credenciais da API Senior não configuradas.');
  }

  const { data } = await seniorAuthApi.post<{ token: string }>('/auth/signin', { cpf, password });
  localStorage.setItem(seniorTokenStorageKey, data.token);

  return data.token;
};

const getSeniorToken = async () => {
  const storedToken = localStorage.getItem(seniorTokenStorageKey);
  if (storedToken) return storedToken;

  tokenRequest ??= signInSeniorApi().finally(() => {
    tokenRequest = null;
  });

  return tokenRequest;
};

seniorApi.interceptors.request.use(async (config) => {
  const token = await getSeniorToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  return config;
});

seniorApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(seniorTokenStorageKey);
    }

    return Promise.reject(error);
  },
);

export default seniorApi;
