import { Component } from '@angular/core';
import { LucideAngularModule, UserCog, Lock, SlidersHorizontal, Clock, TriangleAlert, User, Save, Key, Download, Trash2 } from 'lucide-angular';

@Component({
  selector: 'app-ajustes',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './ajustes.html',
  styleUrls: ['./ajustes.css']
})
export class Ajustes {
  readonly UserCog = UserCog;
  readonly Lock = Lock;
  readonly SlidersHorizontal = SlidersHorizontal;
  readonly Clock = Clock;
  readonly TriangleAlert = TriangleAlert;
  readonly User = User;
  readonly Save = Save;
  readonly Key = Key;
  readonly Download = Download;
  readonly Trash2 = Trash2;
}
