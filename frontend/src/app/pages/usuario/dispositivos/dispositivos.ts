import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  Monitor, Tablet, Smartphone, Cable, Laptop,
  HardDrive, Plus, RotateCcw, Info
} from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { EquiposService, Equipo } from '../../../services/equipos';
import { SolicitudesService } from '../../../services/solicitudes';
import { PrestamosService, Prestamo } from '../../../services/prestamos';

@Component({
  selector: 'app-dispositivos',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './dispositivos.html',
  styleUrls: ['./dispositivos.css']
})
export class Dispositivos implements OnInit {
  readonly Monitor = Monitor;
  readonly Tablet = Tablet;
  readonly Smartphone = Smartphone;
  readonly Cable = Cable;
  readonly Laptop = Laptop;
  readonly HardDrive = HardDrive;
  readonly Plus = Plus;
  readonly RotateCcw = RotateCcw;
  readonly Info = Info;

  readonly GRUPOS = [
    { label: 'STEM',            value: 'stem'     },
    { label: 'Servicio Social', value: 'servicio' },
    { label: 'Honores',         value: 'honores'  },
  ] as const;

  equipos: Equipo[] = [];
  prestamos: Prestamo[] = [];
  cargando = true;
  error = '';
  userId = 0;

  // Mensaje feedback
  mensaje = '';
  mensajeTipo = '';

  // Modal Solicitud
  mostrarModalSolicitud = false;
  equipoParaSolicitar: Equipo | null = null;
  motivoSolicitud = '';

  grupoSolicitud = '';  
  guardandoSolicitud = false;

  // Modal Devolución
  mostrarModalDevolucion = false;
  prestamoParaDevolver: Prestamo | null = null;
  devolviendo = false;

  get prestamosActivos(): Prestamo[] {
    return this.prestamos.filter(p =>
      p.id_usuario === this.userId &&
      (p.estado_prestamo || '').toLowerCase() === 'activo'
    );
  }

  // IDs de equipos que el usuario tiene en préstamo activo
  get equiposEnPrestamo(): Set<number> {
    return new Set(this.prestamosActivos.map(p => p.id_equipo));
  }

  constructor(
    private equiposService: EquiposService,
    private solicitudesService: SolicitudesService,
    private prestamosService: PrestamosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const usuarioGuardado = localStorage.getItem('usuario');
    if (usuarioGuardado) {
      try { this.userId = JSON.parse(usuarioGuardado).id_usuario; } catch { /* */ }
    }
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    forkJoin({
      equipos: this.equiposService.getEquipos(),
      prestamos: this.prestamosService.getPrestamos()
    }).subscribe({
      next: ({ equipos, prestamos }) => {
        this.equipos = Array.isArray(equipos) ? equipos : [];
        this.prestamos = Array.isArray(prestamos) ? prestamos : [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudieron cargar los dispositivos.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Modal solicitud ──
  solicitar(equipo: Equipo): void {
    this.equipoParaSolicitar = equipo;
    this.motivoSolicitud = '';
    this.mostrarModalSolicitud = true;
    this.cdr.detectChanges();
  }

  cerrarModalSolicitud(): void {
    this.mostrarModalSolicitud = false;
    this.equipoParaSolicitar = null;
    this.motivoSolicitud = '';
    this.cdr.detectChanges();
  }

  confirmarSolicitud(): void {
    if (!this.equipoParaSolicitar) return;
    this.guardandoSolicitud = true;

    const payload = {
      id_usuario_solicita: this.userId,
      id_equipo: this.equipoParaSolicitar.id_equipo,
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
        this.mostrarMensaje('Solicitud enviada. El encargado la revisará pronto.', 'success');
        this.cargarDatos();
      },
      error: () => {
        this.guardandoSolicitud = false;
        this.mostrarMensaje('Error al enviar la solicitud.', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  // ── Modal devolución ──
  devolverEquipo(equipo: Equipo): void {
    const prestamo = this.prestamosActivos.find(p => p.id_equipo === equipo.id_equipo);
    if (!prestamo) return;
    this.prestamoParaDevolver = prestamo;
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
  getBadgeClass(idEstado: number): string {
    const mapa: Record<number, string> = {
      1: 'badge--green',
      2: 'badge--yellow',
      3: 'badge--orange',
      4: 'badge--red'
    };
    return mapa[idEstado] ?? 'badge--gray';
  }

  getEstadoNombre(idEstado: number): string {
    const mapa: Record<number, string> = {
      1: 'Disponible', 2: 'En uso', 3: 'Prestado', 4: 'Mantenimiento'
    };
    return mapa[idEstado] ?? 'Desconocido';
  }

  getIconoEquipo(nombre?: string | null): any {
    const n = (nombre || '').toLowerCase();
    if (n.includes('laptop') || n.includes('mac')) return Laptop;
    if (n.includes('ipad') || n.includes('tablet')) return Tablet;
    if (n.includes('iphone') || n.includes('celular')) return Smartphone;
    if (n.includes('cable') || n.includes('usb')) return Cable;
    if (n.includes('disco') || n.includes('hdd')) return HardDrive;
    return Monitor;
  }

  esMioEnPrestamo(equipo: Equipo): boolean {
    return this.equiposEnPrestamo.has(equipo.id_equipo);
  }

  mostrarMensaje(texto: string, tipo: string): void {
    this.mensaje = texto;
    this.mensajeTipo = tipo;
    this.cdr.detectChanges();
    setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 4000);
  }
}
