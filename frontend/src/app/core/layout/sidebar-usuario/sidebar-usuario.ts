import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideAngularModule,
  Home, ClipboardList, Monitor, BarChart3,
  Settings, HelpCircle, LogOut, CalendarDays
} from 'lucide-angular';

@Component({
  selector: 'app-sidebar-usuario',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './sidebar-usuario.html',
  styleUrls: ['./sidebar-usuario.css']
})
export class SidebarUsuario implements OnInit {
  readonly Home = Home;
  readonly ClipboardList = ClipboardList;
  readonly Monitor = Monitor;
  readonly BarChart3 = BarChart3;
  readonly CalendarDays = CalendarDays;
  readonly Settings = Settings;
  readonly HelpCircle = HelpCircle;
  readonly LogOut = LogOut;

  usuario: any = null;
  iniciales: string = 'U';

  ngOnInit(): void {
    const usuarioGuardado = localStorage.getItem('usuario');

    if (usuarioGuardado) {
      this.usuario = JSON.parse(usuarioGuardado);
      this.iniciales = this.obtenerIniciales(this.usuario?.nombre_usuario);
    }
  }

  obtenerIniciales(nombre: string | undefined): string {
    if (!nombre) return 'U';

    const partes = nombre.trim().split(' ').filter(Boolean);

    if (partes.length === 1) {
      return partes[0].charAt(0).toUpperCase();
    }

    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  }
}
