import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Lock, SlidersHorizontal, Key, Clock, Calendar, Zap } from 'lucide-angular';

@Component({
  selector: 'app-ajustes',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './ajustes.html',
  styleUrls: ['./ajustes.css']
})
export class Ajustes implements OnInit {
  readonly Lock = Lock;
  readonly SlidersHorizontal = SlidersHorizontal;
  readonly Key = Key;
  readonly Clock = Clock;
  readonly Calendar = Calendar;
  readonly Zap = Zap;

  usuario: any = null;

  // Form data
  passwordForm = {
    current: '',
    new: '',
    confirm: ''
  };

  preferences = {
    notificacionesSolicitudes: true,
    recordatoriosEventos: true
  };

  cargando = false;
  error = '';
  success = '';

  ngOnInit(): void {
    const usuarioGuardado = localStorage.getItem('usuario');
    if (usuarioGuardado) {
      this.usuario = JSON.parse(usuarioGuardado);
      // Load preferences from localStorage or service
      this.loadPreferences();
    }
  }

  actualizarPassword(): void {
    if (!this.passwordForm.current || !this.passwordForm.new || !this.passwordForm.confirm) {
      this.error = 'Todos los campos son requeridos.';
      return;
    }

    if (this.passwordForm.new !== this.passwordForm.confirm) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }

    if (this.passwordForm.new.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.cargando = true;
    this.error = '';
    this.success = '';

    // Simulate API call
    setTimeout(() => {
      this.success = 'Contraseña actualizada correctamente.';
      this.passwordForm = { current: '', new: '', confirm: '' };
      this.cargando = false;
    }, 1000);
  }

  toggleNotificaciones(): void {
    this.preferences.notificacionesSolicitudes = !this.preferences.notificacionesSolicitudes;
    this.savePreferences();
  }

  toggleRecordatorios(): void {
    this.preferences.recordatoriosEventos = !this.preferences.recordatoriosEventos;
    this.savePreferences();
  }

  private loadPreferences(): void {
    const prefs = localStorage.getItem('userPreferences');
    if (prefs) {
      this.preferences = { ...this.preferences, ...JSON.parse(prefs) };
    }
  }

  private savePreferences(): void {
    localStorage.setItem('userPreferences', JSON.stringify(this.preferences));
    this.success = 'Preferencias guardadas.';
    setTimeout(() => this.success = '', 3000);
  }
}
