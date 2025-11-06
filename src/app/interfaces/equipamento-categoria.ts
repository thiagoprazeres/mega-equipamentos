import { LucideIconData } from 'lucide-angular';

export interface EquipamentoCategoria {
  id: number;
  nome: string;
  slug: string;
  name: string;
  icone: LucideIconData;
  avatar: string;
  objetivo: string;
}
