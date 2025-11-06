import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, PhoneCall } from 'lucide-angular';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './header.html',
  styleUrls: ['./header.css'],
})
export class Header {
  readonly PhoneCall = PhoneCall;
}
