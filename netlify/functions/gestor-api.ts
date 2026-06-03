import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  like,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

import { getDb } from '../../src/server/db/client';
import {
  categories,
  companyProfile,
  customers,
  equipmentPrices,
  equipments,
  leads,
  invoicePixCharges,
  rentalContractItems,
  rentalContracts,
  rentalQuoteItems,
  rentalQuotes,
  staffUsers,
  type CatalogStatus,
  type InvoicePixChargeStatus,
  type LeadOrigin,
  type RentalBillingPeriod,
  type RentalContractStatus,
  type RentalQuoteStatus,
  type StaffUserRole,
} from '../../src/server/db/schema';
import {
  analyzePixReceiptRisk,
  buildInvoicePixCharge,
  parsePixReceiptEndToEndId,
} from '../../src/server/pix/invoice-pix';
import { getSupabaseAnonKey, getSupabaseUrl } from '../../src/server/runtime-config';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

type CategoryRow = typeof categories.$inferSelect;
type EquipmentRow = typeof equipments.$inferSelect;
type EquipmentPriceRow = typeof equipmentPrices.$inferSelect;
type CustomerRow = typeof customers.$inferSelect;
type LeadRow = typeof leads.$inferSelect;
type InvoicePixChargeRow = typeof invoicePixCharges.$inferSelect;
type StaffUserRow = typeof staffUsers.$inferSelect;
type CompanyProfileRow = typeof companyProfile.$inferSelect;
type RentalContractRow = typeof rentalContracts.$inferSelect;
type RentalContractItemRow = typeof rentalContractItems.$inferSelect;
type RentalQuoteRow = typeof rentalQuotes.$inferSelect;
type RentalQuoteItemRow = typeof rentalQuoteItems.$inferSelect;

let quotesWithoutLeadMigrationReady = false;
let invoicePixChargesMigrationReady = false;

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return json({ ok: true });
    }

    await requireAuthenticatedSession(event);

    const [resource, id, action] = routeSegments(event);

    switch (resource) {
      case 'categories':
        return requireMethod(event, 'GET', () => listCategories(event));
      case 'equipments':
        return handleEquipments(event, id, action);
      case 'customers':
        return handleCustomers(event, id, action);
      case 'leads':
        return handleLeads(event, id, action);
      case 'staff-users':
        return handleStaffUsers(event, id, action);
      case 'company-profile':
        return handleCompanyProfile(event);
      case 'rental-contracts':
        return handleRentalContracts(event);
      case 'rental-quotes':
        return handleRentalQuotes(event);
      case 'invoice-charges':
        return handleInvoiceCharges(event, id, action);
      default:
        return json({ error: 'Recurso não encontrado.' }, 404);
    }
  } catch (error) {
    return errorResponse(error);
  }
};

async function requireAuthenticatedSession(event: HandlerEvent): Promise<void> {
  const token = authorizationToken(event);

  if (!token) {
    throw httpError(401, 'Sessão ausente.');
  }

  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw httpError(503, 'Supabase não está configurado.');
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);

  if (error || !data.user) {
    throw httpError(401, 'Sessão inválida.');
  }
}

function authorizationToken(event: HandlerEvent): string {
  const authorization = event.headers['authorization'] ?? event.headers['Authorization'];
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

function routeSegments(event: HandlerEvent): string[] {
  const path = event.path
    .replace(/^\/api\/gestor\/?/, '')
    .replace(/^\/\.netlify\/functions\/gestor-api\/?/, '');

  return path.split('/').filter(Boolean);
}

async function handleEquipments(event: HandlerEvent, id?: string, action?: string) {
  if (!id) {
    if (event.httpMethod === 'GET') {
      return listEquipments(event);
    }

    if (event.httpMethod === 'POST') {
      return json(await saveEquipment(await readJson(event)));
    }
  }

  if (id && action === 'status' && event.httpMethod === 'PATCH') {
    const body = await readJson(event);
    await updateEquipmentStatus(Number(id), normalizeCatalogStatus(body.status));
    return json({ ok: true });
  }

  return json({ error: 'Operação de equipamento não suportada.' }, 405);
}

async function handleCustomers(event: HandlerEvent, id?: string, action?: string) {
  if (!id) {
    if (event.httpMethod === 'GET') {
      return json(await listCustomers(event));
    }

    if (event.httpMethod === 'POST') {
      return json(await saveCustomer(await readJson(event)));
    }
  }

  if (id && action === 'status' && event.httpMethod === 'PATCH') {
    const body = await readJson(event);
    await updateCustomerStatus(Number(id), normalizeCatalogStatus(body.status));
    return json({ ok: true });
  }

  return json({ error: 'Operação de cliente não suportada.' }, 405);
}

async function handleLeads(event: HandlerEvent, id?: string, action?: string) {
  if (!id) {
    if (event.httpMethod === 'GET') {
      return json(await listLeads(event));
    }

    if (event.httpMethod === 'POST') {
      return json(await saveLead(await readJson(event)));
    }
  }

  if (id && action === 'status' && event.httpMethod === 'PATCH') {
    const body = await readJson(event);
    await updateLeadStatus(Number(id), normalizeCatalogStatus(body.status));
    return json({ ok: true });
  }

  return json({ error: 'Operação de lead não suportada.' }, 405);
}

async function handleStaffUsers(event: HandlerEvent, id?: string, action?: string) {
  if (!id) {
    if (event.httpMethod === 'GET') {
      return json(await listStaffUsers(event));
    }

    if (event.httpMethod === 'POST') {
      return json(await saveStaffUser(await readJson(event)));
    }
  }

  if (id && action === 'status' && event.httpMethod === 'PATCH') {
    const body = await readJson(event);
    await updateStaffUserStatus(Number(id), normalizeCatalogStatus(body.status));
    return json({ ok: true });
  }

  return json({ error: 'Operação de usuário não suportada.' }, 405);
}

async function handleCompanyProfile(event: HandlerEvent) {
  if (event.httpMethod === 'GET') {
    return json(await getCompanyProfile());
  }

  if (event.httpMethod === 'PUT' || event.httpMethod === 'POST') {
    return json(await saveCompanyProfile(await readJson(event)));
  }

  return json({ error: 'Operação de empresa não suportada.' }, 405);
}

async function handleRentalContracts(event: HandlerEvent) {
  if (event.httpMethod === 'GET') {
    return json(await listRentalContracts(event));
  }

  if (event.httpMethod === 'POST') {
    return json(await saveRentalContract(await readJson(event)));
  }

  return json({ error: 'Operação de contrato não suportada.' }, 405);
}

async function handleRentalQuotes(event: HandlerEvent) {
  const [, id, action] = routeSegments(event);

  if (id && action === 'convert-to-contract' && event.httpMethod === 'POST') {
    return json(await convertRentalQuoteToContract(Number(id)));
  }

  if (event.httpMethod === 'GET') {
    return json(await listRentalQuotes());
  }

  if (event.httpMethod === 'POST') {
    return json(await saveRentalQuote(await readJson(event)));
  }

  return json({ error: 'Operação de orçamento não suportada.' }, 405);
}

async function handleInvoiceCharges(event: HandlerEvent, id?: string, action?: string) {
  await ensureInvoicePixChargesTable();

  if (!id) {
    if (event.httpMethod === 'GET') {
      return json(await listInvoiceCharges(event));
    }

    if (event.httpMethod === 'POST') {
      return json(await createInvoiceCharge(await readJson(event)));
    }
  }

  if (id && action === 'confirm' && event.httpMethod === 'PATCH') {
    return json(await confirmInvoiceCharge(Number(id), await readJson(event)));
  }

  return json({ error: 'Operação de recebimento não suportada.' }, 405);
}

async function listCategories(event: HandlerEvent) {
  const includeArchived = booleanQuery(event, 'includeArchived');
  const where = includeArchived ? undefined : eq(categories.status, 'active');
  const rows = await getDb()
    .select()
    .from(categories)
    .where(where)
    .orderBy(categoryCodeOrderSql(), asc(categories.categoryCode), asc(categories.sortOrder), asc(categories.nome));

  return json(rows.map(mapCategoryRow));
}

async function listEquipments(event: HandlerEvent) {
  const includeArchived = booleanQuery(event, 'includeArchived');
  const categorySlug = queryValue(event, 'categorySlug');
  const search = queryValue(event, 'search');
  const categoryRows = await loadCategories(includeArchived);
  const categoryById = new Map(categoryRows.map((category) => [category.id, category] as const));
  const selectedCategory = categorySlug
    ? categoryRows.find((category) => category.slug === categorySlug)
    : null;

  if (categorySlug && !selectedCategory) {
    return json([]);
  }

  const filters: SQL[] = [];

  if (!includeArchived) {
    filters.push(eq(equipments.status, 'active'));
  }

  if (selectedCategory) {
    filters.push(eq(equipments.categoryId, selectedCategory.id));
  }

  if (search) {
    const searchFilters: SQL[] = [
      ilike(equipments.equipmentCode, `%${search}%`),
      ilike(equipments.nome, `%${search}%`),
      ilike(equipments.technicalName, `%${search}%`),
      ilike(equipments.slug, `%${search}%`),
    ];
    const internalCodeSearch = parseInternalCodeSearch(search);

    if (internalCodeSearch) {
      const matchingCategories = categoryRows.filter(
        (category) => category.categoryCode === internalCodeSearch.categoryCode
      );

      if (matchingCategories.length) {
        const categoryIds = matchingCategories.map((category) => category.id);

        if (internalCodeSearch.equipmentCode) {
          searchFilters.push(
            and(
              inArray(equipments.categoryId, categoryIds),
              eq(equipments.equipmentCode, internalCodeSearch.equipmentCode)
            ) as SQL
          );
        } else {
          searchFilters.push(inArray(equipments.categoryId, categoryIds) as SQL);
        }
      }
    }

    filters.push(or(...searchFilters) as SQL);
  }

  const equipmentRows = await getDb()
    .select()
    .from(equipments)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(equipments.createdAt), desc(equipments.id));
  const pricesByEquipmentId = await loadPricesByEquipmentId(equipmentRows.map((item) => item.id));

  return json(
    equipmentRows
      .map((row) => mapEquipmentRow(row, categoryById.get(row.categoryId), pricesByEquipmentId.get(row.id)))
      .filter(Boolean)
  );
}

