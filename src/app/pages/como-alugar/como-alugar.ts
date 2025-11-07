import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Mail } from 'lucide-angular';

@Component({
  selector: 'app-como-alugar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './como-alugar.html',
  styleUrl: './como-alugar.css',
})
export class ComoAlugarPage {
  readonly Mail = Mail;
}
