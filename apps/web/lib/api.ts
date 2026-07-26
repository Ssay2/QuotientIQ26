const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type HealthResponse = {
  status: "ok";
  service: string;
  timestamp: string;
};

export async function getHealth(): Promise<HealthResponse | null> {
  try {
    const response = await fetch(`${API_URL}/api/health`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as HealthResponse;
  } catch {
    return null;
  }
}
