import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarUsuario } from '../sidebar-usuario/sidebar-usuario';

@Component({
  selector: 'app-usuario-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarUsuario],
  templateUrl: './usuario-layout.html',
  styleUrls: ['./usuario-layout.css']
})
export class UsuarioLayout {}
