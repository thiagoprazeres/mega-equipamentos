alter table public.company_profile
  add column if not exists contract_terms text not null default '';

update public.company_profile
set contract_terms = 'O locatário declara receber os equipamentos em condições de uso, comprometendo-se a devolver os bens no prazo acordado e no mesmo estado de conservação, salvo desgaste natural de uso. Danos, perdas, atrasos ou extravios poderão gerar cobranças adicionais conforme orçamento da locadora.'
where id = 1
  and contract_terms = '';
