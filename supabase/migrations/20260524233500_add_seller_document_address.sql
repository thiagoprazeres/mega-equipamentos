-- Extra seller registry fields for contracts and internal records.

alter table public.sellers
  add column if not exists document text not null default '',
  add column if not exists address text not null default '';

create index if not exists sellers_document_idx on public.sellers(document);
