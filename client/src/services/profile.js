import { api, upload } from './api.js';
export const saveProfile = values => api('/profile','PUT',values);
export const uploadProfileImage = file => upload(file,'public');
export const profileUsernameAvailability = username => api('/profile/username-availability?username=' + encodeURIComponent(username));
