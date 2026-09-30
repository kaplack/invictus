import React, { useState } from 'react';
import { useData } from '../hooks/data.js';
import { State, Records, date, Status } from '../components/UI.jsx';
import { OutlineIcon } from '../components/OutlineIcon.jsx';
import '../styles/orders.css';

const labels = {pending:'Pendiente',accepted:'Aceptado',completed:'Completado',cancelled:'Cancelado'};
export default function CustomerOrders({ renderDetail }) {
  const resource = useData('/orders'), [selected, setSelected] = useState(null);
  return <section className="orders-page">
    <header className="orders-heading"><p>CUENTA</p><h1>Pedidos</h1><span>Consulta tus compras, revisa su estado y accede al detalle de cada pedido.</span></header>
    <section className="orders-panel" aria-labelledby="orders-title">
      <h2 id="orders-title">Tus pedidos</h2>
      <State resource={resource}>{data => <>
        <p className="orders-count">{data.orders.length} {data.orders.length === 1 ? 'pedido' : 'pedidos'}</p>
        {data.orders.length ? <Records items={data.orders} columns={[
          {label:'Pedido',render:order=><strong className="order-number">#{order.id.slice(0,8).toUpperCase()}</strong>},
          {label:'Fecha',render:order=><div className="order-date"><OutlineIcon name="calendar"/><span>{order.createdAt ? date(order.createdAt) : 'Sin fecha registrada'}</span></div>},
          {label:'Total',render:order=><strong className="order-total">{new Intl.NumberFormat('es-PE',{style:'currency',currency:order.currency || 'PEN'}).format(order.totalCents/100)}</strong>},
          {label:'Estado',render:order=><Status value={order.status} label={labels[order.status]}/>},
        ]} actions={order=><button className="order-detail-link" onClick={()=>setSelected(order)}>Ver detalle <span aria-hidden="true">→</span></button>}/> :
          <div className="empty"><p>Todavía no tienes pedidos.</p><a className="button" href="#/tienda">Explorar tienda</a></div>}
      </>}</State>
    </section>
    {selected && <div className="order-detail-wrap">{renderDetail(selected,()=>setSelected(null))}</div>}
  </section>;
}
