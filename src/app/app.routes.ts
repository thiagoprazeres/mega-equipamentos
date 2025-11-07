import { Routes } from '@angular/router';

import { HomePage } from './pages/home/home';
import { QuemSomosPage } from './pages/quem-somos/quem-somos';
import { EquipamentosPage } from './pages/equipamentos/equipamentos';
import { EquipamentosCategoriaPage } from './pages/equipamentos-categoria/equipamentos-categoria';
import { ComoAlugarPage } from './pages/como-alugar/como-alugar';
import { BlogPage } from './pages/blog/blog';
import { ContatoPage } from './pages/contato/contato';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'quem-somos', component: QuemSomosPage, title: 'Quem Somos' },
  { path: 'equipamentos', component: EquipamentosPage, title: 'Equipamentos' },
  { path: 'equipamentos/:slug', component: EquipamentosCategoriaPage, title: 'Equipamentos' },
  { path: 'como-alugar', component: ComoAlugarPage, title: 'Como Alugar' },
  { path: 'blog', component: BlogPage, title: 'Blog' },
  { path: 'contato', component: ContatoPage, title: 'Contato' },
  { path: '**', redirectTo: '' },
];
