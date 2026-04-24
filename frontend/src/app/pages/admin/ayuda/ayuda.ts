import { Component } from '@angular/core';
import { LucideAngularModule, BookOpen, MessageCircleQuestion, Headphones, Mail, Phone, Info, ClipboardList, Box, Users, Calendar, BarChart3, Settings, Search } from 'lucide-angular';

@Component({
  selector: 'app-ayuda',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './ayuda.html',
  styleUrls: ['./ayuda.css']
})
export class Ayuda {
  readonly BookOpen = BookOpen;
  readonly MessageCircleQuestion = MessageCircleQuestion;
  readonly Headphones = Headphones;
  readonly Mail = Mail;
  readonly Phone = Phone;
  readonly Info = Info;
  readonly ClipboardList = ClipboardList;
  readonly Box = Box;
  readonly Users = Users;
  readonly Calendar = Calendar;
  readonly BarChart3 = BarChart3;
  readonly Settings = Settings;
  readonly Search = Search;
}
