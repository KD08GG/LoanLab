import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { LucideAngularModule, Monitor, Tablet, Cable, Search, Plus, Pencil, Trash2 } from 'lucide-angular';
import { EquiposService, Equipo, EstadoEquipo } from '../../../services/equipos';
import { PrestamosService, Prestamo } from '../../../services/prestamos';

@Component({
  selector: 'app-inventario-encargado',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './inventario.html',
  styleUrl: './inventario.css'
})
export class InventarioEncargado implements OnInit {
  readonly Monitor = Monitor;
  readonly Tablet = Tablet;
  readonly Cable = Cable;
  readonly Search = Search;
  readonly Plus = Plus;
  readonly Pencil = Pencil;
  readonly Trash2 = Trash2;

  equipos: Equipo[] = [];
  equiposFiltrados: Equipo[] = [];
  estados: EstadoEquipo[] = [];
  prestamos: Prestamo[] = [];
  tabActivo = 'todas';
  cargando = true;
  error = false;
  textoBusqueda = '';

  mostrarModal = false;
  guardando = false;
  nuevoEquipo = {
    nombre_equipo: '',
    marca: '',
    modelo: '',
    num_serie: '',
    fecha_alta: '',
    activo_equipo: true,
    id_categoria: 1,
    id_ubicacion: 1,
    id_estado_equipo: 1
  };

  mostrarModalEditar = false;
  guardandoEditar = false;
  equipoEditando: Equipo | null = null;
  equipoEditandoForm = {
    nombre_equipo: '',
    marca: '',
    modelo: '',
    num_serie: '',
    fecha_alta: '',
    id_estado_equipo: 1
  };

