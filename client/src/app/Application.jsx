import PublicTeams from "../pages/PublicTeams.jsx";
import MainNavigation from "../components/MainNavigation.jsx";
import Teams from "../pages/TeamSpace.jsx";
import UserMenu from "../components/UserMenu.jsx";
import React, { useState, useEffect } from "react";
import { api } from "../services/api.js";
import { Home, Events, Shop, Quote } from "../pages/Public.jsx";
import {
  Login,
  Account,
  Registrations,
  Cart,
  Orders,
} from "../pages/Account.jsx";
export default function Application() {
  const [route, setRoute] = useState(
      location.hash.slice(1) || location.pathname,
    ),
    [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [cart, setCart] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    const fn = () => {
      setRoute(location.hash.slice(1) || location.pathname);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", fn);
    api("/auth/session")
      .then((r) => setUser(r.user))
      .catch((e) => {
        if (e.status !== 401) setError(e.message);
      })
      .finally(() => setLoading(false));
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  async function logout() {
    try {
      await api("/auth/logout", "POST", {});
      setUser(null);
      setCart(null);
      sessionStorage.removeItem("checkout-key");
      location.hash = "/";
    } catch (e) {
      setError(e.message);
    }
  }
  const cartCount = (cart?.items || []).reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const manager = ["ADMIN", "ORGANIZER"].includes(user?.role),
    protectedRoute = [
      "/cuenta",
      "/perfil",
      "/inscripciones",
      "/mis-eventos",
      "/carrito",
      "/pedidos",
    ].includes(route) || route === '/mis-teams' || route.startsWith('/mis-teams/');
  if (loading)
    return (
      <div className="empty" role="status">
        Cargando Invictus…
      </div>
    );
  let page;
  if (protectedRoute && !user) page = <Login onSession={setUser} redirect={protectedRoute ? route : "/cuenta"} />;
  else if (route === "/") page = <Home />;
  else if (route === "/teams" || route.startsWith("/teams/")) page = <PublicTeams key={route} id={route.split("/")[2]} />;
  else if (route === "/acceso") page = <Login onSession={setUser} />;
  else if (route === "/eventos" || route.startsWith("/eventos/"))
    page = <Events key={route} slug={route.split("/")[2]} user={user} />;
  else if (route === "/deportistas")
    page = <section className="heading"><p className="eyebrow">COMUNIDAD INVICTUS</p><h1>Deportistas</h1><span className="badge">Próximamente</span><p>Estamos preparando este espacio para la comunidad deportiva.</p><a className="button secondary" href="#/eventos">Explorar eventos</a></section>;
  else if (route === "/tienda")
    page = <Shop user={user} cart={cart} setCart={setCart} />;
  else if (route === "/cotizar") page = <Quote />;
  else if (route === "/cuenta" || route === "/perfil")
    page = <Account user={user} />;
  else if (route === "/inscripciones") page = <Registrations />;
  else if (route === "/mis-eventos") page = <Teams user={user} />;
  else if (route === '/mis-teams' || route.startsWith('/mis-teams/')) page = <Teams id={route.split('/')[2]} user={user} section={route.split('/')[3] || 'inicio'} onLogout={logout} sessionError={error}/>;
  else if (route === "/carrito") page = <Cart cart={cart} setCart={setCart} />;
  else if (route === "/pedidos") page = <Orders />;
  else
    page = (
      <p className="empty">
        Página no encontrada. <a href="#/">Volver al inicio</a>
      </p>
    );
  if (user && route.startsWith("/mis-teams/")) return page;
  return (
    <div className={(route === "/mis-teams" || route === "/mis-eventos" || route === "/pedidos" || route === "/inscripciones" || route === "/perfil" || route === "/cuenta" || route === "/acceso" || (protectedRoute && !user) || route === "/" || route === "/teams" || route.startsWith("/teams/") || route === "/eventos" || route.startsWith("/eventos/") || route === "/tienda") ? "landing-shell" : undefined}>
      <a className="skip" href="#main">
        Ir al contenido
      </a>
      <header className="site-header">
        <a className="brand" href="#/">
          {" "}
          INVICTUS
        </a>
        <MainNavigation route={route} />
        <div className="account-nav">
          <a
            className="cart-link"
            href="#/carrito"
            aria-label={
              cartCount
                ? `Carrito, ${cartCount} ${cartCount === 1 ? "producto" : "productos"}`
                : "Carrito vacío"
            }
            title="Carrito"
            aria-current={route === "/carrito" ? "page" : undefined}
          >
            <svg
              aria-hidden="true"
              width="23"
              height="23"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3h2l2.4 12h11.2l2-8H6" />
              <circle cx="9" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
            </svg>
            {cartCount > 0 && (
              <span className="cart-count" aria-hidden="true">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </a>
          {user ? (
            <UserMenu
              user={user}
              manager={manager}
              route={route}
              onLogout={logout}
            />
          ) : (
            <a
              className="button small login-link"
              href="#/acceso"
              aria-label="Ingresar"
              title="Ingresar"
            >
              <svg
                className="login-icon"
                aria-hidden="true"
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20v-2a7 7 0 0 1 14 0v2" />
              </svg>
              <span className="login-label">Ingresar ↗</span>
            </a>
          )}
        </div>
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <main id="main" className="container">
        {page}
      </main>
      <footer>
        <a className="brand" href="#/">
          INVICTUS
        </a>
        <p>Cada evento termina. El esfuerzo permanece.</p>
        <span>Eventos · Comunidad · Reconocimientos</span>
      </footer>
    </div>
  );
}
