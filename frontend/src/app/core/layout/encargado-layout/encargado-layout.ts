import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarEncargado } from '../sidebar-encargado/sidebar-encargado';

@Component({
  selector: 'app-encargado-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarEncargado],
  templateUrl: './encargado-layout.html',
  styleUrls: ['./encargado-layout.css']
})
export class EncargadoLayout {}