  constructor(
    private equiposService: EquiposService,
    private prestamosService: PrestamosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    forkJoin({
      equipos: this.equiposService.getEquipos(),
      estados: this.equiposService.getEstados(),
      prestamos: this.prestamosService.getPrestamos()
    }).subscribe({
      next: ({ equipos, estados, prestamos }) => {
        this.estados = estados;
        this.equipos = equipos;
        this.prestamos = prestamos;
        this.equiposFiltrados = equipos;
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

  buscar(evento: Event) {
    this.textoBusqueda = (evento.target as HTMLInputElement).value.toLowerCase();
    this.filtrar();
  }

  filtrar() {
    let resultado = this.equipos;
    if (this.tabActivo !== 'todas') {
      resultado = resultado.filter(e =>
        this.obtenerTextoEstado(e.id_estado_equipo).toLowerCase() === this.tabActivo.toLowerCase()
      );
    }
    if (this.textoBusqueda) {
      resultado = resultado.filter(e =>
        e.nombre_equipo.toLowerCase().includes(this.textoBusqueda) ||
        e.num_serie.toLowerCase().includes(this.textoBusqueda)
      );
    }
    this.equiposFiltrados = resultado;
    this.cdr.detectChanges();
  }

  cambiarTab(tab: string) {
    this.tabActivo = tab;
    this.filtrar();
    this.cdr.detectChanges();
  }

  esOcupado(idEstado: number): boolean {
    return this.obtenerTextoEstado(idEstado).toLowerCase() === 'ocupado';
  }

  devolverEquipo(equipo: Equipo): void {
    if (!confirm(`¿Confirmar devolución de "${equipo.nombre_equipo}"?`)) return;

    const prestamo = this.prestamos.find(
      p => p.id_equipo === equipo.id_equipo &&
           (p.estado_prestamo || '').toLowerCase() === 'activo'
    );

    if (!prestamo) {
      alert('No se encontró un préstamo activo para este equipo.');
      return;
    }

    const idUsuarioEntrega = this.obtenerIdUsuarioActual();
    this.prestamosService.devolver(prestamo.id_prestamo, idUsuarioEntrega).subscribe({
      next: () => {
        forkJoin({
          equipos: this.equiposService.getEquipos(),
          prestamos: this.prestamosService.getPrestamos()
        }).subscribe({
          next: ({ equipos, prestamos }) => {
            this.equipos = equipos;
            this.prestamos = prestamos;
            this.filtrar();
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        alert('Error al procesar la devolución.');
        this.cdr.detectChanges();
      }
    });
  }

  abrirModal() {
    this.mostrarModal = true;
    this.cdr.detectChanges();
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.nuevoEquipo = {
      nombre_equipo: '', marca: '', modelo: '', num_serie: '',
      fecha_alta: '', activo_equipo: true, id_categoria: 1,
      id_ubicacion: 1, id_estado_equipo: 1
    };
    this.cdr.detectChanges();
  }

  agregarEquipo() {
    if (!this.nuevoEquipo.nombre_equipo || !this.nuevoEquipo.num_serie ||
        !this.nuevoEquipo.fecha_alta || !this.nuevoEquipo.marca) {
      alert('Por favor llena los campos obligatorios');
      return;
    }
    this.guardando = true;
    this.equiposService.agregarEquipo(this.nuevoEquipo).subscribe({
      next: (equipo) => {
        this.equipos.push(equipo);
        this.filtrar();
        this.cerrarModal();
        this.guardando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        alert('Error al agregar el equipo');
        this.guardando = false;
        this.cdr.detectChanges();
      }
    });
  }

  abrirModalEditar(equipo: Equipo) {
    this.equipoEditando = equipo;
    this.equipoEditandoForm = {
      nombre_equipo: equipo.nombre_equipo,
      marca: equipo.marca,
      modelo: equipo.modelo,
      num_serie: equipo.num_serie,
      fecha_alta: equipo.fecha_alta,
      id_estado_equipo: equipo.id_estado_equipo
    };
    this.mostrarModalEditar = true;
    this.cdr.detectChanges();
  }

  cerrarModalEditar() {
    this.mostrarModalEditar = false;
    this.equipoEditando = null;
    this.cdr.detectChanges();
  }

  guardarEdicion() {
    if (!this.equipoEditando) return;
    if (!this.equipoEditandoForm.nombre_equipo || !this.equipoEditandoForm.num_serie ||
        !this.equipoEditandoForm.marca) {
      alert('Por favor llena los campos obligatorios');
      return;
    }
    this.guardandoEditar = true;
    this.equiposService.actualizarEquipo(this.equipoEditando.id_equipo, this.equipoEditandoForm).subscribe({
      next: (equipoActualizado) => {
        const index = this.equipos.findIndex(e => e.id_equipo === equipoActualizado.id_equipo);
        if (index !== -1) {
          this.equipos[index] = equipoActualizado;
        }
        this.filtrar();
        this.cerrarModalEditar();
        this.guardandoEditar = false;
        this.cdr.detectChanges();
      },
      error: () => {
        alert('Error al actualizar el equipo');
        this.guardandoEditar = false;
        this.cdr.detectChanges();
      }
    });
  }

  eliminarEquipo(equipo: Equipo) {
    const confirmar = confirm(`¿Estás seguro de eliminar "${equipo.nombre_equipo}"?`);
    if (!confirmar) return;

    this.equiposService.eliminarEquipo(equipo.id_equipo).subscribe({
      next: () => {
        this.equipos = this.equipos.filter(e => e.id_equipo !== equipo.id_equipo);
        this.filtrar();
        this.cdr.detectChanges();
      },
      error: () => {
        alert('Error al eliminar el equipo');
        this.cdr.detectChanges();
      }
    });
  }

  private obtenerIdUsuarioActual(): number {
    try {
      const u = localStorage.getItem('usuario');
      return u ? Number(JSON.parse(u)?.id_usuario || 0) : 0;
    } catch { return 0; }
  }

  obtenerTextoEstado(idEstado: number): string {
    const estado = this.estados.find(e => e.id_estado_equipo === idEstado);
    return estado ? estado.nombre_estado : 'Sin estado';
  }

  obtenerClaseBadge(idEstado: number): string {
    const nombre = this.obtenerTextoEstado(idEstado).toLowerCase();
    if (nombre === 'disponible') return 'badge badge--green';
    if (nombre === 'ocupado') return 'badge badge--yellow';
    if (nombre === 'no disponible') return 'badge badge--orange';
    if (nombre === 'mantenimiento') return 'badge badge--red';
    return 'badge';
  }

  obtenerIcono(nombre: string): any {
    const n = nombre.toLowerCase();
    if (n.includes('ipad') || n.includes('tablet')) return this.Tablet;
    if (n.includes('cable') || n.includes('usb')) return this.Cable;
    return this.Monitor;
  }
}
