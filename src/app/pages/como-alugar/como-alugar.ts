import { Component } from '@angular/core';

import { LucideAngularModule, Mail } from 'lucide-angular';

@Component({
  selector: 'app-como-alugar',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './como-alugar.html',
  styleUrl: './como-alugar.css',
})
export class ComoAlugarPage {
  readonly Mail = Mail;
}
