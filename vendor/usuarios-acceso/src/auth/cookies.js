export function sessionCookieOptions({ secure = false, maxAge } = {}) {
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/',
    maxAge,
  };
}
