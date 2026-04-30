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

import * as utils from "./utils.js";

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
const noteInput = document.getElementById("note");
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

function getWatchValues(fields) {
  const precisionRaw = fields.precision.value.trim();
  const priceRaw = fields.price.value.trim();
  const lastBatteryChangeDateRaw = fields.lastBatteryChangeDate.value.trim();

  return {
    brand: fields.brand.value.trim(),
    model: fields.model.value.trim(),
    precisionRaw,
    precision: precisionRaw ? utils.parsePrecisionInput(precisionRaw) : null,
    purchaseDateRaw: fields.purchaseDate.value.trim(),
    purchaseDate: utils.toIsoDate(fields.purchaseDate.value),
    priceRaw,
    price: priceRaw ? utils.parseCurrencyInput(priceRaw) : null,
    hasBattery: fields.hasBattery.checked,
    batteryDuration: fields.batteryDuration.value.trim(),
    lastBatteryChangeDateRaw,
    lastBatteryChangeDate: utils.toIsoDate(lastBatteryChangeDateRaw),
    note: fields.note ? fields.note.value.trim() : "",
  };
}

function validateWatchValues(values) {
  if (!values.brand || !values.model || !values.purchaseDateRaw) {
    return "Preencha marca, modelo e data da compra.";
  }

  if (!values.purchaseDate) {
    return "Informe uma data de compra válida.";
  }

  if (utils.isFutureIsoDate(values.purchaseDate)) {
    return "A data da compra não pode ser futura.";
  }

  if (values.priceRaw && (Number.isNaN(values.price) || values.price < 0)) {
    return "Informe um preço válido ou deixe o campo em branco.";
  }

  if (values.precisionRaw && Number.isNaN(values.precision)) {
    return "Informe a precisão em segundos por mês usando + ou - (ex.: +20 ou -15).";
  }

  if (values.hasBattery) {
    const batteryDurationMonths = utils.parseBatteryDurationToMonths(values.batteryDuration);

    if (!values.batteryDuration || batteryDurationMonths === null) {
      return "Informe a duração da bateria em anos ou meses (ex.: 3 anos ou 36 meses).";
    }

    if (values.lastBatteryChangeDateRaw && !values.lastBatteryChangeDate) {
      return "Informe uma data válida para a última troca de bateria.";
    }

    if (values.lastBatteryChangeDate && utils.isFutureIsoDate(values.lastBatteryChangeDate)) {
      return "A data da última troca não pode ser futura.";
    }

    if (values.lastBatteryChangeDate && values.lastBatteryChangeDate < values.purchaseDate) {
      return "A data da última troca não pode ser anterior à data da compra.";
    }
  }

  return "";
}

function buildWatchDocument(values) {
  return {
    brand: values.brand,
    model: values.model,
    precision: values.precision,
    purchaseDate: values.purchaseDate,
    price: values.price,
    hasBattery: values.hasBattery,
    batteryDuration: values.hasBattery ? values.batteryDuration : null,
    lastBatteryChangeDate: values.hasBattery ? (values.lastBatteryChangeDate || null) : null,
    note: values.note,
  };
}

