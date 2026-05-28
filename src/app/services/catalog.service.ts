import { Injectable, inject } from '@angular/core';

import { equipamentosCategoriasData } from '../data/equipamentos-categorias-data';
import { equipamentosData } from '../data/equipamentos-data';
import type {
  CatalogStatus,
  Equipamento,
  EquipamentoPreco,
} from '../interfaces/equipamento';
import type { EquipamentoCategoria } from '../interfaces/equipamento-categoria';
import { emptyEquipmentPrices } from '../utils/prices';
import { GestorApiService } from './gestor-api.service';
import { SupabaseClientService } from './supabase-client.service';
import { SupabaseConfigService } from './supabase-config.service';

const EQUIPMENT_IMAGES_BUCKET = 'equipment-images';
const EQUIPMENT_IMAGE_CACHE_SECONDS = '31536000';

interface CategoryRow {
  id: number;
  category_code?: string | null;
  nome: string;
  slug: string;
  name: string;
  icone: string;
  avatar: string;
  avatar_hero: string | null;
  avatar_card: string | null;
  video: string | null;
  objetivo: string;
  status: CatalogStatus;
  sort_order: number;
}

interface EquipmentRow {
  id: number;
  category_id: number;
  nome: string;
  technical_name?: string | null;
  slug: string;
  avatar: string | null;
  video: string | null;
  descricao: string;
  aplicacao: string;
  tipo_de_servico: string;
  periodo_de_locacao: string;
  diferenciais: string;
  equipment_code?: string | null;
  asset_value_cents?: number | null;
  total_invested_cents?: number | null;
  notes?: string | null;
  stock_quantity?: number | null;
  status: CatalogStatus;
  sort_order: number;
}

interface EquipmentPriceRow {
  equipment_id: number;
  daily_price_cents: number;
  weekly_price_cents: number;
  fortnightly_price_cents: number;
  monthly_price_cents: number;
  currency: 'BRL';
}

export interface CatalogListOptions {
  includeArchived?: boolean;
  categorySlug?: string;
  search?: string;
}

export interface EquipmentEditorInput {
  id?: number;
  categoryId: number;
  nome: string;
  nomeTecnico: string;
  slug: string;
  avatar?: string | null;
  video?: string | null;
  descricao: string;
  aplicacao: string;
  tipoDeServico: string;
  periodoDeLocacao: string;
  diferenciais: string;
  codigo: string;
  assetValueCents: number;
  totalInvestedCents: number;
  notes: string;
  stockQuantity: number;
  status?: CatalogStatus;
  sortOrder?: number;
  precos: EquipamentoPreco;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly api = inject(GestorApiService);
  private readonly supabase = inject(SupabaseClientService);
  private readonly supabaseConfig = inject(SupabaseConfigService);

  getLocalCategories(options: Pick<CatalogListOptions, 'includeArchived'> = {}) {
    return fallbackCategories(options.includeArchived);
  }

  getLocalEquipments(options: CatalogListOptions = {}) {
    return fallbackEquipments(options);
  }

  async listCategories(options: Pick<CatalogListOptions, 'includeArchived'> = {}) {
    if (options.includeArchived) {
      return this.api.request<EquipamentoCategoria[]>('/categories?includeArchived=1');
    }

    const apiCategories = await this.api
      .optionalRequest<EquipamentoCategoria[]>('/categories')
      .catch((error) => {
        console.warn('catalog categories api fallback', error);
        return null;
      });

    if (apiCategories) {
      return apiCategories;
    }

    if (!options.includeArchived) {
      try {
        const data = await this.fetchPublicRows<CategoryRow>('categories', {
          select: '*',
          status: 'eq.active',
          order: 'sort_order.asc,nome.asc',
        });

        if (data) {
          return data.map(mapCategoryRow);
        }
      } catch (error) {
        console.warn('catalog categories fallback', error);
      }
    }

    const client = await this.supabase.getClient();

    if (!client) {
      return fallbackCategories(options.includeArchived);
    }

    let query = client
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('nome', { ascending: true });

    if (!options.includeArchived) {
      query = query.eq('status', 'active');
    }

    const { data, error } = await query;

    if (error || !data) {
      console.warn('catalog categories fallback', error);
      return fallbackCategories(options.includeArchived);
    }

    return (data as CategoryRow[]).map(mapCategoryRow);
  }

