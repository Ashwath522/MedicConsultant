const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'ck_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401 && token) {
    setToken(null);
    window.location.href = '/login';
  }
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const d = await res.json();
      msg = typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail);
    } catch { /* ignore */ }
    throw new ApiError(res.status, msg);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

/** Multipart upload (audio, images). Don't set Content-Type: the browser adds the boundary. */
export async function upload<T = unknown>(path: string, form: FormData): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try { const d = await res.json(); msg = typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail); } catch { /* ignore */ }
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export const fmtTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// ---- Types (mirror backend/app/schemas.py) ----
export interface Segment { start: number; end: number; text: string }
export interface Consultation {
  id: string; episode_id: string; consent_given: boolean; language: string; duration_sec: number;
  transcript: Segment[]; summary: string; audio_deleted: boolean; recorded_at: string;
}
export interface Profile {
  id: string; email: string; name: string; age: number | null; language: string;
  allergies: string[]; chronic_conditions: string[]; regular_medicines: string[];
  wake_time: string; breakfast_time: string; lunch_time: string; dinner_time: string; bed_time: string;
}
export interface Contact {
  id: string; type: 'family' | 'doctor'; name: string; phone: string; relation: string; caregiver_alerts: boolean;
}
export interface Episode {
  id: string; title: string; category: string; issue_description: string; start_date: string; status: 'active' | 'closed';
}
