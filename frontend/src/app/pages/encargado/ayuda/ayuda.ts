import { Component } from '@angular/core';
import { LucideAngularModule, BookOpen, ClipboardList, Box, Users, Calendar, BarChart3, Settings, MessageCircleQuestion, ChevronDown, Headphones, Mail, Phone, Info, Search } from 'lucide-angular';

@Component({
  selector: 'app-ayuda-encargado',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './ayuda.html',
  styleUrls: ['./ayuda.css']
})
export class AyudaEncargado {
  readonly BookOpen = BookOpen;
  readonly ClipboardList = ClipboardList;
  readonly Box = Box;
  readonly Users = Users;
  readonly Calendar = Calendar;
  readonly BarChart3 = BarChart3;
  readonly Settings = Settings;
  readonly MessageCircleQuestion = MessageCircleQuestion;
  readonly ChevronDown = ChevronDown;
  readonly Headphones = Headphones;
  readonly Mail = Mail;
  readonly Phone = Phone;
  readonly Info = Info;
  readonly Search = Search;
}
