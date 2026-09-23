export function sessionCookieOptions({ secure = false, maxAge } = {}) {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}
