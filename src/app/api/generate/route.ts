import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  try {
    const { phone, duration, adminPassword } = await req.json();

    // Check if the requester provided the correct admin password
    // In production, configure ADMIN_PASSWORD in Vercel env variables
    const expectedPassword = process.env.ADMIN_PASSWORD || 'rahasia123';

    if (adminPassword !== expectedPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Default duration is 24 hours if not specified
    const expiresIn = duration || '24h';
    const payload = phone ? { phone } : {};

    // Generate token
    const token = await signToken(payload, expiresIn);
    
    // Construct the full URL
    // In production, NEXT_PUBLIC_BASE_URL should be set, e.g. https://scanglasses.biz.id
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    const link = `${baseUrl}/scan/${token}`;

    return NextResponse.json({ token, link, expiresIn });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 });
  }
}
