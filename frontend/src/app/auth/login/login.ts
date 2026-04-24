import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule, ShieldCheck, GraduationCap, ClipboardCheck } from 'lucide-angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  readonly ShieldCheck = ShieldCheck;
  readonly GraduationCap = GraduationCap;
  readonly ClipboardCheck = ClipboardCheck;

  constructor(private router: Router) {}

  entrar(rol: string) {  //va a /register/admin, /register/usuario, /register/encargado
    //localStorage.setItem('rol', rol);
    this.router.navigate(['/register',rol]);
  }
}
