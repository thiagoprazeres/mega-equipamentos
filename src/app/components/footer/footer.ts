import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, PhoneCall, Mail, Instagram, MapPin, Clock, Building2 } from 'lucide-angular';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './footer.html',
  styleUrls: ['./footer.css'],
})
export class Footer {
  readonly PhoneCall = PhoneCall;
  readonly Mail = Mail;
  readonly Instagram = Instagram;
  readonly MapPin = MapPin;
  readonly Clock = Clock;
  readonly Building2 = Building2;
  readonly year = new Date().getFullYear();
}
