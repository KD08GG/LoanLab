import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  LucideAngularModule,
  Clock, CheckCircle, List, Plus,
  Monitor, Tablet, Cable, Laptop,
  RotateCcw, TrendingUp, Award
} from 'lucide-angular';
import { SolicitudesService, Solicitud } from '../../../services/solicitudes';
import { EquiposService, Equipo } from '../../../services/equipos';
import { PrestamosService, Prestamo } from '../../../services/prestamos';

@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './solicitudes.html',
  styleUrls: ['./solicitudes.css']
})
export class Solicitudes implements OnInit {
  readonly Clock = Clock;
  readonly CheckCircle = CheckCircle;
  readonly List = List;
  readonly Plus = Plus;
  readonly Monitor = Monitor;
  readonly RotateCcw = RotateCcw;
  readonly TrendingUp = TrendingUp;
  readonly Award = Award;

  readonly GRUPOS = [
    { label: 'STEM',            value: 'stem'     },
    { label: 'Servicio Social', value: 'servicio' },
    { label: 'Honores',         value: 'honores'  },
  ] as const;

  solicitudes: Solicitud[] = [];
  equipos: Equipo[] = [];
  prestamos: Prestamo[] = [];
  filtradas: Solicitud[] = [];

  filtroActivo = 'todas';
  cargando = true;
  error = '';
  userId = 0;

  // Mensaje de feedback
  mensaje = '';
  mensajeTipo = '';

  // Modal préstamo rápido
  mostrarModalSolicitud = false;
  guardandoSolicitud = false;
  equipoSeleccionado = 0;
  motivoSolicitud = '';
  grupoSolicitud = '';
  
  intentoGuardar = false;

  // Modal devolución
  mostrarModalDevolucion = false;
  devolviendo = false;
  prestamoParaDevolver: Prestamo | null = null;

  // Stats calculadas
  equipoMasUsado = '';
  totalUsoEquipoTop = 0;
  ultimoPrestamo: Prestamo | null = null;
  ultimoPrestamoEquipo: Equipo | undefined;

  get pendientes()  { return this.solicitudes.filter(s => this.norm(s.estado_solicitud) === 'pendiente').length; }
  get aprobadas()   { return this.solicitudes.filter(s => this.norm(s.estado_solicitud) === 'aprobada').length; }
  get total()       { return this.solicitudes.length; }

  get equiposDisponibles(): Equipo[] {
    return this.equipos.filter(e => e.id_estado_equipo === 1);
  }

  get prestamosActivos(): Prestamo[] {
    return this.prestamos.filter(p =>
      p.id_usuario === this.userId &&
      this.norm(p.estado_prestamo) === 'activo'
    );
  }

