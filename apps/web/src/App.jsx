import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import RouteScreen from './RouteScreen.jsx';
import { routes } from './routes.js';

export default function App() {
  const navigate = useNavigate();
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const navigateToRoute = (path) => navigate(path);
    window.__VUELVE_NAVIGATE__ = navigateToRoute;

    import('./legacyApp.js').catch((error) => {
      console.error('No se pudo iniciar la aplicación Vuelve.', error);
      setLoadError('No se pudo cargar la aplicación. Recarga la página para intentarlo de nuevo.');
    });

    return () => {
      if (window.__VUELVE_NAVIGATE__ === navigateToRoute) {
        delete window.__VUELVE_NAVIGATE__;
      }
    };
  }, [navigate]);

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        {routes.map((route) => (
          <Route key={route.path} path={route.path} element={<RouteScreen route={route} />} />
        ))}
        <Route path="/empleado/visitas" element={<RouteScreen route={{ profile: 'employee', title: 'Registrar visita' }} />} />
        <Route path="/empleado/perfil" element={<RouteScreen route={{ profile: 'employee', title: 'Mi perfil' }} />} />
        <Route path="/cliente/actividad" element={<RouteScreen route={{ profile: 'client', title: 'Mi actividad' }} />} />
        <Route path="/cliente/perfil" element={<RouteScreen route={{ profile: 'client', title: 'Mi perfil' }} />} />
        <Route path="/dueno/nueva-campana" element={<RouteScreen route={{ profile: 'owner', title: 'Crear campaña' }} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <div id="app">
        {loadError ? (
          <p className="load-error" role="alert">
            {loadError}
          </p>
        ) : (
          <p className="app-loading" role="status">
            Cargando Vuelve…
          </p>
        )}
      </div>
      <div id="layer" />
      <div id="toastbox" />
    </>
  );
}
