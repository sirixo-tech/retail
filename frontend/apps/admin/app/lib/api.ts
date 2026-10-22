export type ApiError = {
  error?: { code?: string; message?: string; details?: Record<string, string[]> };
};

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = decodeURIComponent(
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="))
      ?.slice("XSRF-TOKEN=".length) ?? "",
  );

  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(typeof FormData !== "undefined" && init.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(token ? { "X-XSRF-TOKEN": token } : {}),
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  let body: any = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: { message: text } };
    }
  }

  if (!response.ok) {
    throw (
      body ?? {
        error: {
          code: `HTTP_${response.status}`,
          message: `Request failed with status ${response.status}`,
        },
      }
    );
  }
  return body as T;
}

export async function warmCsrf(): Promise<void> {
  try {
    await fetch("/api/v1/platform/plans", { credentials: "include", headers: { Accept: "application/json" } });
  } catch {
    // ignore
  }
}
