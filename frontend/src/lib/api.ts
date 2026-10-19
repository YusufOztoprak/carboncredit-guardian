export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://carboncredit-guardian.onrender.com";

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
        typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      // ignore: response had no JSON body
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const getProjects = () => request<Project[]>("/projects");
export const getProject = (id: number | string) => request<Project>(`/projects/${id}`);
export const createProject = (body: NewProject) =>
  request<{ id: number }>("/projects", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const verifyProject = (id: number | string) =>
  request<unknown>(`/projects/${id}/verify`, { method: "POST" });

export const mintProject = (id: number | string) =>
  request<{ tx_hash?: string } | null>(`/projects/${id}/mint`, { method: "POST" });

export const getHistory = (id: number | string) =>
  request<unknown>(`/credits/${id}/history`);

export const kwhToMwh = (kwh: number) => kwh / 1000;
export const riskScore = (bp: number) => Math.round(bp / 100);

export type HistoryEvent = {
  type: "minted" | "transferred" | "retired" | "other";
  txHash?: string;
  explorerUrl?: string;
  from?: string;
  to?: string;
  amount?: string;
  beneficiary?: string;
  reason?: string;
  time?: string;
};

export type HistoryTotals = {
  minted: number;
  transferred: number;
  retired: number;
  outstanding: number;
  syncError?: string;
};

export function parseHistoryTotals(raw: unknown): HistoryTotals {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const n = (v: unknown) => Number(v ?? 0) || 0;
  return {
    minted: n(o.minted),
    transferred: n(o.transferred),
    retired: n(o.retired),
    outstanding: n(o.outstanding),
    syncError: typeof o.sync_error === "string" ? o.sync_error : undefined,
  };
}

export function normalizeHistory(raw: unknown): HistoryEvent[] {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list =
    [raw, obj.events, obj.timeline, obj.history, obj.items].find(
      (c): c is unknown[] => Array.isArray(c)
    ) ?? [];

  return list.map((item) => {
    const e = (item ?? {}) as Record<string, unknown>;
    const pick = (...keys: string[]) => {
      for (const k of keys) {
        const v = e[k];
        if (v !== undefined && v !== null && v !== "") return String(v);
      }
      return undefined;
    };
    const kind = (pick("event_type", "type", "event", "kind", "name") ?? "").toLowerCase();
    const type: HistoryEvent["type"] = kind.includes("mint")
      ? "minted"
      : kind.includes("retire")
      ? "retired"
      : kind.includes("transfer")
      ? "transferred"
      : "other";
    return {
      type,
      txHash: pick("tx_hash", "transaction_hash", "txHash", "hash"),
      explorerUrl: pick("explorer_url"),
      from: pick("from_address", "from", "sender"),
      to: pick("to_address", "to", "recipient"),
      amount: pick("amount", "value", "quantity"),
      beneficiary: pick("beneficiary"),
      reason: pick("reason"),
      time: pick("block_timestamp", "timestamp", "created_at", "time"),
    };
  });
}
