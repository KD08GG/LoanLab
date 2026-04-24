import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import {
  LucideAngularModule,
  ClipboardList,
  Repeat,
  Users,
  Package,
  Clock,
  Monitor,
  TrendingUp,
  Layers,
  Info
} from 'lucide-angular';
import { PrestamosService, Prestamo } from '../../../services/prestamos';
import { SolicitudesService, Solicitud } from '../../../services/solicitudes';
import { EquiposService, Equipo } from '../../../services/equipos';
import { UsuariosService, Usuario } from '../../../services/usuarios';

interface StatItem {
  icon: any;
  value: string | number;
  label: string;
  sub: string;
}

interface BarraItem {
  label: string;
  value: number;
  highlight: boolean;
}

interface DeviceUsageItem {
  name: string;
  pct: number;
  valueText: string;
  color: string;
}

interface TopUserItem {
  name: string;
  solicitudes: number;
  prestamos: number;
  total: number;
}

@Component({
  selector: 'app-analiticos',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './analiticos.html',
  styleUrls: ['./analiticos.css']
})
export class Analiticos implements OnInit {
  readonly ClipboardList = ClipboardList;
  readonly Repeat = Repeat;
  readonly Users = Users;
  readonly Package = Package;
  readonly Clock = Clock;
  readonly Monitor = Monitor;
  readonly TrendingUp = TrendingUp;
  readonly Layers = Layers;
  readonly Info = Info;

  prestamos: Prestamo[] = [];
  solicitudes: Solicitud[] = [];
  equipos: Equipo[] = [];
  usuarios: Usuario[] = [];

  cargando = true;
  error = '';

  stats: StatItem[] = [];
  barras: BarraItem[] = [];
  topEquipoNombre = 'Sin datos';
  topEquipoHoras = '0 movimientos';
  trendLabels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
  trendPath = 'M 0 100 L 100 100 L 200 100 L 300 100';
  trendArea = 'M 0 100 L 100 100 L 200 100 L 300 100 L 300 100 L 0 100 Z';
  deviceUsage: DeviceUsageItem[] = [];
  topUsers: TopUserItem[] = [];

  constructor(
    private readonly prestamosService: PrestamosService,
    private readonly solicitudesService: SolicitudesService,
    private readonly equiposService: EquiposService,
    private readonly usuariosService: UsuariosService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarAnaliticos();
  }

  cargarAnaliticos(): void {
    this.cargando = true;
    this.error = '';

    forkJoin({
      prestamos: this.prestamosService.getPrestamos(),
      solicitudes: this.solicitudesService.getSolicitudes(),
      equipos: this.equiposService.getEquipos(),
      usuarios: this.usuariosService.getUsuarios()
    }).subscribe({
      next: ({ prestamos, solicitudes, equipos, usuarios }) => {
        this.prestamos = Array.isArray(prestamos) ? prestamos : [];
        this.solicitudes = Array.isArray(solicitudes) ? solicitudes : [];
        this.equipos = Array.isArray(equipos) ? equipos : [];
        this.usuarios = Array.isArray(usuarios) ? usuarios : [];

        this.barras = this.construirBarrasSemana(this.solicitudes.map((s) => s.fecha_solicitud));
        this.deviceUsage = this.construirUsoDispositivos();
        this.construirTopEquipo();
        this.construirTendencia();
        this.topUsers = this.construirTopUsuarios();
        this.stats = this.construirStats();

        this.cargando = false;
        this.refrescarVista();
      },
      error: (err: unknown) => {
        console.error('Error cargando analíticos admin:', err);
        this.error = 'No se pudieron cargar los analíticos.';
        this.cargando = false;
        this.refrescarVista();
      }
    });
  }

  barHeight(bar: BarraItem): string {
    const valores = this.barras.map((b) => b.value);
    const max = Math.max(...valores, 0);

    if (max === 0) {
      return '6%';
    }

    if (max === 1) {
      return bar.value > 0 ? '72%' : '6%';
    }

    if (bar.value === 0) {
      return '6%';
    }

    const pct = Math.round((bar.value / max) * 100);
    return `${Math.max(28, pct)}%`;
  }

  barLabel(bar: BarraItem): string {
    return `${bar.value}`;
  }

  private construirStats(): StatItem[] {
    const solicitudesSemana = this.barras.reduce((acc, item) => acc + item.value, 0);
    const prestamosActivos = this.prestamos.filter(
      (p) => this.normalizarTexto(p.estado_prestamo) === 'activo'
    ).length;
    const totalUsuarios = this.usuarios.filter(
      (u) => this.normalizarTexto(u.estado_usuario) !== 'inactivo'
    ).length;
    const equiposUsados = new Set(this.prestamos.map((p) => p.id_equipo)).size;

    return [
      { icon: this.ClipboardList, value: solicitudesSemana, label: 'Solicitudes semana', sub: 'Semana actual' },
      { icon: this.Repeat, value: prestamosActivos, label: 'Préstamos activos', sub: 'Actualmente en uso' },
      { icon: this.Users, value: totalUsuarios, label: 'Usuarios activos', sub: 'Con actividad registrada' },
      { icon: this.Package, value: equiposUsados, label: 'Equipos usados', sub: 'Con movimientos' }
    ];
  }

