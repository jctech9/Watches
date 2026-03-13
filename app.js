import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-analytics.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB5Jcu5I0V5Xf--ggGiA5SDREed9WZ7fEQ",
  authDomain: "watches-9ecd7.firebaseapp.com",
  projectId: "watches-9ecd7",
  storageBucket: "watches-9ecd7.firebasestorage.app",
  messagingSenderId: "774181698737",
  appId: "1:774181698737:web:4db760c57edf41129e3690",
  measurementId: "G-H01TRJ08BM",
};

const app = initializeApp(firebaseConfig);
try {
  getAnalytics(app);
} catch {
  // Analytics pode falhar em ambiente local sem HTTPS.
}
const auth = getAuth(app);
const db = getFirestore(app);

const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitButton = document.getElementById("submit-button");
const logoutButton = document.getElementById("logout-button");
const feedback = document.getElementById("feedback");
const userPanel = document.getElementById("user-panel");
const welcomeMessage = document.getElementById("welcome-message");
const watchesPanel = document.getElementById("watches-panel");
const watchForm = document.getElementById("watch-form");
const brandInput = document.getElementById("brand");
const modelInput = document.getElementById("model");
const precisionInput = document.getElementById("precision");
const purchaseDateInput = document.getElementById("purchase-date");
const priceInput = document.getElementById("price");
const hasBatteryInput = document.getElementById("has-battery");
const batteryDurationInput = document.getElementById("battery-duration");
const lastBatteryChangeDateInput = document.getElementById("last-battery-change-date");
const watchesList = document.getElementById("watches-list");
const watchesAverageAge = document.getElementById("watches-average-age");
const watchSubmitButton = document.getElementById("watch-submit-button");

let currentUserId = null;

function setFeedback(message, kind = "") {
  feedback.textContent = message;
  feedback.className = `feedback ${kind}`.trim();
}

function setLoading(loading) {
  submitButton.disabled = loading;
  submitButton.textContent = loading ? "Entrando..." : "Entrar";
}

