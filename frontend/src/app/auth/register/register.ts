import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule, Eye, EyeOff, ArrowLeft } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register implements OnInit {
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;
  readonly ArrowLeft = ArrowLeft;

  rol = '';
  idUdlap = '';
  password = '';
  mostrarPassword = false;
  cargando = false;
  error = '';

  get tituloRol(): string {
    const titulos: Record<string, string> = {
      admin: 'Administrador',
      usuario: 'Estudiante',
      encargado: 'Encargado'
    };
    return titulos[this.rol] ?? 'Usuario';
  }

  get descripcionRol(): string {
    const descripciones: Record<string, string> = {
      admin: 'Acceso completo al sistema de gestión STEM',
      usuario: 'Acceso a equipos, solicitudes y analíticos',
      encargado: 'Supervisión de solicitudes y equipos del laboratorio'
    };
    return descripciones[this.rol] ?? '';
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.rol = this.route.snapshot.paramMap.get('rol') ?? 'usuario';
  }

  togglePassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
    this.cdr.detectChanges();
  }

  volver(): void {
    this.router.navigate(['/login']);
  }

  iniciarSesion(): void {
    this.error = '';

    if (!this.idUdlap.trim() || !this.password.trim()) {
      this.error = 'Por favor ingresa tu ID UDLAP y contraseña.';
      this.cdr.detectChanges();
      return;
    }

    this.cargando = true;
    this.cdr.detectChanges();

    const payload = {
      id_usuario: Number(this.idUdlap),
      password: this.password
    };

    this.authService.login(payload).subscribe({
      next: (res: any) => {
        const usuario = res.usuario;

        if (!usuario) {
          this.error = 'Respuesta inválida del servidor.';
          this.cargando = false;
          this.cdr.detectChanges();
          return;
        }

        const rolesPermitidos: Record<string, number> = {
          admin: 1,
          encargado: 2,
          usuario: 3
        };

        const rolRequerido = rolesPermitidos[this.rol];

        if (usuario.id_rol !== rolRequerido) {
          const mensajes: Record<string, string> = {
            admin: 'Este acceso es solo para administradores.',
            encargado: 'Este acceso es solo para encargados.',
            usuario: 'Este acceso es solo para estudiantes.'
          };
          this.error = mensajes[this.rol] || 'Rol no permitido.';
          this.cargando = false;
          this.cdr.detectChanges();
          return;
        }

        localStorage.setItem('usuario', JSON.stringify(usuario));
        localStorage.setItem('rol', this.rol);
        this.cargando = false;
        this.cdr.detectChanges();
        this.router.navigate([`/${this.rol}/home`]);
      },
      error: (err: any) => {
        this.error = err?.error?.error || 'Credenciales incorrectas. Verifica tu ID y contraseña.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }
}
