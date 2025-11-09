import { RenderMode, ServerRoute } from '@angular/ssr';
import { equipamentosCategoriasData } from './data/equipamentos-categorias-data';
import { equipamentosData } from './data/equipamentos-data';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'equipamentos/:categoriaSlug/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return equipamentosData.map((e) => ({
        categoriaSlug: e.equipamentoCategoria.slug,
        slug: e.slug,
      }));
    },
  },
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
