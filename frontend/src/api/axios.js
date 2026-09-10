import axios from "axios";

const axiosInstance = axios.create({
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const host = window.location.hostname;
  config.baseURL = `http://${host}:8000/api`;
  return config;
});

export default axiosInstance;
