import { Injectable, inject } from '@angular/core';

import type { Customer } from '../interfaces/customer';
import type { StaffUser } from '../interfaces/staff-user';
import type { RentalBillingPeriod } from '../interfaces/rental-contract';
import type { RentalQuote, RentalQuoteItem, RentalQuoteStatus } from '../interfaces/rental-quote';
import { SupabaseClientService } from './supabase-client.service';

interface RentalQuoteRow {
  id: number;
  quote_number: string;
  customer_id: number | null;
  customer_name: string;
  customer_document: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  customer_state: string;
  seller_id: number | null;
  seller_name: string;
  seller_email: string;
  seller_phone: string;
  billing_period?: RentalBillingPeriod | null;
  start_date: string;
  valid_until: string | null;
  delivery_address: string;
  worksite_address: string;
  notes: string;
  subtotal_cents: number;
  shipping_cents?: number | null;
  total_cents: number;
  status: RentalQuoteStatus;
  created_at: string;
  updated_at: string;
}

interface RentalQuoteItemRow {
  id: number;
  quote_id: number;
  equipment_id: number;
  equipment_name: string;
  quantity: number;
  billing_period: RentalBillingPeriod;
  unit_price_cents: number;
  total_price_cents: number;
  asset_value_cents?: number | null;
  sort_order: number;
}

export interface RentalQuoteEditorInput {
  id?: number;
  customer?: Customer | null;
  seller?: StaffUser | null;
  billingPeriod: RentalBillingPeriod;
  startDate: string;
  validUntil?: string;
  deliveryAddress?: string;
  worksiteAddress?: string;
  notes?: string;
  status: RentalQuoteStatus;
  items: RentalQuoteItem[];
  shippingCents?: number;
}

@Injectable({ providedIn: 'root' })
export class RentalQuoteService {
  private readonly supabase = inject(SupabaseClientService);

  async listQuotes(): Promise<RentalQuote[]> {
    const client = await this.supabase.requireClient();
    const { data, error } = await client
      .from('rental_quotes')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (error || !data) {
      throw error ?? new Error('Não foi possível carregar os orçamentos.');
    }

    const quoteRows = data as RentalQuoteRow[];
    const itemsByQuoteId = await this.getItemsByQuoteId(quoteRows.map((quote) => quote.id));

    return quoteRows.map((row) => mapQuoteRow(row, itemsByQuoteId.get(row.id) ?? []));
  }

  async saveQuote(input: RentalQuoteEditorInput): Promise<RentalQuote> {
    const client = await this.supabase.requireClient();
    const billingPeriod = normalizeBillingPeriod(input.billingPeriod);
    const items = input.items.map((item, index) => normalizeQuoteItem(item, index, billingPeriod));
    const subtotalCents = items.reduce((total, item) => total + item.totalPriceCents, 0);
    const quotePayload = {
      customer_id: input.customer?.id ?? null,
      customer_name: input.customer?.nome ?? '',
      customer_document: input.customer?.document ?? '',
      customer_email: input.customer?.email ?? '',
      customer_phone: input.customer?.whatsapp || input.customer?.phone || '',
      customer_address: input.customer?.address ?? '',
      customer_city: input.customer?.city ?? '',
      customer_state: input.customer?.state ?? '',
      seller_id: input.seller?.id ?? null,
      seller_name: input.seller?.nome ?? '',
      seller_email: input.seller?.email ?? '',
      seller_phone: input.seller?.whatsapp || input.seller?.phone || '',
      billing_period: billingPeriod,
      start_date: input.startDate,
      valid_until: input.validUntil || null,
      delivery_address: input.deliveryAddress?.trim() ?? '',
      worksite_address: input.worksiteAddress?.trim() ?? '',
      notes: input.notes?.trim() ?? '',
      subtotal_cents: subtotalCents,
      shipping_cents: input.shippingCents ?? 0,
      total_cents: subtotalCents + (input.shippingCents ?? 0),
      status: input.status,
    };
    const quoteResponse = input.id
      ? await client
          .from('rental_quotes')
          .update(quotePayload)
          .eq('id', input.id)
          .select('*')
          .single()
      : await client.from('rental_quotes').insert(quotePayload).select('*').single();

    if (quoteResponse.error || !quoteResponse.data) {
      throw quoteResponse.error ?? new Error('Não foi possível salvar o orçamento.');
    }

    const savedQuote = quoteResponse.data as RentalQuoteRow;

    if (input.id) {
      const deleteResponse = await client
        .from('rental_quote_items')
        .delete()
        .eq('quote_id', savedQuote.id);

      if (deleteResponse.error) {
        throw deleteResponse.error;
      }
    }

    if (items.length) {
      const itemResponse = await client.from('rental_quote_items').insert(
        items.map((item, index) => ({
          quote_id: savedQuote.id,
          equipment_id: item.equipmentId,
          equipment_name: item.equipmentName,
          quantity: item.quantity,
          billing_period: item.billingPeriod,
          unit_price_cents: item.unitPriceCents,
          total_price_cents: item.totalPriceCents,
          asset_value_cents: item.assetValueCents ?? 0,
          sort_order: index + 1,
        }))
      );

      if (itemResponse.error) {
        throw itemResponse.error;
      }
    }

    const itemsByQuoteId = await this.getItemsByQuoteId([savedQuote.id]);

    return mapQuoteRow(savedQuote, itemsByQuoteId.get(savedQuote.id) ?? []);
  }

