import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { LucideAngularModule, Laptop, Tablet, Cable, Monitor } from 'lucide-angular';
import { UsuariosService, Usuario } from '../../../services/usuarios';
import { EquiposService, Equipo, EstadoEquipo } from '../../../services/equipos';
import { SolicitudesService, Solicitud } from '../../../services/solicitudes';

@Component({
  selector: 'app-movimientos-encargado',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './movimientos.html',
  styleUrl: './movimientos.css'
})
export class MovimientosEncargado implements OnInit {
  readonly Laptop = Laptop;
  readonly Tablet = Tablet;
  readonly Cable = Cable;
  readonly Monitor = Monitor;

  solicitudes: Solicitud[] = [];
  usuarios: Usuario[] = [];
  equipos: Equipo[] = [];
  estados: EstadoEquipo[] = [];

  tabActivo = 'todas';
  cargando = true;
  error = false;

  constructor(
    private solicitudesService: SolicitudesService,
    private usuariosService: UsuariosService,
    private equiposService: EquiposService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    forkJoin({
      solicitudes: this.solicitudesService.getSolicitudes(),
      usuarios: this.usuariosService.getUsuarios(),
      equipos: this.equiposService.getEquipos(),
      estados: this.equiposService.getEstados()
    }).subscribe({
      next: ({ solicitudes, usuarios, equipos, estados }) => {
        this.solicitudes = solicitudes;
        this.usuarios = usuarios;
        this.equipos = equipos;
        this.estados = estados;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = true;
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  cambiarTab(tab: string): void {
    this.tabActivo = tab;
    this.cdr.detectChanges();
  }

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

  obtenerIconoEquipo(nombre: string): any {
    const n = (nombre || '').toLowerCase();
    if (n.includes('mac') || n.includes('laptop')) return this.Laptop;
    if (n.includes('ipad') || n.includes('tablet')) return this.Tablet;
    if (n.includes('cable') || n.includes('usb')) return this.Cable;
    return this.Monitor;
  }

  obtenerTextoEstadoEquipo(id_equipo: number): string {
    const equipo = this.getEquipo(id_equipo);
    if (!equipo) return '-';
    const estado = this.estados.find(e => e.id_estado_equipo === equipo.id_estado_equipo);
    return estado ? estado.nombre_estado : 'Sin estado';
  }

  obtenerClaseBadgeEquipo(id_equipo: number): string {
    const equipo = this.getEquipo(id_equipo);
    if (!equipo) return 'badge';
    const nombre = this.obtenerTextoEstadoEquipo(id_equipo).toLowerCase();
    if (nombre === 'disponible') return 'badge badge--green';
    if (nombre === 'ocupado') return 'badge badge--yellow';
    if (nombre === 'no disponible') return 'badge badge--orange';
    if (nombre === 'mantenimiento') return 'badge badge--red';
    return 'badge badge--gray';
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '-';
    const f = new Date(fecha);
    return f.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
