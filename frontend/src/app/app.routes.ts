import { Routes } from '@angular/router';
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login').then(m => m.Login)
  },
  {
    path: 'register/:rol',
    loadComponent: () => import('./auth/register/register').then(m => m.Register)
  },

  {
    path: 'admin',
    loadComponent: () =>
      import('./core/layout/admin-layout/admin-layout').then(m => m.AdminLayout),
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home',        loadComponent: () => import('./pages/admin/home/home').then(m => m.Home) },
      { path: 'solicitudes', loadComponent: () => import('./pages/admin/solicitudes/solicitudes').then(m => m.Solicitudes) },
      { path: 'movimientos', loadComponent: () => import('./pages/admin/movimientos/movimientos').then(m => m.Movimientos) },
      { path: 'inventario',  loadComponent: () => import('./pages/admin/inventario/inventario').then(m => m.Inventario) },
      { path: 'usuarios',    loadComponent: () => import('./pages/admin/usuarios/usuarios').then(m => m.Usuarios) },
      { path: 'eventos',     loadComponent: () => import('./pages/admin/eventos/eventos').then(m => m.Eventos) },
      { path: 'analiticos',  loadComponent: () => import('./pages/admin/analiticos/analiticos').then(m => m.Analiticos) },
      { path: 'ajustes',     loadComponent: () => import('./pages/admin/ajustes/ajustes').then(m => m.Ajustes) },
      { path: 'ayuda',       loadComponent: () => import('./pages/admin/ayuda/ayuda').then(m => m.Ayuda) },
    ]
  },
  {
    path: 'encargado',
    loadComponent: () =>
      import('./core/layout/encargado-layout/encargado-layout').then(m => m.EncargadoLayout),
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home',        loadComponent: () => import('./pages/encargado/home/home').then(m => m.HomeEncargado) },
      { path: 'solicitudes', loadComponent: () => import('./pages/encargado/solicitudes/solicitudes').then(m => m.SolicitudesEncargado) },
      { path: 'movimientos', loadComponent: () => import('./pages/encargado/movimientos/movimientos').then(m => m.MovimientosEncargado) },
      { path: 'inventario',  loadComponent: () => import('./pages/encargado/inventario/inventario').then(m => m.InventarioEncargado) },
      { path: 'usuarios',    loadComponent: () => import('./pages/encargado/usuarios/usuarios').then(m => m.UsuariosEncargado) },
      { path: 'eventos',     loadComponent: () => import('./pages/encargado/eventos/eventos').then(m => m.EventosEncargado) },
      { path: 'analiticos',  loadComponent: () => import('./pages/encargado/analiticos/analiticos').then(m => m.AnaliticosEncargado) },
      { path: 'ajustes',     loadComponent: () => import('./pages/encargado/ajustes/ajustes').then(m => m.AjustesEncargado) },
      { path: 'ayuda',       loadComponent: () => import('./pages/encargado/ayuda/ayuda').then(m => m.AyudaEncargado) },
    ]
  },
  {
    path: 'usuario',
    loadComponent: () =>
      import('./core/layout/usuario-layout/usuario-layout').then(m => m.UsuarioLayout),
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home',         loadComponent: () => import('./pages/usuario/home/home').then(m => m.Home) },
      { path: 'solicitudes',  loadComponent: () => import('./pages/usuario/solicitudes/solicitudes').then(m => m.Solicitudes) },
      { path: 'eventos',      loadComponent: () => import('./pages/usuario/eventos/eventos').then(m => m.Eventos) },
      { path: 'analiticos',   loadComponent: () => import('./pages/usuario/analiticos/analiticos').then(m => m.Analiticos) },
      { path: 'dispositivos', loadComponent: () => import('./pages/usuario/dispositivos/dispositivos').then(m => m.Dispositivos) },
      { path: 'ajustes',      loadComponent: () => import('./pages/usuario/ajustes/ajustes').then(m => m.Ajustes) },
      { path: 'ayuda',        loadComponent: () => import('./pages/usuario/ayuda/ayuda').then(m => m.Ayuda) },
    ]
  }

];
