export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://carboncredit-guardian.onrender.com";

export type Verification = {
  expected_kwh_total: number;
  reported_kwh_total: number;
  expected_monthly_kwh: number[];
  anomaly_months: number[];
  risk_score_bp: number;
  passed: boolean;
  avoided_tco2: number;
  created_at: string;
};

export type Project = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  capacity_kwp: number;
  owner_address: string;
  status: string;
  created_at: string;
  monthly_kwh: number[];
  latest_verification: Verification | null;
};

export type NewProject = {
  name: string;
  latitude: number;
  longitude: number;
  capacity_kwp: number;
  owner_address: string;
  monthly_kwh: number[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail =
        typeof body.detail === "string"
          ? body.detail
          : JSON.stringify(body.detail);
    } catch {
      // ignore: response had no JSON body
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const getProjects = () => request<Project[]>("/projects");
export const getProject = (id: number | string) =>
  request<Project>(`/projects/${id}`);
export const createProject = (body: NewProject) =>
  request<{ id: number }>("/projects", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const kwhToMwh = (kwh: number) => kwh / 1000;
export const riskScore = (bp: number) => Math.round(bp / 100);
