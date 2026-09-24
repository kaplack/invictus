import {useData} from '../hooks/data.js';
import React,{useState,useEffect}from'react';import{AdminPanel}from'@base/panel-administrativo/react';import'@base/panel-administrativo/styles.css';import{api}from'../services/api.js';import{Login,Orders}from'../pages/Account.jsx';import{ManageEvents,Products,Quotes,Users}from'../pages/Manage.jsx';
export default function AdminApplication(){const[user,setUser]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');useEffect(()=>{api('/auth/session').then(r=>setUser(r.user)).catch(e=>{if(e.status!==401)setError(e.message)}).finally(()=>setLoading(false));if(!location.hash||location.hash==='#/'||location.hash==='#/gestion/eventos')location.hash='/gestion/eventos/invictus'},[]);async function logout(){try{await api('/auth/logout','POST',{});setUser(null)}catch(e){setError(e.message)}}
 if(loading)return <p className="empty">Cargando administración…</p>;
 if(!user)return <main className="container"><a className="brand" href={import.meta.env.VITE_PUBLIC_URL||'http://localhost:5173'}>INVICTUS · GESTIÓN</a><Login onSession={setUser} redirect="/gestion/eventos/invictus" allowRegister={false}/>{error&&<p role="alert">{error}</p>}</main>;
 if(!['ADMIN','ORGANIZER'].includes(user.role))return <main className="container"><h1>Acceso reservado</h1><p>Esta cuenta no tiene permisos de organización o administración.</p><button onClick={logout}>Cerrar sesión</button></main>;
 return <AdminWorkspace user={user} logout={logout} error={error}/>;
}
function AdminWorkspace({user,logout,error}) {
 const events=useData('/events/manage');
 const pending=(events.data||[]).filter(e=>e.source==='EXTERNAL'&&e.reviewStatus==='PENDING_REVIEW').length;
 const admin=user.role==='ADMIN';
 useEffect(()=>{if(!admin&&location.hash==='#/gestion/eventos/invictus')location.hash='/gestion/eventos/externos';},[admin]);
 const menu=[{label:'Eventos',children:[...(admin?[{path:'/gestion/eventos/invictus',label:'Eventos Invictus',icon:'calendar',render:()=> <ManageEvents key="invictus" user={user} resource={events} scope="INVICTUS"/>}]:[]),{path:'/gestion/eventos/externos',label:'Eventos externos',icon:'review',badge:pending,render:()=> <ManageEvents key="external" user={user} resource={events} scope="EXTERNAL"/>}]},...(admin?[{path:'/gestion/productos',label:'Productos',icon:'box',render:()=> <Products/>},{path:'/gestion/pedidos',label:'Pedidos y pagos',icon:'orders',render:()=> <Orders admin/>},{path:'/gestion/cotizaciones',label:'Cotizaciones',icon:'quote',render:()=> <Quotes/>},{path:'/gestion/usuarios',label:'Usuarios y acceso',icon:'users',render:()=> <Users/>}]:[])];
 return <AdminPanel user={user} permissions={['panel:access']} menu={menu} brand="INVICTUS" colors={{primary:'#1e3a5f',sidebar:'#171717',sidebarText:'#fff'}} onLogout={logout}><a href={import.meta.env.VITE_PUBLIC_URL||'http://localhost:5173'}>← Ir a la web pública</a>{error&&<p role="alert">{error}</p>}</AdminPanel>;
}
