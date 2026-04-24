import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { LucideAngularModule, Monitor, Tablet, Plug, Search, Plus, Pencil, Trash2, RotateCcw } from 'lucide-angular';
import { EquiposService, Equipo, EstadoEquipo } from '../../../services/equipos';
import { PrestamosService, Prestamo } from '../../../services/prestamos';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './inventario.html',
  styleUrl: './inventario.css'
})
export class Inventario implements OnInit, OnDestroy {
  readonly Monitor = Monitor;
  readonly Tablet = Tablet;
  readonly Plug = Plug;
  readonly Search = Search;
  readonly Plus = Plus;
  readonly Pencil = Pencil;
  readonly Trash2 = Trash2;
  readonly RotateCcw = RotateCcw;

  nombreUsuario = 'Usuario';
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

  private eventSource!: EventSource;

  constructor(
    private equiposService: EquiposService,
    private prestamosService: PrestamosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.nombreUsuario = this.obtenerNombreGuardado();

    forkJoin({
      equipos: this.equiposService.getEquipos(),
      estados: this.equiposService.getEstados(),
      prestamos: this.prestamosService.getPrestamos()
    }).subscribe({
      next: ({ equipos, estados, prestamos }) => {
        this.estados = Array.isArray(estados) ? estados : [];
        this.equipos = Array.isArray(equipos) ? equipos : [];
        this.prestamos = Array.isArray(prestamos) ? prestamos : [];
        this.equiposFiltrados = [...this.equipos];
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
    if (this.eventSource) {
      this.eventSource.close();
    }
  }

  private conectarSSE(): void {
    this.eventSource = new EventSource('http://localhost:8000/api/equipos/stream/');

    this.eventSource.onmessage = (event) => {
      console.log('Evento SSE:', event.data);

      forkJoin({
        equipos: this.equiposService.getEquipos(),
        prestamos: this.prestamosService.getPrestamos()
      }).subscribe({
        next: ({ equipos, prestamos }) => {
          this.equipos = Array.isArray(equipos) ? equipos : [];
          this.prestamos = Array.isArray(prestamos) ? prestamos : [];
          this.filtrar();
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error recargando por SSE:', err)
      });
    };

    this.eventSource.onerror = (error) => {
      console.error('Error SSE:', error);
    };
  }

  private obtenerNombreGuardado(): string {
    const nombre = localStorage.getItem('nombre');
    if (nombre) return nombre;

    const usuarioGuardado = localStorage.getItem('usuario');
    if (!usuarioGuardado) return 'Usuario';

    try {
      const usuario = JSON.parse(usuarioGuardado);
      return usuario?.nombre_usuario || usuario?.nombre || usuario?.username || 'Usuario';
    } catch (error) {
      console.error('Error al leer usuario desde localStorage:', error);
      return 'Usuario';
    }
  }

  buscar(evento: Event): void {
    this.textoBusqueda = (evento.target as HTMLInputElement).value.toLowerCase();
    this.filtrar();
  }

  filtrar(): void {
    let resultado = [...this.equipos];

    if (this.tabActivo !== 'todas') {
      resultado = resultado.filter((e) =>
        this.obtenerTextoEstado(e.id_estado_equipo).toLowerCase() === this.tabActivo.toLowerCase()
      );
    }

    if (this.textoBusqueda) {
      resultado = resultado.filter((e) =>
        e.nombre_equipo.toLowerCase().includes(this.textoBusqueda) ||
        e.num_serie.toLowerCase().includes(this.textoBusqueda)
      );
    }

    this.equiposFiltrados = resultado;
    this.cdr.detectChanges();
  }

  cambiarTab(tab: string): void {
    this.tabActivo = tab;
    this.filtrar();
    this.cdr.detectChanges();
  }

  abrirModal(): void {
    this.mostrarModal = true;
    this.cdr.detectChanges();
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.nuevoEquipo = {
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
    this.cdr.detectChanges();
  }

  agregarEquipo(): void {
    if (
      !this.nuevoEquipo.nombre_equipo ||
      !this.nuevoEquipo.num_serie ||
      !this.nuevoEquipo.fecha_alta ||
      !this.nuevoEquipo.marca
    ) {
      alert('Por favor llena los campos obligatorios');
      return;
    }

    this.guardando = true;

    this.equiposService.agregarEquipo(this.nuevoEquipo).subscribe({
      next: () => {
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

  abrirModalEditar(equipo: Equipo): void {
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

  cerrarModalEditar(): void {
    this.mostrarModalEditar = false;
    this.equipoEditando = null;
    this.cdr.detectChanges();
  }

  guardarEdicion(): void {
    if (!this.equipoEditando) return;

    if (
      !this.equipoEditandoForm.nombre_equipo ||
      !this.equipoEditandoForm.num_serie ||
      !this.equipoEditandoForm.marca
    ) {
      alert('Por favor llena los campos obligatorios');
      return;
    }

    this.guardandoEditar = true;

    this.equiposService.actualizarEquipo(this.equipoEditando.id_equipo, this.equipoEditandoForm).subscribe({
      next: (equipoActualizado) => {
        const index = this.equipos.findIndex((e) => e.id_equipo === equipoActualizado.id_equipo);
        if (index !== -1) this.equipos[index] = equipoActualizado;
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

  eliminarEquipo(equipo: Equipo): void {
    const confirmar = confirm(`¿Estás seguro de eliminar "${equipo.nombre_equipo}"?`);
    if (!confirmar) return;

    this.equiposService.eliminarEquipo(equipo.id_equipo).subscribe({
      next: () => {
        this.equipos = this.equipos.filter((e) => e.id_equipo !== equipo.id_equipo);
        this.filtrar();
        this.cdr.detectChanges();
      },
      error: () => {
        alert('Error al eliminar el equipo');
        this.cdr.detectChanges();
      }
    });
  }

  // ─── DEVOLVER ────────────────────────────────────────────────────────────────

  estaOcupado(equipo: Equipo): boolean {
    return this.obtenerTextoEstado(equipo.id_estado_equipo).toLowerCase() === 'ocupado';
  }

  devolverEquipo(equipo: Equipo): void {
    if (!confirm(`¿Confirmar devolución de "${equipo.nombre_equipo}"? Se marcará como Disponible.`)) return;

    // Buscar el préstamo activo de este equipo
    const prestamoActivo = this.prestamos.find(
      p => p.id_equipo === equipo.id_equipo && p.estado_prestamo?.toLowerCase() === 'activo'
    );

    if (!prestamoActivo) {
      alert('No se encontró un préstamo activo para este equipo.');
      return;
    }

    // Obtener el usuario logueado para registrar quién recibe la devolución
    let idUsuarioEntrega: number | undefined;
    const usuarioGuardado = localStorage.getItem('usuario');
    if (usuarioGuardado) {
      try {
        const u = JSON.parse(usuarioGuardado);
        idUsuarioEntrega = Number(u?.id_usuario || 0) || undefined;
      } catch { /* ignorar */ }
    }

    this.prestamosService.devolver(prestamoActivo.id_prestamo, idUsuarioEntrega).subscribe({
      next: () => {
        // El SSE actualizará los equipos automáticamente, pero refrescamos por si acaso
        forkJoin({
          equipos: this.equiposService.getEquipos(),
          prestamos: this.prestamosService.getPrestamos()
        }).subscribe({
          next: ({ equipos, prestamos }) => {
            this.equipos = Array.isArray(equipos) ? equipos : [];
            this.prestamos = Array.isArray(prestamos) ? prestamos : [];
            this.filtrar();
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        const msg = err?.error?.error || 'Error al procesar la devolución';
        alert(msg);
        this.cdr.detectChanges();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────

  obtenerTextoEstado(idEstado: number): string {
    const estado = this.estados.find((e) => e.id_estado_equipo === idEstado);
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
    if (n.includes('cable') || n.includes('usb')) return this.Plug;

    return this.Monitor;
  }
}
