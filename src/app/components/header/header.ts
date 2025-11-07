import { Component, ElementRef, ViewChild } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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
  @ViewChild('summary') summary!: ElementRef<HTMLElement>;

  handleClick() {
    this.summary.nativeElement.click();
  }
}
