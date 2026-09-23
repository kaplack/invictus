import React from 'react';import{createRoot}from'react-dom/client';import AdminApplication from '../../client/src/app/AdminApplication.jsx';import '../../client/src/styles/global.css';
createRoot(document.getElementById('root')).render(<AdminApplication/>);
if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js');
