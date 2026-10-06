// Keep old shared links working while using the browser history for public routes.
export function currentRoute() {
  if (location.hash.startsWith('#/')) {
    const legacy=location.hash.slice(1);
    history.replaceState(null,'',legacy);
  }
  if(location.pathname==='/eventos') history.replaceState(null,'','/'+location.search);
  return location.pathname;
}
export function navigate(path,{replace=false}={}) {
  // The separate administrative panel retains its own router.
  if(path.startsWith('/gestion')) { location.hash=path; return; }
  history[replace?'replaceState':'pushState'](null,'',path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
export function interceptNavigation(event) {
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const anchor=event.target.closest?.('a[href]');
  if(!anchor||anchor.hasAttribute('download')||(anchor.target&&anchor.target!=='_self'))return;
  const raw=anchor.getAttribute('href');
  if(raw.startsWith('#')&&!raw.startsWith('#/'))return;
  const url=new URL(raw.startsWith('#/')?raw.slice(1):raw,location.href);
  if(url.origin!==location.origin||!/^\/(?:$|eventos(?:\/|$)|mis-eventos(?:\/|$)|perfil$|cuenta$|acceso$|inscripciones$|inscripcion\/|teams(?:\/|$)|mis-teams(?:\/|$)|tienda$|cotizar$|carrito$|pedidos$|deportistas$)/.test(url.pathname))return;
  event.preventDefault();navigate(url.pathname+url.search+url.hash);
}
