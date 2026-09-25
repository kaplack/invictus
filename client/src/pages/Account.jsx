import React,{useState,useEffect}from'react';import{api,upload,fileUrl}from'../services/api.js';import{useData,useAction}from'../hooks/data.js';import{Heading,State,Feedback,Field,Textarea,Records,Status,date,money}from'../components/UI.jsx';
export function Login({onSession,redirect="/cuenta",allowRegister=true}){const[register,setRegister]=useState(false),a=useAction();return <div className="auth-layout"><div><p className="eyebrow">TU HISTORIA EMPIEZA AQUÍ</p><h1>Un lugar para<br/>cada desafío.</h1><p>Inscríbete, encuentra reconocimientos y conserva tu historial.</p></div><form className="card form" onSubmit={e=>{e.preventDefault();const body=Object.fromEntries(new FormData(e.currentTarget));a.run(async()=>{const r=await api('/auth/'+(register?'register':'login'),'POST',body);onSession(r.user);location.hash=redirect;},'Sesión iniciada.')}}><h2>{register?'Crea tu cuenta':'Bienvenido de nuevo'}</h2>{register&&<><Field label="Nombre" name="name" required autoComplete="given-name"/><Field label="Apellidos" name="lastName" required autoComplete="family-name"/></>}<Field label="Correo electrónico" name="email" type="email" required autoComplete="email"/><Field label="Contraseña" name="password" type="password" minLength="12" required autoComplete={register?'new-password':'current-password'}/>{register&&<small>Usa al menos 12 caracteres, mayúscula, minúscula, número y símbolo.</small>}<button disabled={a.busy}>{register?'Crear cuenta':'Iniciar sesión'} →</button>{allowRegister&&<button className="link-button" type="button" onClick={()=>setRegister(!register)}>{register?'Ya tengo una cuenta':'Crear una cuenta'}</button>}<Feedback state={a}/></form></div>}
export function Account({user}) {
  const p=useData('/profile');
  return <><Heading eyebrow="MI CUENTA" title="Mi perfil"><p>Actualiza tu foto y tus datos personales.</p></Heading>
    <State resource={p}>{profile=><ProfileForm key={profile?.updatedAt||'new'} profile={profile} user={user}/>}</State>
  </>;
}
export function Registrations() {
  const r=useData('/profile/registrations');
  return <><Heading eyebrow="MI CUENTA" title="Mis inscripciones"><p>Consulta los eventos en los que participas y el estado de tus inscripciones.</p></Heading>
    <State resource={r}>{items=>items.length?<Records items={items} columns={[{label:'Evento',render:i=>i.event.title},{label:'Team organizador',render:i=>i.event.team?.name||'—'},{label:'Fecha',render:i=>date(i.event.startsAt)},{label:'Estado',render:i=><Status value={i.status}/>}]}/>:<div className="empty"><p>Aún no te has inscrito en ningún evento.</p><a className="button" href="#/eventos">Explorar eventos</a></div>}</State>
    <p className="muted">Una inscripción confirmada no acredita asistencia, resultados ni logros.</p>
  </>;
}
function ProfileForm({profile,user}) {
  const a=useAction(),[photo,setPhoto]=useState(null),[preview,setPreview]=useState(''),[saved,setSaved]=useState(profile),[photoError,setPhotoError]=useState('');
  useEffect(()=>{
    if(!photo){setPreview('');return;}
    const url=URL.createObjectURL(photo);setPreview(url);
    return()=>URL.revokeObjectURL(url);
  },[photo]);
  const image=preview||(saved?.avatarFileId?fileUrl(saved.avatarFileId):'');
  return <form className="form card profile-form" onSubmit={e=>{
    e.preventDefault();const values=Object.fromEntries(new FormData(e.currentTarget));
    a.run(async()=>{
      const avatarFileId=photo?(await upload(photo,'public')).id:saved?.avatarFileId||null;
      const result=await api('/profile','PUT',{...saved,...values,avatarFileId,visibility:saved?.visibility||'PRIVATE'});
      setSaved(result);setPhoto(null);
    },'Perfil guardado.');
  }}>
    <h2>Tu perfil</h2>
    <div className="profile-photo-row">
      <div className="profile-photo">{image?<img src={image} alt="Foto de perfil"/>:<span aria-hidden="true">{(user.name||'U').slice(0,1).toUpperCase()}</span>}</div>
      <div className="profile-photo-controls"><label htmlFor="profile-photo">Foto de perfil</label>
        <input id="profile-photo" type="file" accept="image/png,image/jpeg,image/webp" disabled={a.busy} aria-describedby="profile-photo-help" onChange={e=>{
          const file=e.target.files?.[0];e.target.value='';if(!file)return;
          if(!['image/png','image/jpeg','image/webp'].includes(file.type)){setPhotoError('Elige una imagen JPG, PNG o WebP.');return;}
          if(file.size>10*1024*1024){setPhotoError('La imagen debe pesar como máximo 10 MB.');return;}
          setPhotoError('');setPhoto(file);
        }}/>
        <small id="profile-photo-help">JPG, PNG o WebP · máximo 10 MB. La foto tendrá acceso público. Guarda el perfil para aplicar el cambio.</small>
        {photo&&<button className="link-button" type="button" disabled={a.busy} onClick={()=>{setPhoto(null);setPhotoError('');}}>Descartar nueva foto</button>}
        {photoError&&<p className="error" role="alert">{photoError}</p>}
      </div>
    </div>
    <Field label="Nombre del perfil" name="publicName" defaultValue={profile?.publicName||user.name} required maxLength="120" disabled={a.busy}/>
    <Field label="Ciudad (opcional)" name="location" defaultValue={profile?.location||''} maxLength="120" disabled={a.busy}/>
    <Textarea label="Sobre ti (opcional)" name="bio" defaultValue={profile?.bio||''} maxLength="2000" disabled={a.busy}/>
    <div className="actions"><button disabled={a.busy}>{a.busy?'Guardando…':'Guardar perfil'}</button></div>
    <Feedback state={a}/>
  </form>;
}
export function Cart({cart,setCart}){const a=useAction(),[key,setKey]=useState(()=>sessionStorage.getItem('checkout-key')||crypto.randomUUID());async function checkout(){sessionStorage.setItem('checkout-key',key);const r=await api('/orders','POST',{cartId:cart.cartId,key});sessionStorage.removeItem('checkout-key');setKey(crypto.randomUUID());setCart(null);location.hash='/pedidos';return r;}return <><Heading eyebrow="TU SELECCIÓN" title="Carrito de reconocimientos."/><Feedback state={a}/>{!cart?.items?.length?<div className="empty"><p>Tu carrito está vacío.</p><a href="#/tienda" className="button">Explorar la tienda</a></div>:<div className="card"><Records items={cart.items} columns={[{label:'Producto',render:i=>i.name},{label:'Cantidad',render:i=>i.quantity},{label:'Subtotal',render:i=>money(i.lineTotalCents)}]}/><h2>Total: {money(cart.totalCents)}</h2><p>Las existencias se reservan al crear el pedido. El pago se revisa manualmente.</p><div className="actions"><button disabled={a.busy} onClick={()=>a.run(checkout,'Pedido creado.')}>Crear pedido →</button><button className="secondary" disabled={a.busy} onClick={()=>{setCart(null);sessionStorage.removeItem('checkout-key');setKey(crypto.randomUUID())}}>Vaciar carrito</button></div></div>}</>}
export function Orders({admin=false}){const r=useData(admin?'/orders/admin':'/orders'),a=useAction(),[selected,setSelected]=useState(null);return <><Heading eyebrow={admin?'ADMINISTRACIÓN':'MI CUENTA'} title={admin?"Pedidos":"Mis pedidos"}/><Feedback state={a}/><State resource={r}>{data=><Records items={data.orders} columns={[{label:'Pedido',render:i=>i.id.slice(0,8).toUpperCase()},{label:'Total',render:i=>money(i.totalCents)},{label:'Estado',render:i=><Status value={i.status}/>}]} actions={i=><><button className="secondary" onClick={()=>setSelected(i)}>Ver detalle</button>{admin&&['pending','accepted'].includes(i.status)&&<><button disabled={a.busy} onClick={()=>a.run(async()=>{await api(`/orders/admin/${i.id}/status`,'PATCH',{status:i.status==='pending'?'accepted':'completed'});r.reload();},'Estado actualizado.')}>{i.status==='pending'?'Aceptar':'Completar'}</button><button className="danger" disabled={a.busy} onClick={()=>{if(confirm('¿Cancelar este pedido y restituir sus existencias? Solo se permite sin pago verificado.'))a.run(async()=>{await api(`/orders/admin/${i.id}/status`,'PATCH',{status:'cancelled'});r.reload();},'Pedido cancelado.')}}>Cancelar</button></>}</>}/>}</State>{selected&&<OrderDetail key={selected.id} order={selected} admin={admin} close={()=>setSelected(null)}/>}</>}
function OrderDetail({order,admin,close}){const r=useData('/payments/'+(admin?'admin/':'')+order.id),op=useData('/payments/operations/'+(admin?'admin/':'')+order.id),methods=useData('/payments/methods'),a=useAction();const[method,setMethod]=useState('cash'),[file,setFile]=useState(null);return <section className="card detail"><button className="secondary" onClick={close}>Cerrar detalle</button><h2>Pedido {order.id.slice(0,8).toUpperCase()}</h2>{order.items.map(i=><p key={i.productId}>{i.name} × {i.quantity}</p>)}<State resource={op}>{data=><p>Pago a {data.operation.instructions.recipientName} · {data.operation.instructions.holder} {data.operation.instructions.phone}</p>}</State><State resource={r}>{data=><>{data.payments.map(p=><div className="payment-row" key={p.id}><Status value={p.status}/><span>{money(p.amountCents)} · {p.method}</span>{admin&&['pending','pending_review'].includes(p.status)&&<div className="actions"><button disabled={a.busy} onClick={()=>a.run(async()=>{await api(`/payments/admin/${order.id}/${p.id}`,'PATCH',{status:'verified'});r.reload();},'Pago verificado.')}>Verificar pago</button><button className="danger" disabled={a.busy} onClick={()=>{const reason=prompt('Motivo del rechazo');if(reason)a.run(async()=>{await api(`/payments/admin/${order.id}/${p.id}`,'PATCH',{status:'rejected',reason});r.reload();},'Pago rechazado.')}}>Rechazar</button></div>}{p.proofFileId&&<a className="button secondary" href={`${import.meta.env.VITE_API_URL||'/api'}/payments/${admin?'admin/':''}${order.id}/${p.id}/proof`}>Ver comprobante</a>}</div>)}{!admin&&!['cancelled','completed'].includes(order.status)&&!data.payments.some(p=>p.status!=='rejected')&&<form className="form" onSubmit={e=>{e.preventDefault();a.run(async()=>{const proofFileId=method==='cash'?null:(await upload(file)).id;await api('/payments/'+order.id,'POST',{method,proofFileId});r.reload();},'Pago registrado para revisión.')}}><State resource={methods}>{data=><label>Método de pago<select value={method} onChange={e=>setMethod(e.target.value)}>{data.methods.map(m=><option key={m} value={m}>{m==='cash'?'Efectivo':m}</option>)}</select></label>}</State>{method!=='cash'&&<label>Comprobante privado · imagen o PDF, máximo 10 MB<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" required onChange={e=>setFile(e.target.files[0])}/></label>}<button disabled={a.busy}>Registrar pago para revisión</button></form>}</>}</State><Feedback state={a}/></section>}
