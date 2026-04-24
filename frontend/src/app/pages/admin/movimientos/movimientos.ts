import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { LucideAngularModule, Laptop, Tablet, Cable, Monitor } from 'lucide-angular';
import { PrestamosService, Prestamo } from '../../../services/prestamos';
import { UsuariosService, Usuario } from '../../../services/usuarios';
import { EquiposService, Equipo, EstadoEquipo } from '../../../services/equipos';
import { SolicitudesService, Solicitud } from '../../../services/solicitudes';

@Component({
  selector: 'app-movimientos',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './movimientos.html',
  styleUrls: ['./movimientos.css']
})
export class Movimientos implements OnInit, OnDestroy {
  readonly Laptop = Laptop;
  readonly Tablet = Tablet;
  readonly Cable = Cable;
  readonly Monitor = Monitor;

  prestamos: Prestamo[] = [];
  solicitudes: Solicitud[] = [];
  usuarios: Usuario[] = [];
  equipos: Equipo[] = [];
  estados: EstadoEquipo[] = [];   // ← NUEVO: para leer el estado del equipo

  tabActivo = 'todas';
  cargando = true;
  error = false;

  private sseSolicitudes!: EventSource;

  constructor(
    private prestamosService: PrestamosService,
    private solicitudesService: SolicitudesService,
    private usuariosService: UsuariosService,
    private equiposService: EquiposService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    forkJoin({
      prestamos: this.prestamosService.getPrestamos(),
      solicitudes: this.solicitudesService.getSolicitudes(),
      usuarios: this.usuariosService.getUsuarios(),
      equipos: this.equiposService.getEquipos(),
      estados: this.equiposService.getEstados()   // ← NUEVO
    }).subscribe({
      next: ({ prestamos, solicitudes, usuarios, equipos, estados }) => {
        this.prestamos = prestamos;
        this.solicitudes = solicitudes;
        this.usuarios = usuarios;
        this.equipos = equipos;
        this.estados = Array.isArray(estados) ? estados : [];
        this.cargando = false;
        this.conectarSSE();
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = true;
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.sseSolicitudes) this.sseSolicitudes.close();
  }

  private conectarSSE(): void {
    this.sseSolicitudes = new EventSource('http://localhost:8000/api/solicitudes/stream/');
    this.sseSolicitudes.onmessage = () => this.recargarDatos();
    this.sseSolicitudes.onerror = (e) => console.error('Error SSE movimientos:', e);
  }

  private recargarDatos(): void {
    forkJoin({
      prestamos: this.prestamosService.getPrestamos(),
      solicitudes: this.solicitudesService.getSolicitudes(),
      usuarios: this.usuariosService.getUsuarios(),
      equipos: this.equiposService.getEquipos(),
      estados: this.equiposService.getEstados()
    }).subscribe({
      next: ({ prestamos, solicitudes, usuarios, equipos, estados }) => {
        this.prestamos = prestamos;
        this.solicitudes = solicitudes;
        this.usuarios = usuarios;
        this.equipos = equipos;
        this.estados = Array.isArray(estados) ? estados : [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error recargando movimientos:', err)
    });
  }

  cambiarTab(tab: string): void {
    this.tabActivo = tab;
    this.cdr.detectChanges();
  }

  // La tabla de Movimientos ahora muestra las SOLICITUDES (intercambiada desde Solicitudes)
  get solicitudesFiltradas(): Solicitud[] {
    if (this.tabActivo === 'todas') return this.solicitudes;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);

    if (this.tabActivo === 'hoy') {
      return this.solicitudes.filter(s => {
        const f = new Date(s.fecha_solicitud);
        return f >= hoy && f < manana;
      });
    }

    if (this.tabActivo === 'semana') {
      const hace7 = new Date(hoy);
      hace7.setDate(hoy.getDate() - 7);
      return this.solicitudes.filter(s => {
        const f = new Date(s.fecha_solicitud);
        return f >= hace7;
      });
    }

    return this.solicitudes;
  }

  getUsuario(id: number): Usuario | undefined {
    return this.usuarios.find(u => u.id_usuario === id);
  }

  getEquipo(id: number): Equipo | undefined {
    return this.equipos.find(e => e.id_equipo === id);
  }

  // ── Estado del EQUIPO (no de la solicitud) ──
  obtenerTextoEstadoEquipo(id_equipo: number): string {
    const equipo = this.equipos.find(e => e.id_equipo === id_equipo);
    if (!equipo) return '-';
    const estado = this.estados.find(e => e.id_estado_equipo === equipo.id_estado_equipo);
    return estado?.nombre_estado || 'Sin estado';
  }

  obtenerClaseBadgeEquipo(id_equipo: number): string {
    const texto = this.obtenerTextoEstadoEquipo(id_equipo).toLowerCase();
    if (texto === 'disponible') return 'badge badge--green';
    if (texto === 'ocupado') return 'badge badge--yellow';
    if (texto === 'no disponible') return 'badge badge--orange';
    if (texto === 'mantenimiento') return 'badge badge--red';
    return 'badge badge--gray';
  }

  obtenerIcono(id_equipo: number): any {
    const nombre = this.getEquipo(id_equipo)?.nombre_equipo || '';
    const n = nombre.toLowerCase();
    if (n.includes('mac') || n.includes('laptop')) return this.Laptop;
    if (n.includes('ipad') || n.includes('tablet')) return this.Tablet;
    if (n.includes('cable') || n.includes('usb')) return this.Cable;
    return this.Monitor;
  }

  obtenerClaseBadgeSolicitud(estado: string): string {
    const e = (estado || 'pendiente').toLowerCase();
    if (e === 'pendiente') return 'badge badge--yellow';
    if (e === 'aprobada') return 'badge badge--green';
    if (e === 'rechazada') return 'badge badge--red';
    return 'badge badge--gray';
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).replace(/\//g, '-');
  }

  formatearHora(fecha: string | null): string {
    if (!fecha) return '--:--';
    return new Date(fecha).toLocaleTimeString('es-MX', {
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  }
}