async function saveEquipment(input: Record<string, unknown>) {
  const db = getDb();
  const id = optionalNumber(input.id);
  const requestedSlug = textInput(input.slug);
  const slug = id ? requestedSlug : await resolveAvailableEquipmentSlug(requestedSlug);
  const payload = {
    categoryId: numberInput(input.categoryId),
    nome: textInput(input.nome),
    technicalName: textInput(input.nomeTecnico),
    slug,
    avatar: nullableTextInput(input.avatar),
    video: nullableTextInput(input.video),
    descricao: textInput(input.descricao),
    aplicacao: textInput(input.aplicacao),
    tipoDeServico: textInput(input.tipoDeServico),
    periodoDeLocacao: textInput(input.periodoDeLocacao),
    diferenciais: textInput(input.diferenciais),
    equipmentCode: textInput(input.codigo),
    assetValueCents: centsInput(input.assetValueCents),
    totalInvestedCents: centsInput(input.totalInvestedCents),
    notes: textInput(input.notes),
    stockQuantity: stockInput(input.stockQuantity),
    status: normalizeCatalogStatus(input.status),
    sortOrder: numberInput(input.sortOrder, 0),
  };
  const prices = priceInput(input.precos);

  const saved = await db.transaction(async (tx) => {
    const [equipment] = id
      ? await tx.update(equipments).set(payload).where(eq(equipments.id, id)).returning()
      : await tx.insert(equipments).values(payload).returning();

    if (!equipment) {
      throw httpError(500, 'Não foi possível salvar o equipamento.');
    }

    await tx
      .insert(equipmentPrices)
      .values({
        equipmentId: equipment.id,
        ...prices,
        currency: 'BRL',
      })
      .onConflictDoUpdate({
        target: equipmentPrices.equipmentId,
        set: {
          ...prices,
          currency: 'BRL',
        },
      });

    await renumberActiveEquipmentCodes(tx);

    return equipment;
  });

  const [equipment] = await db.select().from(equipments).where(eq(equipments.id, saved.id));

  if (!equipment) {
    throw httpError(500, 'Não foi possível recarregar o equipamento salvo.');
  }

  const [category] = await db.select().from(categories).where(eq(categories.id, equipment.categoryId));
  return mapEquipmentRow(equipment, category, prices);
}

async function updateEquipmentStatus(id: number, status: CatalogStatus) {
  await getDb().transaction(async (tx) => {
    await tx.update(equipments).set({ status }).where(eq(equipments.id, id));
    await renumberActiveEquipmentCodes(tx);
  });
}

async function renumberActiveEquipmentCodes(executor: { execute: (query: SQL) => Promise<unknown> }) {
  await executor.execute(sql`
    with ranked as (
      select
        e.id,
        lpad(row_number() over (
          partition by e.category_id
          order by
            lower(translate(
              coalesce(e.nome, ''),
              'ÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäåéèêëíìîïóòôõöúùûüçñ',
              'AAAAAAEEEEIIIIOOOOOUUUUCNaaaaaaeeeeiiiiooooouuuucn'
            )),
            lower(coalesce(e.nome, '')),
            e.id
        )::text, 3, '0') as equipment_code,
        row_number() over (
          partition by e.category_id
          order by
            lower(translate(
              coalesce(e.nome, ''),
              'ÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäåéèêëíìîïóòôõöúùûüçñ',
              'AAAAAAEEEEIIIIOOOOOUUUUCNaaaaaaeeeeiiiiooooouuuucn'
            )),
            lower(coalesce(e.nome, '')),
            e.id
        ) as sort_order
      from public.equipments e
      where e.status = 'active'
    )
    update public.equipments e
    set
      equipment_code = ranked.equipment_code,
      sort_order = ranked.sort_order,
      updated_at = now()
    from ranked
    where e.id = ranked.id
      and (
        e.equipment_code is distinct from ranked.equipment_code
        or e.sort_order is distinct from ranked.sort_order
      )
  `);
}

async function listCustomers(event: HandlerEvent) {
  const filters = booleanQuery(event, 'includeArchived') ? [] : [eq(customers.status, 'active')];
  const rows = await getDb()
    .select()
    .from(customers)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(customers.createdAt), desc(customers.id));

  return rows.map(mapCustomerRow);
}

async function saveCustomer(input: Record<string, unknown>) {
  const id = optionalNumber(input.id);
  const payload = {
    nome: textInput(input.nome),
    document: textInput(input.document),
    email: textInput(input.email).toLowerCase(),
    phone: textInput(input.phone),
    whatsapp: textInput(input.whatsapp),
    zipCode: textInput(input.zipCode),
    address: textInput(input.address),
    city: textInput(input.city),
    state: textInput(input.state).toUpperCase(),
    notes: textInput(input.notes),
    status: normalizeCatalogStatus(input.status),
  };
  const [row] = id
    ? await getDb().update(customers).set(payload).where(eq(customers.id, id)).returning()
    : await getDb().insert(customers).values(payload).returning();

  if (!row) {
    throw httpError(500, 'Não foi possível salvar o cliente.');
  }

  return mapCustomerRow(row);
}

async function updateCustomerStatus(id: number, status: CatalogStatus) {
  await getDb().update(customers).set({ status }).where(eq(customers.id, id));
}

async function listLeads(event: HandlerEvent) {
  const filters = booleanQuery(event, 'includeArchived') ? [] : [eq(leads.status, 'active')];
  const rows = await getDb()
    .select()
    .from(leads)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(leads.createdAt), desc(leads.id));

  return rows.map(mapLeadRow);
}

async function saveLead(input: Record<string, unknown>) {
  const id = optionalNumber(input.id);
  const interestCategoryId = optionalNumber(input.interestCategoryId) ?? null;
  const interestCategory = interestCategoryId ? await loadCategoryById(interestCategoryId) : null;

  if (interestCategoryId && !interestCategory) {
    throw httpError(400, 'Grupo de interesse inválido.');
  }

  const payload = {
    nome: textInput(input.nome),
    document: textInput(input.document),
    email: textInput(input.email).toLowerCase(),
    phone: textInput(input.phone),
    whatsapp: textInput(input.whatsapp),
    zipCode: textInput(input.zipCode),
    address: textInput(input.address),
    city: textInput(input.city),
    state: textInput(input.state).toUpperCase(),
    origin: normalizeLeadOrigin(input.origin),
    interestCategoryId,
    interestCategoryName: interestCategory?.nome ?? '',
    notes: textInput(input.notes),
    customerId: optionalNumber(input.customerId) ?? null,
    status: normalizeCatalogStatus(input.status),
  };

  if (!payload.nome) {
    throw httpError(400, 'Informe o nome do lead.');
  }

  const [row] = id
    ? await getDb().update(leads).set(payload).where(eq(leads.id, id)).returning()
    : await getDb().insert(leads).values(payload).returning();

  if (!row) {
    throw httpError(500, 'Não foi possível salvar o lead.');
  }

  return mapLeadRow(row);
}

