import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function RouteScreen({ route }) {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = `${route.title} | Spinta Café`;
    document.documentElement.dataset.profile = route.profile;
    document.documentElement.dataset.screen = route.title;
    window.__VUELVE_ROUTE__ = pathname;
    window.__VUELVE_SET_ROUTE__?.(pathname);
  }, [pathname, route.title]);

  return null;
}
