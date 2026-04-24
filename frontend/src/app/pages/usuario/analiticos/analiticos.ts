import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import {
  LucideAngularModule,
  ClipboardList, Repeat, BarChart3,
  Activity, Monitor, Info, TrendingUp
} from 'lucide-angular';
import { forkJoin } from 'rxjs';
import { PrestamosService, Prestamo } from '../../../services/prestamos';
import { SolicitudesService, Solicitud } from '../../../services/solicitudes';
import { EquiposService, Equipo } from '../../../services/equipos';

interface BarraSemana {
  dia: string;
  solicitudes: number;
  prestamos: number;
  total: number;
  altura: number;
  highlight: boolean;
}

interface UsoDispositivo {
  nombre: string;
  movimientos: number;
  porcentaje: number;
  color: string;
}

// Heatmap: 52 semanas × 7 días
interface HeatCell {
  fecha: string;
  valor: number;
  nivel: number; // 0-4 para intensidad
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
  readonly BarChart3 = BarChart3;
  readonly Activity = Activity;
  readonly Monitor = Monitor;
  readonly Info = Info;
  readonly TrendingUp = TrendingUp;

  usuarioActual: any = null;
  prestamos: Prestamo[] = [];
  solicitudes: Solicitud[] = [];
  equipos: Equipo[] = [];

  barras: BarraSemana[] = [];
  dispositivos: UsoDispositivo[] = [];
  heatmap: HeatCell[][] = []; // 7 filas (días) × 52 columnas (semanas)
  heatmapMeses: { label: string; col: number }[] = [];

  trendLabels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
  trendPath = 'M 0 90 L 100 90 L 200 90 L 300 90';
  trendArea = 'M 0 90 L 100 90 L 200 90 L 300 90 L 300 100 L 0 100 Z';

  cargando = true;
  error = false;

  constructor(
    private readonly prestamosService: PrestamosService,
    private readonly solicitudesService: SolicitudesService,
    private readonly equiposService: EquiposService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const usuarioGuardado = localStorage.getItem('usuario');
    this.usuarioActual = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;
    this.cargarAnaliticos();
  }

  cargarAnaliticos(): void {
    forkJoin({
      prestamos: this.prestamosService.getPrestamos(),
      solicitudes: this.solicitudesService.getSolicitudes(),
      equipos: this.equiposService.getEquipos()
    }).subscribe({
      next: ({ prestamos, solicitudes, equipos }) => {
        this.prestamos = Array.isArray(prestamos) ? prestamos : [];
        this.solicitudes = Array.isArray(solicitudes) ? solicitudes : [];
        this.equipos = Array.isArray(equipos) ? equipos : [];

        this.barras = this.construirBarrasSemanales();
        this.dispositivos = this.construirUsoDispositivos();
        this.construirTendenciaMensual();
        this.construirHeatmap();

        this.cargando = false;
        this.refrescarVista();
      },
      error: () => {
        this.error = true;
        this.cargando = false;
        this.refrescarVista();
      }
    });
  }

  get miId(): number {
    return Number(this.usuarioActual?.id_usuario || 0);
  }

  get misPrestamos(): Prestamo[] {
    return this.prestamos.filter(p => Number(p.id_usuario) === this.miId);
  }

  get misSolicitudes(): Solicitud[] {
    return this.solicitudes.filter(s => Number(s.id_usuario_solicita) === this.miId);
  }

  // ── Stats de tarjetas ──
  get solicitudesSemana(): number {
    return this.barras.reduce((acc, b) => acc + b.solicitudes, 0);
  }

  get prestamosMes(): number {
    const limite = new Date();
    limite.setDate(limite.getDate() - 30);
    return this.misPrestamos.filter(p =>
      new Date(p.fecha_inicio).getTime() >= limite.getTime()
    ).length;
  }

  get promedioDiario(): string {
    const total = this.barras.reduce((acc, b) => acc + b.total, 0);
    return (total / 7).toFixed(1);
  }

  get totalActividad(): number {
    return this.misPrestamos.length + this.misSolicitudes.length;
  }

  // ── Barras semanales ──
  private construirBarrasSemanales(): BarraSemana[] {
    const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const sol = [0, 0, 0, 0, 0, 0, 0];
    const pre = [0, 0, 0, 0, 0, 0, 0];

    const hoy = new Date();
    const inicio = new Date(hoy);
    const ajuste = (hoy.getDay() + 6) % 7;
    inicio.setDate(hoy.getDate() - ajuste);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 7);

    this.misSolicitudes.forEach(s => {
      const d = new Date(s.fecha_solicitud);
      if (!isNaN(d.getTime()) && d >= inicio && d < fin) {
        sol[(d.getDay() + 6) % 7] += 1;
      }
    });

    this.misPrestamos.forEach(p => {
      const d = new Date(p.fecha_inicio);
      if (!isNaN(d.getTime()) && d >= inicio && d < fin) {
        pre[(d.getDay() + 6) % 7] += 1;
      }
    });

    const totales = labels.map((_, i) => sol[i] + pre[i]);
    const max = Math.max(...totales, 1);

