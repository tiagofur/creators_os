import { type NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8000';

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('refresh_token')?.value;

  // Best-effort: notify backend of logout
  if (refreshToken) {
    try {
      await fetch(`${API_BASE_URL}/v1/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // Ignore — clear cookies regardless
    }
  }

  const res = NextResponse.json({ success: true });
  res.cookies.delete('refresh_token');
  return res;
}
