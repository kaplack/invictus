import { useEffect, useState } from 'react';
import { usernameAvailability } from '../services/auth.js';
import { profileUsernameAvailability } from '../services/profile.js';
export function useUsernameAvailability(value, enabled, {currentUsername, profile = false} = {}) {
  const username = value.trim().toLowerCase();
  const current = username === currentUsername?.trim().toLowerCase();
  const valid = /^[a-z0-9._]{3,30}$/.test(username);
  const [result, setResult] = useState(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled || !valid || current) return;
    let active = true;
    const timer = setTimeout(async () => {
      setResult({ username, status: 'checking' });
      try {
        const data = await (profile ? profileUsernameAvailability : usernameAvailability)(username);
        if (active) setResult({ username, status: data.available ? 'available' : 'taken' });
      } catch {
        if (active) setResult({ username, status: 'error' });
      }
    }, 450);
    return () => { active = false; clearTimeout(timer); };
  }, [username, valid, enabled, revision, current, profile]);
  const status = !valid ? (username ? 'invalid' : 'empty')
    : current ? 'available' : result?.username === username ? result.status : 'checking';
  return { username, status, retry: () => { setResult(null); setRevision(v => v + 1); } };
}