  private construirBarrasSemana(fechas: string[]): BarraItem[] {
    const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const counts = [0, 0, 0, 0, 0, 0, 0];

    const hoy = new Date();
    const inicioSemana = new Date(hoy);
    const ajuste = (hoy.getDay() + 6) % 7; // lunes = 0
    inicioSemana.setDate(hoy.getDate() - ajuste);
    inicioSemana.setHours(0, 0, 0, 0);

    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 7);
    finSemana.setHours(0, 0, 0, 0);

    fechas.forEach((fecha) => {
      const d = new Date(fecha);
      if (Number.isNaN(d.getTime())) return;

      if (d >= inicioSemana && d < finSemana) {
        const idx = (d.getDay() + 6) % 7;
        counts[idx] += 1;
      }
    });

    const max = Math.max(...counts, 0);

    return labels.map((label, index) => ({
      label,
      value: counts[index],
      highlight: max > 0 && counts[index] === max
    }));
  }

  private construirUsoDispositivos(): DeviceUsageItem[] {
    const palette = ['var(--orange-bright)', 'var(--yellow)', 'var(--teal)', 'var(--dark)'];
    const counter = new Map<number, number>();

    this.prestamos.forEach((p) => {
      counter.set(p.id_equipo, (counter.get(p.id_equipo) || 0) + 1);
    });

    const max = Math.max(...Array.from(counter.values()), 1);

    return Array.from(counter.entries())
      .map(([idEquipo, total], index) => {
        const equipo = this.equipos.find((e) => e.id_equipo === idEquipo);

        return {
          name: equipo?.nombre_equipo || `Equipo ${idEquipo}`,
          pct: Math.max(8, Math.round((total / max) * 100)),
          valueText: `${total} mov.`,
          color: palette[index % palette.length]
        };
      })
      .sort((a, b) => this.extraerNumero(b.valueText) - this.extraerNumero(a.valueText))
      .slice(0, 5);
  }

  private construirTopEquipo(): void {
    if (!this.deviceUsage.length) {
      this.topEquipoNombre = 'Sin datos';
      this.topEquipoHoras = '0 movimientos';
      return;
    }

    this.topEquipoNombre = this.deviceUsage[0].name;
    this.topEquipoHoras = `${this.deviceUsage[0].valueText} este mes`;
  }

  private construirTendencia(): void {
    const hoy = new Date();
    const semanas = [0, 0, 0, 0];

    this.prestamos.forEach((prestamo) => {
      const d = new Date(prestamo.fecha_inicio);
      if (Number.isNaN(d.getTime())) return;

      const diffDias = Math.floor((hoy.getTime() - d.getTime()) / 86400000);
      if (diffDias >= 0 && diffDias < 28) {
        const idx = 3 - Math.floor(diffDias / 7);
        if (idx >= 0 && idx < 4) semanas[idx] += 1;
      }
    });

    const max = Math.max(...semanas, 1);
    const points = semanas.map((valor, index) => {
      const x = index * 100;
      const y = 100 - Math.max(10, Math.round((valor / max) * 80));
      return `${x} ${y}`;
    });

    this.trendPath = `M ${points.join(' L ')}`;
    this.trendArea = `M ${points.join(' L ')} L 300 100 L 0 100 Z`;
  }

  private construirTopUsuarios(): TopUserItem[] {
    const solicitudesPorUsuario = new Map<number, number>();
    const prestamosPorUsuario = new Map<number, number>();

    this.solicitudes.forEach((s) => {
      solicitudesPorUsuario.set(
        s.id_usuario_solicita,
        (solicitudesPorUsuario.get(s.id_usuario_solicita) || 0) + 1
      );
    });

    this.prestamos.forEach((p) => {
      prestamosPorUsuario.set(
        p.id_usuario,
        (prestamosPorUsuario.get(p.id_usuario) || 0) + 1
      );
    });

    const ids = new Set<number>([
      ...Array.from(solicitudesPorUsuario.keys()),
      ...Array.from(prestamosPorUsuario.keys())
    ]);

    return Array.from(ids)
      .map((idUsuario) => {
        const usuario = this.usuarios.find((u) => u.id_usuario === idUsuario);
        const solicitudes = solicitudesPorUsuario.get(idUsuario) || 0;
        const prestamos = prestamosPorUsuario.get(idUsuario) || 0;

        return {
          name: usuario?.nombre_usuario || `Usuario ${idUsuario}`,
          solicitudes,
          prestamos,
          total: solicitudes + prestamos
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }

  private extraerNumero(texto: string): number {
    const match = texto.match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  private normalizarTexto(valor?: string | null): string {
    return (valor || '').trim().toLowerCase();
  }

  private refrescarVista(): void {
    this.cdr.markForCheck();

    setTimeout(() => {
      try {
        this.cdr.detectChanges();
      } catch (error) {
        console.warn('No se pudo forzar la vista en Analíticos:', error);
      }
    }, 0);
  }
}
