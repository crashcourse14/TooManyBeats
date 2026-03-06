import { getIronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  user?: string; // canonical username
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'tmb_session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: undefined, // session cookie — expires when browser closes
  },
};

/** Call inside any Route Handler to get the typed session object. */
export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
