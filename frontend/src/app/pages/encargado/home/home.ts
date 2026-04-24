import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import {
  LucideAngularModule,
  Bell, Activity, Calendar,
  Users, Monitor, Laptop, Tablet, Cable
} from 'lucide-angular';
import { SolicitudesService, Solicitud } from '../../../services/solicitudes';
import { UsuariosService, Usuario } from '../../../services/usuarios';
import { EquiposService, Equipo } from '../../../services/equipos';
import { PrestamosService, Prestamo } from '../../../services/prestamos';

interface SolicitudView {
  id: number;
  icon: any;
  nombre_equipo: string;
  num_serie: string;
  nombre_usuario: string;
  fecha: string;
  motivo: string;
}

interface MovimientoView {
  arrowClass: string;
  arrowSymbol: string;
  icon: any;
  title: string;
  subtitle: string;
  fecha: Date;
}

interface StripDia {
  num: number;
  label: string;
  hoy: boolean;
}

interface CalEvento {
  bar: string;
  time: string;
  title: string;
}

interface UsuarioStatusView {
  arrowClass: string;
  arrowSymbol: string;
  desc: string;
  time: string;
}

@Component({
  selector: 'app-home-encargado',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeEncargado implements OnInit {
  readonly Bell = Bell;
  readonly Activity = Activity;
  readonly Calendar = Calendar;
  readonly Users = Users;
  readonly Monitor = Monitor;
  readonly Laptop = Laptop;
  readonly Tablet = Tablet;
  readonly Cable = Cable;

  nombreUsuario = 'Encargado';

  solicitudes: Solicitud[] = [];
  usuarios: Usuario[] = [];
  equipos: Equipo[] = [];
  prestamos: Prestamo[] = [];

  mostrarModalMotivo = false;
  motivoActual = '';

  cargando = true;
  error = '';

  solicitudesPendientes: SolicitudView[] = [];
  solicitudesExtraordinarias: SolicitudView[] = [];
  pendientesCount = 0;
  extraordinariasCount = 0;

  movimientos: MovimientoView[] = [];

  diaNum = '';
  mesNombre = '';
  diaNombre = '';
  stripDias: StripDia[] = [];
  calEventos: CalEvento[] = [];
  fechaSeleccionada: Date = new Date();

  usuariosActivosCount = 0;
  usuariosStatus: UsuarioStatusView[] = [];

  constructor(
    private readonly solicitudesService: SolicitudesService,
    private readonly usuariosService: UsuariosService,
    private readonly equiposService: EquiposService,
    private readonly prestamosService: PrestamosService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.nombreUsuario = this.obtenerNombreGuardado();
    this.cargarDashboard();
  }

  cargarDashboard(): void {
    this.cargando = true;
    this.error = '';

    forkJoin({
      solicitudes: this.solicitudesService.getSolicitudes(),
      usuarios: this.usuariosService.getUsuarios(),
      equipos: this.equiposService.getEquipos(),
      prestamos: this.prestamosService.getPrestamos()
    }).subscribe({
      next: ({ solicitudes, usuarios, equipos, prestamos }) => {
        this.solicitudes = Array.isArray(solicitudes) ? solicitudes : [];
        this.usuarios = Array.isArray(usuarios) ? usuarios : [];
        this.equipos = Array.isArray(equipos) ? equipos : [];
        this.prestamos = Array.isArray(prestamos) ? prestamos : [];

        this.construirSolicitudes();
        this.construirMovimientos();
        this.construirCalendario();
        this.construirUsuarios();

        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudo cargar el dashboard.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  aprobar(id: number): void {
  if (!confirm('¿Aprobar esta solicitud?')) return;
  let idUsuarioEntrega = 0;
  try {
    const u = localStorage.getItem('usuario');
    if (u) idUsuarioEntrega = Number(JSON.parse(u)?.id_usuario || 0);
  } catch { /* */ }
  if (!idUsuarioEntrega) return;

  this.solicitudesService.aprobar(id, idUsuarioEntrega).subscribe({
    next: () => {
      const solicitud = this.solicitudes.find(s => s.id_solicitud === id);
      if (!solicitud) return;
      const equipo = this.equipos.find(e => e.id_equipo === solicitud.id_equipo);
      if (equipo) {
        this.equiposService.actualizarEquipo(equipo.id_equipo, {
          ...equipo, id_estado_equipo: 2
        }).subscribe({ next: () => this.cargarDashboard(), error: () => this.cargarDashboard() });
      } else {
        this.cargarDashboard();
      }
    },
    error: () => { this.cargarDashboard(); }
  });
}

  rechazar(id: number): void {
    if (!confirm('¿Rechazar esta solicitud?')) return;
    this.solicitudesService.rechazar(id).subscribe({
      next: () => this.cargarDashboard(),
      error: () => { this.error = 'No se pudo rechazar.'; this.cdr.detectChanges(); }
    });
  }

  verMotivo(motivo: string): void {
    this.motivoActual = motivo;
    this.mostrarModalMotivo = true;
  }

  cerrarModalMotivo(): void {
    this.mostrarModalMotivo = false;
    this.motivoActual = '';
  }

  seleccionarDia(dia: StripDia): void {
    const nuevaFecha = new Date(
      this.fechaSeleccionada.getFullYear(),
      this.fechaSeleccionada.getMonth(),
      dia.num
    );
    this.fechaSeleccionada = nuevaFecha;
    this.actualizarCalendario(nuevaFecha);
    this.cdr.detectChanges();
  }

  formatearHora(fecha: Date | string): string {
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  private construirSolicitudes(): void {
    const pendientes = this.solicitudes
      .filter(s => this.normalizar(s.estado_solicitud) === 'pendiente')
      .sort((a, b) => b.id_solicitud - a.id_solicitud);

    const extraordinarias = pendientes.filter(s => {
      const tipo = this.normalizar(s.tipo_solicitud);
      return tipo === 'evento' || tipo === 'extendido';
    });

    const normales = pendientes.filter(s => {
      const tipo = this.normalizar(s.tipo_solicitud);
      return tipo !== 'evento' && tipo !== 'extendido';
    });

    this.pendientesCount = normales.length;
    this.extraordinariasCount = extraordinarias.length;
    this.solicitudesPendientes = normales.slice(0, 3).map(s => this.mapearSolicitud(s));
    this.solicitudesExtraordinarias = extraordinarias.slice(0, 3).map(s => this.mapearSolicitud(s));
  }

  private construirMovimientos(): void {
    const lista: MovimientoView[] = [];

    this.prestamos.forEach(p => {
      const usuario = this.usuarios.find(u => u.id_usuario === p.id_usuario);
      const equipo = this.equipos.find(e => e.id_equipo === p.id_equipo);
      const estado = this.normalizar(p.estado_prestamo);
      lista.push({
        arrowClass: estado === 'activo' ? 'movement-item__arrow--in' : 'movement-item__arrow--out',
        arrowSymbol: estado === 'activo' ? '→' : '←',
        icon: this.iconoEquipo(equipo?.nombre_equipo),
        title: equipo?.nombre_equipo || `Equipo ${p.id_equipo}`,
        subtitle: `${usuario?.nombre_usuario || 'Usuario'} - ${estado}`,
        fecha: new Date(p.fecha_inicio)
      });
    });

    this.solicitudes
      .filter(s => this.normalizar(s.estado_solicitud) === 'aprobada')
      .forEach(s => {
        const usuario = this.usuarios.find(u => u.id_usuario === s.id_usuario_solicita);
        const equipo = this.equipos.find(e => e.id_equipo === s.id_equipo);
        lista.push({
          arrowClass: 'movement-item__arrow--in',
          arrowSymbol: '→',
          icon: this.iconoEquipo(equipo?.nombre_equipo),
          title: equipo?.nombre_equipo || `Equipo ${s.id_equipo}`,
          subtitle: `${usuario?.nombre_usuario || 'Usuario'} tiene solicitud aprobada`,
          fecha: new Date(s.fecha_solicitud)
        });
      });

    this.movimientos = lista
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
      .slice(0, 4);
  }

  private construirCalendario(): void {
    const hoy = new Date();
    const hoyInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    const eventos = this.obtenerEventosOrdenados();

    let fechaRef = hoyInicio;
    let eventosDelDia = eventos.filter(e => this.esMismoDia(e.fecha, hoyInicio));

    if (eventosDelDia.length === 0) {
      const siguiente = eventos.find(e => e.fecha.getTime() >= hoyInicio.getTime());
      if (siguiente) {
        fechaRef = new Date(siguiente.fecha.getFullYear(), siguiente.fecha.getMonth(), siguiente.fecha.getDate());
        eventosDelDia = eventos.filter(e => this.esMismoDia(e.fecha, fechaRef));
      }
    }

    this.fechaSeleccionada = fechaRef;
    this.actualizarCalendario(fechaRef);
  }

  private actualizarCalendario(fechaRef: Date): void {
    const diasMes = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const diasSemana = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const diasStrip = ['D','L','M','M','J','V','S'];
    const colores = ['var(--teal)', 'var(--orange-bright)', 'var(--yellow)'];

    this.diaNum = String(fechaRef.getDate()).padStart(2, '0');
    this.mesNombre = diasMes[fechaRef.getMonth()];
    this.diaNombre = diasSemana[fechaRef.getDay()];

    const inicioSemana = new Date(fechaRef);
    inicioSemana.setDate(fechaRef.getDate() - fechaRef.getDay());
    this.stripDias = Array.from({ length: 7 }, (_, i) => {
      const f = new Date(inicioSemana);
      f.setDate(inicioSemana.getDate() + i);
      return { num: f.getDate(), label: diasStrip[f.getDay()], hoy: this.esMismoDia(f, fechaRef) };
    });

    const eventosDelDia = this.obtenerEventosOrdenados()
      .filter(e => this.esMismoDia(e.fecha, fechaRef));

    this.calEventos = eventosDelDia.slice(0, 4).map((item, i) => ({
      bar: colores[i % colores.length],
      time: item.fecha.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }),
      title: item.solicitud.grupo_solicitud || this.equipos.find(e => e.id_equipo === item.solicitud.id_equipo)?.nombre_equipo || 'Evento'
    }));
  }

  private obtenerEventosOrdenados(): Array<{ solicitud: Solicitud; fecha: Date }> {
    return this.solicitudes
      .filter(s => this.esEvento(s))
      .map(s => {
        const fecha = new Date(s.fecha_inicio_prestamo || s.fecha_solicitud || '');
        return isNaN(fecha.getTime()) ? null : { solicitud: s, fecha };
      })
      .filter((x): x is { solicitud: Solicitud; fecha: Date } => x !== null)
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  }

  private construirUsuarios(): void {
    this.usuariosActivosCount = this.usuarios.filter(u => u.inLab || this.normalizar(u.estado_usuario) === 'activo').length;
    this.usuariosStatus = [...this.usuarios]
      .sort((a, b) => Number(b.inLab) - Number(a.inLab))
      .slice(0, 4)
      .map(u => ({
        arrowClass: u.inLab ? 'movement-item__arrow--in' : 'movement-item__arrow--out',
        arrowSymbol: u.inLab ? '→' : '←',
        desc: u.inLab ? `${u.nombre_usuario} está en laboratorio` : `${u.nombre_usuario} registró acceso`,
        time: u.ultimo_acceso ? this.formatearHora(u.ultimo_acceso) : '--:--'
      }));
  }

  private mapearSolicitud(s: Solicitud): SolicitudView {
    const equipo = this.equipos.find(e => e.id_equipo === s.id_equipo);
    const usuario = this.usuarios.find(u => u.id_usuario === s.id_usuario_solicita);
    return {
      id: s.id_solicitud,
      icon: this.iconoEquipo(equipo?.nombre_equipo),
      nombre_equipo: equipo?.nombre_equipo || 'Equipo no encontrado',
      num_serie: equipo?.num_serie || `ID-${s.id_equipo}`,
      nombre_usuario: usuario?.nombre_usuario || 'Usuario no encontrado',
      fecha: this.formatearFecha(s.fecha_solicitud),
      motivo: s.motivo || ''
    };
  }

  private formatearFecha(fecha: string): string {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  }

  private esEvento(s: Solicitud): boolean {
    const tipo = this.normalizar(s.tipo_solicitud);
    return tipo === 'evento' || tipo === 'extendido' || !!s.fecha_inicio_prestamo;
  }

  private esMismoDia(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  private iconoEquipo(nombre?: string | null): any {
    const n = this.normalizar(nombre);
    if (n.includes('mac') || n.includes('laptop')) return this.Laptop;
    if (n.includes('ipad') || n.includes('tablet')) return this.Tablet;
    if (n.includes('cable') || n.includes('usb')) return this.Cable;
    return this.Monitor;
  }

  private normalizar(valor?: string | null): string {
    return (valor || '').trim().toLowerCase();
  }

  private obtenerNombreGuardado(): string {
    try {
      const u = localStorage.getItem('usuario');
      return u ? JSON.parse(u)?.nombre_usuario || 'Encargado' : 'Encargado';
    } catch { return 'Encargado'; }
  }
}