async function updateLeadStatus(id: number, status: CatalogStatus) {
  await getDb().update(leads).set({ status }).where(eq(leads.id, id));
}

async function listStaffUsers(event: HandlerEvent) {
  const filters: SQL[] = [];
  const role = queryValue(event, 'role');

  if (!booleanQuery(event, 'includeArchived')) {
    filters.push(eq(staffUsers.status, 'active'));
  }

  if (role) {
    filters.push(eq(staffUsers.role, normalizeStaffUserRole(role)));
  }

  const rows = await getDb()
    .select()
    .from(staffUsers)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(staffUsers.createdAt), desc(staffUsers.id));

  return rows.map(mapStaffUserRow);
}

async function saveStaffUser(input: Record<string, unknown>) {
  const id = optionalNumber(input.id);
  const payload = {
    authUserId: nullableTextInput(input.authUserId),
    nome: textInput(input.nome),
    role: normalizeStaffUserRole(input.role),
    document: textInput(input.document),
    email: textInput(input.email).toLowerCase(),
    phone: textInput(input.phone),
    whatsapp: textInput(input.whatsapp),
    address: textInput(input.address),
    notes: textInput(input.notes),
    status: normalizeCatalogStatus(input.status),
  };
  const [row] = id
    ? await getDb().update(staffUsers).set(payload).where(eq(staffUsers.id, id)).returning()
    : await getDb().insert(staffUsers).values(payload).returning();

  if (!row) {
    throw httpError(500, 'Não foi possível salvar o usuário.');
  }

  return mapStaffUserRow(row);
}

async function updateStaffUserStatus(id: number, status: CatalogStatus) {
  await getDb().update(staffUsers).set({ status }).where(eq(staffUsers.id, id));
}

async function getCompanyProfile() {
  const [row] = await getDb().select().from(companyProfile).where(eq(companyProfile.id, 1));

  if (!row) {
    throw httpError(404, 'Dados da empresa não encontrados.');
  }

  return mapCompanyProfileRow(row);
}

async function saveCompanyProfile(input: Record<string, unknown>) {
  const payload = {
    id: 1,
    legalName: textInput(input.legalName),
    tradeName: textInput(input.tradeName),
    document: textInput(input.document),
    pixKey: textInput(input.pixKey),
    email: textInput(input.email).toLowerCase(),
    gmailPassword: textInput(input.gmailPassword),
    phone: textInput(input.phone),
    whatsapp: textInput(input.whatsapp),
    address: textInput(input.address),
    city: textInput(input.city),
    state: textInput(input.state).toUpperCase(),
    zipCode: textInput(input.zipCode),
    instagramLogin: textInput(input.instagramLogin),
    instagramPassword: textInput(input.instagramPassword),
    contractTerms: textInput(input.contractTerms),
  };
  const [row] = await getDb()
    .insert(companyProfile)
    .values(payload)
    .onConflictDoUpdate({
      target: companyProfile.id,
      set: payload,
    })
    .returning();

  if (!row) {
    throw httpError(500, 'Não foi possível salvar os dados da empresa.');
  }

  return mapCompanyProfileRow(row);
}

async function listRentalContracts(event: HandlerEvent) {
  const dateFrom = dateQueryValue(event, 'dateFrom');
  const dateTo = dateQueryValue(event, 'dateTo');
  const dateMode = contractDateModeQuery(event);
  const filters: SQL[] = [];

  if (dateMode === 'start') {
    if (dateFrom) {
      filters.push(sql`${rentalContracts.startDate} >= ${dateFrom}`);
    }

    if (dateTo) {
      filters.push(sql`${rentalContracts.startDate} <= ${dateTo}`);
    }
  } else if (dateMode === 'end') {
    if (dateFrom) {
      filters.push(sql`coalesce(${rentalContracts.endDate}, ${rentalContracts.startDate}) >= ${dateFrom}`);
    }

    if (dateTo) {
      filters.push(sql`coalesce(${rentalContracts.endDate}, ${rentalContracts.startDate}) <= ${dateTo}`);
    }
  } else {
    if (dateFrom) {
      filters.push(sql`coalesce(${rentalContracts.endDate}, ${rentalContracts.startDate}) >= ${dateFrom}`);
    }

    if (dateTo) {
      filters.push(sql`${rentalContracts.startDate} <= ${dateTo}`);
    }
  }

  const contractRows = await getDb()
    .select()
    .from(rentalContracts)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(rentalContracts.createdAt), desc(rentalContracts.id));
  const itemsByContractId = await loadContractItemsByContractId(
    contractRows.map((contract) => contract.id)
  );

  return contractRows.map((row) => mapContractRow(row, itemsByContractId.get(row.id) ?? []));
}

async function saveRentalContract(input: Record<string, unknown>) {
  const id = optionalNumber(input.id);
  const customer = recordInput(input.customer);
  const seller = recordInput(input.seller);
  const billingPeriod = normalizeBillingPeriod(input.billingPeriod);
  const rentalPeriodCount = periodCountInput(input.rentalPeriodCount);
  const items = arrayInput(input.items).map((item, index) =>
    normalizeContractItem(recordInput(item), index, billingPeriod, rentalPeriodCount)
  );
  const subtotalCents = items.reduce((total, item) => total + item.totalPriceCents, 0);
  const shippingCents = centsInput(input.shippingCents, 6000);
  const discountCents = centsInput(input.discountCents);
  const surchargeCents = centsInput(input.surchargeCents);
  const payload = {
    customerId: numberInput(customer.id),
    customerName: textInput(customer.nome),
    customerDocument: textInput(customer.document),
    customerEmail: textInput(customer.email),
    customerPhone: textInput(customer.whatsapp) || textInput(customer.phone),
    customerAddress: textInput(customer.address),
    customerCity: textInput(customer.city),
    customerState: textInput(customer.state),
    sellerId: numberInput(seller.id),
    sellerName: textInput(seller.nome),
    sellerEmail: textInput(seller.email),
    sellerPhone: textInput(seller.whatsapp) || textInput(seller.phone),
    billingPeriod,
    rentalPeriodCount,
    startDate: textInput(input.startDate),
    endDate: nullableTextInput(input.endDate),
    deliveryAddress: textInput(input.deliveryAddress),
    worksiteAddress: textInput(input.worksiteAddress),
    notes: textInput(input.notes),
    terms: textInput(input.terms),
    subtotalCents,
    shippingCents,
    discountCents,
    surchargeCents,
    totalCents: rentalTotalCents(subtotalCents, shippingCents, discountCents, surchargeCents),
    status: normalizeContractStatus(input.status),
  };

  const saved = await getDb().transaction(async (tx) => {
    const [contract] = id
      ? await tx.update(rentalContracts).set(payload).where(eq(rentalContracts.id, id)).returning()
      : await tx.insert(rentalContracts).values(payload).returning();

    if (!contract) {
      throw httpError(500, 'Não foi possível salvar o contrato.');
    }

    if (id) {
      await tx.delete(rentalContractItems).where(eq(rentalContractItems.contractId, contract.id));
    }

    const savedItems = items.length
      ? await tx
          .insert(rentalContractItems)
          .values(items.map((item) => ({ ...item, contractId: contract.id })))
          .returning()
      : [];

    return { contract, items: savedItems };
  });

  return mapContractRow(saved.contract, saved.items.map(mapContractItemRow));
}

