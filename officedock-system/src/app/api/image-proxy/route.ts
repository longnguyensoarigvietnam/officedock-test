import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl || !imageUrl.startsWith('http')) {
    return new Response('Invalid URL', { status: 400 });
  }

  try {
    const res = await fetch(imageUrl);
    const buffer = await res.arrayBuffer();

    return new Response(Buffer.from(buffer), {
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'image/png',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response('Fetch failed', { status: 500 });
  }
}
