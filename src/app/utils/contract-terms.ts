export const DEFAULT_CONTRACT_TERMS =
  'O locatário declara receber os equipamentos em condições de uso, comprometendo-se a devolver os bens no prazo acordado e no mesmo estado de conservação, salvo desgaste natural de uso. Danos, perdas, atrasos ou extravios poderão gerar cobranças adicionais conforme orçamento da locadora.';

export function normalizeContractTerms(value?: string | null): string {
  return value?.trim() || DEFAULT_CONTRACT_TERMS;
}

export function markdownToContractText(value?: string | null): string {
  return normalizeContractTerms(value)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '• ')
    .replace(/^>\s?/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1$2')
    .replace(/(^|[^_])_([^_]+)_/g, '$1$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
