import { describe, expect, it } from '@jest/globals';
import type { TFunction } from 'i18next';

import {
  DEFAULT_SERVICE_CATEGORIES,
  formatServiceCategoryLabel,
  formatTicketCategory,
} from './service-categories';

describe('service-categories helper', () => {
  const fakeT = ((key: string) => `i18n:${key}`) as unknown as TFunction;

  it('uses the existing translation key for the eight seeded codes while NameEn is unchanged', () => {
    for (const cat of DEFAULT_SERVICE_CATEGORIES) {
      expect(formatServiceCategoryLabel(cat, fakeT, 'en')).toBe(`i18n:maint.category.${cat.code}`);
      expect(formatServiceCategoryLabel(cat, fakeT, 'ar')).toBe(`i18n:maint.category.${cat.code}`);
      expect(formatServiceCategoryLabel(cat, fakeT, 'fr')).toBe(`i18n:maint.category.${cat.code}`);
    }
    const spaced = { code: 'cleaning', nameEn: '  cleaning ', nameAr: 'التنظيف' };
    expect(formatServiceCategoryLabel(spaced, fakeT, 'en')).toBe('i18n:maint.category.cleaning');
  });

  it('shows the new NameEn (or NameAr in Arabic) when a seeded category is renamed', () => {
    const renamed = { code: 'cleaning', nameEn: 'Housekeeping', nameAr: 'تدبير منزلي' };
    expect(formatServiceCategoryLabel(renamed, fakeT, 'en')).toBe('Housekeeping');
    expect(formatServiceCategoryLabel(renamed, fakeT, 'fr')).toBe('Housekeeping');
    expect(formatServiceCategoryLabel(renamed, fakeT, 'ar')).toBe('تدبير منزلي');
  });

  it('uses NameAr in Arabic and NameEn in other languages for custom categories', () => {
    const custom = { code: 'landscaping', nameEn: 'Landscaping', nameAr: 'تنسيق الحدائق' };
    expect(formatServiceCategoryLabel(custom, fakeT, 'ar')).toBe('تنسيق الحدائق');
    expect(formatServiceCategoryLabel(custom, fakeT, 'en')).toBe('Landscaping');
    expect(formatServiceCategoryLabel(custom, fakeT, 'fr')).toBe('Landscaping');
  });

  it('formats categories found in the list and keeps unknown ticket categories as typed', () => {
    const list = [
      ...DEFAULT_SERVICE_CATEGORIES.filter((c) => c.code !== 'cleaning'),
      { code: 'cleaning', nameEn: 'Housekeeping', nameAr: 'تدبير منزلي' },
      { code: 'landscaping', nameEn: 'Landscaping', nameAr: 'تنسيق الحدائق' },
    ];
    expect(formatTicketCategory('Plumbing', list, fakeT, 'fr')).toBe('i18n:maint.category.plumbing');
    expect(formatTicketCategory('Housekeeping', list, fakeT, 'en')).toBe('Housekeeping');
    expect(formatTicketCategory('Housekeeping', list, fakeT, 'ar')).toBe('تدبير منزلي');
    expect(formatTicketCategory('Landscaping', list, fakeT, 'ar')).toBe('تنسيق الحدائق');
    expect(formatTicketCategory('HVAC', list, fakeT, 'en')).toBe('HVAC');
    expect(formatTicketCategory('HVAC', list, fakeT, 'ar')).toBe('HVAC');
  });
});
