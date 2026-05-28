import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Building2,
  Clock,
  LockKeyhole,
  LucideAngularModule,
  Mail,
  MapPin,
  PhoneCall,
} from 'lucide-angular';

import { APP_VERSION } from '../../app-version';

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
  readonly MapPin = MapPin;
  readonly Clock = Clock;
  readonly Building2 = Building2;
  readonly LockKeyhole = LockKeyhole;
  readonly year = new Date().getFullYear();
  readonly appVersion = APP_VERSION;
}
