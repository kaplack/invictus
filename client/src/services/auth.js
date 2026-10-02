import { api } from './api.js';
export const usernameAvailability = username => api('/auth/username-availability?username=' + encodeURIComponent(username));
