const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

const ERROR_TRANSLATIONS = new Map([
  ["Invalid credentials", "이메일 또는 비밀번호가 올바르지 않습니다."],
  ["Email already exists", "이미 가입된 이메일입니다."],
  ["Invalid token", "로그인 정보가 유효하지 않습니다. 다시 로그인해주세요."],
  ["User not found", "사용자를 찾을 수 없습니다."],
  ["Post not found", "게시글을 찾을 수 없습니다."],
  ["Comment not found", "댓글을 찾을 수 없습니다."],
  ["Unknown skill_id", "알 수 없는 스킬 정보입니다."],
  ["Forbidden", "권한이 없습니다."],
  ["Current password is incorrect", "현재 비밀번호가 올바르지 않습니다."],
  ["Analysis not found", "분석 결과를 찾을 수 없습니다."],
  ["source_url is required", "채용공고 링크를 입력해주세요."],
  ["raw_text is required", "채용공고 내용을 입력해주세요."],
  ["JD not found", "채용공고를 찾을 수 없습니다."],
  ["채용공고 링크를 입력해주세요.", "채용공고 링크를 입력해주세요."],
  ["채용공고 내용을 입력해주세요.", "채용공고 내용을 입력해주세요."],
  ["채용공고를 찾을 수 없습니다.", "채용공고를 찾을 수 없습니다."],
]);

function translateErrorMessage(message, fallback = "요청 처리에 실패했습니다.") {
  if (!message) return fallback;
  if (ERROR_TRANSLATIONS.has(message)) return ERROR_TRANSLATIONS.get(message);
  if (message.includes("String should have at least")) return "입력값이 너무 짧습니다.";
  if (message.includes("String should have at most")) return "입력값이 너무 깁니다.";
  if (message.includes("Field required")) return "필수 값을 입력해주세요.";
  if (message.includes("Input should be a valid email")) return "올바른 이메일 형식으로 입력해주세요.";
  if (message.includes("Input should be greater than or equal to")) return "입력값이 허용 범위보다 작습니다.";
  if (message.includes("Input should be less than or equal to")) return "입력값이 허용 범위보다 큽니다.";
  if (message.startsWith("Request failed")) return fallback;
  return message;
}

function toErrorMessage(detail, fallback) {
  if (typeof detail === "string") return translateErrorMessage(detail, fallback);
  if (Array.isArray(detail)) {
    return detail
      .map((item) => translateErrorMessage(item.msg || item.detail || JSON.stringify(item), fallback))
      .join("\n");
  }
  if (detail && typeof detail === "object") {
    return translateErrorMessage(detail.msg || detail.detail || JSON.stringify(detail), fallback);
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
    throw new Error(toErrorMessage(body.detail, `요청 처리에 실패했습니다. (${response.status})`));
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
  updateMe: (payload) => apiFetch("/auth/me", { method: "PATCH", body: JSON.stringify(payload) }),
  changePassword: (payload) => apiFetch("/auth/me/password", { method: "PATCH", body: JSON.stringify(payload) }),
  deleteMe: (payload) => apiFetch("/auth/me", { method: "DELETE", body: JSON.stringify(payload) }),
};

export const postsApi = {
  list: (params = {}) => apiFetch(`/posts?${new URLSearchParams(params)}`),
  drafts: () => apiFetch("/posts/drafts/me"),
  create: (payload) => apiFetch("/posts", { method: "POST", body: JSON.stringify(payload) }),
  get: (postId) => apiFetch(`/posts/${postId}`),
  update: (postId, payload) => apiFetch(`/posts/${postId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  remove: (postId) => apiFetch(`/posts/${postId}`, { method: "DELETE" }),
  applicationStatus: (postId) => apiFetch(`/posts/${postId}/applications/me`),
  myApplications: () => apiFetch("/posts/applications/me"),
  apply: (postId) => apiFetch(`/posts/${postId}/applications`, { method: "POST" }),
  cancelApplication: (postId) => apiFetch(`/posts/${postId}/applications/me`, { method: "DELETE" }),
  applications: (postId) => apiFetch(`/posts/${postId}/applications`),
  updateApplication: (postId, applicationId, payload) => apiFetch(`/posts/${postId}/applications/${applicationId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  comments: (postId) => apiFetch(`/posts/${postId}/comments`),
  createComment: (postId, payload) => apiFetch(`/posts/${postId}/comments`, { method: "POST", body: JSON.stringify(payload) }),
  updateComment: (postId, commentId, payload) => apiFetch(`/posts/${postId}/comments/${commentId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteComment: (postId, commentId) => apiFetch(`/posts/${postId}/comments/${commentId}`, { method: "DELETE" }),
};

export const skillsApi = {
  list: () => apiFetch("/skills"),
  mySkills: () => apiFetch("/skills/me"),
  updateMySkills: (payload) => apiFetch("/skills/me", { method: "PUT", body: JSON.stringify(payload) }),
};

export const jdApi = {
  list: () => apiFetch("/jd"),
  analyses: () => apiFetch("/jd/analyses"),
  create: (payload) => apiFetch("/jd", { method: "POST", body: JSON.stringify(payload) }),
  analyze: (jdId) => apiFetch(`/jd/${jdId}/analyze`, { method: "POST" }),
};
