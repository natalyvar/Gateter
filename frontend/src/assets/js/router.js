/**
 * Router mínimo basado en la History API.
 *
 * Cada ruta asocia un patrón ("/usuarios/:username") a una vista:
 *   view(outlet, { params, signal })
 * El `signal` se aborta al navegar a otra ruta, de modo que las vistas pueden
 * cancelar peticiones en curso y limpiar suscripciones sin fugas de memoria.
 *
 * En cada navegación se emite el evento `routechange` en window para que
 * componentes persistentes (p. ej. la columna de usuarios) reaccionen.
 */

const routes = [];
let outlet = null;
let controller = null;

function compile(pattern) {
  const keys = [];
  const source = pattern.replace(/:(\w+)/g, (_, key) => {
    keys.push(key);
    return "([^/]+)";
  });
  return { regex: new RegExp(`^${source}/?$`), keys };
}

export function defineRoutes(definitions, fallbackView) {
  for (const { path, view } of definitions) routes.push({ ...compile(path), view });
  routes.push({ regex: /.*/, keys: [], view: fallbackView });
}

function match(pathname) {
  for (const route of routes) {
    const result = route.regex.exec(pathname);
    if (!result) continue;
    const params = Object.fromEntries(route.keys.map((key, i) => [key, decodeURIComponent(result[i + 1])]));
    return { view: route.view, params };
  }
  return null;
}

async function render() {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  const { view, params } = match(window.location.pathname);
  window.dispatchEvent(new CustomEvent("routechange", { detail: { path: window.location.pathname, params } }));
  outlet.replaceChildren();
  window.scrollTo(0, 0);

  try {
    await view(outlet, { params, signal });
  } catch (error) {
    if (error.name !== "AbortError") throw error;
  }
  if (!signal.aborted) outlet.focus({ preventScroll: true });
}

export function navigate(path, { replace = false } = {}) {
  if (replace) window.history.replaceState({}, "", path);
  else if (path !== window.location.pathname) window.history.pushState({}, "", path);
  return render();
}

export function startRouter(outletElement) {
  outlet = outletElement;

  // Intercepta enlaces internos marcados con data-link para no recargar la página.
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-link]");
    if (!link || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(link.getAttribute("href"));
  });

  window.addEventListener("popstate", render);
  return render();
}
