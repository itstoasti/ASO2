import { NextRequest, NextResponse } from 'next/server';
import { getAsaAccessToken } from '@/lib/ios/search-ads-api';
import { AsaCredentials } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const credentials: AsaCredentials = await req.json();
    if (!credentials.clientId || !credentials.teamId || !credentials.keyId || !credentials.privateKey) {
      return NextResponse.json({ success: false, message: 'All Apple Search Ads credentials fields are required.' }, { status: 400 });
    }

    const token = await getAsaAccessToken(credentials);
    if (token) {
      return NextResponse.json({ success: true, message: 'Successfully authenticated with Apple Search Ads API.' });
    } else {
      return NextResponse.json({ success: false, message: 'Authentication failed. Please verify keyId, teamId, clientId, and private key signature.' }, { status: 401 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Error verifying credentials.' }, { status: 500 });
  }
}
