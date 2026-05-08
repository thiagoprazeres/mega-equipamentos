import { Routes } from '@angular/router';


import { equipamentosCategoriasData } from './data/equipamentos-categorias-data';
import { equipamentosData } from './data/equipamentos-data';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home').then(m => m.HomePage), title: 'Mega Equipamentos | Locação de Equipamentos para Obras em Caruaru' },
  { path: 'quem-somos', loadComponent: () => import('./pages/quem-somos/quem-somos').then(m => m.QuemSomosPage), title: 'Quem Somos | Mega Equipamentos' },
  { path: 'equipamentos', loadComponent: () => import('./pages/equipamentos/equipamentos').then(m => m.EquipamentosPage), title: 'Catálogo de Equipamentos | Mega Equipamentos' },
  { path: 'consultor-virtual', loadComponent: () => import('./pages/consultor-virtual/consultor-virtual').then(m => m.ConsultorVirtualPage), title: 'Consultor Virtual | Mega Equipamentos' },
  {
    path: 'equipamentos/:categoriaSlug/:slug',
    loadComponent: () => import('./pages/equipamento/equipamento').then(m => m.EquipamentoPage),
    title: (route) => {
      const slug = route.params['slug'];
      const e = equipamentosData.find((it) => it.slug === slug);
      return e ? `${e.nome} para Locação em Caruaru | Mega Equipamentos` : 'Equipamento | Mega Equipamentos';
    },
  },
  {
    path: 'equipamentos/:slug',
    loadComponent: () => import('./pages/equipamentos-categoria/equipamentos-categoria').then(m => m.EquipamentosCategoriaPage),
    title: (route) => {
      const slug = route.params['slug'];
      const categoria = equipamentosCategoriasData.find((c) => c.slug === slug);
      return categoria ? `Locação de ${categoria.nome} em Caruaru | Mega Equipamentos` : 'Equipamentos | Mega Equipamentos';
    },
  },
  { path: 'como-alugar', loadComponent: () => import('./pages/como-alugar/como-alugar').then(m => m.ComoAlugarPage), title: 'Como Alugar | Mega Equipamentos' },
  { path: 'contato', loadComponent: () => import('./pages/contato/contato').then(m => m.ContatoPage), title: 'Contato | Mega Equipamentos' },
  { path: '**', redirectTo: '' },
];
