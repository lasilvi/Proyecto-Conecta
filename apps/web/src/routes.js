export const routes = [
  { path: '/login', profile: 'login', title: 'Iniciar sesión' },

  { path: '/dueno/inicio', profile: 'owner', title: 'Inicio' },
  { path: '/dueno/clientes', profile: 'owner', title: 'Clientes' },
  { path: '/dueno/campanas', profile: 'owner', title: 'Campañas' },
  { path: '/dueno/campanas/nueva', profile: 'owner', title: 'Crear campaña' },
  { path: '/dueno/campanas/:id', profile: 'owner', title: 'Detalle de campaña' },
  { path: '/dueno/recompensas', profile: 'owner', title: 'Recompensas' },
  { path: '/dueno/metricas', profile: 'owner', title: 'Métricas' },
  { path: '/dueno/personalizacion', profile: 'owner', title: 'Personalización' },
  { path: '/dueno/visitas', profile: 'owner', title: 'Registrar visita' },
  { path: '/dueno/visitas/escanear', profile: 'owner', title: 'Escanear cliente' },
  { path: '/dueno/visitas/buscar', profile: 'owner', title: 'Buscar cliente' },
  { path: '/dueno/visitas/nuevo-cliente', profile: 'owner', title: 'Inscribir cliente' },
  { path: '/dueno/visitas/cliente/:id', profile: 'owner', title: 'Registrar visita' },

  { path: '/empleado/caja', profile: 'employee', title: 'Caja' },
  { path: '/empleado/escanear', profile: 'employee', title: 'Escanear cliente' },
  { path: '/empleado/buscar', profile: 'employee', title: 'Buscar cliente' },
  { path: '/empleado/nuevo-cliente', profile: 'employee', title: 'Inscribir cliente' },
  { path: '/empleado/cliente/:id', profile: 'employee', title: 'Registrar visita' },

  { path: '/cliente/progreso', profile: 'client', title: 'Mi progreso' },
  { path: '/cliente/recompensas', profile: 'client', title: 'Mis recompensas' },
  { path: '/cliente/historial', profile: 'client', title: 'Mi historial' },
  { path: '/cliente/beneficios', profile: 'client', title: 'Mis beneficios' },
];
