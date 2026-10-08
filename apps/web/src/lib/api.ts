import { toast } from 'sonner';

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const TOKEN_KEY = 'moneybook_token';
const WAKE_TOAST = 'api-waking-up';

// MVP trade-off: the JWT lives in localStorage. For hardened production use an httpOnly cookie (see roadmap).
export const tokenStore = {
  get: (): string | null => (typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY)),
  set: (token: string) => window.localStorage.setItem(TOKEN_KEY, token),
  clear: () => window.localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly errors?: string[]) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/** Calls the API and unwraps the `{ success, data }` envelope. Throws ApiError with a readable message. */
export async function api<T>(path: string, { method = 'GET', body, query }: RequestOptions = {}): Promise<T> {
  const token = tokenStore.get();
  let response: Response;
  // Free hosting puts the API to sleep when idle; the first request can take ~1 minute. Tell the user why.
  const wakeTimer = setTimeout(() => toast.loading('Máy chủ đang khởi động, vui lòng chờ khoảng 1 phút…', { id: WAKE_TOAST }), 4000);
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Không kết nối được máy chủ. Vui lòng thử lại.', 0);
  } finally {
    clearTimeout(wakeTimer);
    toast.dismiss(WAKE_TOAST);
  }

  const payload = (await response.json().catch(() => null)) as
    | { success: true; data: T }
    | { success: false; message?: string; errors?: string[] }
    | null;

  if (!response.ok || !payload || payload.success === false) {
    if (response.status === 401 && !path.startsWith('/auth/')) {
      tokenStore.clear();
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    const failure = payload && payload.success === false ? payload : null;
    throw new ApiError(failure?.message ?? `Lỗi ${response.status}`, response.status, failure?.errors);
  }
  return payload.data;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.errors?.length ? error.errors.join('\n') : error.message;
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định';
}

/** Fire-and-forget request that wakes a sleeping API while the user is still typing their password. */
export function wakeServer(): void {
  void fetch(`${BASE_URL}/health`, { cache: 'no-store' }).catch(() => undefined);
}
