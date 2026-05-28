import { Injectable, inject } from '@angular/core';

import type { Customer } from '../interfaces/customer';
import type { StaffUser } from '../interfaces/staff-user';
import type {
  RentalBillingPeriod,
  RentalContract,
  RentalContractItem,
  RentalContractStatus,
} from '../interfaces/rental-contract';
import { SupabaseClientService } from './supabase-client.service';

interface RentalContractRow {
  id: number;
  contract_number: string;
  previous_contract_number?: string | null;
  customer_id: number;
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
  end_date: string | null;
  delivery_address: string;
  worksite_address: string;
  notes: string;
  terms: string;
  subtotal_cents: number;
  shipping_cents?: number | null;
  total_cents: number;
  status: RentalContractStatus;
  created_at: string;
  updated_at: string;
}

interface RentalContractItemRow {
  id: number;
  contract_id: number;
  equipment_id: number;
  equipment_name: string;
  quantity: number;
  billing_period: RentalBillingPeriod;
  unit_price_cents: number;
  total_price_cents: number;
  asset_value_cents?: number | null;
  sort_order: number;
}

export interface RentalContractEditorInput {
  id?: number;
  customer: Customer;
  seller: StaffUser;
  billingPeriod: RentalBillingPeriod;
  startDate: string;
  endDate?: string;
  deliveryAddress?: string;
  worksiteAddress?: string;
  notes?: string;
  terms?: string;
  status: RentalContractStatus;
  items: RentalContractItem[];
  shippingCents?: number;
}

@Injectable({ providedIn: 'root' })
export class RentalContractService {
  private readonly supabase = inject(SupabaseClientService);

  async listContracts(): Promise<RentalContract[]> {
    const client = await this.supabase.requireClient();
    const { data, error } = await client
      .from('rental_contracts')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (error || !data) {
      throw error ?? new Error('Não foi possível carregar os contratos.');
    }

    const contractRows = data as RentalContractRow[];
    const itemsByContractId = await this.getItemsByContractId(contractRows.map((contract) => contract.id));

    return contractRows.map((row) => mapContractRow(row, itemsByContractId.get(row.id) ?? []));
  }

  async saveContract(input: RentalContractEditorInput): Promise<RentalContract> {
    const client = await this.supabase.requireClient();
    const billingPeriod = normalizeBillingPeriod(input.billingPeriod);
    const items = input.items.map((item, index) => normalizeContractItem(item, index, billingPeriod));
    const subtotalCents = items.reduce((total, item) => total + item.totalPriceCents, 0);
    const contractPayload = {
      customer_id: input.customer.id,
      customer_name: input.customer.nome,
      customer_document: input.customer.document ?? '',
      customer_email: input.customer.email ?? '',
      customer_phone: input.customer.whatsapp || input.customer.phone || '',
      customer_address: input.customer.address ?? '',
      customer_city: input.customer.city ?? '',
      customer_state: input.customer.state ?? '',
      seller_id: input.seller.id,
      seller_name: input.seller.nome,
      seller_email: input.seller.email ?? '',
      seller_phone: input.seller.whatsapp || input.seller.phone || '',
      billing_period: billingPeriod,
      start_date: input.startDate,
      end_date: input.endDate || null,
      delivery_address: input.deliveryAddress?.trim() ?? '',
      worksite_address: input.worksiteAddress?.trim() ?? '',
      notes: input.notes?.trim() ?? '',
      terms: input.terms?.trim() ?? '',
      subtotal_cents: subtotalCents,
      shipping_cents: input.shippingCents ?? 6000,
      total_cents: subtotalCents + (input.shippingCents ?? 6000),
      status: input.status,
    };
    const contractResponse = input.id
      ? await client
          .from('rental_contracts')
          .update(contractPayload)
          .eq('id', input.id)
          .select('*')
          .single()
      : await client.from('rental_contracts').insert(contractPayload).select('*').single();

    if (contractResponse.error || !contractResponse.data) {
      throw contractResponse.error ?? new Error('Não foi possível salvar o contrato.');
    }

    const savedContract = contractResponse.data as RentalContractRow;

    if (input.id) {
      const deleteResponse = await client
        .from('rental_contract_items')
        .delete()
        .eq('contract_id', savedContract.id);

      if (deleteResponse.error) {
        throw deleteResponse.error;
      }
    }

    if (items.length) {
      const itemResponse = await client.from('rental_contract_items').insert(
        items.map((item, index) => ({
          contract_id: savedContract.id,
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

    const itemsByContractId = await this.getItemsByContractId([savedContract.id]);

    return mapContractRow(savedContract, itemsByContractId.get(savedContract.id) ?? []);
  }

  private async getItemsByContractId(contractIds: number[]): Promise<Map<number, RentalContractItem[]>> {
    const itemsByContractId = new Map<number, RentalContractItem[]>();

    if (!contractIds.length) {
      return itemsByContractId;
    }

    const client = await this.supabase.requireClient();
    const { data, error } = await client
      .from('rental_contract_items')
      .select('*')
      .in('contract_id', contractIds)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (error || !data) {
      throw error ?? new Error('Não foi possível carregar os itens do contrato.');
    }

    for (const row of data as RentalContractItemRow[]) {
      const items = itemsByContractId.get(row.contract_id) ?? [];
      items.push(mapContractItemRow(row));
      itemsByContractId.set(row.contract_id, items);
    }

    return itemsByContractId;
  }
}

function normalizeContractItem(
  item: RentalContractItem,
  index: number,
  billingPeriod: RentalBillingPeriod
): RentalContractItem {
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

function mapContractRow(row: RentalContractRow, items: RentalContractItem[]): RentalContract {
  return {
    id: row.id,
    contractNumber: row.contract_number,
    previousContractNumber: row.previous_contract_number || undefined,
    customerId: row.customer_id,
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
    endDate: row.end_date ?? undefined,
    deliveryAddress: row.delivery_address || undefined,
    worksiteAddress: row.worksite_address || undefined,
    notes: row.notes || undefined,
    terms: row.terms || undefined,
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents ?? 6000,
    totalCents: row.total_cents,
    status: row.status,
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapContractItemRow(row: RentalContractItemRow): RentalContractItem {
  return {
    id: row.id,
    contractId: row.contract_id,
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