  async listEquipments(options: CatalogListOptions = {}) {
    const searchParams = new URLSearchParams();

    if (options.includeArchived) {
      searchParams.set('includeArchived', '1');
    }

    if (options.categorySlug) {
      searchParams.set('categorySlug', options.categorySlug);
    }

    if (options.search) {
      searchParams.set('search', options.search);
    }

    const apiPath = `/equipments${searchParams.size ? `?${searchParams.toString()}` : ''}`;
    const apiEquipments = options.includeArchived
      ? await this.api.request<Equipamento[]>(apiPath)
      : await this.api.optionalRequest<Equipamento[]>(apiPath).catch((error) => {
          console.warn('catalog equipments api fallback', error);
          return null;
        });

    if (apiEquipments) {
      return apiEquipments;
    }

    const categories = await this.listCategories({ includeArchived: options.includeArchived });
    const categoryById = new Map(categories.map((category) => [category.id, category] as const));
    const selectedCategory = options.categorySlug
      ? categories.find((category) => category.slug === options.categorySlug)
      : null;

    if (options.categorySlug && !selectedCategory) {
      return [];
    }

    if (!options.includeArchived) {
      try {
        const params: Record<string, string> = {
          select: '*',
          status: 'eq.active',
          order: 'sort_order.asc,nome.asc',
        };

        if (selectedCategory) {
          params['category_id'] = `eq.${selectedCategory.id}`;
        }

        const searchValue = options.search?.trim();

        if (searchValue) {
          params['nome'] = `ilike.*${searchValue}*`;
        }

        const equipmentRows = await this.fetchPublicRows<EquipmentRow>('equipments', params);

        if (equipmentRows) {
          const pricesByEquipmentId = await this.getPricesByEquipmentId(
            equipmentRows.map((item) => item.id),
            false
          );

          return equipmentRows
            .map((row) => mapEquipmentRow(row, categoryById.get(row.category_id), pricesByEquipmentId.get(row.id)))
            .filter((item): item is Equipamento => Boolean(item));
        }
      } catch (error) {
        console.warn('catalog equipments fallback', error);
      }
    }

    const client = await this.supabase.getClient();

    if (!client) {
      return fallbackEquipments(options);
    }

    let query = client
      .from('equipments')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('nome', { ascending: true });

    if (!options.includeArchived) {
      query = query.eq('status', 'active');
    }

    if (selectedCategory) {
      query = query.eq('category_id', selectedCategory.id);
    }

    const search = normalizeSearch(options.search);

    if (search) {
      query = query.ilike('nome', `%${search}%`);
    }

    const { data, error } = await query;

    if (error || !data) {
      console.warn('catalog equipments fallback', error);
      return fallbackEquipments(options);
    }

    const equipmentRows = data as EquipmentRow[];
    const pricesByEquipmentId = await this.getPricesByEquipmentId(
      equipmentRows.map((item) => item.id),
      options.includeArchived
    );

    return equipmentRows
      .map((row) => mapEquipmentRow(row, categoryById.get(row.category_id), pricesByEquipmentId.get(row.id)))
      .filter((item): item is Equipamento => Boolean(item));
  }

  async getCategoryBySlug(slug: string) {
    const categories = await this.listCategories();
    return categories.find((category) => category.slug === slug);
  }

  async getEquipmentBySlug(slug: string, categorySlug?: string) {
    const equipments = await this.listEquipments({ categorySlug });
    return equipments.find((equipment) => equipment.slug === slug);
  }

  async saveEquipment(input: EquipmentEditorInput): Promise<Equipamento> {
    return this.api.request<Equipamento>('/equipments', { method: 'POST', body: input });
  }

  async uploadEquipmentImage(file: File, equipmentSlug: string): Promise<string> {
    const client = await this.supabase.requireClient();
    const folder = slugifyStorageSegment(equipmentSlug);
    const extension = getImageExtension(file);
    const path = `${folder}/${Date.now()}-${randomStorageId()}.${extension}`;
    const { error } = await client.storage.from(EQUIPMENT_IMAGES_BUCKET).upload(path, file, {
      cacheControl: EQUIPMENT_IMAGE_CACHE_SECONDS,
      contentType: file.type || 'image/jpeg',
      upsert: false,
    });

    if (error) {
      throw error;
    }

    const { data } = client.storage.from(EQUIPMENT_IMAGES_BUCKET).getPublicUrl(path);

    if (!data.publicUrl) {
      throw new Error('Não foi possível obter a URL pública da foto.');
    }

    return data.publicUrl;
  }

