import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, Home, ClipboardList, Repeat, Box, Users, Calendar, BarChart3, Settings, HelpCircle, LogOut } from 'lucide-angular';

@Component({
  selector: 'app-sidebar-encargado',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './sidebar-encargado.html',
  styleUrls: ['./sidebar-encargado.css']
})
export class SidebarEncargado {
  readonly Home = Home;
  readonly ClipboardList = ClipboardList;
  readonly Repeat = Repeat;
  readonly Box = Box;
  readonly Users = Users;
  readonly Calendar = Calendar;
  readonly BarChart3 = BarChart3;
  readonly Settings = Settings;
  readonly HelpCircle = HelpCircle;
  readonly LogOut = LogOut;
}
