import { NextRequest, NextResponse } from 'next/server';
import { extractSeedKeywordsFromUrl } from '@/lib/keyword-extractor';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Valid URL is required' }, { status: 400 });
    }

    const keywords = await extractSeedKeywordsFromUrl(url);
    return NextResponse.json({ url, keywords });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to extract keywords' }, { status: 500 });
  }
}
