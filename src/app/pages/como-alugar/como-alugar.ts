import { Component, ElementRef, ViewChild } from '@angular/core';
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

  @ViewChild('videoStory') videoStory!: ElementRef<HTMLVideoElement>;

  playAndGoFullscreen() {
    this.videoStory.nativeElement.requestFullscreen();
  }
}
