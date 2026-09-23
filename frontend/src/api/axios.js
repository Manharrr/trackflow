import axios from "axios";

export const getApiBaseUrl = (windowObj = (typeof window !== "undefined" ? window : null)) => {
  const envUrl = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "";
  if (envUrl && !envUrl.includes("duckdns")) {
    return envUrl;
  }
  const hostname = windowObj?.location?.hostname || "";
  const isLocal =
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1";

  if (isLocal) {
    return `http://${hostname || "localhost"}:8000/api`;
  }
  return "https://api.manhargurukkal.site/api";
};

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    config.baseURL = getApiBaseUrl(window);
  }
  return config;
});

export default axiosInstance;

// import axios from "axios";

// const axiosInstance = axios.create({
//   withCredentials: true,
// });

// axiosInstance.interceptors.request.use((config) => {
//   const host = window.location.hostname;
//   config.baseURL = `http://${host}:8000/api`;
//   return config;
// });

// export default axiosInstance;
