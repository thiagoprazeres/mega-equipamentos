import { Routes } from '@angular/router';

import { HomePage } from './pages/home/home';
import { QuemSomosPage } from './pages/quem-somos/quem-somos';
import { EquipamentosPage } from './pages/equipamentos/equipamentos';
import { ComoAlugarPage } from './pages/como-alugar/como-alugar';
import { BlogPage } from './pages/blog/blog';
import { ContatoPage } from './pages/contato/contato';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'quem-somos', component: QuemSomosPage },
  { path: 'equipamentos', component: EquipamentosPage },
  { path: 'como-alugar', component: ComoAlugarPage },
  { path: 'blog', component: BlogPage },
  { path: 'contato', component: ContatoPage },
  { path: '**', redirectTo: '' },
];
