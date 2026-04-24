import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { LucideAngularModule, Monitor, Tablet, Cable, Plus, Laptop } from 'lucide-angular';
import { SolicitudesService, Solicitud } from '../../../services/solicitudes';
import { UsuariosService, Usuario } from '../../../services/usuarios';
import { EquiposService, Equipo } from '../../../services/equipos';
import { PrestamosService, Prestamo } from '../../../services/prestamos';

interface ParUsuarioEquipo {
  id_usuario: number;
  id_equipo: number;
}

interface MovimientoItem {
  tipo: 'prestamo' | 'solicitud';
  id: string;
  id_usuario: number;
  id_equipo: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: string;
  grupo?: string;
}

@Component({
  selector: 'app-solicitudes-encargado',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './solicitudes.html',
  styleUrl: './solicitudes.css'
})
export class SolicitudesEncargado implements OnInit {
  readonly Monitor = Monitor;
  readonly Tablet = Tablet;
  readonly Cable = Cable;
  readonly Plus = Plus;
  readonly Laptop = Laptop;

  solicitudes: Solicitud[] = [];
  usuarios: Usuario[] = [];
  equipos: Equipo[] = [];
  prestamos: Prestamo[] = [];

  tabActivo = 'todas';
  cargando = true;
  error = false;

  mensaje = '';
  mensajeTipo = '';

  mostrarModalSolicitud = false;
  guardandoSolicitud = false;
  intentoGuardar = false;

  paresUsuarioEquipo: ParUsuarioEquipo[] = [{ id_usuario: 0, id_equipo: 0 }];

  nuevaSolicitud = {
    id_usuario_solicita: 0,
    id_equipo: 0,
    fecha_solicitud: new Date().toISOString(),
    grupo_solicitud: '',
    estado_solicitud: 'Pendiente',
    tipo_solicitud: 'Normal',
    motivo: '',
    fecha_inicio_prestamo: '',
    fecha_fin_prestamo: ''
  };

  movimientos: MovimientoItem[] = [];

  mostrarModalMotivo = false;
  motivoActual = '';