  private async resolveAvailableEquipmentSlug(slug: string): Promise<string> {
    const client = await this.supabase.requireClient();
    const baseSlug = slug || 'equipamento';
    const { data, error } = await client
      .from('equipments')
      .select('slug')
      .like('slug', `${baseSlug}%`);

    if (error || !data) {
      return baseSlug;
    }

    const existingSlugs = new Set(
      (data as Pick<EquipmentRow, 'slug'>[])
        .map((item) => item.slug)
        .filter((itemSlug) => itemSlug === baseSlug || itemSlug.startsWith(`${baseSlug}-`))
    );

    if (!existingSlugs.has(baseSlug)) {
      return baseSlug;
    }

    for (let suffix = 2; suffix < 1000; suffix += 1) {
      const candidate = `${baseSlug}-${suffix}`;

      if (!existingSlugs.has(candidate)) {
        return candidate;
      }
    }

    return `${baseSlug}-${Date.now()}`;
  }

  async archiveEquipment(id: number): Promise<void> {
    await this.updateEquipmentStatus(id, 'archived');
  }

  async restoreEquipment(id: number): Promise<void> {
    await this.updateEquipmentStatus(id, 'active');
  }

  private async updateEquipmentStatus(id: number, status: CatalogStatus) {
    await this.api.request(`/equipments/${id}/status`, { method: 'PATCH', body: { status } });
  }

  private async getPricesByEquipmentId(equipmentIds: number[], includeArchived = false) {
    const pricesByEquipmentId = new Map<number, EquipamentoPreco>();

    if (!equipmentIds.length) {
      return pricesByEquipmentId;
    }

    if (!includeArchived) {
      try {
        const data = await this.fetchPublicRows<EquipmentPriceRow>('equipment_prices', {
          select: '*',
          equipment_id: `in.(${equipmentIds.join(',')})`,
        });

        for (const row of data ?? []) {
          pricesByEquipmentId.set(row.equipment_id, mapPriceRow(row));
        }

        return pricesByEquipmentId;
      } catch (error) {
        console.warn('catalog prices unavailable', error);
        return pricesByEquipmentId;
      }
    }

    const client = await this.supabase.getClient();

    if (!client) {
      return pricesByEquipmentId;
    }

    const { data, error } = await client
      .from('equipment_prices')
      .select('*')
      .in('equipment_id', equipmentIds);

    if (error || !data) {
      console.warn('catalog prices unavailable', error);
      return pricesByEquipmentId;
    }

    for (const row of data as EquipmentPriceRow[]) {
      pricesByEquipmentId.set(row.equipment_id, mapPriceRow(row));
    }

    return pricesByEquipmentId;
  }

  private async fetchPublicRows<Row>(
    table: 'categories' | 'equipments' | 'equipment_prices',
    params: Record<string, string>
  ): Promise<Row[] | null> {
    const config = await this.supabaseConfig.getConfig();

    if (!config) {
      return null;
    }

    const url = new URL(`/rest/v1/${table}`, config.supabaseUrl);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          apikey: config.supabaseAnonKey,
          Authorization: `Bearer ${config.supabaseAnonKey}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Supabase REST ${table} respondeu ${response.status}.`);
      }

      return (await response.json()) as Row[];
    } finally {
      clearTimeout(timeout);
    }
  }
}

function mapCategoryRow(row: CategoryRow): EquipamentoCategoria {
  return {
    id: row.id,
    codigo: row.category_code || String(row.id),
    nome: row.nome,
    slug: row.slug,
    name: row.name,
    icone: row.icone,
    avatar: row.avatar,
    avatarHero: row.avatar_hero ?? undefined,
    avatarCard: row.avatar_card ?? undefined,
    video: row.video ?? undefined,
    objetivo: row.objetivo,
    status: row.status,
    sortOrder: row.sort_order,
  };
}

