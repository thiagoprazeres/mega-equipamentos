import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export type CatalogStatus = 'active' | 'archived';
export type StaffUserRole = 'admin' | 'vendedor' | 'operador' | 'financeiro';
export type RentalBillingPeriod = 'daily' | 'weekly' | 'fortnightly' | 'monthly';
export type RentalContractStatus = 'draft' | 'active' | 'closed' | 'returned' | 'cancelled';
export type RentalQuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
export type LeadOrigin =
  | 'indicacao'
  | 'google'
  | 'instagram'
  | 'facebook'
  | 'visita_comercial'
  | 'ligacao_comercial'
  | 'cliente'
  | 'loja'
  | 'whatsapp';

export const catalogStatus = pgEnum('catalog_status', ['active', 'archived']);

const createdAt = () =>
  timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow();

export const categories = pgTable('categories', {
  id: integer('id').primaryKey(),
  categoryCode: text('category_code').notNull().default(''),
  nome: text('nome').notNull(),
  slug: text('slug').notNull(),
  name: text('name').notNull().default(''),
  icone: text('icone').notNull().default(''),
  avatar: text('avatar').notNull().default(''),
  avatarHero: text('avatar_hero'),
  avatarCard: text('avatar_card'),
  video: text('video'),
  objetivo: text('objetivo').notNull().default(''),
  status: catalogStatus('status').notNull().default('active'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex('categories_slug_key').on(table.slug),
  uniqueIndex('categories_category_code_idx').on(table.categoryCode),
  index('categories_status_idx').on(table.status),
]);

export const equipments = pgTable('equipments', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  categoryId: integer('category_id')
    .notNull()
    .references(() => categories.id, { onUpdate: 'cascade' }),
  nome: text('nome').notNull(),
  technicalName: text('technical_name').notNull().default(''),
  slug: text('slug').notNull(),
  avatar: text('avatar'),
  video: text('video'),
  descricao: text('descricao').notNull().default(''),
  aplicacao: text('aplicacao').notNull().default(''),
  tipoDeServico: text('tipo_de_servico').notNull().default(''),
  periodoDeLocacao: text('periodo_de_locacao').notNull().default(''),
  diferenciais: text('diferenciais').notNull().default(''),
  equipmentCode: text('equipment_code').notNull().default(''),
  assetValueCents: integer('asset_value_cents').notNull().default(0),
  totalInvestedCents: integer('total_invested_cents').notNull().default(0),
  notes: text('notes').notNull().default(''),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  status: catalogStatus('status').notNull().default('active'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex('products_slug_key').on(table.slug),
  index('equipments_category_id_idx').on(table.categoryId),
  index('equipments_status_idx').on(table.status),
  index('equipments_equipment_code_idx').on(table.equipmentCode),
  check('equipments_asset_value_cents_check', sql`${table.assetValueCents} >= 0`),
  check('equipments_total_invested_cents_check', sql`${table.totalInvestedCents} >= 0`),
  check('equipments_stock_quantity_check', sql`${table.stockQuantity} >= 0`),
]);

export const equipmentPrices = pgTable('equipment_prices', {
  equipmentId: integer('equipment_id')
    .primaryKey()
    .references(() => equipments.id, { onDelete: 'cascade' }),
  dailyPriceCents: integer('daily_price_cents').notNull().default(0),
  weeklyPriceCents: integer('weekly_price_cents').notNull().default(0),
  fortnightlyPriceCents: integer('fortnightly_price_cents').notNull().default(0),
  monthlyPriceCents: integer('monthly_price_cents').notNull().default(0),
  currency: text('currency').notNull().default('BRL').$type<'BRL'>(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  check('equipment_prices_daily_price_cents_check', sql`${table.dailyPriceCents} >= 0`),
  check('equipment_prices_weekly_price_cents_check', sql`${table.weeklyPriceCents} >= 0`),
  check('equipment_prices_fortnightly_price_cents_check', sql`${table.fortnightlyPriceCents} >= 0`),
  check('equipment_prices_monthly_price_cents_check', sql`${table.monthlyPriceCents} >= 0`),
  check('equipment_prices_currency_check', sql`${table.currency} = 'BRL'`),
]);

export const customers = pgTable('customers', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  nome: text('nome').notNull(),
  document: text('document').notNull().default(''),
  email: text('email').notNull().default(''),
  phone: text('phone').notNull().default(''),
  whatsapp: text('whatsapp').notNull().default(''),
  zipCode: text('zip_code').notNull().default(''),
  address: text('address').notNull().default(''),
  city: text('city').notNull().default(''),
  state: text('state').notNull().default(''),
  notes: text('notes').notNull().default(''),
  status: catalogStatus('status').notNull().default('active'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  index('customers_status_idx').on(table.status),
  index('customers_nome_idx').on(table.nome),
  index('customers_document_idx').on(table.document),
]);

export const leads = pgTable('leads', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  nome: text('nome').notNull(),
  document: text('document').notNull().default(''),
  email: text('email').notNull().default(''),
  phone: text('phone').notNull().default(''),
  whatsapp: text('whatsapp').notNull().default(''),
  zipCode: text('zip_code').notNull().default(''),
  address: text('address').notNull().default(''),
  city: text('city').notNull().default(''),
  state: text('state').notNull().default(''),
  origin: text('origin').notNull().default('whatsapp').$type<LeadOrigin>(),
  interestCategoryId: integer('interest_category_id').references(() => categories.id, { onUpdate: 'cascade' }),
  interestCategoryName: text('interest_category_name').notNull().default(''),
  notes: text('notes').notNull().default(''),
  customerId: integer('customer_id').references(() => customers.id, { onUpdate: 'cascade' }),
  status: catalogStatus('status').notNull().default('active'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  index('leads_status_idx').on(table.status),
  index('leads_nome_idx').on(table.nome),
  index('leads_origin_idx').on(table.origin),
  index('leads_interest_category_id_idx').on(table.interestCategoryId),
  index('leads_customer_id_idx').on(table.customerId),
  check('leads_origin_check', sql`${table.origin} in ('indicacao', 'google', 'instagram', 'facebook', 'visita_comercial', 'ligacao_comercial', 'cliente', 'loja', 'whatsapp')`),
]);

export const staffUsers = pgTable('staff_users', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  authUserId: uuid('auth_user_id'),
  nome: text('nome').notNull(),
  role: text('role').notNull().default('vendedor').$type<StaffUserRole>(),
  document: text('document').notNull().default(''),
  email: text('email').notNull().default(''),
  phone: text('phone').notNull().default(''),
  whatsapp: text('whatsapp').notNull().default(''),
  address: text('address').notNull().default(''),
  notes: text('notes').notNull().default(''),
  status: catalogStatus('status').notNull().default('active'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  index('staff_users_status_idx').on(table.status),
  index('staff_users_nome_idx').on(table.nome),
  index('staff_users_role_idx').on(table.role),
  index('staff_users_auth_user_id_idx').on(table.authUserId),
  check('staff_users_role_check', sql`${table.role} in ('admin', 'vendedor', 'operador', 'financeiro')`),
]);

export const companyProfile = pgTable('company_profile', {
  id: integer('id').primaryKey(),
  legalName: text('legal_name').notNull(),
  tradeName: text('trade_name').notNull().default(''),
  document: text('document').notNull().default(''),
  pixKey: text('pix_key').notNull().default(''),
  email: text('email').notNull().default(''),
  gmailPassword: text('gmail_password').notNull().default(''),
  phone: text('phone').notNull().default(''),
  whatsapp: text('whatsapp').notNull().default(''),
  address: text('address').notNull().default(''),
  city: text('city').notNull().default(''),
  state: text('state').notNull().default(''),
  zipCode: text('zip_code').notNull().default(''),
  instagramLogin: text('instagram_login').notNull().default(''),
  instagramPassword: text('instagram_password').notNull().default(''),
  contractTerms: text('contract_terms').notNull().default(''),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  check('company_profile_id_check', sql`${table.id} = 1`),
]);

export const rentalContracts = pgTable('rental_contracts', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  contractNumber: text('contract_number')
    .notNull()
    .default(sql`public.format_rental_contract_number(nextval('public.rental_contract_number_seq'))`),
  previousContractNumber: text('previous_contract_number'),
  customerId: integer('customer_id')
    .notNull()
    .references(() => customers.id, { onUpdate: 'cascade' }),
  customerName: text('customer_name').notNull().default(''),
  customerDocument: text('customer_document').notNull().default(''),
  customerEmail: text('customer_email').notNull().default(''),
  customerPhone: text('customer_phone').notNull().default(''),
  customerAddress: text('customer_address').notNull().default(''),
  customerCity: text('customer_city').notNull().default(''),
  customerState: text('customer_state').notNull().default(''),
  sellerId: integer('seller_id').references(() => staffUsers.id, { onUpdate: 'cascade' }),
  sellerName: text('seller_name').notNull().default(''),
  sellerEmail: text('seller_email').notNull().default(''),
  sellerPhone: text('seller_phone').notNull().default(''),
  billingPeriod: text('billing_period')
    .notNull()
    .default('daily')
    .$type<RentalBillingPeriod>(),
  rentalPeriodCount: integer('rental_period_count').notNull().default(1),
  startDate: date('start_date', { mode: 'string' }).notNull(),
  endDate: date('end_date', { mode: 'string' }),
  deliveryAddress: text('delivery_address').notNull().default(''),
  worksiteAddress: text('worksite_address').notNull().default(''),
  notes: text('notes').notNull().default(''),
  terms: text('terms').notNull().default(''),
  subtotalCents: integer('subtotal_cents').notNull().default(0),
  shippingCents: integer('shipping_cents').notNull().default(6000),
  discountCents: integer('discount_cents').notNull().default(0),
  surchargeCents: integer('surcharge_cents').notNull().default(0),
  totalCents: integer('total_cents').notNull().default(0),
  status: text('status').notNull().default('draft').$type<RentalContractStatus>(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex('rental_contracts_contract_number_key').on(table.contractNumber),
  index('rental_contracts_customer_id_idx').on(table.customerId),
  index('rental_contracts_seller_id_idx').on(table.sellerId),
  index('rental_contracts_status_idx').on(table.status),
  index('rental_contracts_start_date_idx').on(table.startDate),
  check('rental_contracts_billing_period_check', sql`${table.billingPeriod} in ('daily', 'weekly', 'fortnightly', 'monthly')`),
  check('rental_contracts_rental_period_count_check', sql`${table.rentalPeriodCount} > 0`),
  check('rental_contracts_status_check', sql`${table.status} in ('draft', 'active', 'closed', 'returned', 'cancelled')`),
  check('rental_contracts_subtotal_cents_check', sql`${table.subtotalCents} >= 0`),
  check('rental_contracts_shipping_cents_check', sql`${table.shippingCents} >= 0`),
  check('rental_contracts_discount_cents_check', sql`${table.discountCents} >= 0`),
  check('rental_contracts_surcharge_cents_check', sql`${table.surchargeCents} >= 0`),
  check('rental_contracts_total_cents_check', sql`${table.totalCents} >= 0`),
]);

export const rentalContractItems = pgTable('rental_contract_items', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  contractId: integer('contract_id')
    .notNull()
    .references(() => rentalContracts.id, { onDelete: 'cascade' }),
  equipmentId: integer('equipment_id')
    .notNull()
    .references(() => equipments.id, { onUpdate: 'cascade' }),
  equipmentName: text('equipment_name').notNull().default(''),
  quantity: integer('quantity').notNull().default(1),
  billingPeriod: text('billing_period')
    .notNull()
    .default('daily')
    .$type<RentalBillingPeriod>(),
  unitPriceCents: integer('unit_price_cents').notNull().default(0),
  totalPriceCents: integer('total_price_cents').notNull().default(0),
  assetValueCents: integer('asset_value_cents').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  index('rental_contract_items_contract_id_idx').on(table.contractId),
  index('rental_contract_items_equipment_id_idx').on(table.equipmentId),
  check('rental_contract_items_quantity_check', sql`${table.quantity} > 0`),
  check('rental_contract_items_billing_period_check', sql`${table.billingPeriod} in ('daily', 'weekly', 'fortnightly', 'monthly')`),
  check('rental_contract_items_unit_price_cents_check', sql`${table.unitPriceCents} >= 0`),
  check('rental_contract_items_total_price_cents_check', sql`${table.totalPriceCents} >= 0`),
  check('rental_contract_items_asset_value_cents_check', sql`${table.assetValueCents} >= 0`),
]);

export const rentalQuotes = pgTable('rental_quotes', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  quoteNumber: text('quote_number').notNull().default(sql`public.next_rental_quote_number()`),
  leadId: integer('lead_id')
    .notNull()
    .references(() => leads.id, { onUpdate: 'cascade' }),
  leadName: text('lead_name').notNull().default(''),
  leadDocument: text('lead_document').notNull().default(''),
  leadEmail: text('lead_email').notNull().default(''),
  leadPhone: text('lead_phone').notNull().default(''),
  leadAddress: text('lead_address').notNull().default(''),
  leadCity: text('lead_city').notNull().default(''),
  leadState: text('lead_state').notNull().default(''),
  leadOrigin: text('lead_origin').notNull().default('whatsapp').$type<LeadOrigin>(),
  leadInterestCategoryId: integer('lead_interest_category_id').references(() => categories.id, { onUpdate: 'cascade' }),
  leadInterestCategoryName: text('lead_interest_category_name').notNull().default(''),
  customerId: integer('customer_id').references(() => customers.id, { onUpdate: 'cascade' }),
  customerName: text('customer_name').notNull().default(''),
  customerDocument: text('customer_document').notNull().default(''),
  customerEmail: text('customer_email').notNull().default(''),
  customerPhone: text('customer_phone').notNull().default(''),
  customerAddress: text('customer_address').notNull().default(''),
  customerCity: text('customer_city').notNull().default(''),
  customerState: text('customer_state').notNull().default(''),
  sellerId: integer('seller_id').references(() => staffUsers.id, { onUpdate: 'cascade' }),
  sellerName: text('seller_name').notNull().default(''),
  sellerEmail: text('seller_email').notNull().default(''),
  sellerPhone: text('seller_phone').notNull().default(''),
  billingPeriod: text('billing_period')
    .notNull()
    .default('daily')
    .$type<RentalBillingPeriod>(),
  rentalPeriodCount: integer('rental_period_count').notNull().default(1),
  startDate: date('start_date', { mode: 'string' }).notNull().defaultNow(),
  validUntil: date('valid_until', { mode: 'string' }),
  deliveryAddress: text('delivery_address').notNull().default(''),
  worksiteAddress: text('worksite_address').notNull().default(''),
  notes: text('notes').notNull().default(''),
  subtotalCents: integer('subtotal_cents').notNull().default(0),
  shippingCents: integer('shipping_cents').notNull().default(0),
  discountCents: integer('discount_cents').notNull().default(0),
  surchargeCents: integer('surcharge_cents').notNull().default(0),
  totalCents: integer('total_cents').notNull().default(0),
  status: text('status').notNull().default('draft').$type<RentalQuoteStatus>(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex('rental_quotes_quote_number_key').on(table.quoteNumber),
  index('rental_quotes_quote_number_idx').on(table.quoteNumber),
  index('rental_quotes_lead_id_idx').on(table.leadId),
  index('rental_quotes_customer_id_idx').on(table.customerId),
  index('rental_quotes_seller_id_idx').on(table.sellerId),
  index('rental_quotes_status_idx').on(table.status),
  check('rental_quotes_billing_period_check', sql`${table.billingPeriod} in ('daily', 'weekly', 'fortnightly', 'monthly')`),
  check('rental_quotes_rental_period_count_check', sql`${table.rentalPeriodCount} > 0`),
  check('rental_quotes_status_check', sql`${table.status} in ('draft', 'sent', 'approved', 'rejected', 'expired')`),
  check('rental_quotes_lead_origin_check', sql`${table.leadOrigin} in ('indicacao', 'google', 'instagram', 'facebook', 'visita_comercial', 'ligacao_comercial', 'cliente', 'loja', 'whatsapp')`),
  check('rental_quotes_amounts_check', sql`${table.subtotalCents} >= 0 and ${table.shippingCents} >= 0 and ${table.totalCents} >= 0`),
  check('rental_quotes_discount_cents_check', sql`${table.discountCents} >= 0`),
  check('rental_quotes_surcharge_cents_check', sql`${table.surchargeCents} >= 0`),
]);

export const rentalQuoteItems = pgTable('rental_quote_items', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  quoteId: integer('quote_id')
    .notNull()
    .references(() => rentalQuotes.id, { onDelete: 'cascade' }),
  equipmentId: integer('equipment_id')
    .notNull()
    .references(() => equipments.id, { onUpdate: 'cascade' }),
  equipmentName: text('equipment_name').notNull(),
  quantity: integer('quantity').notNull().default(1),
  billingPeriod: text('billing_period')
    .notNull()
    .default('daily')
    .$type<RentalBillingPeriod>(),
  unitPriceCents: integer('unit_price_cents').notNull().default(0),
  totalPriceCents: integer('total_price_cents').notNull().default(0),
  assetValueCents: integer('asset_value_cents').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
}, (table) => [
  index('rental_quote_items_quote_id_idx').on(table.quoteId),
  check('rental_quote_items_quantity_check', sql`${table.quantity} > 0`),
  check('rental_quote_items_billing_period_check', sql`${table.billingPeriod} in ('daily', 'weekly', 'fortnightly', 'monthly')`),
  check('rental_quote_items_unit_price_cents_check', sql`${table.unitPriceCents} >= 0`),
  check('rental_quote_items_total_price_cents_check', sql`${table.totalPriceCents} >= 0`),
  check('rental_quote_items_asset_value_cents_check', sql`${table.assetValueCents} >= 0`),
]);