  constructor(
    private solicitudesService: SolicitudesService,
    private usuariosService: UsuariosService,
    private equiposService: EquiposService,
    private prestamosService: PrestamosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    forkJoin({
      solicitudes: this.solicitudesService.getSolicitudes(),
      usuarios: this.usuariosService.getUsuarios(),
      equipos: this.equiposService.getEquipos(),
      prestamos: this.prestamosService.getPrestamos()
    }).subscribe({
      next: ({ solicitudes, usuarios, equipos, prestamos }) => {
        this.solicitudes = solicitudes;
        this.usuarios = usuarios;
        this.equipos = equipos;
        this.prestamos = prestamos;
        this.construirMovimientos();
        this.cargando = false;
        this.error = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar datos:', err);
        this.error = true;
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  private construirMovimientos(): void {
    const lista: MovimientoItem[] = [];

    this.prestamos.forEach(p => {
      const estado = this.normalizar(p.estado_prestamo);
      if (!['activo', 'vencido', 'cerrado'].includes(estado)) return;
      lista.push({
        tipo: 'prestamo',
        id: `prestamo-${p.id_prestamo}`,
        id_usuario: p.id_usuario,
        id_equipo: p.id_equipo,
        fecha_inicio: p.fecha_inicio,
        fecha_fin: p.fecha_fin,
        estado
      });
    });

    this.solicitudes.forEach(s => {
      if (this.normalizar(s.estado_solicitud) !== 'aprobada') return;
      lista.push({
        tipo: 'solicitud',
        id: `solicitud-${s.id_solicitud}`,
        id_usuario: s.id_usuario_solicita,
        id_equipo: s.id_equipo,
        fecha_inicio: s.fecha_solicitud,
        fecha_fin: s.fecha_fin_prestamo || null,
        estado: 'aprobada',
        grupo: s.grupo_solicitud || ''
      });
    });

    lista.sort((a, b) =>
      new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime()
    );

    this.movimientos = lista;
  }

  get movimientosFiltrados(): MovimientoItem[] {
    return this.movimientos;
  }

  get prestamosActivos(): Prestamo[] {
    return this.prestamos.filter(p =>
      (p.estado_prestamo || '').toLowerCase() === 'activo'
    );
  }

  devolverPrestamo(prestamo: Prestamo): void {
    if (!confirm(`¿Confirmar devolución del equipo?`)) return;
    const idUsuarioEntrega = this.obtenerIdUsuarioActual();
    this.prestamosService.devolver(prestamo.id_prestamo, idUsuarioEntrega).subscribe({
      next: () => {
        this.mostrarMensaje('Devolución registrada correctamente.', 'success');
        this.cargarDatos();
      },
      error: () => this.mostrarMensaje('Error al procesar la devolución.', 'error')
    });
  }

  private obtenerIdUsuarioActual(): number {
    try {
      const u = localStorage.getItem('usuario');
      return u ? Number(JSON.parse(u)?.id_usuario || 0) : 0;
    } catch { return 0; }
  }

  cambiarTab(tab: string): void {
    this.tabActivo = tab;
    this.cdr.detectChanges();
  }

  get solicitudesFiltradas(): Solicitud[] {
    if (this.tabActivo === 'todas') return this.solicitudes;
    return this.solicitudes.filter(
      s => (s.estado_solicitud || 'Pendiente').toLowerCase() === this.tabActivo.toLowerCase()
    );
  }

  get solicitudesEvento(): Solicitud[] {
    return this.solicitudes.filter(s => s.tipo_solicitud?.toLowerCase() === 'evento');
  }

  get solicitudesExtendidas(): Solicitud[] {
    return this.solicitudes.filter(s => s.tipo_solicitud?.toLowerCase() === 'extendido');
  }

  get requiereFechasYMotivo(): boolean {
    return this.nuevaSolicitud.tipo_solicitud === 'Evento' ||
      this.nuevaSolicitud.tipo_solicitud === 'Extendido';
  }

  get equiposDisponibles(): Equipo[] {
    return this.equipos.filter(e => e.id_estado_equipo === 1);
  }

  getUsuario(id: number): Usuario | undefined {
    return this.usuarios.find(u => u.id_usuario === id);
  }

  getEquipo(id: number): Equipo | undefined {
    return this.equipos.find(e => e.id_equipo === id);
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '-';
    const f = new Date(fecha);
    return f.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatearHora(fecha: string | null): string {
    if (!fecha) return '--:--';
    const d = new Date(fecha);
    return d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  obtenerClaseBadge(estado: string): string {
    const e = (estado || 'pendiente').toLowerCase();
    if (e === 'pendiente') return 'badge badge--yellow';
    if (e === 'aprobada') return 'badge badge--green';
    if (e === 'rechazada') return 'badge badge--red';
    if (e === 'cancelada') return 'badge badge--red';
    return 'badge badge--gray';
  }

  obtenerClaseBadgeMovimiento(estado: string): string {
    const e = estado.toLowerCase();
    if (e === 'activo') return 'badge badge--green';
    if (e === 'vencido') return 'badge badge--red';
    if (e === 'cerrado') return 'badge badge--gray';
    if (e === 'aprobada') return 'badge badge--green';
    return 'badge badge--gray';
  }

  obtenerTextoBadgeMovimiento(estado: string): string {
    const e = estado.toLowerCase();
    if (e === 'activo') return 'Activo';
    if (e === 'vencido') return 'Vencido';
    if (e === 'cerrado') return 'Devuelto';
    if (e === 'aprobada') return 'Aprobada';
    return estado;
  }

  esPendiente(s: Solicitud): boolean {
    return (s.estado_solicitud || 'Pendiente').toLowerCase() === 'pendiente';
  }

  obtenerIconoEquipo(nombre: string): any {
    const n = (nombre || '').toLowerCase();
    if (n.includes('ipad') || n.includes('tablet')) return this.Tablet;
    if (n.includes('cable') || n.includes('usb')) return this.Cable;
    return this.Monitor;
  }

  obtenerIconoMovimiento(id_equipo: number): any {
    const nombre = this.getEquipo(id_equipo)?.nombre_equipo || '';
    const n = nombre.toLowerCase();
    if (n.includes('mac') || n.includes('laptop')) return this.Laptop;
    if (n.includes('ipad') || n.includes('tablet')) return this.Tablet;
    if (n.includes('cable') || n.includes('usb')) return this.Cable;
    return this.Monitor;
  }

  getTextoMovimiento(item: MovimientoItem): string {
    const usuario = this.getUsuario(item.id_usuario);
    const equipo = this.getEquipo(item.id_equipo);
    const userName = usuario?.nombre_usuario || 'Desconocido';
    const eqName = equipo?.nombre_equipo || 'equipo';
    if (item.tipo === 'solicitud') return `${userName} tiene aprobada la solicitud de ${eqName}`;
    if (item.estado === 'activo') return `${userName} tiene prestado ${eqName}`;
    if (item.estado === 'cerrado') return `${userName} devolvió ${eqName}`;
    if (item.estado === 'vencido') return `${userName} tiene vencido ${eqName}`;
    return `${userName} registró movimiento con ${eqName}`;
  }

  mostrarMensaje(texto: string, tipo: string): void {
    this.mensaje = texto;
    this.mensajeTipo = tipo;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.mensaje = '';
      this.cdr.detectChanges();
    }, 4000);
  }

  aprobar(id: number): void {
  if (!confirm('¿Aprobar esta solicitud?')) return;
  let idUsuarioEntrega = 0;
  try {
    const u = localStorage.getItem('usuario');
    if (u) idUsuarioEntrega = Number(JSON.parse(u)?.id_usuario || 0);
  } catch { /* */ }
  if (!idUsuarioEntrega) {
    this.mostrarMensaje('No se pudo identificar al usuario.', 'error');
    return;
  }

  this.solicitudesService.aprobar(id, idUsuarioEntrega).subscribe({
    next: () => {
      this.mostrarMensaje('Solicitud aprobada correctamente.', 'success');
      this.cargarDatos();
    },
    error: () => this.mostrarMensaje('Error al aprobar la solicitud.', 'error')
  });
}

  rechazar(id: number): void {
    if (!confirm('¿Rechazar esta solicitud?')) return;
    this.solicitudesService.rechazar(id).subscribe({
      next: () => {
        this.mostrarMensaje('Solicitud rechazada.', 'info');
        this.cargarDatos();
      },
      error: () => this.mostrarMensaje('Error al rechazar.', 'error')
    });
  }

  agregarPar(): void {
    this.paresUsuarioEquipo.push({ id_usuario: 0, id_equipo: 0 });
  }

  eliminarPar(index: number): void {
    this.paresUsuarioEquipo.splice(index, 1);
  }

  abrirModalSolicitud(): void {
    this.mostrarModalSolicitud = true;
    this.intentoGuardar = false;
    this.paresUsuarioEquipo = [{ id_usuario: 0, id_equipo: 0 }];
  }

  cerrarModalSolicitud(): void {
    this.mostrarModalSolicitud = false;
    this.intentoGuardar = false;
    this.paresUsuarioEquipo = [{ id_usuario: 0, id_equipo: 0 }];
    this.nuevaSolicitud = {
      id_usuario_solicita: 0,
      id_equipo: 0,
      fecha_solicitud: new Date().toISOString(),
      grupo_solicitud: '',
      estado_solicitud: 'Pendiente',
      tipo_solicitud: 'Normal',
      motivo: '',
      fecha_inicio_prestamo: '',
      fecha_fin_prestamo: ''
    };
  }

  guardarSolicitud(): void {
    this.intentoGuardar = true;
    this.cdr.detectChanges();

    const primerPar = this.paresUsuarioEquipo[0];
    if (!this.nuevaSolicitud.grupo_solicitud || !primerPar.id_usuario || !primerPar.id_equipo) {
      return;
    }

    if (this.requiereFechasYMotivo &&
      (!this.nuevaSolicitud.fecha_inicio_prestamo || !this.nuevaSolicitud.fecha_fin_prestamo)) {
      return;
    }

    this.guardandoSolicitud = true;

    // Usamos el primer par como solicitud principal
    const payload: any = {
      id_usuario_solicita: primerPar.id_usuario,
      id_equipo: primerPar.id_equipo,
      fecha_solicitud: new Date().toISOString(),
      grupo_solicitud: this.nuevaSolicitud.grupo_solicitud,
      estado_solicitud: 'Pendiente',
      tipo_solicitud: this.nuevaSolicitud.tipo_solicitud
    };

    if (this.requiereFechasYMotivo) {
      payload.motivo = this.nuevaSolicitud.motivo;
      payload.fecha_inicio_prestamo = new Date(this.nuevaSolicitud.fecha_inicio_prestamo).toISOString();
      payload.fecha_fin_prestamo = new Date(this.nuevaSolicitud.fecha_fin_prestamo).toISOString();
    }

    this.solicitudesService.crearSolicitud(payload).subscribe({
      next: () => {
        // Si hay más pares, crear solicitudes adicionales
        const paresAdicionales = this.paresUsuarioEquipo.slice(1).filter(p => p.id_usuario && p.id_equipo);
        if (paresAdicionales.length === 0) {
          this.mostrarMensaje('Solicitud creada.', 'success');
          this.cerrarModalSolicitud();
          this.guardandoSolicitud = false;
          this.cargarDatos();
          return;
        }

        const peticionesAdicionales = paresAdicionales.map(par => {
          const payloadAdicional: any = {
            ...payload,
            id_usuario_solicita: par.id_usuario,
            id_equipo: par.id_equipo,
            fecha_solicitud: new Date().toISOString()
          };
          return this.solicitudesService.crearSolicitud(payloadAdicional);
        });

        forkJoin(peticionesAdicionales).subscribe({
          next: () => {
            this.mostrarMensaje('Solicitudes creadas correctamente.', 'success');
            this.cerrarModalSolicitud();
            this.guardandoSolicitud = false;
            this.cargarDatos();
          },
          error: () => {
            this.mostrarMensaje('Solicitud principal creada. Algunos pares adicionales fallaron.', 'info');
            this.cerrarModalSolicitud();
            this.guardandoSolicitud = false;
            this.cargarDatos();
          }
        });
      },
      error: () => {
        alert('Error al crear solicitud');
        this.guardandoSolicitud = false;
        this.cdr.detectChanges();
      }
    });
  }

  verMotivo(motivo: string): void {
    this.motivoActual = motivo;
    this.mostrarModalMotivo = true;
  }

  cerrarModalMotivo(): void {
    this.mostrarModalMotivo = false;
  }

  private normalizar(valor?: string | null): string {
    return (valor || '').trim().toLowerCase();
  }
}
