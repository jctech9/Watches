/**
 * Utilitários para o aplicativo Watches
 */

export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(value) {
  if (!value) {
    return "Não informado";
  }

  const normalized = String(value).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
    return normalized;
  }

  const [year, month, day] = normalized.split("-");
  if (!year || !month || !day) {
    return normalized;
  }

  return `${day}/${month}/${year}`;
}

export function toIsoDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  let normalized = raw;
  if (/^\d{8}$/.test(normalized)) {
    normalized = `${normalized.slice(0, 2)}/${normalized.slice(2, 4)}/${normalized.slice(4)}`;
  }

  const match = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return "";
  }

  const [, dayStr, monthStr, yearStr] = match;
  const day = Number(dayStr);
  const month = Number(monthStr);
  const year = Number(yearStr);

  if (year < 1900 || year > 2100) {
    return "";
  }

  const candidate = new Date(year, month - 1, day);
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return "";
  }

  return `${yearStr}-${monthStr}-${dayStr}`;
}

export function toDisplayDate(value) {
  const iso = toIsoDate(value);
  if (!iso) {
    return "";
  }

  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function applyDateMask(input) {
  const digits = String(input.value ?? "").replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  let masked = day;
  if (month) {
    masked += `/${month}`;
  }
  if (year) {
    masked += `/${year}`;
  }

  input.value = masked;
}

export function formatCurrencyInput(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "";
  }

  const safeAmount = Math.max(0, amount);
  const centsValue = Math.round(safeAmount * 100);
  const integerPart = Math.floor(centsValue / 100);
  const decimalPart = String(centsValue % 100).padStart(2, "0");
  const integerLabel = String(integerPart).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${integerLabel},${decimalPart}`;
}

export function applyCurrencyMask(input) {
  const digits = String(input.value ?? "").replace(/\D/g, "");
  if (!digits) {
    input.value = "";
    return;
  }

  const cents = digits.slice(-2).padStart(2, "0");
  const integerRaw = digits.length > 2 ? digits.slice(0, -2) : "0";
  const integerPart = String(Number(integerRaw)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  input.value = `${integerPart},${cents}`;
}

export function parseCurrencyInput(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return Number.NaN;
  }

  const normalized = raw.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return Number.NaN;
  }

  return Number(parsed.toFixed(2));
}

export function parsePrecisionInput(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  const normalized = raw.replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return Number.NaN;
  }

  return Number(parsed.toFixed(2));
}

export function formatPrecisionInput(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  const safeValue = Number.isInteger(numericValue) ? numericValue : Number(numericValue.toFixed(2));
  return safeValue > 0 ? `+${safeValue}` : String(safeValue);
}

export function escapeHtml(value) {
  const text = String(value ?? "");
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatBatteryEstimateLabel(batteryDuration) {
  const value = String(batteryDuration ?? "").trim();
  if (!value) {
    return "Não informado";
  }

  const numericValue = Number(value.replace(",", "."));
  if (Number.isFinite(numericValue) && numericValue >= 0) {
    const safeValue = Number.isInteger(numericValue) ? numericValue : Number(numericValue.toFixed(1));
    return `${safeValue} ${pluralize(safeValue, "ano", "anos")}`;
  }

  return value;
}

export function formatPrecisionLabel(precision) {
  if (precision === null || precision === undefined || precision === "") {
    return "Não informado";
  }

  const numericValue = Number(precision);
  if (!Number.isFinite(numericValue)) {
    return String(precision);
  }

  const safeValue = Number.isInteger(numericValue) ? numericValue : Number(numericValue.toFixed(2));
  return `+-${Math.abs(safeValue)} s/mês`;
}

export function parseBatteryDurationToMonths(batteryDuration) {
  const value = String(batteryDuration ?? "").trim();
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase().replace(",", ".");
  const amountMatch = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!amountMatch) {
    return null;
  }

  const amount = Number(amountMatch[1]);
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  const asMonths = /(mes|mês|meses|month|months)/.test(normalized);
  const durationInMonths = asMonths ? amount : amount * 12;
  return Math.round(durationInMonths);
}

export function pluralize(value, singular, plural) {
  return value === 1 ? singular : plural;
}

export function formatAgeLabel(years, months) {
  return `${years} ${pluralize(years, "ano", "anos")} e ${months} ${pluralize(months, "mês", "meses")}`;
}

export function calculateElapsedFromDates(startDate, endDate) {
  let years = endDate.getFullYear() - startDate.getFullYear();
  let months = endDate.getMonth() - startDate.getMonth();

  if (endDate.getDate() < startDate.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 0) {
    return {
      years: 0,
      months: 0,
      totalMonths: 0,
    };
  }

  return {
    years,
    months,
    totalMonths: years * 12 + months,
  };
}

export function calculateAgeFromPurchase(purchaseDate, referenceDate = new Date()) {
  const isoDate = toIsoDate(purchaseDate);
  if (!isoDate) {
    return null;
  }

  const [yearStr, monthStr, dayStr] = isoDate.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const purchase = new Date(year, month - 1, day);

  if (Number.isNaN(purchase.getTime())) {
    return null;
  }

  return calculateElapsedFromDates(purchase, referenceDate);
}

export function calculateRemainingBatteryLife(startDateValue, batteryDuration, referenceDate = new Date()) {
  const startIso = toIsoDate(startDateValue);
  const durationInMonths = parseBatteryDurationToMonths(batteryDuration);
  if (!startIso || durationInMonths === null) {
    return null;
  }

  const [yearStr, monthStr, dayStr] = startIso.split("-");
  const startDate = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
  if (Number.isNaN(startDate.getTime())) {
    return null;
  }

  const replacementDate = new Date(startDate);
  replacementDate.setMonth(replacementDate.getMonth() + durationInMonths);

  const buildBatteryProgress = (remainingTotalMonths) => {
    if (durationInMonths <= 0) {
      return 0;
    }

    const boundedRemaining = Math.max(0, Math.min(durationInMonths, remainingTotalMonths));
    return Math.round((boundedRemaining / durationInMonths) * 100);
  };

  if (referenceDate >= replacementDate) {
    const overdue = calculateElapsedFromDates(replacementDate, referenceDate);
    const remainingTotalMonths = 0;
    return {
      isOverdue: true,
      remainingYears: 0,
      remainingMonths: 0,
      remainingTotalMonths,
      durationMonths: durationInMonths,
      remainingPercentage: buildBatteryProgress(remainingTotalMonths),
      overdueYears: overdue.years,
      overdueMonths: overdue.months,
    };
  }

  const remaining = calculateElapsedFromDates(referenceDate, replacementDate);
  return {
    isOverdue: false,
    remainingYears: remaining.years,
    remainingMonths: remaining.months,
    remainingTotalMonths: remaining.totalMonths,
    durationMonths: durationInMonths,
    remainingPercentage: buildBatteryProgress(remaining.totalMonths),
    overdueYears: 0,
    overdueMonths: 0,
  };
}

export function formatRemainingBatteryLabel(remainingBattery) {
  if (!remainingBattery) {
    return "Não foi possível calcular";
  }

  if (remainingBattery.isOverdue) {
    return `Troca recomendada (atrasada em ${formatAgeLabel(remainingBattery.overdueYears, remainingBattery.overdueMonths)})`;
  }

  return `${formatAgeLabel(remainingBattery.remainingYears, remainingBattery.remainingMonths)} restantes`;
}