function setWatchLoading(loading) {
  watchSubmitButton.disabled = loading;
  watchSubmitButton.textContent = loading ? "Salvando..." : "Salvar relógio";
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value) {
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

function toIsoDate(value) {
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

function toDisplayDate(value) {
  const iso = toIsoDate(value);
  if (!iso) {
    return "";
  }

  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function applyDateMask(input) {
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

function formatCurrencyInput(value) {
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

function applyCurrencyMask(input) {
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

function parseCurrencyInput(value) {
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

function parsePrecisionInput(value) {
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

function formatPrecisionInput(value) {
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

function escapeHtml(value) {
  const text = String(value ?? "");
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatBatteryEstimateLabel(batteryDuration) {
  const value = String(batteryDuration ?? "").trim();
  if (!value) {
    return "Nao informado";
  }

  const numericValue = Number(value.replace(",", "."));
  if (Number.isFinite(numericValue) && numericValue >= 0) {
    const safeValue = Number.isInteger(numericValue) ? numericValue : Number(numericValue.toFixed(1));
    return `${safeValue} ${pluralize(safeValue, "ano", "anos")}`;
  }

  return value;
}

function formatPrecisionLabel(precision) {
  if (precision === null || precision === undefined || precision === "") {
    return "Nao informado";
  }

  const numericValue = Number(precision);
  if (!Number.isFinite(numericValue)) {
    return String(precision);
  }

  const safeValue = Number.isInteger(numericValue) ? numericValue : Number(numericValue.toFixed(2));
  return `+-${Math.abs(safeValue)} s/mes`;
}

function parseBatteryDurationToMonths(batteryDuration) {
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

  const asMonths = /(mes|meses|month|months)/.test(normalized);
  const durationInMonths = asMonths ? amount : amount * 12;
  return Math.round(durationInMonths);
}

function pluralize(value, singular, plural) {
  return value === 1 ? singular : plural;
}

function formatAgeLabel(years, months) {
  return `${years} ${pluralize(years, "ano", "anos")} e ${months} ${pluralize(months, "mes", "meses")}`;
}

function calculateElapsedFromDates(startDate, endDate) {
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

function calculateAgeFromPurchase(purchaseDate, referenceDate = new Date()) {
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

function calculateRemainingBatteryLife(startDateValue, batteryDuration, referenceDate = new Date()) {
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

function formatRemainingBatteryLabel(remainingBattery) {
  if (!remainingBattery) {
    return "Nao foi possivel calcular";
  }

  if (remainingBattery.isOverdue) {
    return `Troca recomendada (atrasada em ${formatAgeLabel(remainingBattery.overdueYears, remainingBattery.overdueMonths)})`;
  }

  return `${formatAgeLabel(remainingBattery.remainingYears, remainingBattery.remainingMonths)} restantes`;
}

function renderWatches(watches) {
  watchesList.innerHTML = "";

  const validAges = watches
    .map((watch) => calculateAgeFromPurchase(watch.purchaseDate))
    .filter((age) => Boolean(age));

  if (watchesAverageAge) {
    if (validAges.length) {
      const totalMonths = validAges.reduce((sum, age) => sum + age.totalMonths, 0);
      const averageMonths = Math.round(totalMonths / validAges.length);
      const averageYears = Math.floor(averageMonths / 12);
      const remainingMonths = averageMonths % 12;
      watchesAverageAge.textContent = `Media de idade dos relogios: ${formatAgeLabel(averageYears, remainingMonths)}.`;
      watchesAverageAge.classList.remove("hidden");
    } else {
      watchesAverageAge.textContent = "";
      watchesAverageAge.classList.add("hidden");
    }
  }

  if (!watches.length) {
    const emptyItem = document.createElement("li");
    emptyItem.innerHTML = "<p>Nenhum relógio cadastrado até o momento.</p>";
    watchesList.appendChild(emptyItem);
    return;
  }

  watches.forEach((watch) => {
    const item = document.createElement("li");
    item.classList.add("watch-card-item");
    const hasBattery = Boolean(watch.hasBattery);
    const noteValue = watch.note || "";
    const purchaseDateValue = watch.purchaseDate || "";
    const purchaseDateInputValue = toDisplayDate(purchaseDateValue);
    const hasValidPrice =
      watch.price !== null &&
      watch.price !== undefined &&
      watch.price !== "" &&
      Number.isFinite(Number(watch.price)) &&
      Number(watch.price) >= 0;
    const priceValue = hasValidPrice ? Number(watch.price) : null;
    const priceInputValue = hasValidPrice ? formatCurrencyInput(priceValue) : "";
    const purchaseDateLabel = formatDate(purchaseDateValue);
    const priceLabel = hasValidPrice ? formatCurrency(priceValue) : "Nao informado";
    const precisionLabel = escapeHtml(formatPrecisionLabel(watch.precision));
    const batteryEstimateLabel = formatBatteryEstimateLabel(watch.batteryDuration || "");
    const lastBatteryChangeDateValue = watch.lastBatteryChangeDate || "";
    const batteryStartDate = lastBatteryChangeDateValue || purchaseDateValue;
    const lastBatteryChangeLabel = lastBatteryChangeDateValue ? formatDate(lastBatteryChangeDateValue) : "Nao informada";
    const remainingBattery = hasBattery
      ? calculateRemainingBatteryLife(batteryStartDate, watch.batteryDuration || "")
      : null;
    const remainingBatteryLabel = hasBattery ? formatRemainingBatteryLabel(remainingBattery) : "Nao se aplica";
    const batteryRemainingClass = hasBattery ? "watch-remaining-time" : "watch-remaining-time no-battery";
    const batteryProgressPercentage = remainingBattery ? remainingBattery.remainingPercentage : null;
    const batteryMeterClass = remainingBattery
      ? `watch-battery-meter${remainingBattery.isOverdue ? " is-overdue" : ""}${
          !remainingBattery.isOverdue && batteryProgressPercentage <= 20 ? " is-low" : ""
        }`
      : "watch-battery-meter";
    const batteryProgressMarkup = hasBattery && remainingBattery
      ? `
        <span class="watch-battery-meter-wrap" aria-label="Bateria restante em percentual">
          <span class="${batteryMeterClass}" role="img" aria-label="Bateria restante: ${batteryProgressPercentage}%">
            <span class="watch-battery-meter-level" style="width: ${batteryProgressPercentage}%;"></span>
          </span>
          <span class="watch-battery-meter-percent">${batteryProgressPercentage}%</span>
        </span>
      `
      : "";
    const watchAge = calculateAgeFromPurchase(purchaseDateValue);
    const watchAgeLabel = watchAge ? formatAgeLabel(watchAge.years, watchAge.months) : "Nao foi possivel calcular";
    const manufacturerDetails = hasBattery
      ? `
        <p><strong>Precisao:</strong> ${precisionLabel}</p>
        <p><strong>Duracao da bateria:</strong> ${escapeHtml(batteryEstimateLabel)}</p>
      `
      : `
        <p><strong>Precisao:</strong> ${precisionLabel}</p>
        <p><strong>Tipo de energia:</strong> Sem bateria</p>
      `;
    const watchBrandLabel = escapeHtml(watch.brand || "Sem marca");
    const watchModelLabel = escapeHtml(watch.model || "Sem modelo");

    item.innerHTML = `
      <div class="watch-card-header">
        <div class="watch-title-wrap">
          <span class="watch-kicker">Relogio</span>
          <p class="watch-title"><span class="watch-brand">${watchBrandLabel}</span> <span class="watch-model">${watchModelLabel}</span></p>
        </div>
        <button type="button" class="small-button edit-watch-button" aria-label="Editar relogio" title="Editar relogio">&#9998;</button>
      </div>

      <div class="watch-static-row">
        <section class="watch-section-block watch-status-block" aria-label="Status atual do relogio">
          <h4 class="watch-section-title">Status atual</h4>
          <div class="watch-status-grid">
            <p class="watch-metric"><strong>Idade:</strong> ${escapeHtml(watchAgeLabel)}</p>
            <p class="watch-metric"><strong>Tempo restante da bateria:</strong> <span class="${batteryRemainingClass}">${escapeHtml(remainingBatteryLabel)}</span>${batteryProgressMarkup}</p>
          </div>
        </section>

        <details class="watch-details-menu">
          <summary>Mais informacoes</summary>
          <div class="watch-info-grid">
            <section class="watch-section-block watch-manufacturer-block" aria-label="Informacoes do fabricante">
              <h4 class="watch-section-title">Informacoes do fabricante</h4>
              <div class="watch-data-list">
                ${manufacturerDetails}
              </div>
            </section>

            <section class="watch-section-block watch-user-block" aria-label="Informacoes do usuario">
              <h4 class="watch-section-title">Informacoes do usuario</h4>
              <div class="watch-data-list">
                <p><strong>Data da compra:</strong> ${escapeHtml(purchaseDateLabel)}</p>
                <p><strong>Preco:</strong> ${escapeHtml(priceLabel)}</p>
                <p><strong>Ultima troca de bateria:</strong> ${escapeHtml(lastBatteryChangeLabel)}</p>
                <p><strong>Observacao:</strong> ${escapeHtml(noteValue || "Nenhuma")}</p>
              </div>
            </section>
          </div>
        </details>
      </div>

      <div class="watch-edit-row hidden">
        <label for="brand-${watch.id}"><strong>Marca:</strong></label>
        <input id="brand-${watch.id}" name="brand-${watch.id}" class="edit-brand" type="text" value="${escapeHtml(watch.brand || "")}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />

        <label for="model-${watch.id}"><strong>Modelo:</strong></label>
        <input id="model-${watch.id}" name="model-${watch.id}" class="edit-model" type="text" value="${escapeHtml(watch.model || "")}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />

        <label for="precision-${watch.id}"><strong>Precisao mensal (s/mes, +-):</strong></label>
        <input id="precision-${watch.id}" name="precision-${watch.id}" class="edit-precision" type="text" inputmode="decimal" value="${escapeHtml(formatPrecisionInput(watch.precision))}" placeholder="+-" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />

        <label for="purchase-date-${watch.id}"><strong>Data da compra:</strong></label>
        <input id="purchase-date-${watch.id}" name="purchase-date-${watch.id}" class="edit-purchase-date" type="text" inputmode="numeric" maxlength="10" value="${escapeHtml(purchaseDateInputValue)}" autocomplete="off" />

        <label for="price-${watch.id}"><strong>Preco (R$):</strong></label>
        <input id="price-${watch.id}" name="price-${watch.id}" class="edit-price" type="text" inputmode="decimal" maxlength="20" value="${escapeHtml(priceInputValue)}" autocomplete="off" />

        <label class="edit-check-row" for="has-battery-${watch.id}">
          <input id="has-battery-${watch.id}" name="has-battery-${watch.id}" class="edit-has-battery" type="checkbox" ${hasBattery ? "checked" : ""} autocomplete="off" />
          Usa bateria?
        </label>

        <label for="battery-duration-${watch.id}"><strong>Duracao da bateria:</strong></label>
        <input
          id="battery-duration-${watch.id}"
          name="battery-duration-${watch.id}"
          class="edit-battery-duration"
          type="text"
          value="${escapeHtml(watch.batteryDuration || "")}" 
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          ${hasBattery ? "" : "disabled"}
        />

        <label for="last-battery-change-date-${watch.id}"><strong>Data da ultima troca de bateria:</strong></label>
        <input
          id="last-battery-change-date-${watch.id}"
          name="last-battery-change-date-${watch.id}"
          class="edit-last-battery-change-date"
          type="text"
          inputmode="numeric"
          maxlength="10"
          value="${escapeHtml(toDisplayDate(lastBatteryChangeDateValue))}"
          autocomplete="off"
          ${hasBattery ? "" : "disabled"}
        />

        <label for="note-${watch.id}"><strong>Observacao:</strong></label>
        <input id="note-${watch.id}" name="note-${watch.id}" class="edit-note" type="text" value="${escapeHtml(noteValue)}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />

        <div class="watch-edit-actions">
          <button type="button" class="small-button ghost cancel-edit-button">Cancelar</button>
          <button type="button" class="small-button danger delete-watch-button">Excluir</button>
          <button type="button" class="small-button save-watch-button">Salvar alteracoes</button>
        </div>
      </div>
    `;

    const editWatchButton = item.querySelector(".edit-watch-button");
    const cancelEditButton = item.querySelector(".cancel-edit-button");
    const staticRow = item.querySelector(".watch-static-row");
    const editRow = item.querySelector(".watch-edit-row");
    const saveWatchButton = item.querySelector(".save-watch-button");
    const deleteWatchButton = item.querySelector(".delete-watch-button");
    const editBrand = item.querySelector(".edit-brand");
    const editModel = item.querySelector(".edit-model");
    const editPrecision = item.querySelector(".edit-precision");
    const editPurchaseDate = item.querySelector(".edit-purchase-date");
    const editPrice = item.querySelector(".edit-price");
    const editHasBattery = item.querySelector(".edit-has-battery");
    const editBatteryDuration = item.querySelector(".edit-battery-duration");
    const editLastBatteryChangeDate = item.querySelector(".edit-last-battery-change-date");
    const editNote = item.querySelector(".edit-note");

    editPurchaseDate.addEventListener("input", () => {
      applyDateMask(editPurchaseDate);
    });

    editPrice.addEventListener("input", () => {
      applyCurrencyMask(editPrice);
    });

    editLastBatteryChangeDate.addEventListener("input", () => {
      applyDateMask(editLastBatteryChangeDate);
    });

    editWatchButton.addEventListener("click", () => {
      staticRow.classList.add("hidden");
      editRow.classList.remove("hidden");
      editWatchButton.classList.add("hidden");
    });

    cancelEditButton.addEventListener("click", () => {
      staticRow.classList.remove("hidden");
      editRow.classList.add("hidden");
      editWatchButton.classList.remove("hidden");
    });

    editHasBattery.addEventListener("change", () => {
      editBatteryDuration.disabled = !editHasBattery.checked;
      editLastBatteryChangeDate.disabled = !editHasBattery.checked;
      if (!editHasBattery.checked) {
        editBatteryDuration.value = "";
        editLastBatteryChangeDate.value = "";
      }
    });

    saveWatchButton.addEventListener("click", async () => {
      if (!currentUserId) {
        setFeedback("Faça login para editar relógios.", "error");
        return;
      }

      const brand = editBrand.value.trim();
      const model = editModel.value.trim();
      const precisionRaw = editPrecision.value.trim();
      const precision = precisionRaw ? parsePrecisionInput(precisionRaw) : null;
      const purchaseDate = toIsoDate(editPurchaseDate.value);
      const priceRaw = editPrice.value.trim();
      const price = priceRaw ? parseCurrencyInput(priceRaw) : null;
      const hasBatteryValue = editHasBattery.checked;
      const batteryDuration = editBatteryDuration.value.trim();
      const lastBatteryChangeDateRaw = editLastBatteryChangeDate.value.trim();
      const lastBatteryChangeDate = toIsoDate(lastBatteryChangeDateRaw);
      const note = editNote.value.trim();

      if (!brand || !model || !purchaseDate) {
        setFeedback("Preencha marca, modelo e data da compra antes de salvar.", "error");
        return;
      }

      if (priceRaw && (Number.isNaN(price) || price < 0)) {
        setFeedback("Informe um preço válido ou deixe o campo em branco.", "error");
        return;
      }

      if (precisionRaw && Number.isNaN(precision)) {
        setFeedback("Informe a precisao em segundos por mes usando + ou - (ex.: +20 ou -15).", "error");
        return;
      }

      if (hasBatteryValue && !batteryDuration) {
        setFeedback("Informe a duração da bateria ou desmarque a opção de bateria.", "error");
        return;
      }

      if (hasBatteryValue && lastBatteryChangeDateRaw && !lastBatteryChangeDate) {
        setFeedback("Informe uma data válida para a última troca de bateria.", "error");
        return;
      }

      if (hasBatteryValue && lastBatteryChangeDate && lastBatteryChangeDate < purchaseDate) {
        setFeedback("A data da última troca não pode ser anterior à data da compra.", "error");
        return;
      }

      saveWatchButton.disabled = true;

      try {
        await updateDoc(doc(db, "users", currentUserId, "watches", watch.id), {
          brand,
          model,
          precision,
          purchaseDate,
          price,
          hasBattery: hasBatteryValue,
          batteryDuration: hasBatteryValue ? batteryDuration : null,
          lastBatteryChangeDate: hasBatteryValue ? (lastBatteryChangeDate || null) : null,
          note,
          updatedAt: serverTimestamp(),
        });

        await loadWatches();
        setFeedback("Relógio atualizado com sucesso.", "ok");
      } catch (error) {
        setFeedback(`Erro ao atualizar relógio: ${error.message}`, "error");
      } finally {
        saveWatchButton.disabled = false;
      }
    });

    deleteWatchButton.addEventListener("click", async () => {
      if (!currentUserId) {
        setFeedback("Faça login para excluir relógios.", "error");
        return;
      }

      const confirmed = window.confirm("Realmente deseja excluir este relogio?");
      if (!confirmed) {
        return;
      }

      deleteWatchButton.disabled = true;

      try {
        await deleteDoc(doc(db, "users", currentUserId, "watches", watch.id));
        await loadWatches();
        setFeedback("Relogio excluido com sucesso.", "ok");
      } catch (error) {
        setFeedback(`Erro ao excluir relógio: ${error.message}`, "error");
      } finally {
        deleteWatchButton.disabled = false;
      }
    });

    watchesList.appendChild(item);
  });
}

async function loadWatches() {
  if (!currentUserId) {
    renderWatches([]);
    return;
  }

  const watchesRef = collection(db, "users", currentUserId, "watches");
  const watchesQuery = query(watchesRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(watchesQuery);

  const watches = snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  }));

  renderWatches(watches);
}

function isConfigFilled(config) {
  return Object.values(config).every(
    (value) => typeof value === "string" && value.trim() && !value.includes("COLE_AQUI")
  );
}

if (!isConfigFilled(firebaseConfig)) {
  setFeedback("Configure o Firebase no arquivo app.js antes de usar o login.", "error");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isConfigFilled(firebaseConfig)) {
    setFeedback("Firebase ainda não configurado.", "error");
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    setFeedback("Preencha e-mail e senha.", "error");
    return;
  }

  setLoading(true);
  setFeedback("");

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);

    await setDoc(
      doc(db, "ultimoLogin", credential.user.uid),
      {
        email: credential.user.email,
        at: serverTimestamp(),
      },
      { merge: true }
    );

    setFeedback("Login realizado com sucesso.", "ok");
    passwordInput.value = "";
  } catch (error) {
    setFeedback(`Erro no login: ${error.message}`, "error");
  } finally {
    setLoading(false);
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
    setFeedback("Sessão encerrada.", "ok");
  } catch (error) {
    setFeedback(`Erro ao sair: ${error.message}`, "error");
  }
});

hasBatteryInput.addEventListener("change", () => {
  batteryDurationInput.disabled = !hasBatteryInput.checked;
  lastBatteryChangeDateInput.disabled = !hasBatteryInput.checked;
  if (!hasBatteryInput.checked) {
    batteryDurationInput.value = "";
    lastBatteryChangeDateInput.value = "";
  }
});

watchForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUserId) {
    setFeedback("Faça login para cadastrar relógios.", "error");
    return;
  }

  const brand = brandInput.value.trim();
  const model = modelInput.value.trim();
  const precisionRaw = precisionInput.value.trim();
  const precision = precisionRaw ? parsePrecisionInput(precisionRaw) : null;
  const purchaseDate = toIsoDate(purchaseDateInput.value);
  const priceRaw = priceInput.value.trim();
  const price = priceRaw ? parseCurrencyInput(priceRaw) : null;
  const hasBattery = hasBatteryInput.checked;
  const batteryDuration = batteryDurationInput.value.trim();
  const lastBatteryChangeDateRaw = lastBatteryChangeDateInput.value.trim();
  const lastBatteryChangeDate = toIsoDate(lastBatteryChangeDateRaw);

  if (!brand || !model || !purchaseDate) {
    setFeedback("Preencha marca, modelo e data da compra.", "error");
    return;
  }

  if (priceRaw && (Number.isNaN(price) || price < 0)) {
    setFeedback("Informe um preço válido ou deixe o campo em branco.", "error");
    return;
  }

  if (precisionRaw && Number.isNaN(precision)) {
    setFeedback("Informe a precisao em segundos por mes usando + ou - (ex.: +20 ou -15).", "error");
    return;
  }

  if (hasBattery && !batteryDuration) {
    setFeedback("Informe a duração da bateria ou desmarque a opção de bateria.", "error");
    return;
  }

  if (hasBattery && lastBatteryChangeDateRaw && !lastBatteryChangeDate) {
    setFeedback("Informe uma data válida para a última troca de bateria.", "error");
    return;
  }

  if (hasBattery && lastBatteryChangeDate && lastBatteryChangeDate < purchaseDate) {
    setFeedback("A data da última troca não pode ser anterior à data da compra.", "error");
    return;
  }

  setWatchLoading(true);

  try {
    const watchDocRef = doc(collection(db, "users", currentUserId, "watches"));

    await setDoc(watchDocRef, {
      brand,
      model,
      precision,
      purchaseDate,
      price,
      hasBattery,
      batteryDuration: hasBattery ? batteryDuration : null,
      lastBatteryChangeDate: hasBattery ? (lastBatteryChangeDate || null) : null,
      createdAt: serverTimestamp(),
    });

    watchForm.reset();
    batteryDurationInput.disabled = true;
    lastBatteryChangeDateInput.disabled = true;
    await loadWatches();
    setFeedback("Relógio cadastrado com sucesso.", "ok");
  } catch (error) {
    setFeedback(`Erro ao salvar relógio: ${error.message}`, "error");
  } finally {
    setWatchLoading(false);
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserId = user.uid;
    userPanel.classList.remove("hidden");
    watchesPanel.classList.remove("hidden");
    welcomeMessage.textContent = "";
    loginForm.classList.add("hidden");
    loadWatches().catch((error) => {
      setFeedback(`Erro ao carregar relógios: ${error.message}`, "error");
    });
  } else {
    currentUserId = null;
    userPanel.classList.add("hidden");
    watchesPanel.classList.add("hidden");
    welcomeMessage.textContent = "";
    loginForm.classList.remove("hidden");
    renderWatches([]);
  }
});

purchaseDateInput.addEventListener("input", () => {
  applyDateMask(purchaseDateInput);
});

lastBatteryChangeDateInput.addEventListener("input", () => {
  applyDateMask(lastBatteryChangeDateInput);
});

priceInput.addEventListener("input", () => {
  applyCurrencyMask(priceInput);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.error("Falha ao registrar service worker:", error);
    });
  });
}