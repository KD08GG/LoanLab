import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { LucideAngularModule, User } from 'lucide-angular';
import { UsuariosService, Usuario } from '../../../services/usuarios';
import { EquiposService, Equipo } from '../../../services/equipos';
import { PrestamosService, Prestamo } from '../../../services/prestamos';

@Component({
  selector: 'app-usuarios-encargado',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css'
})
export class UsuariosEncargado implements OnInit {
  readonly User = User;

  tabActivo = 'todos';
  usuarios: Usuario[] = [];
  equipos: Equipo[] = [];
  prestamos: Prestamo[] = [];
  cargando = true;
  error = false;

  dispositivoMasUsado: Map<number, string> = new Map();

  constructor(
    private usuariosService: UsuariosService,
    private equiposService: EquiposService,
    private prestamosService: PrestamosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    forkJoin({
      usuarios: this.usuariosService.getUsuarios(),
      equipos: this.equiposService.getEquipos(),
      prestamos: this.prestamosService.getPrestamos()
    }).subscribe({
      next: ({ usuarios, equipos, prestamos }) => {
        this.usuarios = Array.isArray(usuarios) ? usuarios : [];
        this.equipos = Array.isArray(equipos) ? equipos : [];
        this.prestamos = Array.isArray(prestamos) ? prestamos : [];
        this.construirDispositivoMasUsado();
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

  private construirDispositivoMasUsado(): void {
    this.usuarios.forEach(usuario => {
      const prestamosUsuario = this.prestamos.filter(
        p => p.id_usuario === usuario.id_usuario
      );

      if (prestamosUsuario.length === 0) {
        this.dispositivoMasUsado.set(usuario.id_usuario, '-');
        return;
      }

      const conteo = new Map<number, number>();
      prestamosUsuario.forEach(p => {
        conteo.set(p.id_equipo, (conteo.get(p.id_equipo) || 0) + 1);
      });

      const idEquipoMasUsado = Array.from(conteo.entries())
        .sort((a, b) => b[1] - a[1])[0][0];

      const equipo = this.equipos.find(e => e.id_equipo === idEquipoMasUsado);
      this.dispositivoMasUsado.set(
        usuario.id_usuario,
        equipo?.nombre_equipo || '-'
      );
    });
  }

  obtenerDispositivoMasUsado(idUsuario: number): string {
    return this.dispositivoMasUsado.get(idUsuario) || '-';
  }

  cambiarTab(tab: string) {
    this.tabActivo = tab;
    this.cdr.detectChanges();
  }

  get usuariosFiltrados(): Usuario[] {
    if (this.tabActivo === 'todos') return this.usuarios;
    return this.usuarios.filter(u => u.estado_usuario === this.tabActivo);
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
    const d = new Date(fecha);
    return d.toLocaleString('es-MX');
  }
}
