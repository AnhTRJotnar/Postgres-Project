const API_URL = "http://127.0.0.1:3000";

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = "ApiError";
    }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      error?.error ?? `API request failed: ${response.status}`
    );
  }


    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}