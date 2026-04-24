import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import {
  LucideAngularModule,
  Monitor, ClipboardList, Calendar,
  Clock, Info, Laptop, Tablet, Smartphone,
  HardDrive, Package, RotateCcw
} from 'lucide-angular';
import { SolicitudesService, Solicitud } from '../../../services/solicitudes';
import { PrestamosService, Prestamo } from '../../../services/prestamos';
import { EquiposService, Equipo } from '../../../services/equipos';

interface SolicitudView {
  id: number;
  nombre_equipo: string;
  num_serie: string;
  fecha: string;
  estado: string;
  tipo: string;
  icon: any;
}

interface PrestamoView {
  id: number;
  id_equipo: number;
  nombre_equipo: string;
  num_serie: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  icon: any;
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

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements OnInit {
  readonly Monitor = Monitor;
  readonly ClipboardList = ClipboardList;
  readonly Calendar = Calendar;
  readonly Clock = Clock;
  readonly Info = Info;
  readonly Package = Package;
  readonly RotateCcw = RotateCcw;

  usuario: any = null;
  userId = 0;

  solicitudes: Solicitud[] = [];
  prestamos: Prestamo[] = [];
  equipos: Equipo[] = [];

  solicitudesPendientes: SolicitudView[] = [];
  solicitudesActivas: SolicitudView[] = [];
  solicitudesHistorial: SolicitudView[] = [];
  prestamoActivo: PrestamoView | null = null;

  movimientosSemana = 0;
  activosCount = 0;

  // Calendario dinámico — mismo patrón que Admin
  diaNum = '';
  mesNombre = '';
  diaNombre = '';
  stripDias: StripDia[] = [];
  eventosOriginales: { fecha: Date; title: string }[] = [];
  eventosHoy: CalEvento[] = [];
  eventosProximos: CalEvento[] = [];
  diaSeleccionado!: Date;

  // Modal devolución
  mostrarModalDevolucion = false;
  prestamoParaDevolver: PrestamoView | null = null;
  devolviendo = false;
  mensajeExito = '';

  activeTab = 'activas';
  cargando = true;
  error = '';

  constructor(
    private solicitudesService: SolicitudesService,
    private prestamosService: PrestamosService,
    private equiposService: EquiposService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const usuarioGuardado = localStorage.getItem('usuario');
    if (usuarioGuardado) {
      try {
        this.usuario = JSON.parse(usuarioGuardado);
        this.userId = this.usuario.id_usuario;
        // Inicializar día seleccionado = hoy
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        this.diaSeleccionado = hoy;
        this.cargarDatos();
      } catch {
        this.error = 'Error al leer sesión.';
        this.cargando = false;
      }
    } else {
      this.error = 'Usuario no encontrado.';
      this.cargando = false;
    }
  }

  cargarDatos(): void {
    this.cargando = true;
    this.error = '';

    forkJoin({
      solicitudes: this.solicitudesService.getSolicitudes(),
      prestamos: this.prestamosService.getPrestamos(),
      equipos: this.equiposService.getEquipos()
    }).subscribe({
      next: ({ solicitudes, prestamos, equipos }) => {
        this.equipos = Array.isArray(equipos) ? equipos : [];

        this.solicitudes = (Array.isArray(solicitudes) ? solicitudes : [])
          .filter(s => s.id_usuario_solicita === this.userId);
        this.prestamos = (Array.isArray(prestamos) ? prestamos : [])
          .filter(p => p.id_usuario === this.userId);

        this.procesarSolicitudes();
        this.procesarPrestamos();
        // Pasar TODAS las solicitudes para el calendario de eventos del lab
        this.construirCalendario(Array.isArray(solicitudes) ? solicitudes : []);

        this.activosCount = this.prestamos.filter(p =>
          this.norm(p.estado_prestamo) === 'activo'
        ).length;
        this.movimientosSemana = this.solicitudes.length;

        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudo cargar la información.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Solicitudes ──
  procesarSolicitudes(): void {
    const mapear = (s: Solicitud): SolicitudView => {
      const equipo = this.equipos.find(e => e.id_equipo === s.id_equipo);
      return {
        id: s.id_solicitud,
        nombre_equipo: equipo?.nombre_equipo || `Equipo ${s.id_equipo}`,
        num_serie: equipo?.num_serie || '',
        fecha: this.formatearFecha(s.fecha_solicitud),
        estado: s.estado_solicitud,
        tipo: s.tipo_solicitud || 'normal',
        icon: this.iconoEquipo(equipo?.nombre_equipo)
      };
    };

    this.solicitudesPendientes = this.solicitudes
      .filter(s => this.norm(s.estado_solicitud) === 'pendiente')
      .sort((a, b) => new Date(b.fecha_solicitud).getTime() - new Date(a.fecha_solicitud).getTime())
      .map(mapear);

    this.solicitudesActivas = this.solicitudes
      .filter(s => this.norm(s.estado_solicitud) === 'aprobada')
      .sort((a, b) => new Date(b.fecha_solicitud).getTime() - new Date(a.fecha_solicitud).getTime())
      .map(mapear);

    this.solicitudesHistorial = this.solicitudes
      .filter(s => ['rechazada', 'finalizada', 'entregada'].includes(this.norm(s.estado_solicitud)))
      .sort((a, b) => new Date(b.fecha_solicitud).getTime() - new Date(a.fecha_solicitud).getTime())
      .slice(0, 10)
      .map(mapear);
  }

  // ── Préstamos ──
  procesarPrestamos(): void {
    const activo = this.prestamos.find(p =>
      ['activo', 'aprobado', 'entregado'].includes(this.norm(p.estado_prestamo))
    );
    if (activo) {
      const equipo = this.equipos.find(e => e.id_equipo === activo.id_equipo);
      this.prestamoActivo = {
        id: activo.id_prestamo,
        id_equipo: activo.id_equipo,
        nombre_equipo: equipo?.nombre_equipo || `Equipo ${activo.id_equipo}`,
        num_serie: equipo?.num_serie || '',
        fecha_inicio: activo.fecha_inicio,
        fecha_fin: activo.fecha_fin || '',
        estado: activo.estado_prestamo,
        icon: this.iconoEquipo(equipo?.nombre_equipo)
      };
    } else {
      this.prestamoActivo = null;
    }
  }

  // ── Calendario interactivo (mismo patrón que Admin) ──
  private construirCalendario(todasSolicitudes: Solicitud[]): void {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const diasMes = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diasStrip = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

    this.eventosOriginales = todasSolicitudes
      .filter(s => this.esEvento(s))
      .map(s => {
        const fecha = new Date(s.fecha_inicio_prestamo || s.fecha_solicitud || '');
        return isNaN(fecha.getTime()) ? null : {
          fecha,
          title: s.grupo_solicitud ||
            this.equipos.find(e => e.id_equipo === s.id_equipo)?.nombre_equipo || 'Evento'
        };
      })
      .filter((x): x is { fecha: Date; title: string } => x !== null)
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    // Header del día seleccionado (igual que Admin)
    const fechaRef = this.diaSeleccionado || hoy;
    this.diaNum = String(fechaRef.getDate()).padStart(2, '0');
    this.mesNombre = diasMes[fechaRef.getMonth()];
    this.diaNombre = diasSemana[fechaRef.getDay()];

    // Strip de 7 días (semana actual desde domingo)
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

  // ── Selección de día (igual que Admin) ──
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

  private actualizarEventosFiltrados(): void {
    const diaRef = new Date(this.diaSeleccionado || new Date());
    diaRef.setHours(0, 0, 0, 0);
    const diaSiguiente = new Date(diaRef);
    diaSiguiente.setDate(diaRef.getDate() + 1);

    const colores = ['var(--teal)', 'var(--orange-bright)', 'var(--yellow)'];

    this.eventosHoy = this.eventosOriginales
      .filter(e => this.esMismoDia(e.fecha, diaRef))
      .map((ev, i) => ({
        bar: colores[i % colores.length],
        time: ev.fecha.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }),
        title: ev.title,
        date: this.formatearFechaMostrada(ev.fecha)
      }));

    this.eventosProximos = this.eventosOriginales
      .filter(e => e.fecha.getTime() >= diaSiguiente.getTime())
      .map((ev, i) => ({
        bar: colores[i % colores.length],
        time: ev.fecha.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }),
        title: ev.title,
        date: this.formatearFechaMostrada(ev.fecha)
      }));
  }

  // ── Devolución ──
  abrirModalDevolucion(): void {
    this.prestamoParaDevolver = this.prestamoActivo;
    this.mostrarModalDevolucion = true;
    this.cdr.detectChanges();
  }

  cerrarModalDevolucion(): void {
    this.mostrarModalDevolucion = false;
    this.prestamoParaDevolver = null;
    this.cdr.detectChanges();
  }

  confirmarDevolucion(): void {
    if (!this.prestamoParaDevolver) return;
    this.devolviendo = true;
    this.prestamosService.devolver(this.prestamoParaDevolver.id, this.userId).subscribe({
      next: () => {
        this.devolviendo = false;
        this.cerrarModalDevolucion();
        this.mensajeExito = 'Equipo devuelto correctamente.';
        setTimeout(() => { this.mensajeExito = ''; this.cdr.detectChanges(); }, 3500);
        this.cargarDatos();
      },
      error: () => {
        this.devolviendo = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Helpers ──
  switchTab(tab: string): void {
    this.activeTab = tab;
  }

  getBadgeClass(estado: string): string {
    const mapa: Record<string, string> = {
      pendiente: 'badge--yellow',
      aprobada: 'badge--green',
      rechazada: 'badge--red',
      entregada: 'badge--blue',
      finalizada: 'badge--gray'
    };
    return mapa[this.norm(estado)] ?? 'badge--gray';
  }

  calcularDiasRestantes(fechaFin: string): number {
    if (!fechaFin) return 0;
    const fin = new Date(fechaFin);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 3600 * 24)));
  }

  private formatearFecha(fecha: string): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  }

  private formatearFechaMostrada(fecha: Date): string {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${meses[fecha.getMonth()]} ${fecha.getDate()}`;
  }

  private esEvento(s: Solicitud): boolean {
    const tipo = this.norm(s.tipo_solicitud);
    return tipo === 'evento' || tipo === 'extendido' || !!s.fecha_inicio_prestamo;
  }

  private esMismoDia(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  private iconoEquipo(nombre?: string | null): any {
    const n = this.norm(nombre);
    if (n.includes('laptop') || n.includes('macbook') || n.includes('mac')) return Laptop;
    if (n.includes('ipad') || n.includes('tablet')) return Tablet;
    if (n.includes('iphone') || n.includes('celular') || n.includes('smartphone')) return Smartphone;
    if (n.includes('disco') || n.includes('hdd')) return HardDrive;
    return Monitor;
  }

  private norm(v?: string | null): string {
    return (v || '').trim().toLowerCase();
  }
}