async function listInvoiceCharges(event: HandlerEvent) {
  const status = optionalInvoiceChargeStatus(queryValue(event, 'status'));
  const contractId = optionalNumber(queryValue(event, 'contractId'));
  const filters: SQL[] = [];

  if (status) {
    filters.push(eq(invoicePixCharges.status, status));
  }

  if (contractId) {
    filters.push(eq(invoicePixCharges.contractId, contractId));
  }

  const chargeRows = await getDb()
    .select()
    .from(invoicePixCharges)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(invoicePixCharges.createdAt), desc(invoicePixCharges.id));
  const contractsById = await loadContractsById(chargeRows.map((charge) => charge.contractId));

  return chargeRows.map((row) => mapInvoiceChargeRow(row, contractsById.get(row.contractId)));
}

async function createInvoiceCharge(input: Record<string, unknown>) {
  const contract = await loadRentalContractById(numberInput(input.contractId));
  const company = await getCompanyProfile();
  const dueDate = requiredDateInput(input.dueDate, 'Informe a data de vencimento.');
  const additionalInfo = textInput(input.additionalInfo);
  const pixKey = company.pixKey || company.document || '';

  if (!pixKey) {
    throw httpError(400, 'Cadastre a chave PIX em Dados da Empresa antes de gerar fatura PIX.');
  }

  const pix = await buildInvoicePixCharge({
    contractNumber: contract.contractNumber,
    amountCents: contract.totalCents,
    pixKey,
    receiverName: company.legalName,
    receiverCity: company.city || 'Caruaru',
    description: `FAT ${contract.contractNumber}`,
  });

  const [row] = await getDb()
    .insert(invoicePixCharges)
    .values({
      contractId: contract.id,
      invoiceNumber: `FAT-${contract.contractNumber}`,
      txid: pix.txid,
      brcode: pix.brcode,
      pixKey,
      receiverName: pix.receiverName,
      receiverCity: pix.receiverCity,
      amountCents: contract.totalCents,
      dueDate,
      additionalInfo,
      status: 'pending',
    })
    .returning();

  if (!row) {
    throw httpError(500, 'Não foi possível criar a cobrança PIX.');
  }

  return mapInvoiceChargeRow(row, contract, pix.qrCodeDataUrl);
}

