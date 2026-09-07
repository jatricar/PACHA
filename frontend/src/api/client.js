import { supabase } from "../lib/supabaseClient";

// In production, set VITE_API_BASE_URL (e.g. https://pacha-backend.onrender.com/api)
// as an environment variable on the hosting platform (Vercel/Netlify/Cloudflare Pages).
// Locally it falls back to the FastAPI dev server on port 8000.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

async function authHeaders(extra = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function parseErrorDetail(res) {
  try {
    const body = await res.json();
    return body.detail || res.statusText;
  } catch (e) {
    return res.statusText;
  }
}

// --- Public (no auth required) ---

export async function fetchCrops() {
  const res = await fetch(`${API_BASE}/crops/`);
  if (!res.ok) throw new Error("Failed to fetch crops database");
  return res.json();
}

// --- Fields (require auth, scoped to the signed-in user) ---

export async function fetchSavedFields() {
  const res = await fetch(`${API_BASE}/fields/`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function fetchUsageSummary() {
  const res = await fetch(`${API_BASE}/fields/usage-summary`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function createField(fieldData) {
  const res = await fetch(`${API_BASE}/fields/`, {
    method: "POST",
    headers: await authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(fieldData)
  });
  if (!res.ok) {
    const detail = await parseErrorDetail(res);
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function deleteField(fieldId) {
  const res = await fetch(`${API_BASE}/fields/${fieldId}`, {
    method: "DELETE",
    headers: await authHeaders()
  });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function analyzeAdhocStress({ latitude, longitude, crop_id, planting_date, variety, maturity_class }) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    crop_id,
    planting_date,
    variety: variety || "Standard Hybrid",
    maturity_class: maturity_class || "medium"
  });
  const res = await fetch(`${API_BASE}/stress/analyze?${params.toString()}`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

// --- Admin (require the signed-in user's email to be in ADMIN_EMAILS) ---

export async function fetchAdminUsers() {
  const res = await fetch(`${API_BASE}/admin/users`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function fetchAdminUsageSummary() {
  const res = await fetch(`${API_BASE}/admin/usage-summary`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

export async function updateUserTier(userId, tier) {
  const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(userId)}/tier?tier=${tier}`, {
    method: "PATCH",
    headers: await authHeaders()
  });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}
