import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  BookOpen, MessageCircleQuestion, Headphones,
  ClipboardList, Monitor, Calendar, BarChart3,
  Settings, Mail, Phone, ChevronDown, Info
} from 'lucide-angular';

@Component({
  selector: 'app-ayuda',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './ayuda.html',
  styleUrls: ['./ayuda.css']
})
export class Ayuda {
  readonly BookOpen = BookOpen;
  readonly MessageCircleQuestion = MessageCircleQuestion;
  readonly Headphones = Headphones;
  readonly ClipboardList = ClipboardList;
  readonly Monitor = Monitor;
  readonly Calendar = Calendar;
  readonly BarChart3 = BarChart3;
  readonly Settings = Settings;
  readonly Mail = Mail;
  readonly Phone = Phone;
  readonly ChevronDown = ChevronDown;
  readonly Info = Info;

  searchQuery = '';

  buscar(): void {
    if (this.searchQuery.trim()) {
      console.log('Buscando:', this.searchQuery);
      // Implement search logic
    }
  }

  abrirGuia(titulo: string): void {
    console.log('Abrir guía:', titulo);
    // Navigate to guide or show modal
  }
}
