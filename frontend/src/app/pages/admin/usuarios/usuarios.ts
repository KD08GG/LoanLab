import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { LucideAngularModule, User } from 'lucide-angular';
import { UsuariosService, Usuario } from '../../../services/usuarios';
import { EquiposService, Equipo } from '../../../services/equipos';
import { PrestamosService, Prestamo } from '../../../services/prestamos';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.css']
})
export class Usuarios implements OnInit, OnDestroy {
  readonly User = User;

  nombreUsuario = 'Usuario';
  tabActivo = 'todos';
  usuarios: Usuario[] = [];
  equipos: Equipo[] = [];
  prestamos: Prestamo[] = [];
  cargando = true;
  error = false;

  private eventSource!: EventSource;

  constructor(
    private usuariosService: UsuariosService,
    private equiposService: EquiposService,
    private prestamosService: PrestamosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.nombreUsuario = this.obtenerNombreGuardado();

    forkJoin({
      usuarios: this.usuariosService.getUsuarios(),
      equipos: this.equiposService.getEquipos(),
      prestamos: this.prestamosService.getPrestamos()
    }).subscribe({
      next: ({ usuarios, equipos, prestamos }) => {
        this.usuarios = Array.isArray(usuarios) ? usuarios : [];
        this.equipos = Array.isArray(equipos) ? equipos : [];
        this.prestamos = Array.isArray(prestamos) ? prestamos : [];
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
    if (this.eventSource) this.eventSource.close();
  }

  private conectarSSE(): void {
    this.eventSource = new EventSource('http://localhost:8000/api/usuarios/stream/');
    this.eventSource.onmessage = () => {
      forkJoin({
        usuarios: this.usuariosService.getUsuarios(),
        equipos: this.equiposService.getEquipos(),
        prestamos: this.prestamosService.getPrestamos()
      }).subscribe({
        next: ({ usuarios, equipos, prestamos }) => {
          this.usuarios = Array.isArray(usuarios) ? [...usuarios] : [];
          this.equipos = Array.isArray(equipos) ? equipos : [];
          this.prestamos = Array.isArray(prestamos) ? prestamos : [];
          this.cdr.detectChanges();
        }
      });
    };
    this.eventSource.onerror = (e) => console.error('Error SSE usuarios:', e);
  }

  private obtenerNombreGuardado(): string {
    const nombre = localStorage.getItem('nombre');
    if (nombre) return nombre;
    const usuarioGuardado = localStorage.getItem('usuario');
    if (!usuarioGuardado) return 'Usuario';
    try {
      const u = JSON.parse(usuarioGuardado);
      return u?.nombre_usuario || u?.nombre || u?.username || 'Usuario';
    } catch { return 'Usuario'; }
  }

  cambiarTab(tab: string): void {
    this.tabActivo = tab;
    this.cdr.detectChanges();
  }

  get usuariosFiltrados(): Usuario[] {
    if (this.tabActivo === 'todos') return this.usuarios;
    return this.usuarios.filter(u => u.estado_usuario === this.tabActivo);
  }

  // Devuelve el nombre del equipo del último préstamo del usuario
  getUltimoPrestamo(idUsuario: number): string {
    const prestamosUsuario = this.prestamos
      .filter(p => p.id_usuario === idUsuario)
      .sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime());

    if (!prestamosUsuario.length) return '—';

    const ultimo = prestamosUsuario[0];
    const equipo = this.equipos.find(e => e.id_equipo === ultimo.id_equipo);
    return equipo?.nombre_equipo || `Equipo #${ultimo.id_equipo}`;
  }

  obtenerClaseBadge(estado: string): string {
    const clases: { [key: string]: string } = {
      activo: 'badge badge--green',
      fuera: 'badge badge--gray',
      suspendido: 'badge badge--red',
      prestamo: 'badge badge--orange'
    };
    return clases[estado] || 'badge';
  }

  obtenerTextoEstado(estado: string): string {
    const textos: { [key: string]: string } = {
      activo: 'Activo',
      fuera: 'Fuera',
      suspendido: 'Suspendido',
      prestamo: 'Préstamo extendido'
    };
    return textos[estado] || estado;
  }

  obtenerUltimoAcceso(fecha: string | null): string {
    if (!fecha) return 'Sin acceso';
    return new Date(fecha).toLocaleString('es-MX');
  }
}