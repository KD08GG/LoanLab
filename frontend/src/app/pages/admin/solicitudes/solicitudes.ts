import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { LucideAngularModule, Monitor, Tablet, Cable, Plus, Trash2 } from 'lucide-angular';
import { SolicitudesService, Solicitud } from '../../../services/solicitudes';
import { UsuariosService, Usuario } from '../../../services/usuarios';
import { EquiposService, Equipo } from '../../../services/equipos';
import { PrestamosService, Prestamo } from '../../../services/prestamos';

interface ParUsuarioEquipo {
  id_usuario: number;
  id_equipo: number;
}

@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './solicitudes.html',
  styleUrls: ['./solicitudes.css']
})
export class Solicitudes implements OnInit {
  readonly Monitor = Monitor;
  readonly Tablet = Tablet;
  readonly Cable = Cable;
  readonly Plus = Plus;
  readonly Trash2 = Trash2;

  solicitudes: Solicitud[] = [];
  prestamos: Prestamo[] = [];
  usuarios: Usuario[] = [];
  equipos: Equipo[] = [];

  tabActivo = 'todas';
  cargando = true;
  error = false;

  mensaje = '';
  mensajeTipo = '';

  // ── Modal nueva solicitud ──
  mostrarModalSolicitud = false;
  guardandoSolicitud = false;
  intentoGuardar = false; // activa bordes rojos en campos vacíos

  nuevaSolicitud = {
    grupo_solicitud: '',
    estado_solicitud: 'Pendiente',
    tipo_solicitud: 'Normal',
    motivo: '',
    fecha_inicio_prestamo: '',
    fecha_fin_prestamo: ''
  };

  // Lista de pares usuario↔equipo
  pares: ParUsuarioEquipo[] = [{ id_usuario: 0, id_equipo: 0 }];

  // ── Modal motivo ──
  mostrarModalMotivo = false;
  motivoActual = '';

  readonly PROGRAMAS = ['STEM', 'Honores', 'Servicio Social'];

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

  cambiarTab(tab: string): void {
    this.tabActivo = tab;
    this.cdr.detectChanges();
  }

  // ── Getters de filtrado ──
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

