import { Component } from '@angular/core';
import { LucideAngularModule, UserCog, User, Save, Lock, Key, SlidersHorizontal } from 'lucide-angular';

@Component({
  selector: 'app-ajustes-encargado',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './ajustes.html',
  styleUrls: ['./ajustes.css']
})
export class AjustesEncargado {
  readonly UserCog = UserCog;
  readonly User = User;
  readonly Save = Save;
  readonly Lock = Lock;
  readonly Key = Key;
  readonly SlidersHorizontal = SlidersHorizontal;
}
