import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MEGA_CONSULTOR_CONTEXT } from '../../features/consultor-equipamentos/consultor-equipamentos';
// import { ConsultorVirtualPage } from './consultor-virtual';

// describe('ConsultorVirtualPage', () => {
//   let component: ConsultorVirtualPage;
//   let fixture: ComponentFixture<ConsultorVirtualPage>;

//   beforeEach(async () => {
//     await TestBed.configureTestingModule({
//       imports: [ConsultorVirtualPage],
//       providers: [provideRouter([])],
//     }).compileComponents();

//     fixture = TestBed.createComponent(ConsultorVirtualPage);
//     component = fixture.componentInstance;
//     fixture.detectChanges();
//   });

//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });

//   it('envia o payload mínimo para a função e renderiza links inline da IA', async () => {
//     const fetchSpy = spyOn(window, 'fetch').and.resolveTo(
//       new Response(
//         JSON.stringify({
//           source: 'ai',
//           answer: 'Para essa pintura, eu indicaria Escada de Andaime.',
//           selectedEquipmentIds: [12],
//           itemReasons: [
//             {
//               equipmentId: 12,
//               reason: 'Ajuda no acesso seguro entre níveis.',
//             },
//           ],
//           followUpQuestion: null,
//           showQuoteCta: true,
//           whatsappPrefill: 'Olá! Vim do consultor virtual da Mega Equipamentos.',
//         }),
//         {
//           status: 200,
//           headers: {
//             'Content-Type': 'application/json',
//           },
//         }
//       )
//     );

//     await (component as any).sendMessage('Quero pintar minha casa em Caruaru.');
//     fixture.detectChanges();

//     const [, options] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
//     const body = JSON.parse(options.body as string) as Record<string, unknown>;
//     const element = fixture.nativeElement as HTMLElement;
//     const link = element.querySelector('.consultor-inline-link') as HTMLAnchorElement | null;

//     expect(body).toEqual({
//       message: 'Quero pintar minha casa em Caruaru.',
//       history: [],
//       context: MEGA_CONSULTOR_CONTEXT,
//     });
//     expect(link).not.toBeNull();
//     expect(link?.getAttribute('href')).toBe('/equipamentos/andaimes/escada-de-andaime');
//     expect(element.textContent).not.toContain('fallback local');
//   });

//   it('mostra erro visível quando a OpenAI falha sem gerar resposta local', async () => {
//     spyOn(console, 'error');
//     spyOn(window, 'fetch').and.resolveTo(
//       new Response(
//         JSON.stringify({
//           error: 'A IA ficou indisponível no momento. Tente novamente em instantes.',
//         }),
//         {
//           status: 503,
//           headers: {
//             'Content-Type': 'application/json',
//           },
//         }
//       )
//     );

//     await (component as any).sendMessage('Oi, meu nome é Thiago.');
//     fixture.detectChanges();

//     const element = fixture.nativeElement as HTMLElement;

//     expect(element.textContent).toContain(
//       'A IA ficou indisponível no momento. Tente novamente em instantes.'
//     );
//     expect(element.textContent).not.toContain('fallback local');
//     expect(element.textContent).not.toContain('Segui com uma resposta local do consultor.');
//   });
// });
