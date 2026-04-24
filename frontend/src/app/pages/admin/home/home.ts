import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { forkJoin } from 'rxjs';
import {
  LucideAngularModule,
  Bell, Activity, Calendar,
  Users, Package, Monitor, Laptop, Tablet, Cable
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
  fechaCompleta: Date;
}

interface CalEvento {
  bar: string;
  time: string;
  title: string;
  date: string;
}

interface UsuarioStatusView {
  arrowClass: string;
  arrowSymbol: string;
  desc: string;
  time: string;
}

interface InventarioItem {
  icon: any;
  nombre: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements OnInit, OnDestroy {
  readonly Bell = Bell;
  readonly Activity = Activity;
  readonly Calendar = Calendar;
  readonly Users = Users;
  readonly Package = Package;
  readonly Monitor = Monitor;
  readonly Laptop = Laptop;
  readonly Tablet = Tablet;
  readonly Cable = Cable;

  nombreUsuario = 'Usuario';

  solicitudes: Solicitud[] = [];
  usuarios: Usuario[] = [];
  equipos: Equipo[] = [];
  prestamos: Prestamo[] = [];

  mostrarModalMotivo = false;
  motivoActual = '';

  cargando = true;
  error = '';

  solicitudesPendientesView: SolicitudView[] = [];
  solicitudesExtraordinariasView: SolicitudView[] = [];
  pendientesCount = 0;
  extraordinariasCount = 0;

  movimientos: MovimientoView[] = [];

  diaNum = '';
  mesNombre = '';
  diaNombre = '';
  stripDias: StripDia[] = [];
  eventosOriginales: { fecha: Date; title: string }[] = [];
  eventosHoy: CalEvento[] = [];
  eventosProximos: CalEvento[] = [];

  // ── NUEVO: día seleccionado en el strip ──
  diaSeleccionado!: Date;

  usuariosActivosCount = 0;
  usuariosStatus: UsuarioStatusView[] = [];

  totalEquipos = 0;
  inventarioItems: InventarioItem[] = [];

  private sseSolicitudes!: EventSource;
  private sseUsuarios!: EventSource;
  private sseEquipos!: EventSource;
  private ssePrestamos!: EventSource;

  constructor(
    private readonly solicitudesService: SolicitudesService,
    private readonly usuariosService: UsuariosService,
    private readonly equiposService: EquiposService,
    private readonly prestamosService: PrestamosService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.nombreUsuario = this.obtenerNombreGuardado();
    // Inicializar día seleccionado como hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    this.diaSeleccionado = hoy;

    this.cargarDashboard();
    this.conectarSSE();
  }

  ngOnDestroy(): void {
    if (this.sseSolicitudes) this.sseSolicitudes.close();
    if (this.sseUsuarios) this.sseUsuarios.close();
    if (this.sseEquipos) this.sseEquipos.close();
    if (this.ssePrestamos) this.ssePrestamos.close();
  }

  private conectarSSE(): void {
    this.sseSolicitudes = new EventSource('http://localhost:8000/api/solicitudes/stream/');
    this.sseSolicitudes.onmessage = () => this.cargarDashboard();
    this.sseSolicitudes.onerror = (e) => console.error('SSE solicitudes:', e);

    this.sseUsuarios = new EventSource('http://localhost:8000/api/usuarios/stream/');
    this.sseUsuarios.onmessage = () => this.cargarDashboard();
    this.sseUsuarios.onerror = (e) => console.error('SSE usuarios:', e);

    this.sseEquipos = new EventSource('http://localhost:8000/api/equipos/stream/');
    this.sseEquipos.onmessage = () => this.cargarDashboard();
    this.sseEquipos.onerror = (e) => console.error('SSE equipos:', e);

    this.ssePrestamos = new EventSource('http://localhost:8000/api/prestamos/stream/');
    this.ssePrestamos.onmessage = () => this.cargarDashboard();
    this.ssePrestamos.onerror = (e) => console.error('SSE prestamos:', e);
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
        this.construirInventario();

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

  // ── NUEVO: seleccionar un día del strip ──
  seleccionarDia(dia: StripDia): void {
    this.diaSeleccionado = dia.fechaCompleta;

    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diasMes = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    this.diaNum = String(dia.fechaCompleta.getDate()).padStart(2, '0');
    this.mesNombre = diasMes[dia.fechaCompleta.getMonth()];
    this.diaNombre = diasSemana[dia.fechaCompleta.getDay()];

    this.actualizarEventosFiltrados();
    this.cdr.detectChanges();
  }

  esDiaSeleccionado(dia: StripDia): boolean {
    return this.esMismoDia(dia.fechaCompleta, this.diaSeleccionado);
  }

  aprobar(id: number): void {
    if (!confirm('¿Aprobar esta solicitud?')) return;

    const usuarioGuardado = localStorage.getItem('usuario');
    let idUsuarioEntrega = 0;
    if (usuarioGuardado) {
      try {
        const u = JSON.parse(usuarioGuardado);
        idUsuarioEntrega = Number(u?.id_usuario || 0);
      } catch { /* ignorar */ }
    }

    if (!idUsuarioEntrega) {
      this.error = 'No se pudo identificar al usuario que aprueba.';
      this.cdr.detectChanges();
      return;
    }

    this.solicitudesService.aprobar(id, idUsuarioEntrega).subscribe({
      next: () => this.cargarDashboard(),
      error: () => { this.error = 'No se pudo aprobar.'; this.cdr.detectChanges(); }
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

  formatearHora(fecha: Date | string): string {
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  private construirSolicitudes(): void {
    const pendientes = this.solicitudes
      .filter((s) => this.normalizar(s.estado_solicitud) === 'pendiente')
      .sort((a, b) => b.id_solicitud - a.id_solicitud);

    const extraordinarias = pendientes.filter((s) => {
      const tipo = this.normalizar(s.tipo_solicitud);
      return tipo === 'evento' || tipo === 'extendido';
    });
    const normales = pendientes.filter((s) => {
      const tipo = this.normalizar(s.tipo_solicitud);
      return tipo !== 'evento' && tipo !== 'extendido';
    });

    this.pendientesCount = normales.length;
    this.extraordinariasCount = extraordinarias.length;
    this.solicitudesPendientesView = normales.slice(0, 3).map((s) => this.mapearSolicitud(s));
    this.solicitudesExtraordinariasView = extraordinarias.slice(0, 3).map((s) => this.mapearSolicitud(s));
  }

  private construirMovimientos(): void {
    const lista: MovimientoView[] = [];

    this.prestamos.forEach((p) => {
      const usuario = this.usuarios.find((u) => u.id_usuario === p.id_usuario);
      const equipo = this.equipos.find((e) => e.id_equipo === p.id_equipo);
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
      .filter((s) => this.normalizar(s.estado_solicitud) === 'aprobada')
      .forEach((s) => {
        const usuario = this.usuarios.find((u) => u.id_usuario === s.id_usuario_solicita);
        const equipo = this.equipos.find((e) => e.id_equipo === s.id_equipo);
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
    hoy.setHours(0, 0, 0, 0);
    const diasMes = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diasStrip = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

    this.eventosOriginales = this.solicitudes
      .filter((s) => this.esEvento(s))
      .map((s) => {
        const fecha = new Date(s.fecha_inicio_prestamo || s.fecha_solicitud || '');
        return isNaN(fecha.getTime()) ? null : {
          fecha,
          title: s.grupo_solicitud ||
            this.equipos.find((e) => e.id_equipo === s.id_equipo)?.nombre_equipo || 'Evento'
        };
      })
      .filter((x): x is { fecha: Date; title: string } => x !== null)
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    // Mostrar datos del día actualmente seleccionado (o hoy si es la primera carga)
    const fechaRef = this.diaSeleccionado || hoy;
    this.diaNum = String(fechaRef.getDate()).padStart(2, '0');
    this.mesNombre = diasMes[fechaRef.getMonth()];
    this.diaNombre = diasSemana[fechaRef.getDay()];

    // Construir strip de 7 días (semana actual)
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());

    this.stripDias = Array.from({ length: 7 }, (_, i) => {
      const f = new Date(inicioSemana);
      f.setDate(inicioSemana.getDate() + i);
      f.setHours(0, 0, 0, 0);
      return {
        num: f.getDate(),
        label: diasStrip[f.getDay()],
        hoy: this.esMismoDia(f, hoy),
        fechaCompleta: new Date(f)
      };
    });

    this.actualizarEventosFiltrados();
  }

  private actualizarEventosFiltrados(): void {
    const diaRef = this.diaSeleccionado || new Date();
    diaRef.setHours(0, 0, 0, 0);
    const diaSiguiente = new Date(diaRef);
    diaSiguiente.setDate(diaRef.getDate() + 1);

    const colores = ['var(--teal)', 'var(--orange-bright)', 'var(--yellow)'];

    // Eventos del día seleccionado
    this.eventosHoy = this.eventosOriginales
      .filter((e) => this.esMismoDia(e.fecha, diaRef))
      .map((ev, i) => ({
        bar: colores[i % colores.length],
        time: ev.fecha.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }),
        title: ev.title,
        date: this.formatearFechaMostrada(ev.fecha)
      }));

    // Próximos eventos (después del día seleccionado)
    this.eventosProximos = this.eventosOriginales
      .filter((e) => e.fecha.getTime() >= diaSiguiente.getTime())
      .map((ev, i) => ({
        bar: colores[i % colores.length],
        time: ev.fecha.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }),
        title: ev.title,
        date: this.formatearFechaMostrada(ev.fecha)
      }));
  }

  private formatearFechaMostrada(fecha: Date): string {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${meses[fecha.getMonth()]} ${fecha.getDate()}`;
  }

  private construirUsuarios(): void {
    this.usuariosActivosCount = this.usuarios.filter(
      (u) => u.inLab || this.normalizar(u.estado_usuario) === 'activo'
    ).length;

    this.usuariosStatus = [...this.usuarios]
      .sort((a, b) => Number(b.inLab) - Number(a.inLab))
      .slice(0, 4)
      .map((u) => ({
        arrowClass: u.inLab ? 'movement-item__arrow--in' : 'movement-item__arrow--out',
        arrowSymbol: u.inLab ? '→' : '←',
        desc: u.inLab ? `${u.nombre_usuario} está en laboratorio` : `${u.nombre_usuario} registró acceso`,
        time: u.ultimo_acceso ? this.formatearHora(u.ultimo_acceso) : '--:--'
      }));
  }

  private construirInventario(): void {
    this.totalEquipos = this.equipos.length;
    const conteo = new Map<string, { icon: any; total: number }>();
    this.equipos.forEach((e) => {
      const clave = e.nombre_equipo || 'Equipo';
      const existe = conteo.get(clave);
      if (existe) { existe.total += 1; }
      else { conteo.set(clave, { icon: this.iconoEquipo(clave), total: 1 }); }
    });
    this.inventarioItems = Array.from(conteo.entries()).slice(0, 5).map(([nombre, data]) => ({
      icon: data.icon,
      nombre: data.total > 1 ? `${nombre} (${data.total})` : nombre
    }));
  }

  private mapearSolicitud(s: Solicitud): SolicitudView {
    const equipo = this.equipos.find((e) => e.id_equipo === s.id_equipo);
    const usuario = this.usuarios.find((u) => u.id_usuario === s.id_usuario_solicita);
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
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
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
      return u ? JSON.parse(u)?.nombre_usuario || 'Usuario' : 'Usuario';
    } catch {
      return 'Usuario';
    }
  }
}