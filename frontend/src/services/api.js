import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000, // 2 minutes for normal requests
});

// Separate axios instance for video/image uploads with longer timeout
export const uploadApi = axios.create({
  baseURL: API_BASE,
  timeout: 600000, // 10 minutes for uploads
});

// ---------- Students ----------
export const StudentsAPI = {
  list: (params) => api.get("/api/students", { params }).then((r) => r.data),
  get: (id) => api.get(`/api/students/${id}`).then((r) => r.data),
  create: (payload) => api.post("/api/students", payload).then((r) => r.data),
  update: (id, payload) => api.put(`/api/students/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/api/students/${id}`).then((r) => r.data),
};

// ---------- Detection ----------
export const DetectionAPI = {
  image: (file, onProgress) => {
    const fd = new FormData();
    fd.append("file", file);
    return uploadApi
      .post("/api/detect/image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: onProgress,
      })
      .then((r) => r.data);
  },
  video: (file, onProgress) => {
    const fd = new FormData();
    fd.append("file", file);
    return uploadApi
      .post("/api/detect/video", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: onProgress,
      })
      .then((r) => r.data);
  },
};

// ---------- Sessions ----------
export const SessionsAPI = {
  start: (payload) => api.post("/api/sessions/start", payload).then((r) => r.data),
  end: (id) => api.post(`/api/sessions/${id}/end`).then((r) => r.data),
  list: (params) => api.get("/api/sessions", { params }).then((r) => r.data),
  get: (id) => api.get(`/api/sessions/${id}`).then((r) => r.data),
  records: (id) => api.get(`/api/sessions/${id}/records`).then((r) => r.data),
  delete: (id) => api.delete(`/api/sessions/${id}`).then((r) => r.data),
  exportExcelUrl: (id) => `${API_BASE}/api/sessions/${id}/export/excel`,
  overview: () => api.get("/api/sessions/stats/overview").then((r) => r.data),
};

export const HealthAPI = {
  ping: () => api.get("/api/health").then((r) => r.data),
};

export function wsUrl(sessionId) {
  const base = import.meta.env.VITE_WS_URL || window.location.origin.replace(/^http/, "ws");
  return `${base}/ws/attendance/${sessionId}`;
}
