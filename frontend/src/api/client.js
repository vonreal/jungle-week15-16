const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

function toErrorMessage(detail, fallback) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || item.detail || JSON.stringify(item)).join("\n");
  }
  if (detail && typeof detail === "object") {
    return detail.msg || detail.detail || JSON.stringify(detail);
  }
  return fallback;
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("careerbuddy.token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(toErrorMessage(body.detail, `Request failed: ${response.status}`));
  }

  if (response.status === 204) {
    return null;
  }
  return response.json();
}

export const authApi = {
  signup: (payload) => apiFetch("/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => apiFetch("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => apiFetch("/auth/me"),
};

export const postsApi = {
  list: (params = {}) => apiFetch(`/posts?${new URLSearchParams(params)}`),
  create: (payload) => apiFetch("/posts", { method: "POST", body: JSON.stringify(payload) }),
  get: (postId) => apiFetch(`/posts/${postId}`),
  update: (postId, payload) => apiFetch(`/posts/${postId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  remove: (postId) => apiFetch(`/posts/${postId}`, { method: "DELETE" }),
  comments: (postId) => apiFetch(`/posts/${postId}/comments`),
  createComment: (postId, payload) => apiFetch(`/posts/${postId}/comments`, { method: "POST", body: JSON.stringify(payload) }),
  deleteComment: (postId, commentId) => apiFetch(`/posts/${postId}/comments/${commentId}`, { method: "DELETE" }),
};

export const skillsApi = {
  list: () => apiFetch("/skills"),
  mySkills: () => apiFetch("/skills/me"),
  updateMySkills: (payload) => apiFetch("/skills/me", { method: "PUT", body: JSON.stringify(payload) }),
};
