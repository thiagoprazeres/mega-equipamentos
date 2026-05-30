import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { App } from './app';

@Component({
  standalone: true,
  template: '',
})
class EmptyRouteComponent {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: '', component: EmptyRouteComponent },
          { path: 'area-restrita', component: EmptyRouteComponent },
          { path: 'gestor/equipamentos', component: EmptyRouteComponent },
        ]),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the shell layout', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-header')).not.toBeNull();
    expect(compiled.querySelector('app-footer')).not.toBeNull();
    expect(compiled.querySelector('app-whats-app-button')).not.toBeNull();
    expect(compiled.querySelector('[data-testid="restricted-header"]')).toBeNull();
    expect(compiled.querySelector('[data-testid="restricted-footer"]')).toBeNull();
  });

  it('should render the restricted shell without public site chrome', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/area-restrita');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-header')).toBeNull();
    expect(compiled.querySelector('app-footer')).toBeNull();
    expect(compiled.querySelector('app-whats-app-button')).toBeNull();
    expect(compiled.querySelector('[data-testid="restricted-header"]')).not.toBeNull();
    expect(compiled.querySelector('[data-testid="restricted-footer"]')).not.toBeNull();
  });
});
