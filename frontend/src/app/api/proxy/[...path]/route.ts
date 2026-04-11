import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function handler(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const url = `${BACKEND_URL}/${path.join('/')}${req.nextUrl.search}`;

  const headers: Record<string, string> = {};
  const contentType = req.headers.get('content-type');
  if (contentType) headers['content-type'] = contentType;
  const cookie = req.headers.get('cookie');
  if (cookie) headers['cookie'] = cookie;
  const authorization = req.headers.get('authorization');
  if (authorization) headers['authorization'] = authorization;

  const body =
    req.method !== 'GET' && req.method !== 'HEAD'
      ? await req.arrayBuffer()
      : undefined;

  const backendRes = await fetch(url, {
    method: req.method,
    headers,
    body: body || undefined,
  });

  const data = await backendRes.arrayBuffer();
  const res = new NextResponse(data, { status: backendRes.status });

  const ct = backendRes.headers.get('content-type');
  if (ct) res.headers.set('content-type', ct);

  // Forward all Set-Cookie headers so the browser stores them on the Vercel domain
  backendRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      res.headers.append('set-cookie', value);
    }
  });

  return res;
}

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
export const PUT = handler;
export const PATCH = handler;
