import { RenderMode, ServerRoute } from '@angular/ssr';
export const serverRoutes: ServerRoute[] = [
  {
    path: 'area-restrita',
    renderMode: RenderMode.Client,
  },
  {
    path: 'gestor/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'equipamentos',
    renderMode: RenderMode.Server,
  },
  {
    path: 'equipamentos/:categoriaSlug/:slug',
    renderMode: RenderMode.Server,
  },
  {
    path: 'equipamentos/:slug',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
