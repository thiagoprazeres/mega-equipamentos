export function matchesSearchQuery(
  rawQuery: string,
  values: Array<string | number | null | undefined>
): boolean {
  const query = normalizeSearchText(rawQuery);

  if (!query) {
    return true;
  }

  const compactQuery = compactSearchText(rawQuery);

  return values.some((value) => {
    const normalizedValue = normalizeSearchText(value);

    if (normalizedValue.includes(query)) {
      return true;
    }

    return Boolean(compactQuery && compactSearchText(value).includes(compactQuery));
  });
}

export function normalizeSearchText(value: string | number | null | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function compactSearchText(value: string | number | null | undefined): string {
  return normalizeSearchText(value).replace(/[^a-z0-9]/g, '');
}
