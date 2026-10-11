export async function memorialRequest<T>(path: string, payload: Record<string, unknown>, sessionToken?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
  const response = await fetch(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(sessionToken ? { ...payload, sessionToken } : payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'No se pudo completar la operación.');
  return result as T;
}
