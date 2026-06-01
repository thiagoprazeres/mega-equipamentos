import { Routes } from '@angular/router';


import { equipamentosCategoriasData } from './data/equipamentos-categorias-data';
import { equipamentosData } from './data/equipamentos-data';
import { gestorAuthGuard } from './services/gestor-auth.guard';

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
  { path: 'area-restrita', loadComponent: () => import('./pages/gestor-login/gestor-login').then(m => m.GestorLoginPage), title: 'Área Restrita | Mega Equipamentos' },
  { path: 'gestor', redirectTo: '/gestor/equipamentos', pathMatch: 'full' },
  { path: 'gestor/login', loadComponent: () => import('./pages/gestor-login/gestor-login').then(m => m.GestorLoginPage), title: 'Entrar | Área Gestora Mega Equipamentos' },
  { path: 'gestor/produtos', redirectTo: '/gestor/equipamentos', pathMatch: 'full' },
  {
    path: 'gestor/equipamentos',
    canActivate: [gestorAuthGuard],
    loadComponent: () => import('./pages/gestor-equipamentos/gestor-equipamentos').then(m => m.GestorEquipamentosPage),
    title: 'Equipamentos e Preços | Área Gestora Mega Equipamentos',
  },
  {
    path: 'gestor/equipamentos/novo',
    canActivate: [gestorAuthGuard],
    loadComponent: () => import('./pages/gestor-equipamento-form/gestor-equipamento-form').then(m => m.GestorEquipamentoFormPage),
    title: 'Novo Equipamento | Área Gestora Mega Equipamentos',
  },
  {
    path: 'gestor/equipamentos/:id/editar',
    canActivate: [gestorAuthGuard],
    loadComponent: () => import('./pages/gestor-equipamento-form/gestor-equipamento-form').then(m => m.GestorEquipamentoFormPage),
    title: 'Editar Equipamento | Área Gestora Mega Equipamentos',
  },
  {
    path: 'gestor/equipamentos/:id',
    canActivate: [gestorAuthGuard],
    loadComponent: () => import('./pages/gestor-equipamento-detalhe/gestor-equipamento-detalhe').then(m => m.GestorEquipamentoDetalhePage),
    title: 'Detalhes do Equipamento | Área Gestora Mega Equipamentos',
  },
  {
    path: 'gestor/clientes',
    canActivate: [gestorAuthGuard],
    loadComponent: () => import('./pages/gestor-clientes/gestor-clientes').then(m => m.GestorClientesPage),
    title: 'Clientes | Área Gestora Mega Equipamentos',
  },
  {
    path: 'gestor/leads',
    canActivate: [gestorAuthGuard],
    loadComponent: () => import('./pages/gestor-leads/gestor-leads').then(m => m.GestorLeadsPage),
    title: 'Leads | Área Gestora Mega Equipamentos',
  },
  {
    path: 'gestor/leads/:id',
    canActivate: [gestorAuthGuard],
    loadComponent: () => import('./pages/gestor-lead-detalhe/gestor-lead-detalhe').then(m => m.GestorLeadDetalhePage),
    title: 'Detalhes do Lead | Área Gestora Mega Equipamentos',
  },
  {
    path: 'gestor/clientes/:id',
    canActivate: [gestorAuthGuard],
    loadComponent: () => import('./pages/gestor-cliente-detalhe/gestor-cliente-detalhe').then(m => m.GestorClienteDetalhePage),
    title: 'Detalhes do Cliente | Área Gestora Mega Equipamentos',
  },
  {
    path: 'gestor/usuarios',
    canActivate: [gestorAuthGuard],
    loadComponent: () => import('./pages/gestor-usuarios/gestor-usuarios').then(m => m.GestorUsuariosPage),
    title: 'Usuários | Área Gestora Mega Equipamentos',
  },
  {
    path: 'gestor/usuarios/novo',
    canActivate: [gestorAuthGuard],
    loadComponent: () => import('./pages/gestor-usuario-form/gestor-usuario-form').then(m => m.GestorUsuarioFormPage),
    title: 'Novo Usuário | Área Gestora Mega Equipamentos',
  },
  {
    path: 'gestor/usuarios/:id/editar',
    canActivate: [gestorAuthGuard],
    loadComponent: () => import('./pages/gestor-usuario-form/gestor-usuario-form').then(m => m.GestorUsuarioFormPage),
    title: 'Editar Usuário | Área Gestora Mega Equipamentos',
  },
  {
    path: 'gestor/usuarios/:id',
    canActivate: [gestorAuthGuard],
    loadComponent: () => import('./pages/gestor-usuario-detalhe/gestor-usuario-detalhe').then(m => m.GestorUsuarioDetalhePage),
    title: 'Detalhes do Usuário | Área Gestora Mega Equipamentos',
  },
  {
    path: 'gestor/orcamentos',
    canActivate: [gestorAuthGuard],
    loadComponent: () => import('./pages/gestor-orcamentos/gestor-orcamentos').then(m => m.GestorOrcamentosPage),
    title: 'Orçamentos | Área Gestora Mega Equipamentos',
  },
  {
    path: 'gestor/orcamentos/novo',
    canActivate: [gestorAuthGuard],
    loadComponent: () => import('./pages/gestor-orcamento-form/gestor-orcamento-form').then(m => m.GestorOrcamentoFormPage),
    title: 'Novo Orçamento | Área Gestora Mega Equipamentos',
  },
  {
    path: 'gestor/orcamentos/:id/editar',
    canActivate: [gestorAuthGuard],
    loadComponent: () => import('./pages/gestor-orcamento-form/gestor-orcamento-form').then(m => m.GestorOrcamentoFormPage),
    title: 'Editar Orçamento | Área Gestora Mega Equipamentos',
  },
  {
    path: 'gestor/orcamentos/:id',
    canActivate: [gestorAuthGuard],
    loadComponent: () => import('./pages/gestor-orcamento-detalhe/gestor-orcamento-detalhe').then(m => m.GestorOrcamentoDetalhePage),
    title: 'Detalhes do Orçamento | Área Gestora Mega Equipamentos',
  },
  {
    path: 'gestor/contratos',
    canActivate: [gestorAuthGuard],
    loadComponent: () => import('./pages/gestor-contratos/gestor-contratos').then(m => m.GestorContratosPage),
    title: 'Contratos | Área Gestora Mega Equipamentos',
  },
  {
    path: 'gestor/contratos/novo',
    canActivate: [gestorAuthGuard],
    loadComponent: () => import('./pages/gestor-contrato-form/gestor-contrato-form').then(m => m.GestorContratoFormPage),
    title: 'Novo Contrato | Área Gestora Mega Equipamentos',
  },
  {
    path: 'gestor/contratos/:id/editar',
    canActivate: [gestorAuthGuard],
    loadComponent: () => import('./pages/gestor-contrato-form/gestor-contrato-form').then(m => m.GestorContratoFormPage),
    title: 'Editar Contrato | Área Gestora Mega Equipamentos',
  },
  {
    path: 'gestor/contratos/:id',
    canActivate: [gestorAuthGuard],
    loadComponent: () => import('./pages/gestor-contrato-detalhe/gestor-contrato-detalhe').then(m => m.GestorContratoDetalhePage),
    title: 'Detalhes do Contrato | Área Gestora Mega Equipamentos',
  },
  {
    path: 'gestor/empresa',
    canActivate: [gestorAuthGuard],
    loadComponent: () => import('./pages/gestor-empresa/gestor-empresa').then(m => m.GestorEmpresaPage),
    title: 'Dados da Empresa | Área Gestora Mega Equipamentos',
  },
  { path: '**', redirectTo: '' },
];
