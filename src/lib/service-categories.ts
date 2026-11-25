import type { TFunction } from 'i18next';

import type { ServiceCategoryOptionDto } from '@/api/types';

export const DEFAULT_SERVICE_CATEGORIES: ServiceCategoryOptionDto[] = [
  { code: 'airConditioning', nameEn: 'Air Conditioning', nameAr: 'التكييف', sortOrder: 1 },
  { code: 'plumbing', nameEn: 'Plumbing', nameAr: 'السباكة', sortOrder: 2 },
  { code: 'electrical', nameEn: 'Electrical', nameAr: 'الكهرباء', sortOrder: 3 },
  { code: 'appliance', nameEn: 'Appliances', nameAr: 'الأجهزة', sortOrder: 4 },
  { code: 'carpentry', nameEn: 'Doors & Carpentry', nameAr: 'الأبواب والنجارة', sortOrder: 5 },
  { code: 'pestControl', nameEn: 'Pest Control', nameAr: 'مكافحة الحشرات', sortOrder: 6 },
  { code: 'cleaning', nameEn: 'Cleaning', nameAr: 'التنظيف', sortOrder: 7 },
  { code: 'other', nameEn: 'Other', nameAr: 'أخرى', sortOrder: 8 },
];

export function normalizeCategoryName(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

const SEEDED_ORIGINAL_NAME_BY_CODE = new Map(
  DEFAULT_SERVICE_CATEGORIES.map((c) => [c.code, normalizeCategoryName(c.nameEn)]),
);

/**
 * How a category name is shown everywhere on the phone:
 * - Use t('maint.category.<code>') only while the category's NameEn still equals
 *   the original English name for that code (from DEFAULT_SERVICE_CATEGORIES, ignoring case and spaces).
 * - Otherwise show NameAr when the language is Arabic and NameAr is filled in, and NameEn in every other case.
 */
export function formatServiceCategoryLabel(
  cat: Pick<ServiceCategoryOptionDto, 'code' | 'nameEn' | 'nameAr'>,
  t: TFunction,
  language: string,
): string {
  const originalName = SEEDED_ORIGINAL_NAME_BY_CODE.get(cat.code);
  if (originalName && normalizeCategoryName(cat.nameEn || '') === originalName) {
    return t(`maint.category.${cat.code}`);
  }
  const isArabic = language === 'arabic' || language.startsWith('ar');
  if (isArabic && cat.nameAr && cat.nameAr.trim()) {
    return cat.nameAr;
  }
  return cat.nameEn;
}

/**
 * Finds a category in the loaded list by NameEn (ignoring case and spaces), Code, or NameAr.
 */
export function findServiceCategory(
  rawCategory: string | undefined | null,
  categories: readonly ServiceCategoryOptionDto[] = DEFAULT_SERVICE_CATEGORIES,
): ServiceCategoryOptionDto | undefined {
  const trimmed = (rawCategory ?? '').trim();
  if (!trimmed) return undefined;
  const list = categories.length > 0 ? categories : DEFAULT_SERVICE_CATEGORIES;
  const norm = normalizeCategoryName(trimmed);
  return (
    list.find((c) => normalizeCategoryName(c.nameEn) === norm) ??
    list.find((c) => c.code === trimmed) ??
    list.find((c) => Boolean(c.nameAr && c.nameAr.trim() === trimmed))
  );
}

/**
 * Formats a ticket's stored category text:
 * - If found in the category list, formats it with formatServiceCategoryLabel.
 * - Otherwise returns the raw category text as it was typed (e.g. an old "HVAC" ticket).
 */
export function formatTicketCategory(
  rawCategory: string | undefined | null,
  categories: readonly ServiceCategoryOptionDto[],
  t: TFunction,
  language: string,
): string {
  const trimmed = (rawCategory ?? '').trim();
  if (!trimmed) return '';
  const match = findServiceCategory(trimmed, categories);
  if (match) {
    return formatServiceCategoryLabel(match, t, language);
  }
  return trimmed;
}
