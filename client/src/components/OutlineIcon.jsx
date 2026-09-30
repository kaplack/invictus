import React from 'react';
const paths = {
  home: <><path d="m3 10 9-7 9 7v11H3V10Z"/><path d="M9 21v-8h6v8"/></>,
  user: <><circle cx="12" cy="7" r="3.5"/><path d="M5 21v-3a7 7 0 0 1 14 0v3Z"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-14 4h2m4 0h2m-8 3h2"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3"/></>,
  bag: <><path d="M4 7h16l1 14H3L4 7Z"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></>,
  logout: <><path d="M9 3H4v18h5m5-14 5 5-5 5m-6-5h13"/></>,
  settings: <><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/></>,
  location: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/></>,
  note: <><path d="M5 3h10l4 4v14H5V3Zm10 0v5h4M8 12h8m-8 4h6"/></>,
  camera: <><path d="M3 7h4l2-3h6l2 3h4v14H3V7Z"/><circle cx="12" cy="13" r="4"/></>,
  save: <><path d="M4 3h13l4 4v14H3V3h1Zm3 0v6h10V3M7 21v-8h10v8"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></>,
};
export function OutlineIcon({ name, ...props }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{paths[name]}</svg>;
}
