import { RenderMode, ServerRoute } from '@angular/ssr';
import { equipamentosCategoriasData } from './data/equipamentos-categorias-data';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'equipamentos/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return equipamentosCategoriasData.map((categoria) => ({ slug: categoria.slug }));
    },
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
