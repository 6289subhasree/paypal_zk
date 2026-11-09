export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TOKEN_KEY = "zkpass.token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable: session lasts until reload */
  }
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

function messageFrom(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d?.msg ?? String(d)).join("; ");
  if (detail && typeof detail === "object" && "message" in detail) return String((detail as { message: string }).message);
  return "Something went wrong";
}

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers, body });
  } catch {
    throw new ApiError(`Can't reach the API at ${API_URL}. Is the backend running?`, 0);
  }
  const data = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
  if (!res.ok) throw new ApiError(messageFrom(data?.detail), res.status);
  return data as T;
}

// ---- shared types ----
export type User = { id: string; email: string; display_name: string; role: "user" | "reviewer" };

export type Check = { name: string; label: string; passed: boolean; detail: string; simulated?: boolean };

export type KycSession = {
  id: string;
  status: "started" | "needs_review" | "approved" | "rejected";
  declared: { full_name?: string; date_of_birth?: string } | null;
  extracted: Record<string, unknown> | null;
  checks: Check[];
  ai_summary: string | null;
  transcript: { role: "user" | "assistant"; content: string; step?: string }[];
  ai_provider: string;
  started_at: string;
  completed_at: string | null;
  decision_reason_code: string | null;
};

export type ProofMaterial = {
  credentialId: string;
  holderCommitment: string;
  kycApproved: number;
  expiresAt: number;
  birthDate: number | null;
  signature: { s: string; r8x: string; r8y: string };
};

export type Credential = {
  id: string;
  issuer_id: string;
  credential_type: string;
  claims: { kyc_approved: boolean; can_prove_age?: boolean };
  issued_at: string;
  expires_at: string;
  status: "active" | "revoked" | "expired";
  circuit_version: string;
  proof_material?: ProofMaterial;
};

export type PaymentRequest = {
  id: string;
  amount: string;
  currency: string;
  description: string;
  recipient: { id: string; display_name: string };
  payer_user_id: string | null;
  status: "open" | "authorized" | "paid" | "refunded" | "expired" | "cancelled";
  expires_at: string;
  created_at: string;
  challenge: string;
  verifier_id: string;
  issuer_public_key: { ax: string; ay: string };
  min_age: number;
  today: number;
  transaction?: Transaction | null;
};

export type Transaction = {
  id: string;
  payment_request_id: string;
  provider: string;
  provider_order_id: string;
  provider_capture_id: string | null;
  amount: string;
  currency: string;
  status: string;
  environment: string;
  created_at: string;
  captured_at: string | null;
  refund_id?: string | null;
  refund_status?: string | null;
  refunded_at?: string | null;
};