  constructor(
    private solicitudesService: SolicitudesService,
    private equiposService: EquiposService,
    private prestamosService: PrestamosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const usuario = localStorage.getItem('usuario');
    if (usuario) {
      try { this.userId = JSON.parse(usuario).id_usuario; } catch { /* */ }
    }
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    this.error = '';
    forkJoin({
      solicitudes: this.solicitudesService.getSolicitudes(),
      equipos: this.equiposService.getEquipos(),
      prestamos: this.prestamosService.getPrestamos()
    }).subscribe({
      next: ({ solicitudes, equipos, prestamos }) => {
        this.equipos = Array.isArray(equipos) ? equipos : [];
        this.prestamos = Array.isArray(prestamos) ? prestamos : [];
        this.solicitudes = (Array.isArray(solicitudes) ? solicitudes : [])
          .filter(s => s.id_usuario_solicita === this.userId)
          .sort((a, b) => b.id_solicitud - a.id_solicitud)
          .slice(0, 10); // máx 10 solicitudes visibles
        this.filtrar('todas');
        this.calcularStats();
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudieron cargar las solicitudes.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  private calcularStats(): void {
    // Equipo más usado (por número de solicitudes del usuario)
    const conteo = new Map<number, number>();
    this.solicitudes.forEach(s => {
      conteo.set(s.id_equipo, (conteo.get(s.id_equipo) || 0) + 1);
    });
    if (conteo.size > 0) {
      const topId = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0];
      const equipoTop = this.equipos.find(e => e.id_equipo === topId[0]);
      this.equipoMasUsado = equipoTop?.nombre_equipo || `Equipo ${topId[0]}`;
      this.totalUsoEquipoTop = topId[1];
    }

    // Último préstamo del usuario
    const misPrestamos = this.prestamos
      .filter(p => p.id_usuario === this.userId)
      .sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime());
    this.ultimoPrestamo = misPrestamos[0] || null;
    if (this.ultimoPrestamo) {
      this.ultimoPrestamoEquipo = this.equipos.find(e => e.id_equipo === this.ultimoPrestamo!.id_equipo);
    }
  }

  filtrar(estado: string): void {
    this.filtroActivo = estado;
    this.filtradas = estado === 'todas'
      ? this.solicitudes
      : this.solicitudes.filter(s => this.norm(s.estado_solicitud) === estado);
  }

  // ── Modal Préstamo Rápido ──
  abrirModalSolicitud(): void {
    this.mostrarModalSolicitud = true;
    this.equipoSeleccionado = 0;
    this.motivoSolicitud = '';
    this.grupoSolicitud = '';
    this.intentoGuardar = false;
    this.cdr.detectChanges();
  }

  cerrarModalSolicitud(): void {
    this.mostrarModalSolicitud = false;
    this.equipoSeleccionado = 0;
    this.motivoSolicitud = '';
    this.grupoSolicitud = '';
    this.intentoGuardar = false;
    this.cdr.detectChanges();
  }

  guardarSolicitud(): void {
    this.intentoGuardar = true;
    this.cdr.detectChanges();
    if (!this.equipoSeleccionado) return;
    if (!this.equipoSeleccionado || !this.grupoSolicitud) return;


    this.guardandoSolicitud = true;
    const payload = {
      id_usuario_solicita: this.userId,
      id_equipo: this.equipoSeleccionado,
      fecha_solicitud: new Date().toISOString(),
      grupo_solicitud: this.grupoSolicitud,
      estado_solicitud: 'Pendiente',
      tipo_solicitud: 'Normal',
      motivo: this.motivoSolicitud || ''
    };

    this.solicitudesService.crearSolicitud(payload).subscribe({
      next: () => {
        this.guardandoSolicitud = false;
        this.cerrarModalSolicitud();
        this.mostrarMensaje('Solicitud enviada correctamente.', 'success');
        this.cargarDatos();
      },
      error: () => {
        this.guardandoSolicitud = false;
        this.mostrarMensaje('Error al enviar la solicitud.', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  // ── Modal Devolución ──
  abrirModalDevolucion(p: Prestamo): void {
    this.prestamoParaDevolver = p;
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
    this.prestamosService.devolver(this.prestamoParaDevolver.id_prestamo, this.userId).subscribe({
      next: () => {
        this.devolviendo = false;
        this.cerrarModalDevolucion();
        this.mostrarMensaje('Equipo devuelto correctamente.', 'success');
        this.cargarDatos();
      },
      error: () => {
        this.devolviendo = false;
        this.mostrarMensaje('Error al procesar la devolución.', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  // ── Helpers ──
  getEquipo(idEquipo: number): Equipo | undefined {
    return this.equipos.find(e => e.id_equipo === idEquipo);
  }

  getIconoEquipo(nombre?: string): any {
    const n = (nombre || '').toLowerCase();
    if (n.includes('ipad') || n.includes('tablet')) return Tablet;
    if (n.includes('cable') || n.includes('usb')) return Cable;
    if (n.includes('mac') || n.includes('laptop')) return Laptop;
    return Monitor;
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
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

  mostrarMensaje(texto: string, tipo: string): void {
    this.mensaje = texto;
    this.mensajeTipo = tipo;
    this.cdr.detectChanges();
    setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 4000);
  }

  private norm(v: string): string { return (v || '').trim().toLowerCase(); }
}
