export function userLabel(user) {
  return [user?.name, user?.lastName].filter(Boolean).join(' ').trim()
    || (user?.username ? '@' + user.username : 'Cuenta');
}
