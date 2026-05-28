export const DEFAULT_CONTRACT_TERMS =
  'O locatário declara receber os equipamentos em condições de uso, comprometendo-se a devolver os bens no prazo acordado e no mesmo estado de conservação, salvo desgaste natural de uso. Danos, perdas, atrasos ou extravios poderão gerar cobranças adicionais conforme orçamento da locadora.';

export function normalizeContractTerms(value?: string | null): string {
  return value?.trim() || DEFAULT_CONTRACT_TERMS;
}
