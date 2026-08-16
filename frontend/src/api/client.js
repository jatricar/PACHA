// In production, set VITE_API_BASE_URL (e.g. https://pacha-backend.onrender.com/api)
// as an environment variable on the hosting platform (Vercel/Netlify/Cloudflare Pages).
// Locally it falls back to the FastAPI dev server on port 8000.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

export async function fetchCrops() {
  const res = await fetch(`${API_BASE}/crops/`);
  if (!res.ok) throw new Error("Failed to fetch crops database");
  return res.json();
}

export async function fetchSavedFields() {
  const res = await fetch(`${API_BASE}/fields/`);
  if (!res.ok) throw new Error("Failed to fetch fields");
  return res.json();
}

export async function createField(fieldData) {
  const res = await fetch(`${API_BASE}/fields/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fieldData)
  });
  if (!res.ok) throw new Error("Failed to create field");
  return res.json();
}

export async function deleteField(fieldId) {
  const res = await fetch(`${API_BASE}/fields/${fieldId}`, {
    method: "DELETE"
  });
  if (!res.ok) throw new Error("Failed to delete field");
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
  const res = await fetch(`${API_BASE}/stress/analyze?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to analyze plant stress");
  return res.json();
}
