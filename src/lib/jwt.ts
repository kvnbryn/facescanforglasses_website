import { SignJWT, jwtVerify } from 'jose';

// We use a fallback secret if the environment variable is not set yet,
// but in production, ALWAYS set JWT_SECRET in Vercel environment variables.
const secretKey = process.env.JWT_SECRET || 'fallback-secret-key-for-development-only-123456';
const key = new TextEncoder().encode(secretKey);

export async function signToken(payload: { phone?: string; admin?: boolean }, expiresIn: string = '24h') {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload;
  } catch (error) {
    return null;
  }
}