async function confirmInvoiceCharge(id: number, input: Record<string, unknown>) {
  if (!Number.isFinite(id) || id <= 0) {
    throw httpError(400, 'Recebimento inválido.');
  }

  const [charge] = await getDb().select().from(invoicePixCharges).where(eq(invoicePixCharges.id, id));

  if (!charge) {
    throw httpError(404, 'Cobrança PIX não encontrada.');
  }

  let parsedEndToEndId: ReturnType<typeof parsePixReceiptEndToEndId>;

  try {
    parsedEndToEndId = parsePixReceiptEndToEndId(textInput(input.endToEndId));
  } catch (error) {
    throw httpError(400, error instanceof Error ? error.message : 'EndToEndId inválido.');
  }

  const paidAmountCents = centsInput(input.paidAmountCents, charge.amountCents);
  const paidAt = datetimeInput(input.paidAt);
  const knownRows = await getDb()
    .select({ endToEndId: invoicePixCharges.endToEndId })
    .from(invoicePixCharges)
    .where(sql`${invoicePixCharges.endToEndId} <> '' and ${invoicePixCharges.id} <> ${charge.id}`);
  const risk = analyzePixReceiptRisk({
    txid: charge.txid,
    endToEndId: parsedEndToEndId.endToEndId,
    expectedAmountCents: charge.amountCents,
    paidAmountCents,
    paidAt,
    chargeCreatedAt: charge.createdAt,
    payerIspb: parsedEndToEndId.ispb,
    pixKey: charge.pixKey,
    knownEndToEndIds: knownRows.map((row) => row.endToEndId),
    channel: 'manual',
  });
  const nextStatus = invoiceChargeStatusAfterRisk(risk.verdict, charge.amountCents, paidAmountCents);
  const [row] = await getDb()
    .update(invoicePixCharges)
    .set({
      status: nextStatus,
      endToEndId: parsedEndToEndId.endToEndId,
      paidAmountCents,
      paidAt,
      payerIspb: parsedEndToEndId.ispb,
      payerBankName: parsedEndToEndId.bankName,
      payerName: textInput(input.payerName),
      payerDocument: textInput(input.payerDocument),
      riskScore: risk.score,
      riskBand: risk.band,
      riskVerdict: risk.verdict,
      riskSignals: risk.signals,
      riskEvidences: risk.evidences,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(invoicePixCharges.id, id))
    .returning();

  if (!row) {
    throw httpError(500, 'Não foi possível confirmar o recebimento.');
  }

  const contractsById = await loadContractsById([row.contractId]);
  return mapInvoiceChargeRow(row, contractsById.get(row.contractId));
}

async function listRentalQuotes() {
  const quoteRows = await getDb()
    .select()
    .from(rentalQuotes)
    .orderBy(desc(rentalQuotes.createdAt), desc(rentalQuotes.id));
  const itemsByQuoteId = await loadQuoteItemsByQuoteId(quoteRows.map((quote) => quote.id));

  return quoteRows.map((row) => mapQuoteRow(row, itemsByQuoteId.get(row.id) ?? []));
}

async function saveRentalQuote(input: Record<string, unknown>) {
  const id = optionalNumber(input.id);
  const lead = await optionalLeadInput(input.lead);
  const seller = optionalRecordInput(input.seller);
  const billingPeriod = normalizeBillingPeriod(input.billingPeriod);
  const rentalPeriodCount = periodCountInput(input.rentalPeriodCount);
  const items = arrayInput(input.items).map((item, index) =>
    normalizeQuoteItem(recordInput(item), index, billingPeriod, rentalPeriodCount)
  );
  const subtotalCents = items.reduce((total, item) => total + item.totalPriceCents, 0);
  const shippingCents = centsInput(input.shippingCents, 0);
  const discountCents = centsInput(input.discountCents);
  const surchargeCents = centsInput(input.surchargeCents);
  const leadName = textInput(input.leadName) || lead?.nome || '';
  const leadDocument = textInput(input.leadDocument) || lead?.document || '';
  const leadEmail = textInput(input.leadEmail) || lead?.email || '';
  const leadPhone = textInput(input.leadPhone) || lead?.whatsapp || lead?.phone || '';
  const leadAddress = textInput(input.leadAddress) || lead?.address || '';
  const leadCity = textInput(input.leadCity) || lead?.city || '';
  const leadState = textInput(input.leadState) || lead?.state || '';

  if (!leadName) {
    throw httpError(400, 'Informe o nome do interessado ou selecione um lead.');
  }

  if (!lead) {
    await ensureQuotesAllowNoLead();
  }

  const payload = {
    leadId: lead?.id ?? null,
    leadName,
    leadDocument,
    leadEmail,
    leadPhone,
    leadAddress,
    leadCity,
    leadState,
    leadOrigin: normalizeLeadOrigin(lead?.origin),
    leadInterestCategoryId: lead?.interestCategoryId ?? null,
    leadInterestCategoryName: lead?.interestCategoryName ?? '',
    customerId: lead?.customerId ?? null,
    customerName: leadName,
    customerDocument: leadDocument,
    customerEmail: leadEmail,
    customerPhone: leadPhone,
    customerAddress: leadAddress,
    customerCity: leadCity,
    customerState: leadState,
    sellerId: optionalNumber(seller?.id) ?? null,
    sellerName: textInput(seller?.nome),
    sellerEmail: textInput(seller?.email),
    sellerPhone: textInput(seller?.whatsapp) || textInput(seller?.phone),
    billingPeriod,
    rentalPeriodCount,
    startDate: textInput(input.startDate),
    validUntil: nullableTextInput(input.validUntil),
    deliveryAddress: textInput(input.deliveryAddress),
    worksiteAddress: textInput(input.worksiteAddress),
    notes: textInput(input.notes),
    subtotalCents,
    shippingCents,
    discountCents,
    surchargeCents,
    totalCents: rentalTotalCents(subtotalCents, shippingCents, discountCents, surchargeCents),
    status: normalizeQuoteStatus(input.status),
  };

  const saved = await getDb().transaction(async (tx) => {
    const [quote] = id
      ? await tx.update(rentalQuotes).set(payload).where(eq(rentalQuotes.id, id)).returning()
      : await tx.insert(rentalQuotes).values(payload).returning();

    if (!quote) {
      throw httpError(500, 'Não foi possível salvar o orçamento.');
    }

    if (id) {
      await tx.delete(rentalQuoteItems).where(eq(rentalQuoteItems.quoteId, quote.id));
    }

    const savedItems = items.length
      ? await tx
          .insert(rentalQuoteItems)
          .values(items.map((item) => ({ ...item, quoteId: quote.id })))
          .returning()
      : [];

    return { quote, items: savedItems };
  });

  return mapQuoteRow(saved.quote, saved.items.map(mapQuoteItemRow));
}

async function ensureQuotesAllowNoLead() {
  if (quotesWithoutLeadMigrationReady) {
    return;
  }

  await getDb().execute(sql`alter table public.rental_quotes alter column lead_id drop not null`);
  quotesWithoutLeadMigrationReady = true;
}

async function optionalLeadInput(value: unknown): Promise<LeadRow | null> {
  const input = optionalRecordInput(value);

  if (!input) {
    return null;
  }

  const leadId = optionalNumber(input.id);

  if (!leadId) {
    return null;
  }

  const [lead] = await getDb().select().from(leads).where(eq(leads.id, leadId));

  if (!lead) {
    throw httpError(400, 'Lead/interessado inválido.');
  }

  return lead;
}

function quoteCustomerSnapshot(quote: RentalQuoteRow, lead: LeadRow | null) {
  return {
    name: quote.leadName || quote.customerName || lead?.nome || '',
    document: quote.leadDocument || quote.customerDocument || lead?.document || '',
    email: quote.leadEmail || quote.customerEmail || lead?.email || '',
    phone: quote.leadPhone || quote.customerPhone || lead?.whatsapp || lead?.phone || '',
    address: quote.leadAddress || quote.customerAddress || lead?.address || '',
    city: quote.leadCity || quote.customerCity || lead?.city || '',
    state: quote.leadState || quote.customerState || lead?.state || '',
  };
}

async function convertRentalQuoteToContract(id: number) {
  if (!Number.isFinite(id) || id <= 0) {
    throw httpError(400, 'Orçamento inválido.');
  }

  const [quote] = await getDb().select().from(rentalQuotes).where(eq(rentalQuotes.id, id));

  if (!quote) {
    throw httpError(404, 'Orçamento não encontrado.');
  }

  let lead: LeadRow | null = null;

  if (quote.leadId) {
    const [leadRow] = await getDb().select().from(leads).where(eq(leads.id, quote.leadId));

    if (!leadRow) {
      throw httpError(400, 'Lead/interessado não encontrado.');
    }

    lead = leadRow;
  }

  if (!quote.sellerId) {
    throw httpError(400, 'Selecione um vendedor antes de transformar o orçamento em contrato.');
  }

  const quoteItems = await getDb()
    .select()
    .from(rentalQuoteItems)
    .where(eq(rentalQuoteItems.quoteId, quote.id))
    .orderBy(asc(rentalQuoteItems.sortOrder), asc(rentalQuoteItems.id));

  if (!quoteItems.length) {
    throw httpError(400, 'Adicione pelo menos um equipamento antes de transformar o orçamento em contrato.');
  }

  const [profile] = await getDb()
    .select({ contractTerms: companyProfile.contractTerms })
    .from(companyProfile)
    .where(eq(companyProfile.id, 1));
  const endDate = calculateRentalEndDate(
    quote.startDate,
    normalizeBillingPeriod(quote.billingPeriod),
    periodCountInput(quote.rentalPeriodCount)
  );
  const contractNotes = [`Convertido do orçamento ${quote.quoteNumber}.`, quote.notes]
    .filter(Boolean)
    .join('\n');
  const customerSnapshot = quoteCustomerSnapshot(quote, lead);

  if (!customerSnapshot.name) {
    throw httpError(400, 'Informe o interessado antes de transformar o orçamento em contrato.');
  }

  const saved = await getDb().transaction(async (tx) => {
    let customerId = lead?.customerId ?? quote.customerId ?? null;

    if (!customerId) {
      const [customer] = await tx
        .insert(customers)
        .values({
          nome: customerSnapshot.name,
          document: customerSnapshot.document,
          email: customerSnapshot.email,
          phone: customerSnapshot.phone,
          whatsapp: customerSnapshot.phone,
          zipCode: '',
          address: customerSnapshot.address,
          city: customerSnapshot.city,
          state: customerSnapshot.state,
          notes: [
            lead
              ? `Criado automaticamente a partir do lead #${lead.id}.`
              : `Criado automaticamente a partir do orçamento ${quote.quoteNumber}.`,
            lead?.notes,
            quote.notes,
          ]
            .filter(Boolean)
            .join('\n'),
          status: 'active',
        })
        .returning();

      if (!customer) {
        throw httpError(500, 'Não foi possível criar o cliente a partir do orçamento.');
      }

      customerId = customer.id;

      if (lead) {
        await tx.update(leads).set({ customerId }).where(eq(leads.id, lead.id));
      }
    }

    if (!customerId) {
      throw httpError(500, 'Não foi possível definir o cliente do contrato.');
    }

    const [contract] = await tx
      .insert(rentalContracts)
      .values({
        customerId,
        customerName: customerSnapshot.name,
        customerDocument: customerSnapshot.document,
        customerEmail: customerSnapshot.email,
        customerPhone: customerSnapshot.phone,
        customerAddress: customerSnapshot.address,
        customerCity: customerSnapshot.city,
        customerState: customerSnapshot.state,
        sellerId: quote.sellerId,
        sellerName: quote.sellerName,
        sellerEmail: quote.sellerEmail,
        sellerPhone: quote.sellerPhone,
        billingPeriod: normalizeBillingPeriod(quote.billingPeriod),
        rentalPeriodCount: periodCountInput(quote.rentalPeriodCount),
        startDate: quote.startDate,
        endDate: endDate || null,
        deliveryAddress: quote.deliveryAddress,
        worksiteAddress: quote.worksiteAddress,
        notes: contractNotes,
        terms: profile?.contractTerms ?? '',
        subtotalCents: quote.subtotalCents,
        shippingCents: quote.shippingCents,
        discountCents: quote.discountCents,
        surchargeCents: quote.surchargeCents,
        totalCents: quote.totalCents,
        status: 'draft',
      })
      .returning();

    if (!contract) {
      throw httpError(500, 'Não foi possível criar o contrato a partir do orçamento.');
    }

    const savedItems = await tx
      .insert(rentalContractItems)
      .values(
        quoteItems.map((item) => ({
          contractId: contract.id,
          equipmentId: item.equipmentId,
          equipmentName: item.equipmentName,
          quantity: item.quantity,
          billingPeriod: normalizeBillingPeriod(item.billingPeriod),
          unitPriceCents: item.unitPriceCents,
          totalPriceCents: item.totalPriceCents,
          assetValueCents: item.assetValueCents,
          sortOrder: item.sortOrder,
        }))
      )
      .returning();

    await tx.update(rentalQuotes).set({ status: 'approved' }).where(eq(rentalQuotes.id, quote.id));

    return { contract, items: savedItems };
  });

  return mapContractRow(saved.contract, saved.items.map(mapContractItemRow));
}

async function loadCategories(includeArchived: boolean): Promise<CategoryRow[]> {
  return getDb()
    .select()
    .from(categories)
    .where(includeArchived ? undefined : eq(categories.status, 'active'))
    .orderBy(categoryCodeOrderSql(), asc(categories.categoryCode), asc(categories.sortOrder), asc(categories.nome));
}

async function loadRentalContractById(id: number) {
  const [row] = await getDb().select().from(rentalContracts).where(eq(rentalContracts.id, id));

  if (!row) {
    throw httpError(404, 'Contrato não encontrado.');
  }

  const itemsByContractId = await loadContractItemsByContractId([row.id]);
  return mapContractRow(row, itemsByContractId.get(row.id) ?? []);
}

async function loadContractsById(contractIds: number[]): Promise<Map<number, ReturnType<typeof mapContractRow>>> {
  const uniqueIds = [...new Set(contractIds.filter((id) => Number.isFinite(id) && id > 0))];
  const contractsById = new Map<number, ReturnType<typeof mapContractRow>>();

  if (!uniqueIds.length) {
    return contractsById;
  }

  const rows = await getDb()
    .select()
    .from(rentalContracts)
    .where(inArray(rentalContracts.id, uniqueIds));
  const itemsByContractId = await loadContractItemsByContractId(uniqueIds);

  for (const row of rows) {
    contractsById.set(row.id, mapContractRow(row, itemsByContractId.get(row.id) ?? []));
  }

  return contractsById;
}

async function loadCategoryById(id: number): Promise<CategoryRow | null> {
  const [row] = await getDb().select().from(categories).where(eq(categories.id, id));
  return row ?? null;
}

async function loadPricesByEquipmentId(
  equipmentIds: number[]
): Promise<Map<number, ReturnType<typeof mapPriceRow>>> {
  const pricesByEquipmentId = new Map<number, ReturnType<typeof mapPriceRow>>();

  if (!equipmentIds.length) {
    return pricesByEquipmentId;
  }

  const rows = await getDb()
    .select()
    .from(equipmentPrices)
    .where(inArray(equipmentPrices.equipmentId, equipmentIds));

  for (const row of rows) {
    pricesByEquipmentId.set(row.equipmentId, mapPriceRow(row));
  }

  return pricesByEquipmentId;
}

async function loadContractItemsByContractId(
  contractIds: number[]
): Promise<Map<number, ReturnType<typeof mapContractItemRow>[]>> {
  const itemsByContractId = new Map<number, ReturnType<typeof mapContractItemRow>[]>();

  if (!contractIds.length) {
    return itemsByContractId;
  }

  const rows = await getDb()
    .select()
    .from(rentalContractItems)
    .where(inArray(rentalContractItems.contractId, contractIds))
    .orderBy(asc(rentalContractItems.sortOrder), asc(rentalContractItems.id));

  for (const row of rows) {
    const items = itemsByContractId.get(row.contractId) ?? [];
    items.push(mapContractItemRow(row));
    itemsByContractId.set(row.contractId, items);
  }

  return itemsByContractId;
}

async function loadQuoteItemsByQuoteId(
  quoteIds: number[]
): Promise<Map<number, ReturnType<typeof mapQuoteItemRow>[]>> {
  const itemsByQuoteId = new Map<number, ReturnType<typeof mapQuoteItemRow>[]>();

  if (!quoteIds.length) {
    return itemsByQuoteId;
  }

  const rows = await getDb()
    .select()
    .from(rentalQuoteItems)
    .where(inArray(rentalQuoteItems.quoteId, quoteIds))
    .orderBy(asc(rentalQuoteItems.sortOrder), asc(rentalQuoteItems.id));

  for (const row of rows) {
    const items = itemsByQuoteId.get(row.quoteId) ?? [];
    items.push(mapQuoteItemRow(row));
    itemsByQuoteId.set(row.quoteId, items);
  }

  return itemsByQuoteId;
}

async function resolveAvailableEquipmentSlug(slug: string): Promise<string> {
  const baseSlug = slug || 'equipamento';
  const rows = await getDb()
    .select({ slug: equipments.slug })
    .from(equipments)
    .where(like(equipments.slug, `${baseSlug}%`));
  const existingSlugs = new Set(
    rows
      .map((row) => row.slug)
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

function normalizeContractItem(
  item: Record<string, unknown>,
  index: number,
  billingPeriod: RentalBillingPeriod,
  rentalPeriodCount: number
) {
  const quantity = Math.max(1, Math.trunc(Number(item.quantity) || 1));
  const unitPriceCents = centsInput(item.unitPriceCents);

  return {
    equipmentId: numberInput(item.equipmentId),
    equipmentName: textInput(item.equipmentName),
    quantity,
    billingPeriod,
    unitPriceCents,
    totalPriceCents: quantity * unitPriceCents * rentalPeriodCount,
    assetValueCents: centsInput(item.assetValueCents),
    sortOrder: index + 1,
  };
}

function normalizeQuoteItem(
  item: Record<string, unknown>,
  index: number,
  billingPeriod: RentalBillingPeriod,
  rentalPeriodCount: number
) {
  const quantity = Math.max(1, Math.trunc(Number(item.quantity) || 1));
  const unitPriceCents = centsInput(item.unitPriceCents);

  return {
    equipmentId: numberInput(item.equipmentId),
    equipmentName: textInput(item.equipmentName),
    quantity,
    billingPeriod,
    unitPriceCents,
    totalPriceCents: quantity * unitPriceCents * rentalPeriodCount,
    assetValueCents: centsInput(item.assetValueCents),
    sortOrder: index + 1,
  };
}

function rentalTotalCents(
  subtotalCents: number,
  shippingCents: number,
  discountCents: number,
  surchargeCents: number
): number {
  return Math.max(0, subtotalCents + shippingCents - discountCents + surchargeCents);
}

function calculateRentalEndDate(
  startDate: string,
  billingPeriod: RentalBillingPeriod,
  rentalPeriodCount: number
): string {
  if (!startDate) {
    return '';
  }

  const [year, month, day] = startDate.split('-').map(Number);

  if (!year || !month || !day) {
    return '';
  }

  const date = new Date(year, month - 1, day);
  const periodCount = periodCountInput(rentalPeriodCount);

  if (billingPeriod === 'monthly') {
    return addMonths(date, periodCount);
  }

  const daysByPeriod: Record<Exclude<RentalBillingPeriod, 'monthly'>, number> = {
    daily: 1,
    weekly: 7,
    fortnightly: 15,
  };
  date.setDate(date.getDate() + daysByPeriod[billingPeriod] * periodCount);

  return dateInputValue(date);
}

function addMonths(date: Date, months: number): string {
  const targetYear = date.getFullYear();
  const targetMonth = date.getMonth() + months;
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const result = new Date(targetYear, targetMonth, Math.min(date.getDate(), daysInTargetMonth));

  return dateInputValue(result);
}

function dateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function categoryCodeOrderSql(): SQL {
  return sql`coalesce(nullif(regexp_replace(${categories.categoryCode}, '\\D', '', 'g'), '')::integer, 2147483647)`;
}

function mapCategoryRow(row: CategoryRow) {
  return {
    id: row.id,
    codigo: row.categoryCode || String(row.id),
    nome: row.nome,
    slug: row.slug,
    name: row.name,
    icone: row.icone,
    avatar: row.avatar,
    avatarHero: row.avatarHero ?? undefined,
    avatarCard: row.avatarCard ?? undefined,
    video: row.video ?? undefined,
    objetivo: row.objetivo,
    status: row.status,
    sortOrder: row.sortOrder,
  };
}

function mapEquipmentRow(
  row: EquipmentRow,
  category?: CategoryRow,
  prices?: ReturnType<typeof mapPriceRow>
) {
  if (!category) {
    return null;
  }

  const mappedCategory = mapCategoryRow(category);

  return {
    id: row.id,
    nome: row.nome,
    nomeTecnico: row.technicalName,
    slug: row.slug,
    avatar: row.avatar ?? undefined,
    video: row.video ?? undefined,
    descricao: row.descricao,
    aplicacao: row.aplicacao,
    tipoDeServico: row.tipoDeServico,
    periodoDeLocacao: row.periodoDeLocacao,
    diferenciais: row.diferenciais,
    equipamentoCategoria: mappedCategory,
    precos: prices ?? emptyEquipmentPrices(),
    codigo: row.equipmentCode,
    codigoInterno: formatInternalCode(mappedCategory.codigo, row.equipmentCode),
    assetValueCents: row.assetValueCents,
    totalInvestedCents: row.totalInvestedCents,
    notes: row.notes,
    stockQuantity: row.stockQuantity,
    status: row.status,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapPriceRow(row: EquipmentPriceRow) {
  return {
    dailyPriceCents: row.dailyPriceCents,
    weeklyPriceCents: row.weeklyPriceCents,
    fortnightlyPriceCents: row.fortnightlyPriceCents,
    monthlyPriceCents: row.monthlyPriceCents,
    currency: row.currency,
  };
}

function mapCustomerRow(row: CustomerRow) {
  return {
    id: row.id,
    nome: row.nome,
    document: row.document || undefined,
    email: row.email || undefined,
    phone: row.phone || undefined,
    whatsapp: row.whatsapp || undefined,
    zipCode: row.zipCode || undefined,
    address: row.address || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
    notes: row.notes || undefined,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapLeadRow(row: LeadRow) {
  return {
    id: row.id,
    nome: row.nome,
    document: row.document || undefined,
    email: row.email || undefined,
    phone: row.phone || undefined,
    whatsapp: row.whatsapp || undefined,
    zipCode: row.zipCode || undefined,
    address: row.address || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
    origin: normalizeLeadOrigin(row.origin),
    interestCategoryId: row.interestCategoryId ?? undefined,
    interestCategoryName: row.interestCategoryName || undefined,
    notes: row.notes || undefined,
    customerId: row.customerId ?? undefined,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapStaffUserRow(row: StaffUserRow) {
  return {
    id: row.id,
    authUserId: row.authUserId ?? undefined,
    nome: row.nome,
    role: normalizeStaffUserRole(row.role),
    document: row.document || undefined,
    email: row.email || undefined,
    phone: row.phone || undefined,
    whatsapp: row.whatsapp || undefined,
    address: row.address || undefined,
    notes: row.notes || undefined,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapCompanyProfileRow(row: CompanyProfileRow) {
  return {
    id: row.id,
    legalName: row.legalName,
    tradeName: row.tradeName || undefined,
    document: row.document || undefined,
    pixKey: row.pixKey || undefined,
    email: row.email || undefined,
    gmailPassword: row.gmailPassword || undefined,
    phone: row.phone || undefined,
    whatsapp: row.whatsapp || undefined,
    address: row.address || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
    zipCode: row.zipCode || undefined,
    instagramLogin: row.instagramLogin || undefined,
    instagramPassword: row.instagramPassword || undefined,
    contractTerms: row.contractTerms || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapContractRow(row: RentalContractRow, items: ReturnType<typeof mapContractItemRow>[]) {
  return {
    id: row.id,
    contractNumber: row.contractNumber,
    previousContractNumber: row.previousContractNumber || undefined,
    customerId: row.customerId,
    customerName: row.customerName,
    customerDocument: row.customerDocument || undefined,
    customerEmail: row.customerEmail || undefined,
    customerPhone: row.customerPhone || undefined,
    customerAddress: row.customerAddress || undefined,
    customerCity: row.customerCity || undefined,
    customerState: row.customerState || undefined,
    sellerId: row.sellerId ?? undefined,
    sellerName: row.sellerName || undefined,
    sellerEmail: row.sellerEmail || undefined,
    sellerPhone: row.sellerPhone || undefined,
    billingPeriod: normalizeBillingPeriod(row.billingPeriod),
    rentalPeriodCount: periodCountInput(row.rentalPeriodCount),
    startDate: row.startDate,
    endDate: row.endDate ?? undefined,
    deliveryAddress: row.deliveryAddress || undefined,
    worksiteAddress: row.worksiteAddress || undefined,
    notes: row.notes || undefined,
    terms: row.terms || undefined,
    subtotalCents: row.subtotalCents,
    shippingCents: row.shippingCents,
    discountCents: row.discountCents,
    surchargeCents: row.surchargeCents,
    totalCents: row.totalCents,
    status: normalizeContractStatus(row.status),
    items,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapContractItemRow(row: RentalContractItemRow) {
  return {
    id: row.id,
    contractId: row.contractId,
    equipmentId: row.equipmentId,
    equipmentName: row.equipmentName,
    quantity: row.quantity,
    billingPeriod: normalizeBillingPeriod(row.billingPeriod),
    unitPriceCents: row.unitPriceCents,
    totalPriceCents: row.totalPriceCents,
    assetValueCents: row.assetValueCents,
    sortOrder: row.sortOrder,
  };
}

function mapInvoiceChargeRow(
  row: InvoicePixChargeRow,
  contract?: ReturnType<typeof mapContractRow>,
  qrCodeDataUrl?: string
) {
  return {
    id: row.id,
    contractId: row.contractId,
    contractNumber: contract?.contractNumber,
    invoiceNumber: row.invoiceNumber,
    txid: row.txid,
    brcode: row.brcode,
    qrCodeDataUrl,
    pixKey: row.pixKey,
    receiverName: row.receiverName,
    receiverCity: row.receiverCity,
    amountCents: row.amountCents,
    dueDate: row.dueDate,
    additionalInfo: row.additionalInfo || undefined,
    status: normalizeInvoiceChargeStatus(row.status),
    endToEndId: row.endToEndId || undefined,
    paidAmountCents: row.paidAmountCents,
    paidAt: row.paidAt ?? undefined,
    payerIspb: row.payerIspb || undefined,
    payerBankName: row.payerBankName || undefined,
    payerName: row.payerName || undefined,
    payerDocument: row.payerDocument || undefined,
    riskScore: row.riskScore,
    riskBand: row.riskBand || undefined,
    riskVerdict: row.riskVerdict || undefined,
    riskSignals: row.riskSignals,
    riskEvidences: row.riskEvidences,
    customerName: contract?.customerName,
    customerDocument: contract?.customerDocument,
    customerPhone: contract?.customerPhone,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapQuoteRow(row: RentalQuoteRow, items: ReturnType<typeof mapQuoteItemRow>[]) {
  return {
    id: row.id,
    quoteNumber: row.quoteNumber,
    leadId: row.leadId ?? undefined,
    leadName: row.leadName || row.customerName,
    leadDocument: row.leadDocument || row.customerDocument || undefined,
    leadEmail: row.leadEmail || row.customerEmail || undefined,
    leadPhone: row.leadPhone || row.customerPhone || undefined,
    leadAddress: row.leadAddress || row.customerAddress || undefined,
    leadCity: row.leadCity || row.customerCity || undefined,
    leadState: row.leadState || row.customerState || undefined,
    leadOrigin: normalizeLeadOrigin(row.leadOrigin),
    leadInterestCategoryId: row.leadInterestCategoryId ?? undefined,
    leadInterestCategoryName: row.leadInterestCategoryName || undefined,
    customerId: row.customerId ?? undefined,
    customerName: row.customerName,
    customerDocument: row.customerDocument || undefined,
    customerEmail: row.customerEmail || undefined,
    customerPhone: row.customerPhone || undefined,
    customerAddress: row.customerAddress || undefined,
    customerCity: row.customerCity || undefined,
    customerState: row.customerState || undefined,
    sellerId: row.sellerId ?? undefined,
    sellerName: row.sellerName || undefined,
    sellerEmail: row.sellerEmail || undefined,
    sellerPhone: row.sellerPhone || undefined,
    billingPeriod: normalizeBillingPeriod(row.billingPeriod),
    rentalPeriodCount: periodCountInput(row.rentalPeriodCount),
    startDate: row.startDate,
    validUntil: row.validUntil ?? undefined,
    deliveryAddress: row.deliveryAddress || undefined,
    worksiteAddress: row.worksiteAddress || undefined,
    notes: row.notes || undefined,
    subtotalCents: row.subtotalCents,
    shippingCents: row.shippingCents,
    discountCents: row.discountCents,
    surchargeCents: row.surchargeCents,
    totalCents: row.totalCents,
    status: normalizeQuoteStatus(row.status),
    items,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapQuoteItemRow(row: RentalQuoteItemRow) {
  return {
    id: row.id,
    quoteId: row.quoteId,
    equipmentId: row.equipmentId,
    equipmentName: row.equipmentName,
    quantity: row.quantity,
    billingPeriod: normalizeBillingPeriod(row.billingPeriod),
    unitPriceCents: row.unitPriceCents,
    totalPriceCents: row.totalPriceCents,
    assetValueCents: row.assetValueCents,
    sortOrder: row.sortOrder,
  };
}

async function readJson(event: HandlerEvent): Promise<Record<string, unknown>> {
  if (!event.body) {
    return {};
  }

  try {
    return JSON.parse(event.body) as Record<string, unknown>;
  } catch {
    throw httpError(400, 'JSON inválido.');
  }
}

function requireMethod(event: HandlerEvent, method: string, handler: () => Promise<ResponseShape>) {
  if (event.httpMethod !== method) {
    return Promise.resolve(json({ error: 'Método não suportado.' }, 405));
  }

  return handler();
}

type ResponseShape = ReturnType<typeof json>;

function json(body: unknown, statusCode = 200) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  };
}

function errorResponse(error: unknown) {
  const statusCode = typeof error === 'object' && error && 'statusCode' in error
    ? Number((error as { statusCode: unknown }).statusCode) || 500
    : 500;
  const message = error instanceof Error ? error.message : 'Erro inesperado.';
  console.error('gestor-api error', error);
  return json({ error: message }, statusCode);
}

function httpError(statusCode: number, message: string) {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

function queryValue(event: HandlerEvent, key: string): string {
  return event.queryStringParameters?.[key]?.trim() ?? '';
}

function booleanQuery(event: HandlerEvent, key: string): boolean {
  return ['1', 'true', 'yes'].includes(queryValue(event, key).toLowerCase());
}

function dateQueryValue(event: HandlerEvent, key: string): string {
  const value = queryValue(event, key);

  if (!value) {
    return '';
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw httpError(400, `Parâmetro ${key} inválido.`);
  }

  return value;
}

function requiredDateInput(value: unknown, message: string): string {
  const normalized = textInput(value);

  if (!normalized) {
    throw httpError(400, message);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw httpError(400, 'Data inválida.');
  }

  return normalized;
}

function datetimeInput(value: unknown): string {
  const normalized = textInput(value);
  const date = normalized ? new Date(normalized) : new Date();

  if (Number.isNaN(date.getTime())) {
    throw httpError(400, 'Data/hora de pagamento inválida.');
  }

  return date.toISOString();
}

function contractDateModeQuery(event: HandlerEvent): 'overlap' | 'start' | 'end' {
  const value = queryValue(event, 'dateMode');

  if (!value) {
    return 'overlap';
  }

  if (value === 'overlap' || value === 'start' || value === 'end') {
    return value;
  }

  throw httpError(400, 'Parâmetro dateMode inválido.');
}

function textInput(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function nullableTextInput(value: unknown): string | null {
  const normalized = textInput(value);
  return normalized || null;
}

function numberInput(value: unknown, fallback?: number): number {
  const numberValue = Number(value);

  if (Number.isFinite(numberValue)) {
    return Math.trunc(numberValue);
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw httpError(400, 'Número inválido.');
}

function optionalNumber(value: unknown): number | undefined {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? Math.trunc(numberValue) : undefined;
}

function centsInput(value: unknown, fallback = 0): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.max(0, Math.round(numberValue)) : fallback;
}

function periodCountInput(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.max(1, Math.trunc(numberValue)) : 1;
}

function stockInput(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.max(0, Math.trunc(numberValue)) : 0;
}

function recordInput(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  throw httpError(400, 'Objeto inválido.');
}

function optionalRecordInput(value: unknown): Record<string, unknown> | null {
  if (value === undefined || value === null) {
    return null;
  }

  return recordInput(value);
}

function arrayInput(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function priceInput(value: unknown) {
  const price = recordInput(value);

  return {
    dailyPriceCents: centsInput(price.dailyPriceCents),
    weeklyPriceCents: centsInput(price.weeklyPriceCents),
    fortnightlyPriceCents: centsInput(price.fortnightlyPriceCents),
    monthlyPriceCents: centsInput(price.monthlyPriceCents),
    currency: 'BRL' as const,
  };
}

function normalizeCatalogStatus(value: unknown): CatalogStatus {
  return value === 'archived' ? 'archived' : 'active';
}

function normalizeStaffUserRole(value: unknown): StaffUserRole {
  return value === 'admin' || value === 'operador' || value === 'financeiro'
    ? value
    : 'vendedor';
}

function normalizeLeadOrigin(value: unknown): LeadOrigin {
  const normalized = textInput(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  switch (normalized) {
    case 'indicacao':
    case 'google':
    case 'instagram':
    case 'facebook':
    case 'visita_comercial':
    case 'ligacao_comercial':
    case 'cliente':
    case 'loja':
    case 'whatsapp':
      return normalized;
    default:
      return 'whatsapp';
  }
}

function normalizeBillingPeriod(value: unknown): RentalBillingPeriod {
  return value === 'weekly' || value === 'fortnightly' || value === 'monthly' ? value : 'daily';
}

function normalizeContractStatus(value: unknown): RentalContractStatus {
  if (value === 'active' || value === 'closed' || value === 'returned' || value === 'cancelled') {
    return value;
  }

  return 'draft';
}

function normalizeInvoiceChargeStatus(value: unknown): InvoicePixChargeStatus {
  if (
    value === 'paid' ||
    value === 'review' ||
    value === 'rejected' ||
    value === 'cancelled'
  ) {
    return value;
  }

  return 'pending';
}

function optionalInvoiceChargeStatus(value: unknown): InvoicePixChargeStatus | null {
  const normalized = textInput(value);

  if (!normalized || normalized === 'all') {
    return null;
  }

  return normalizeInvoiceChargeStatus(normalized);
}

function invoiceChargeStatusAfterRisk(
  verdict: 'approved' | 'review' | 'rejected',
  expectedAmountCents: number,
  paidAmountCents: number
): InvoicePixChargeStatus {
  if (verdict === 'rejected') {
    return 'rejected';
  }

  if (verdict === 'review' || expectedAmountCents !== paidAmountCents) {
    return 'review';
  }

  return 'paid';
}

function normalizeQuoteStatus(value: unknown): RentalQuoteStatus {
  if (value === 'sent' || value === 'approved' || value === 'rejected' || value === 'expired') {
    return value;
  }

  return 'draft';
}

async function ensureInvoicePixChargesTable() {
  if (invoicePixChargesMigrationReady) {
    return;
  }

  await getDb().execute(sql`
    create table if not exists public.invoice_pix_charges (
      id integer generated by default as identity primary key,
      contract_id integer not null references public.rental_contracts(id) on delete cascade on update cascade,
      invoice_number text not null,
      txid text not null,
      brcode text not null,
      pix_key text not null,
      receiver_name text not null default '',
      receiver_city text not null default '',
      amount_cents integer not null default 0 check (amount_cents >= 0),
      due_date date not null,
      additional_info text not null default '',
      status text not null default 'pending' check (status in ('pending', 'paid', 'review', 'rejected', 'cancelled')),
      end_to_end_id text not null default '',
      paid_amount_cents integer not null default 0 check (paid_amount_cents >= 0),
      paid_at timestamptz,
      payer_ispb text not null default '',
      payer_bank_name text not null default '',
      payer_name text not null default '',
      payer_document text not null default '',
      risk_score integer not null default 0 check (risk_score >= 0),
      risk_band text not null default 'low',
      risk_verdict text not null default 'approved',
      risk_signals jsonb not null default '[]'::jsonb,
      risk_evidences jsonb not null default '[]'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await getDb().execute(sql`
    create unique index if not exists invoice_pix_charges_txid_key
      on public.invoice_pix_charges(txid)
  `);
  await getDb().execute(sql`
    create unique index if not exists invoice_pix_charges_end_to_end_id_key
      on public.invoice_pix_charges(end_to_end_id)
      where end_to_end_id <> ''
  `);
  await getDb().execute(sql`
    create index if not exists invoice_pix_charges_contract_id_idx
      on public.invoice_pix_charges(contract_id)
  `);
  await getDb().execute(sql`
    create index if not exists invoice_pix_charges_status_idx
      on public.invoice_pix_charges(status)
  `);
  await getDb().execute(sql`
    create index if not exists invoice_pix_charges_due_date_idx
      on public.invoice_pix_charges(due_date)
  `);

  invoicePixChargesMigrationReady = true;
}

function emptyEquipmentPrices() {
  return {
    dailyPriceCents: 0,
    weeklyPriceCents: 0,
    fortnightlyPriceCents: 0,
    monthlyPriceCents: 0,
    currency: 'BRL' as const,
  };
}

function formatInternalCode(categoryCode?: string, equipmentCode?: string): string {
  const normalizedCategoryCode = categoryCode?.trim() ?? '';
  const normalizedEquipmentCode = equipmentCode?.trim() ?? '';

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

function parseInternalCodeSearch(value: string): { categoryCode: string; equipmentCode?: string } | null {
  const match = value.trim().match(/^(\d+)(?:[.\s-]+(\d+))?/);

  if (!match) {
    return null;
  }

  const categoryCode = match[1];
  const equipmentCode = match[2] ? normalizeEquipmentCode(match[2]) : undefined;

  return { categoryCode, equipmentCode };
}

function normalizeEquipmentCode(value: string): string {
  const digits = value.replace(/\D/g, '');

  if (!digits) {
    return value.trim();
  }

  return digits.padStart(3, '0');
}