  private async getItemsByQuoteId(quoteIds: number[]): Promise<Map<number, RentalQuoteItem[]>> {
    const itemsByQuoteId = new Map<number, RentalQuoteItem[]>();

    if (!quoteIds.length) {
      return itemsByQuoteId;
    }

    const client = await this.supabase.requireClient();
    const { data, error } = await client
      .from('rental_quote_items')
      .select('*')
      .in('quote_id', quoteIds)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (error || !data) {
      throw error ?? new Error('Não foi possível carregar os itens do orçamento.');
    }

    for (const row of data as RentalQuoteItemRow[]) {
      const items = itemsByQuoteId.get(row.quote_id) ?? [];
      items.push(mapQuoteItemRow(row));
      itemsByQuoteId.set(row.quote_id, items);
    }

    return itemsByQuoteId;
  }
}

function normalizeQuoteItem(
  item: RentalQuoteItem,
  index: number,
  billingPeriod: RentalBillingPeriod
): RentalQuoteItem {
  const quantity = Math.max(1, Math.trunc(Number(item.quantity) || 1));
  const unitPriceCents = Math.max(0, Math.trunc(Number(item.unitPriceCents) || 0));
  const assetValueCents = Math.max(0, Math.trunc(Number(item.assetValueCents) || 0));

  return {
    equipmentId: item.equipmentId,
    equipmentName: item.equipmentName.trim(),
    quantity,
    billingPeriod,
    unitPriceCents,
    totalPriceCents: quantity * unitPriceCents,
    assetValueCents,
    sortOrder: index + 1,
  };
}

function mapQuoteRow(row: RentalQuoteRow, items: RentalQuoteItem[]): RentalQuote {
  return {
    id: row.id,
    quoteNumber: row.quote_number,
    customerId: row.customer_id ?? undefined,
    customerName: row.customer_name,
    customerDocument: row.customer_document || undefined,
    customerEmail: row.customer_email || undefined,
    customerPhone: row.customer_phone || undefined,
    customerAddress: row.customer_address || undefined,
    customerCity: row.customer_city || undefined,
    customerState: row.customer_state || undefined,
    sellerId: row.seller_id ?? undefined,
    sellerName: row.seller_name || undefined,
    sellerEmail: row.seller_email || undefined,
    sellerPhone: row.seller_phone || undefined,
    billingPeriod: normalizeBillingPeriod(row.billing_period),
    startDate: row.start_date,
    validUntil: row.valid_until ?? undefined,
    deliveryAddress: row.delivery_address || undefined,
    worksiteAddress: row.worksite_address || undefined,
    notes: row.notes || undefined,
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents ?? 0,
    totalCents: row.total_cents,
    status: normalizeQuoteStatus(row.status),
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQuoteItemRow(row: RentalQuoteItemRow): RentalQuoteItem {
  return {
    id: row.id,
    quoteId: row.quote_id,
    equipmentId: row.equipment_id,
    equipmentName: row.equipment_name,
    quantity: row.quantity,
    billingPeriod: normalizeBillingPeriod(row.billing_period),
    unitPriceCents: row.unit_price_cents,
    totalPriceCents: row.total_price_cents,
    assetValueCents: row.asset_value_cents ?? 0,
    sortOrder: row.sort_order,
  };
}

function normalizeBillingPeriod(value: string | null | undefined): RentalBillingPeriod {
  return value === 'weekly' || value === 'fortnightly' || value === 'monthly' ? value : 'daily';
}

function normalizeQuoteStatus(value: string | null | undefined): RentalQuoteStatus {
  return value === 'sent' || value === 'approved' || value === 'rejected' || value === 'expired'
    ? value
    : 'draft';
}
