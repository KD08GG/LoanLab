import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import {
  LucideAngularModule,
  CalendarDays, Clock3, BadgeCheck,
  Users, Monitor, Laptop, Tablet, Cable, X
} from 'lucide-angular';
import { SolicitudesService, Solicitud } from '../../../services/solicitudes';
import { UsuariosService, Usuario } from '../../../services/usuarios';
import { EquiposService, Equipo } from '../../../services/equipos';

interface EventoData {
  id: number;
  title: string;
  serial: string;
  fecha: string;
  tipo: string;
  detalle: string;
  icon: any;
  badgeColor: string;
  badgeText: string;
  color: string;
  textColor: string;
  month: number;
  year: number;
  day: number;
  fechaBase: string;
  grupo: string;
  estado: string;
  motivo: string;
}

interface StatItem {
  icon: any;
  value: string | number;
  label: string;
  sub: string;
}

interface CalCell {
  isEmpty: boolean;
  isToday: boolean;
  day: number;
  events: Array<{ label: string; color: string; textColor: string; eventoId: number }>;
}

@Component({
  selector: 'app-eventos',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './eventos.html',
  styleUrls: ['./eventos.css']
})
export class Eventos implements OnInit {
  readonly CalendarDays = CalendarDays;
  readonly Clock3 = Clock3;
  readonly BadgeCheck = BadgeCheck;
  readonly Users = Users;
  readonly Monitor = Monitor;
  readonly Laptop = Laptop;
  readonly Tablet = Tablet;
  readonly Cable = Cable;
  readonly X = X;

  equipos: Equipo[] = [];
  usuarios: Usuario[] = [];
  eventos: EventoData[] = [];

  cargando = true;
  error = '';

  stats: StatItem[] = [];
  calHeaders = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  calTitle = '';
  calCells: CalCell[] = [];
  eventosTabla: EventoData[] = [];

  // Modal de detalles del evento
  eventoSeleccionado: EventoData | null = null;
  mostrarModalEvento = false;

  currentMonth = new Date().getMonth();
  currentYear = new Date().getFullYear();

  constructor(
    private readonly solicitudesService: SolicitudesService,
    private readonly usuariosService: UsuariosService,
    private readonly equiposService: EquiposService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarEventos();
  }

  cargarEventos(): void {
    this.cargando = true;
    this.error = '';

    forkJoin({
      solicitudes: this.solicitudesService.getSolicitudes(),
      usuarios: this.usuariosService.getUsuarios(),
      equipos: this.equiposService.getEquipos()
    }).subscribe({
      next: ({ solicitudes, usuarios, equipos }) => {
        this.usuarios = Array.isArray(usuarios) ? usuarios : [];
        this.equipos = Array.isArray(equipos) ? equipos : [];

        this.eventos = (Array.isArray(solicitudes) ? solicitudes : [])
          .filter(s => this.esEvento(s))
          .map(s => this.mapearEvento(s))
          .filter((ev): ev is EventoData => ev !== null)
          .sort((a, b) => this.obtenerTimestamp(a.fechaBase) - this.obtenerTimestamp(b.fechaBase));

        this.sincronizarMesInicial();
        this.construirStats();
        this.construirTablaEventos();
        this.construirCalendario();

        this.cargando = false;
        this.refrescarVista();
      },
      error: () => {
        this.error = 'No se pudieron cargar los eventos.';
        this.cargando = false;
        this.refrescarVista();
      }
    });
  }

  mesAnterior(): void {
    if (this.currentMonth === 0) { this.currentMonth = 11; this.currentYear -= 1; }
    else { this.currentMonth -= 1; }
    this.construirCalendario();
    this.refrescarVista();
  }

  mesSiguiente(): void {
    if (this.currentMonth === 11) { this.currentMonth = 0; this.currentYear += 1; }
    else { this.currentMonth += 1; }
    this.construirCalendario();
    this.refrescarVista();
  }

  // ── Modal detalles ──
  abrirModalEvento(eventoId: number): void {
    this.eventoSeleccionado = this.eventos.find(e => e.id === eventoId) || null;
    if (this.eventoSeleccionado) {
      this.mostrarModalEvento = true;
      this.refrescarVista();
    }
  }

  cerrarModalEvento(): void {
    this.mostrarModalEvento = false;
    this.eventoSeleccionado = null;
    this.refrescarVista();
  }

  // ── Build helpers ──
  private construirStats(): void {
    const total = this.eventos.length;
    const pendientes = this.eventos.filter(e => this.normalizarTexto(e.estado) === 'pendiente').length;
    const aprobados = this.eventos.filter(e => this.normalizarTexto(e.estado) === 'aprobada').length;
    const grupos = new Set(this.eventos.map(e => e.grupo || 'Sin grupo')).size;

    this.stats = [
      { icon: this.CalendarDays, value: total,     label: 'Eventos',    sub: 'Registros detectados' },
      { icon: this.Clock3,       value: pendientes, label: 'Pendientes', sub: 'Por revisar'          },
      { icon: this.BadgeCheck,   value: aprobados,  label: 'Aprobados',  sub: 'Listos para agenda'  },
      { icon: this.Users,        value: grupos,     label: 'Grupos',     sub: 'Con actividad'        }
    ];
  }