function renderWatches(watches) {
  watchesList.innerHTML = "";

  const validAges = watches
    .map((watch) => utils.calculateAgeFromPurchase(watch.purchaseDate))
    .filter((age) => Boolean(age));

  if (watchesAverageAge) {
    if (validAges.length) {
      const totalMonths = validAges.reduce((sum, age) => sum + age.totalMonths, 0);
      const averageMonths = Math.round(totalMonths / validAges.length);
      const averageYears = Math.floor(averageMonths / 12);
      const remainingMonths = averageMonths % 12;
      watchesAverageAge.textContent = `Média de idade dos relógios: ${utils.formatAgeLabel(averageYears, remainingMonths)}.`;
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
    const purchaseDateInputValue = utils.toDisplayDate(purchaseDateValue);
    const hasValidPrice =
      watch.price !== null &&
      watch.price !== undefined &&
      watch.price !== "" &&
      Number.isFinite(Number(watch.price)) &&
      Number(watch.price) >= 0;
    const priceValue = hasValidPrice ? Number(watch.price) : null;
    const priceInputValue = hasValidPrice ? utils.formatCurrencyInput(priceValue) : "";
    const purchaseDateLabel = utils.formatDate(purchaseDateValue);
    const priceLabel = hasValidPrice ? utils.formatCurrency(priceValue) : "Não informado";
    const precisionLabel = utils.escapeHtml(utils.formatPrecisionLabel(watch.precision));
    const batteryEstimateLabel = utils.formatBatteryEstimateLabel(watch.batteryDuration || "");
    const lastBatteryChangeDateValue = watch.lastBatteryChangeDate || "";
    const batteryStartDate = lastBatteryChangeDateValue || purchaseDateValue;
    const lastBatteryChangeLabel = lastBatteryChangeDateValue ? utils.formatDate(lastBatteryChangeDateValue) : "Não informada";
    const remainingBattery = hasBattery
      ? utils.calculateRemainingBatteryLife(batteryStartDate, watch.batteryDuration || "")
      : null;
    const remainingBatteryLabel = hasBattery ? utils.formatRemainingBatteryLabel(remainingBattery) : "Não se aplica";
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
    const watchAge = utils.calculateAgeFromPurchase(purchaseDateValue);
    const watchAgeLabel = watchAge ? utils.formatAgeLabel(watchAge.years, watchAge.months) : "Não foi possível calcular";
    const manufacturerDetails = hasBattery
      ? `
        <p><strong>Precisão:</strong> ${precisionLabel}</p>
        <p><strong>Duração da bateria:</strong> ${utils.escapeHtml(batteryEstimateLabel)}</p>
      `
      : `
        <p><strong>Precisão:</strong> ${precisionLabel}</p>
        <p><strong>Tipo de energia:</strong> Sem bateria</p>
      `;
    const watchBrandLabel = utils.escapeHtml(watch.brand || "Sem marca");
    const watchModelLabel = utils.escapeHtml(watch.model || "Sem modelo");

    item.innerHTML = `
      <div class="watch-card-header">
        <div class="watch-title-wrap">
          <span class="watch-kicker">Relógio</span>
          <p class="watch-title"><span class="watch-brand">${watchBrandLabel}</span> <span class="watch-model">${watchModelLabel}</span></p>
        </div>
        <button type="button" class="small-button edit-watch-button" aria-label="Editar relógio" title="Editar relógio">&#9998;</button>
      </div>

      <div class="watch-static-row">
        <section class="watch-section-block watch-status-block" aria-label="Status atual do relógio">
          <h4 class="watch-section-title">Status atual</h4>
          <div class="watch-status-grid">
            <p class="watch-metric"><strong>Idade:</strong> ${utils.escapeHtml(watchAgeLabel)}</p>
            <p class="watch-metric"><strong>Tempo restante da bateria:</strong> <span class="${batteryRemainingClass}">${utils.escapeHtml(remainingBatteryLabel)}</span>${batteryProgressMarkup}</p>
          </div>
        </section>

        <details class="watch-details-menu">
          <summary>Mais informações</summary>
          <div class="watch-info-grid">
            <section class="watch-section-block watch-manufacturer-block" aria-label="Informações do fabricante">
              <h4 class="watch-section-title">Informações do fabricante</h4>
              <div class="watch-data-list">
                ${manufacturerDetails}
              </div>
            </section>

            <section class="watch-section-block watch-user-block" aria-label="Informações do usuário">
              <h4 class="watch-section-title">Informações do usuário</h4>
              <div class="watch-data-list">
                <p><strong>Data da compra:</strong> ${utils.escapeHtml(purchaseDateLabel)}</p>
                <p><strong>Preço:</strong> ${utils.escapeHtml(priceLabel)}</p>
                <p><strong>Última troca de bateria:</strong> ${utils.escapeHtml(lastBatteryChangeLabel)}</p>
                <p><strong>Observação:</strong> ${utils.escapeHtml(noteValue || "Nenhuma")}</p>
              </div>
            </section>
          </div>
        </details>
      </div>

      <div class="watch-edit-row hidden">
        <label for="brand-${watch.id}"><strong>Marca:</strong></label>
        <input id="brand-${watch.id}" name="brand-${watch.id}" class="edit-brand" type="text" value="${utils.escapeHtml(watch.brand || "")}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />

        <label for="model-${watch.id}"><strong>Modelo:</strong></label>
        <input id="model-${watch.id}" name="model-${watch.id}" class="edit-model" type="text" value="${utils.escapeHtml(watch.model || "")}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />

        <label for="precision-${watch.id}"><strong>Precisão mensal (s/mês, +-):</strong></label>
        <input id="precision-${watch.id}" name="precision-${watch.id}" class="edit-precision" type="text" inputmode="decimal" value="${utils.escapeHtml(utils.formatPrecisionInput(watch.precision))}" placeholder="+-" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />

        <label for="purchase-date-${watch.id}"><strong>Data da compra:</strong></label>
        <input id="purchase-date-${watch.id}" name="purchase-date-${watch.id}" class="edit-purchase-date" type="text" inputmode="numeric" maxlength="10" value="${utils.escapeHtml(purchaseDateInputValue)}" autocomplete="off" />

        <label for="price-${watch.id}"><strong>Preço (R$):</strong></label>
        <input id="price-${watch.id}" name="price-${watch.id}" class="edit-price" type="text" inputmode="decimal" maxlength="20" value="${utils.escapeHtml(priceInputValue)}" autocomplete="off" />

        <label class="edit-check-row" for="has-battery-${watch.id}">
          <input id="has-battery-${watch.id}" name="has-battery-${watch.id}" class="edit-has-battery" type="checkbox" ${hasBattery ? "checked" : ""} autocomplete="off" />
          Usa bateria?
        </label>

        <label for="battery-duration-${watch.id}"><strong>Duração da bateria:</strong></label>
        <input
          id="battery-duration-${watch.id}"
          name="battery-duration-${watch.id}"
          class="edit-battery-duration"
          type="text"
          value="${utils.escapeHtml(watch.batteryDuration || "")}" 
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          placeholder="ex.: 3 anos ou 36 meses"
          ${hasBattery ? "" : "disabled"}
        />

        <label for="last-battery-change-date-${watch.id}"><strong>Data da última troca de bateria:</strong></label>
        <input
          id="last-battery-change-date-${watch.id}"
          name="last-battery-change-date-${watch.id}"
          class="edit-last-battery-change-date"
          type="text"
          inputmode="numeric"
          maxlength="10"
          value="${utils.escapeHtml(utils.toDisplayDate(lastBatteryChangeDateValue))}"
          autocomplete="off"
          ${hasBattery ? "" : "disabled"}
        />

        <label for="note-${watch.id}"><strong>Observação:</strong></label>
        <input id="note-${watch.id}" name="note-${watch.id}" class="edit-note" type="text" value="${utils.escapeHtml(noteValue)}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />

        <div class="watch-edit-actions">
          <button type="button" class="small-button ghost cancel-edit-button">Cancelar</button>
          <button type="button" class="small-button danger delete-watch-button">Excluir</button>
          <button type="button" class="small-button save-watch-button">Salvar alterações</button>
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
      utils.applyDateMask(editPurchaseDate);
    });

    editPrice.addEventListener("input", () => {
      utils.applyCurrencyMask(editPrice);
    });

    editLastBatteryChangeDate.addEventListener("input", () => {
      utils.applyDateMask(editLastBatteryChangeDate);
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

      const watchValues = getWatchValues({
        brand: editBrand,
        model: editModel,
        precision: editPrecision,
        purchaseDate: editPurchaseDate,
        price: editPrice,
        hasBattery: editHasBattery,
        batteryDuration: editBatteryDuration,
        lastBatteryChangeDate: editLastBatteryChangeDate,
        note: editNote,
      });
      const validationMessage = validateWatchValues(watchValues);

      if (validationMessage) {
        setFeedback(validationMessage, "error");
        return;
      }

      saveWatchButton.disabled = true;

      try {
        await updateDoc(doc(db, "users", currentUserId, "watches", watch.id), {
          ...buildWatchDocument(watchValues),
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

      const confirmed = window.confirm("Realmente deseja excluir este relógio?");
      if (!confirmed) {
        return;
      }

      deleteWatchButton.disabled = true;

      try {
        await deleteDoc(doc(db, "users", currentUserId, "watches", watch.id));
        await loadWatches();
        setFeedback("Relógio excluído com sucesso.", "ok");
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

  const watchValues = getWatchValues({
    brand: brandInput,
    model: modelInput,
    precision: precisionInput,
    purchaseDate: purchaseDateInput,
    price: priceInput,
    hasBattery: hasBatteryInput,
    batteryDuration: batteryDurationInput,
    lastBatteryChangeDate: lastBatteryChangeDateInput,
    note: noteInput,
  });
  const validationMessage = validateWatchValues(watchValues);

  if (validationMessage) {
    setFeedback(validationMessage, "error");
    return;
  }

  setWatchLoading(true);

  try {
    const watchDocRef = doc(collection(db, "users", currentUserId, "watches"));

    await setDoc(watchDocRef, {
      ...buildWatchDocument(watchValues),
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
  utils.applyDateMask(purchaseDateInput);
});

lastBatteryChangeDateInput.addEventListener("input", () => {
  utils.applyDateMask(lastBatteryChangeDateInput);
});

priceInput.addEventListener("input", () => {
  utils.applyCurrencyMask(priceInput);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.error("Falha ao registrar service worker:", error);
    });
  });
}
