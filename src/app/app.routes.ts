import { Routes } from '@angular/router';

import { HomePage } from './pages/home/home';
import { QuemSomosPage } from './pages/quem-somos/quem-somos';
import { EquipamentosPage } from './pages/equipamentos/equipamentos';
import { EquipamentosCategoriaPage } from './pages/equipamentos-categoria/equipamentos-categoria';
import { EquipamentoPage } from './pages/equipamento/equipamento';
import { ComoAlugarPage } from './pages/como-alugar/como-alugar';
import { BlogPage } from './pages/blog/blog';
import { ContatoPage } from './pages/contato/contato';
import { equipamentosCategoriasData } from './data/equipamentos-categorias-data';
import { equipamentosData } from './data/equipamentos-data';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'quem-somos', component: QuemSomosPage, title: 'Quem Somos' },
  { path: 'equipamentos', component: EquipamentosPage, title: 'Equipamentos' },
  {
    path: 'equipamentos/:categoriaSlug/:slug',
    component: EquipamentoPage,
    title: (route) => {
      const slug = route.params['slug'];
      const e = equipamentosData.find((it) => it.slug === slug);
      if (e) {
        return `${e.nome} — ${e.equipamentoCategoria.nome}`;
      }
      return 'Equipamento';
    },
  },
  {
    path: 'equipamentos/:slug',
    component: EquipamentosCategoriaPage,
    title: (route) => {
      const slug = route.params['slug'];
      const categoria = equipamentosCategoriasData.find((c) => c.slug === slug);
      return categoria ? `Equipamentos - ${categoria.nome}` : 'Equipamentos';
    },
  },
  { path: 'como-alugar', component: ComoAlugarPage, title: 'Como Alugar' },
  { path: 'blog', component: BlogPage, title: 'Blog' },
  { path: 'contato', component: ContatoPage, title: 'Contato' },
  { path: '**', redirectTo: '' },
];

