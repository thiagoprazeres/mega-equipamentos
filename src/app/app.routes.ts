import { Routes } from '@angular/router';

import { HomePage } from './pages/home/home';
import { QuemSomosPage } from './pages/quem-somos/quem-somos';
import { EquipamentosPage } from './pages/equipamentos/equipamentos';
// import { ConsultorVirtualPage } from './pages/consultor-virtual/consultor-virtual';
import { EquipamentosCategoriaPage } from './pages/equipamentos-categoria/equipamentos-categoria';
import { EquipamentoPage } from './pages/equipamento/equipamento';
import { ComoAlugarPage } from './pages/como-alugar/como-alugar';
import { ContatoPage } from './pages/contato/contato';
import { equipamentosCategoriasData } from './data/equipamentos-categorias-data';
import { equipamentosData } from './data/equipamentos-data';

export const routes: Routes = [
  { path: '', component: HomePage, title: 'Mega Equipamentos | Locação de Equipamentos para Obras em Caruaru' },
  { path: 'quem-somos', component: QuemSomosPage, title: 'Quem Somos | Mega Equipamentos' },
  { path: 'equipamentos', component: EquipamentosPage, title: 'Catálogo de Equipamentos | Mega Equipamentos' },
  // { path: 'consultor-virtual', component: ConsultorVirtualPage, title: 'Consultor Virtual | Mega Equipamentos' },
  {
    path: 'equipamentos/:categoriaSlug/:slug',
    component: EquipamentoPage,
    title: (route) => {
      const slug = route.params['slug'];
      const e = equipamentosData.find((it) => it.slug === slug);
      return e ? `${e.nome} para Locação em Caruaru | Mega Equipamentos` : 'Equipamento | Mega Equipamentos';
    },
  },
  {
    path: 'equipamentos/:slug',
    component: EquipamentosCategoriaPage,
    title: (route) => {
      const slug = route.params['slug'];
      const categoria = equipamentosCategoriasData.find((c) => c.slug === slug);
      return categoria ? `Locação de ${categoria.nome} em Caruaru | Mega Equipamentos` : 'Equipamentos | Mega Equipamentos';
    },
  },
  { path: 'como-alugar', component: ComoAlugarPage, title: 'Como Alugar | Mega Equipamentos' },
  { path: 'contato', component: ContatoPage, title: 'Contato | Mega Equipamentos' },
  { path: '**', redirectTo: '' },
];
