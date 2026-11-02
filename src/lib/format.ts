import { omanToday } from '@/mock/clock';

// Latin digits in every language, as the PMS website and Omani invoices use them. English
// takes the British order, day before month, as dates are written in Oman ("01 Nov 2026").
const locale = (code: string) => `${code === 'en' ? 'en-GB' : code}-u-nu-latn`;

const numberFormats = new Map<string, Intl.NumberFormat>();

function numberFormat(code: string, decimals: number) {
  const key = `${code}:${decimals}`;
  let f = numberFormats.get(key);
  if (!f) {
    const options = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
    try {
      f = new Intl.NumberFormat(locale(code), options);
    } catch {
      f = new Intl.NumberFormat('en', options);
    }
    numberFormats.set(key, f);
  }
  return f;
}

const THREE_DECIMAL_CURRENCIES = new Set(['OMR', 'BHD', 'KWD', 'JOD', 'TND', 'LYD']);
const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'VND']);
let activeCurrencyCode = 'OMR';

/** Sets the company currency read from GET /api/Auth/me (defaulting to OMR). */
export const setCurrencyCode = (currency?: string | null) => {
  activeCurrencyCode = currency?.trim().toUpperCase() || 'OMR';
};

export const getCurrencyCode = () => activeCurrencyCode;

export const currencyDecimals = (currency = activeCurrencyCode) =>
  THREE_DECIMAL_CURRENCIES.has(currency) ? 3 : ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2;

/**
 * An amount in the company's currency (OMR by default). A whole number drops the minor units,
 * as the design shows rent ("OMR 450"); `exact` keeps all decimals ("OMR 0.000").
 */
export const omr = (value: number, code: string, exact = false, currency = activeCurrencyCode) => {
  const ccy = currency?.trim().toUpperCase() || activeCurrencyCode || 'OMR';
  const decimals = exact || !Number.isInteger(value) ? currencyDecimals(ccy) : 0;
  return `${ccy} ${numberFormat(code, decimals).format(value)}`;
};

/** A plain count or reading, such as 120 or 1,450. */
export const num = (value: number, code: string) => numberFormat(code, 0).format(value);

function dateFormat(code: string, options: Intl.DateTimeFormatOptions) {
  try {
    return new Intl.DateTimeFormat(locale(code), { timeZone: 'UTC', ...options });
  } catch {
    return new Intl.DateTimeFormat('en', { timeZone: 'UTC', ...options });
  }
}

const asDate = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00Z`);

/** yyyy-mm-dd as "01 Nov 2026". */
export const longDate = (value: string, code: string) =>
  dateFormat(code, { day: '2-digit', month: 'short', year: 'numeric' }).format(asDate(value));

/** yyyy-mm-dd as "15 Nov". */
export const shortDate = (value: string, code: string) => dateFormat(code, { day: 'numeric', month: 'short' }).format(asDate(value));

/** yyyy-mm-dd as "Nov". */
export const monthName = (value: string, code: string) => dateFormat(code, { month: 'short' }).format(asDate(value));

/** yyyy-mm-dd as "November 2026". */
export const monthYear = (value: string, code: string) => dateFormat(code, { month: 'long', year: 'numeric' }).format(asDate(value));

/** yyyy-mm-dd as "Sun". */
export const weekday = (value: string, code: string) => dateFormat(code, { weekday: 'short' }).format(asDate(value));

/** Days from today (Oman) to a yyyy-mm-dd date; negative once it has passed. */
export const daysUntil = (value: string) => Math.round((asDate(value).getTime() - asDate(omanToday()).getTime()) / 86_400_000);

/** "Ahmed Al Lawati" as "AA"; a bracketed note such as "Ahmed (HVAC)" is not part of the name. */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => w && !/^[([{"'«]/.test(w))
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/**
 * Text that always reads left to right, such as a phone number, kept whole inside a
 * right-to-left line; otherwise Arabic reorders "+968 9123 4567" into "4567 9123 968+".
 */
export const ltr = (text: string) => `\u2066${text}\u2069`;
