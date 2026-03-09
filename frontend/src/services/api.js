const API_BASE = "/api";
const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized";

function notifyUnauthorized(token, message) {
  if (!token || typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(AUTH_UNAUTHORIZED_EVENT, {
      detail: { message },
    })
  );
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });
  const raw = query.toString();
  return raw ? `?${raw}` : "";
}

async function request(path, { token, headers = {}, body, method = "GET" } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const message = payload?.message || "Erro inesperado";
    if (response.status === 401) {
      notifyUnauthorized(token, message);
    }
    throw new Error(message);
  }

  return payload;
}

export async function apiBlob(path, { token, method = "GET" } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    let message = "Erro inesperado";
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const payload = await response.json();
      message = payload?.message || message;
    }
    if (response.status === 401) {
      notifyUnauthorized(token, message);
    }
    throw new Error(message);
  }

  return response.blob();
}

export function apiJson(path, { token, method = "GET", data } = {}) {
  return request(path, {
    token,
    method,
    headers: { "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });
}

export function apiForm(path, { token, method = "POST", formData } = {}) {
  return request(path, {
    token,
    method,
    body: formData,
  });
}

export { buildQuery };
export { AUTH_UNAUTHORIZED_EVENT };