    return labels.map((dia, i) => ({
      dia,
      solicitudes: sol[i],
      prestamos: pre[i],
      total: totales[i],
      altura: totales[i] === 0 ? 6 : Math.max(18, Math.round((totales[i] / max) * 90)),
      highlight: totales[i] === max && max > 0
    }));
  }

  // ── Uso por dispositivo ──
  private construirUsoDispositivos(): UsoDispositivo[] {
    const palette = ['var(--orange-bright)', 'var(--yellow)', 'var(--teal)', 'var(--dark)'];
    const counter = new Map<number, number>();

    this.misPrestamos.forEach(p => counter.set(p.id_equipo, (counter.get(p.id_equipo) || 0) + 1));
    this.misSolicitudes.forEach(s => counter.set(s.id_equipo, (counter.get(s.id_equipo) || 0) + 1));

    const max = Math.max(...Array.from(counter.values()), 1);

    return Array.from(counter.entries())
      .map(([idEquipo, total], i) => ({
        nombre: this.equipos.find(e => e.id_equipo === idEquipo)?.nombre_equipo || `Equipo ${idEquipo}`,
        movimientos: total,
        porcentaje: Math.max(8, Math.round((total / max) * 100)),
        color: palette[i % palette.length]
      }))
      .sort((a, b) => b.movimientos - a.movimientos)
      .slice(0, 5);
  }

  // ── Tendencia mensual ──
  private construirTendenciaMensual(): void {
    const hoy = new Date();
    const semanas = [0, 0, 0, 0];

    [...this.misPrestamos.map(p => p.fecha_inicio),
     ...this.misSolicitudes.map(s => s.fecha_solicitud)].forEach(fecha => {
      const d = new Date(fecha);
      if (isNaN(d.getTime())) return;
      const diff = Math.floor((hoy.getTime() - d.getTime()) / 86400000);
      if (diff >= 0 && diff < 28) {
        const idx = 3 - Math.floor(diff / 7);
        if (idx >= 0 && idx < 4) semanas[idx] += 1;
      }
    });

    const max = Math.max(...semanas, 1);
    const points = semanas.map((valor, i) => {
      const x = i * 100;
      const y = 100 - Math.max(10, Math.round((valor / max) * 80));
      return `${x} ${y}`;
    });
    this.trendPath = `M ${points.join(' L ')}`;
    this.trendArea = `M ${points.join(' L ')} L 300 100 L 0 100 Z`;
  }

  // ── Heatmap tipo GitHub (52 semanas × 7 días) ──
  private construirHeatmap(): void {
    const actividadPorDia = new Map<string, number>();

    const registrar = (fecha: string) => {
      const d = new Date(fecha);
      if (isNaN(d.getTime())) return;
      const clave = d.toISOString().slice(0, 10);
      actividadPorDia.set(clave, (actividadPorDia.get(clave) || 0) + 1);
    };

    this.misPrestamos.forEach(p => registrar(p.fecha_inicio));
    this.misSolicitudes.forEach(s => registrar(s.fecha_solicitud));

    const maxValor = Math.max(...Array.from(actividadPorDia.values()), 1);

    // Construir grid de 52 semanas × 7 días (Lun-Dom)
    const hoy = new Date();
    // Ir hacia atrás hasta tener 52 semanas completas desde el lunes anterior
    const inicioGrid = new Date(hoy);
    const diaSemana = (hoy.getDay() + 6) % 7; // Lun = 0
    inicioGrid.setDate(hoy.getDate() - diaSemana - (51 * 7));
    inicioGrid.setHours(0, 0, 0, 0);

    // grid[fila=día][col=semana]
    const grid: HeatCell[][] = Array.from({ length: 7 }, () => []);
    const mesesMarcados = new Map<string, number>();

    for (let col = 0; col < 52; col++) {
      for (let fila = 0; fila < 7; fila++) {
        const fecha = new Date(inicioGrid);
        fecha.setDate(inicioGrid.getDate() + col * 7 + fila);
        const clave = fecha.toISOString().slice(0, 10);
        const valor = actividadPorDia.get(clave) || 0;
        const nivel = valor === 0 ? 0 : Math.min(4, Math.ceil((valor / maxValor) * 4));

        grid[fila].push({ fecha: clave, valor, nivel });

        // Registrar mes para etiquetas
        if (fila === 0) {
          const mesKey = `${fecha.getFullYear()}-${fecha.getMonth()}`;
          if (!mesesMarcados.has(mesKey)) {
            mesesMarcados.set(mesKey, col);
          }
        }
      }
    }

    this.heatmap = grid;

    // Etiquetas de mes
    const mesesNombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    this.heatmapMeses = [];
    mesesMarcados.forEach((col, key) => {
      const mes = parseInt(key.split('-')[1]);
      this.heatmapMeses.push({ label: mesesNombres[mes], col });
    });
    this.heatmapMeses.sort((a, b) => a.col - b.col);
  }

  // Devuelve color CSS según nivel 0-4
  heatColor(nivel: number): string {
    const colores = [
      'rgba(0,0,0,0.05)',      // 0: sin actividad
      'rgba(253,190,17,0.35)', // 1: baja
      'rgba(253,190,17,0.6)',  // 2: media
      'rgba(255,149,0,0.75)',  // 3: alta
      'var(--orange-bright)'  // 4: máxima
    ];
    return colores[nivel] ?? colores[0];
  }

  private refrescarVista(): void {
    this.cdr.markForCheck();
    setTimeout(() => {
      try { this.cdr.detectChanges(); }
      catch (e) { console.warn('Analíticos usuario:', e); }
    }, 0);
  }
}