function mapEquipmentRow(
  row: EquipmentRow,
  category?: EquipamentoCategoria,
  prices?: EquipamentoPreco
): Equipamento | null {
  if (!category) {
    return null;
  }

  return {
    id: row.id,
    nome: row.nome,
    nomeTecnico: row.technical_name ?? '',
    slug: row.slug,
    avatar: row.avatar ?? undefined,
    video: row.video ?? undefined,
    descricao: row.descricao,
    aplicacao: row.aplicacao,
    tipoDeServico: row.tipo_de_servico,
    periodoDeLocacao: row.periodo_de_locacao,
    diferenciais: row.diferenciais,
    equipamentoCategoria: category,
    precos: prices ?? emptyEquipmentPrices(),
    codigo: row.equipment_code ?? '',
    codigoInterno: formatInternalCode(category.codigo, row.equipment_code ?? ''),
    assetValueCents: normalizeCents(row.asset_value_cents),
    totalInvestedCents: normalizeCents(row.total_invested_cents),
    notes: row.notes ?? '',
    stockQuantity: normalizeStockQuantity(row.stock_quantity),
    status: row.status,
    sortOrder: row.sort_order,
  };
}

function mapPriceRow(row: EquipmentPriceRow): EquipamentoPreco {
  return {
    dailyPriceCents: row.daily_price_cents,
    weeklyPriceCents: row.weekly_price_cents,
    fortnightlyPriceCents: row.fortnightly_price_cents,
    monthlyPriceCents: row.monthly_price_cents,
    currency: row.currency,
  };
}

function fallbackCategories(includeArchived = false): EquipamentoCategoria[] {
  return equipamentosCategoriasData
    .map((category, index) => ({
      ...category,
      status: category.status ?? 'active',
      codigo: category.codigo || String(category.id),
      sortOrder: category.sortOrder ?? index + 1,
    }))
    .filter((category) => includeArchived || category.status === 'active');
}

function fallbackEquipments(options: CatalogListOptions): Equipamento[] {
  const search = normalizeSearch(options.search);

  return equipamentosData
    .map((equipment, index) => ({
      ...equipment,
      nomeTecnico: equipment.nomeTecnico ?? '',
      precos: equipment.precos ?? emptyEquipmentPrices(),
      codigo: equipment.codigo ?? '',
      codigoInterno: equipment.codigoInterno || formatInternalCode(
        equipment.equipamentoCategoria.codigo,
        equipment.codigo ?? ''
      ),
      assetValueCents: normalizeCents(equipment.assetValueCents),
      totalInvestedCents: normalizeCents(equipment.totalInvestedCents),
      notes: equipment.notes ?? '',
      stockQuantity: normalizeStockQuantity(equipment.stockQuantity),
      status: equipment.status ?? 'active',
      sortOrder: equipment.sortOrder ?? index + 1,
    }))
    .filter((equipment) => options.includeArchived || equipment.status === 'active')
    .filter((equipment) => !options.categorySlug || equipment.equipamentoCategoria.slug === options.categorySlug)
    .filter((equipment) => !search || normalizeSearch(equipment.nome).includes(search));
}

function normalizeSearch(value?: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function slugifyStorageSegment(value: string): string {
  const slug = normalizeSearch(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'equipamento';
}

function getImageExtension(file: File): string {
  const mimeType = file.type.toLowerCase();

  if (mimeType.includes('png')) {
    return 'png';
  }

  if (mimeType.includes('webp')) {
    return 'webp';
  }

  if (mimeType.includes('heic')) {
    return 'heic';
  }

  if (mimeType.includes('heif')) {
    return 'heif';
  }

  const extension = file.name.split('.').pop()?.toLowerCase();

  return extension && /^[a-z0-9]+$/.test(extension) ? extension : 'jpg';
}

function randomStorageId(): string {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(8);
    cryptoApi.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  return Math.random().toString(36).slice(2, 12);
}

function normalizeNullable(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeStockQuantity(value?: number | null): number {
  const quantity = Number(value);
  return Number.isFinite(quantity) ? Math.max(0, Math.trunc(quantity)) : 0;
}

function normalizeCents(value?: number | null): number {
  const cents = Number(value);
  return Number.isFinite(cents) ? Math.max(0, Math.round(cents)) : 0;
}

function normalizeCode(value?: string | null): string {
  return value?.trim() ?? '';
}

function formatInternalCode(categoryCode?: string, equipmentCode?: string): string {
  const normalizedCategoryCode = normalizeCode(categoryCode);
  const normalizedEquipmentCode = normalizeCode(equipmentCode);

  if (!normalizedCategoryCode) {
    return normalizedEquipmentCode;
  }

  if (!normalizedEquipmentCode) {
    return normalizedCategoryCode;
  }

  if (normalizedEquipmentCode.includes('/')) {
    return normalizedEquipmentCode
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => `${normalizedCategoryCode}.${part}`)
      .join(' / ');
  }

  return `${normalizedCategoryCode}.${normalizedEquipmentCode}`;
}