  private construirTablaEventos(): void {
    this.eventosTabla = [...this.eventos].slice(0, 20);
  }

  private construirCalendario(): void {
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    this.calTitle = `${meses[this.currentMonth]} ${this.currentYear}`;

    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const offset = (firstDay.getDay() + 6) % 7;
    const hoy = new Date();

    const eventosPorDia = new Map<number, Array<{ label: string; color: string; textColor: string; eventoId: number }>>();
    this.eventos
      .filter(ev => ev.year === this.currentYear && ev.month === this.currentMonth)
      .forEach(ev => {
        const actuales = eventosPorDia.get(ev.day) || [];
        actuales.push({ label: ev.title, color: ev.color, textColor: ev.textColor, eventoId: ev.id });
        eventosPorDia.set(ev.day, actuales.slice(0, 3));
      });

    const cells: CalCell[] = [];
    for (let i = 0; i < offset; i++) cells.push({ isEmpty: true, isToday: false, day: 0, events: [] });
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({
        isEmpty: false,
        isToday: hoy.getFullYear() === this.currentYear &&
                 hoy.getMonth() === this.currentMonth &&
                 hoy.getDate() === day,
        day,
        events: eventosPorDia.get(day) || []
      });
    }
    while (cells.length % 7 !== 0) cells.push({ isEmpty: true, isToday: false, day: 0, events: [] });
    this.calCells = cells;
  }

  private mapearEvento(s: Solicitud): EventoData | null {
    const fechaBase = s.fecha_inicio_prestamo || s.fecha_solicitud || '';
    const fecha = new Date(fechaBase);
    if (Number.isNaN(fecha.getTime())) return null;

    const usuario = this.usuarios.find(u => u.id_usuario === s.id_usuario_solicita);
    const equipo  = this.equipos.find(e => e.id_equipo === s.id_equipo);
    const tipo    = this.tituloTipo(s.tipo_solicitud);
    const badge   = this.estiloTipo(tipo);

    return {
      id:         s.id_solicitud,
      title:      s.grupo_solicitud || equipo?.nombre_equipo || `Solicitud ${s.id_solicitud}`,
      serial:     equipo?.num_serie || `ID-${s.id_equipo}`,
      fecha:      this.formatearFecha(fechaBase),
      tipo,
      detalle:    usuario?.nombre_usuario || s.motivo || 'Sin detalle',
      icon:       this.iconoEquipo(equipo?.nombre_equipo),
      badgeColor: badge.badgeColor,
      badgeText:  badge.badgeText,
      color:      badge.badgeColor,
      textColor:  badge.badgeText,
      month:      fecha.getMonth(),
      year:       fecha.getFullYear(),
      day:        fecha.getDate(),
      fechaBase,
      grupo:      s.grupo_solicitud || 'Sin grupo',
      estado:     s.estado_solicitud || '',
      motivo:     s.motivo || ''
    };
  }

  private tituloTipo(tipo?: string): string {
    const v = this.normalizarTexto(tipo);
    if (v === 'evento') return 'Evento';
    if (v === 'extendido') return 'Extendido';
    return 'Normal';
  }

  private estiloTipo(tipo: string): { badgeColor: string; badgeText: string } {
    const v = this.normalizarTexto(tipo);
    if (v === 'evento')    return { badgeColor: 'rgba(20,184,166,0.18)',  badgeText: '#0f766e' };
    if (v === 'extendido') return { badgeColor: 'rgba(255,149,0,0.18)',   badgeText: '#c2410c' };
    return { badgeColor: 'rgba(253,190,17,0.2)', badgeText: '#92400e' };
  }

  private iconoEquipo(nombre?: string | null): any {
    const n = this.normalizarTexto(nombre);
    if (n.includes('ipad') || n.includes('tablet')) return this.Tablet;
    if (n.includes('cable') || n.includes('usb'))   return this.Cable;
    if (n.includes('mac')  || n.includes('laptop')) return this.Laptop;
    return this.Monitor;
  }

  private formatearFecha(fecha: string): string {
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private esEvento(s: Solicitud): boolean {
    const tipo = this.normalizarTexto(s.tipo_solicitud);
    return tipo === 'evento' || tipo === 'extendido' || !!s.fecha_inicio_prestamo;
  }

  private normalizarTexto(valor?: string | null): string {
    return (valor || '').trim().toLowerCase();
  }

  private obtenerTimestamp(fecha: string): number {
    const t = new Date(fecha).getTime();
    return Number.isNaN(t) ? 0 : t;
  }

  private sincronizarMesInicial(): void {
    if (!this.eventos.length) return;
    const hoy = new Date();
    const hoyTs = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
    const proximo = this.eventos.find(ev => this.obtenerTimestamp(ev.fechaBase) >= hoyTs);
    const ref = proximo || this.eventos[this.eventos.length - 1];
    this.currentMonth = ref.month;
    this.currentYear  = ref.year;
  }

  private refrescarVista(): void {
    this.cdr.markForCheck();
    setTimeout(() => {
      try { this.cdr.detectChanges(); }
      catch (e) { console.warn('Error al refrescar vista eventos:', e); }
    }, 0);
  }
}