  // Préstamos (movimientos) actuales — tabla intercambiada desde Movimientos
  get movimientosActuales(): Prestamo[] {
    return this.prestamos.filter(p =>
      ['activo', 'vencido'].includes((p.estado_prestamo || '').toLowerCase())
    ).sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime());
  }

  get requiereFechasYMotivo(): boolean {
    return this.nuevaSolicitud.tipo_solicitud === 'Evento' ||
      this.nuevaSolicitud.tipo_solicitud === 'Extendido';
  }

  get equiposDisponibles(): Equipo[] {
    return this.equipos.filter(e => e.id_estado_equipo === 1);
  }

  // Equipos disponibles excluyendo los ya seleccionados en otros pares
  equiposDisponiblesParaPar(indexPar: number): Equipo[] {
    const seleccionados = this.pares
      .filter((_, i) => i !== indexPar)
      .map(p => p.id_equipo)
      .filter(id => id !== 0);
    return this.equiposDisponibles.filter(e => !seleccionados.includes(e.id_equipo));
  }

  getUsuario(id: number): Usuario | undefined {
    return this.usuarios.find(u => u.id_usuario === id);
  }

  getEquipo(id: number): Equipo | undefined {
    return this.equipos.find(e => e.id_equipo === id);
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  formatearHora(fecha: string | null): string {
    if (!fecha) return '--:--';
    return new Date(fecha).toLocaleTimeString('es-MX', {
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  }

  obtenerClaseBadge(estado: string): string {
    const e = (estado || 'pendiente').toLowerCase();
    if (e === 'pendiente') return 'badge badge--yellow';
    if (e === 'aprobada') return 'badge badge--green';
    if (e === 'rechazada') return 'badge badge--red';
    if (e === 'cancelada') return 'badge badge--red';
    return 'badge badge--gray';
  }

  obtenerClaseBadgePrestamo(estado: string): string {
    const e = (estado || '').toLowerCase();
    if (e === 'activo') return 'badge badge--green';
    if (e === 'vencido') return 'badge badge--red';
    if (e === 'cerrado') return 'badge badge--gray';
    return 'badge badge--gray';
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

  mostrarMensaje(texto: string, tipo: string): void {
    this.mensaje = texto;
    this.mensajeTipo = tipo;
    this.cdr.detectChanges();
    setTimeout(() => { this.mensaje = ''; this.cdr.detectChanges(); }, 4000);
  }

  aprobar(id: number): void {
    if (!confirm('¿Aprobar esta solicitud?')) return;
    const usuarioGuardado = localStorage.getItem('usuario');
    let idUsuarioEntrega = 0;
    if (usuarioGuardado) {
      try { idUsuarioEntrega = Number(JSON.parse(usuarioGuardado)?.id_usuario || 0); } catch { /* */ }
    }
    if (!idUsuarioEntrega) { this.mostrarMensaje('No se pudo identificar al usuario.', 'error'); return; }

    this.solicitudesService.aprobar(id, idUsuarioEntrega).subscribe({
      next: () => { this.mostrarMensaje('Solicitud aprobada y préstamo creado.', 'success'); this.cargarDatos(); },
      error: () => this.mostrarMensaje('Error al aprobar la solicitud.', 'error')
    });
  }

  rechazar(id: number): void {
    if (!confirm('¿Rechazar esta solicitud?')) return;
    this.solicitudesService.rechazar(id).subscribe({
      next: () => { this.mostrarMensaje('Solicitud rechazada.', 'info'); this.cargarDatos(); },
      error: () => this.mostrarMensaje('Error al rechazar.', 'error')
    });
  }

  // ── Gestión de pares usuario↔equipo ──
  agregarPar(): void {
    this.pares.push({ id_usuario: 0, id_equipo: 0 });
    this.cdr.detectChanges();
  }

  eliminarPar(index: number): void {
    if (this.pares.length === 1) return;
    this.pares.splice(index, 1);
    this.cdr.detectChanges();
  }

  // ── Validación visual ──
  campoInvalido(valor: any): boolean {
    return this.intentoGuardar && (!valor || valor === 0 || valor === '');
  }

  abrirModalSolicitud(): void {
    this.mostrarModalSolicitud = true;
    this.intentoGuardar = false;
    this.cdr.detectChanges();
  }

  cerrarModalSolicitud(): void {
    this.mostrarModalSolicitud = false;
    this.intentoGuardar = false;
    this.pares = [{ id_usuario: 0, id_equipo: 0 }];
    this.nuevaSolicitud = {
      grupo_solicitud: '',
      estado_solicitud: 'Pendiente',
      tipo_solicitud: 'Normal',
      motivo: '',
      fecha_inicio_prestamo: '',
      fecha_fin_prestamo: ''
    };
    this.cdr.detectChanges();
  }

  guardarSolicitud(): void {
    this.intentoGuardar = true;
    this.cdr.detectChanges();

    // Validar que todos los pares tengan usuario y equipo
    const paresValidos = this.pares.every(p => p.id_usuario !== 0 && p.id_equipo !== 0);

    if (!paresValidos || !this.nuevaSolicitud.grupo_solicitud) {
      return; // los bordes rojos ya aparecen
    }

    if (this.requiereFechasYMotivo &&
      (!this.nuevaSolicitud.fecha_inicio_prestamo || !this.nuevaSolicitud.fecha_fin_prestamo)) {
      return;
    }

    this.guardandoSolicitud = true;

    // Crear una solicitud por cada par usuario↔equipo
    const llamadas = this.pares.map(par => {
      const payload: any = {
        id_usuario_solicita: par.id_usuario,
        id_equipo: par.id_equipo,
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
      return this.solicitudesService.crearSolicitud(payload);
    });

    forkJoin(llamadas).subscribe({
      next: () => {
        this.mostrarMensaje(`${this.pares.length} solicitud(es) creada(s).`, 'success');
        this.cerrarModalSolicitud();
        this.guardandoSolicitud = false;
        this.cargarDatos();
      },
      error: (err) => {
        console.error(err);
        this.mostrarMensaje('Error al crear solicitud(es).', 'error');
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
}