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
  getDocs,
  query,
  orderBy,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

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
const storage = getStorage(app);

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
const purchaseDateInput = document.getElementById("purchase-date");
const priceInput = document.getElementById("price");
const hasBatteryInput = document.getElementById("has-battery");
const batteryDurationInput = document.getElementById("battery-duration");
const photoInput = document.getElementById("photo");
const watchesList = document.getElementById("watches-list");
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

  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function validatePhoto(file) {
  if (!file) {
    return null;
  }

  const maxSizeInBytes = 3 * 1024 * 1024;
  if (!file.type.startsWith("image/")) {
    return "Selecione um arquivo de imagem válido.";
  }

  if (file.size > maxSizeInBytes) {
    return "A foto deve ter no máximo 3MB.";
  }

  return null;
}

async function uploadWatchPhoto(userId, watchId, file) {
  const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
  const fileName = `watch_${Date.now()}.${extension}`;
  const imageRef = ref(storage, `users/${userId}/watches/${watchId}/${fileName}`);
  await uploadBytes(imageRef, file);
  return getDownloadURL(imageRef);
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

function renderWatches(watches) {
  watchesList.innerHTML = "";

  if (!watches.length) {
    const emptyItem = document.createElement("li");
    emptyItem.innerHTML = "<p>Nenhum relógio cadastrado até o momento.</p>";
    watchesList.appendChild(emptyItem);
    return;
  }

  watches.forEach((watch) => {
    const item = document.createElement("li");
    const hasBattery = Boolean(watch.hasBattery);
    const noteValue = watch.note || "";
    const purchaseDateValue = watch.purchaseDate || "";
    const priceValue = Number.isFinite(Number(watch.price)) ? Number(watch.price) : 0;
    const photoUrl = watch.photoUrl || "";

    item.innerHTML = `
      <div class="watch-edit-row">
        <div class="watch-photo-wrap">
          ${photoUrl ? `<img src="${escapeHtml(photoUrl)}" alt="Foto do relógio ${escapeHtml(watch.model || "")}" class="watch-photo" />` : "<p class=\"watch-photo-empty\">Sem foto</p>"}
        </div>

        <label for="photo-${watch.id}"><strong>Nova foto:</strong></label>
        <input
          id="photo-${watch.id}"
          class="edit-photo"
          type="file"
          accept="image/*"
        />

        <label for="brand-${watch.id}"><strong>Marca:</strong></label>
        <input
          id="brand-${watch.id}"
          class="edit-brand"
          type="text"
          value="${escapeHtml(watch.brand || "")}"
          placeholder="Marca"
        />

        <label for="model-${watch.id}"><strong>Modelo:</strong></label>
        <input
          id="model-${watch.id}"
          class="edit-model"
          type="text"
          value="${escapeHtml(watch.model || "")}"
          placeholder="Modelo"
        />

        <label for="purchase-date-${watch.id}"><strong>Data da compra:</strong></label>
        <input
          id="purchase-date-${watch.id}"
          class="edit-purchase-date"
          type="date"
          value="${escapeHtml(purchaseDateValue)}"
        />

        <label for="price-${watch.id}"><strong>Preço (R$):</strong></label>
        <input
          id="price-${watch.id}"
          class="edit-price"
          type="number"
          min="0"
          step="0.01"
          value="${escapeHtml(priceValue)}"
        />

        <label class="edit-check-row" for="has-battery-${watch.id}">
          <input
            id="has-battery-${watch.id}"
            class="edit-has-battery"
            type="checkbox"
            ${hasBattery ? "checked" : ""}
          />
          Usa bateria?
        </label>

        <label for="battery-duration-${watch.id}"><strong>Duração da bateria:</strong></label>
        <input
          id="battery-duration-${watch.id}"
          class="edit-battery-duration"
          type="text"
          value="${escapeHtml(watch.batteryDuration || "")}"
          placeholder="Ex.: 2 anos"
          ${hasBattery ? "" : "disabled"}
        />

        <label for="note-${watch.id}"><strong>Observação:</strong></label>
        <input
          id="note-${watch.id}"
          class="edit-note"
          type="text"
          value="${escapeHtml(noteValue)}"
          placeholder="Observação"
        />

        <p class="watch-summary"><strong>Resumo atual:</strong> ${formatCurrency(priceValue)} | ${formatDate(purchaseDateValue)}</p>
        <button type="button" class="small-button save-watch-button">Salvar alterações</button>
      </div>
    `;

    const saveWatchButton = item.querySelector(".save-watch-button");
    const editBrand = item.querySelector(".edit-brand");
    const editModel = item.querySelector(".edit-model");
    const editPurchaseDate = item.querySelector(".edit-purchase-date");
    const editPrice = item.querySelector(".edit-price");
    const editHasBattery = item.querySelector(".edit-has-battery");
    const editBatteryDuration = item.querySelector(".edit-battery-duration");
    const editNote = item.querySelector(".edit-note");
    const editPhoto = item.querySelector(".edit-photo");

    editHasBattery.addEventListener("change", () => {
      editBatteryDuration.disabled = !editHasBattery.checked;
      if (!editHasBattery.checked) {
        editBatteryDuration.value = "";
      }
    });

    saveWatchButton.addEventListener("click", async () => {
      if (!currentUserId) {
        setFeedback("Faça login para editar relógios.", "error");
        return;
      }

      const brand = editBrand.value.trim();
      const model = editModel.value.trim();
      const purchaseDate = editPurchaseDate.value;
      const price = Number(editPrice.value);
      const hasBatteryValue = editHasBattery.checked;
      const batteryDuration = editBatteryDuration.value.trim();
      const note = editNote.value.trim();
      const photoFile = editPhoto.files?.[0] || null;

      if (!brand || !model || !purchaseDate || Number.isNaN(price) || price < 0) {
        setFeedback("Preencha marca, modelo, data e preço válidos antes de salvar.", "error");
        return;
      }

      if (hasBatteryValue && !batteryDuration) {
        setFeedback("Informe a duração da bateria ou desmarque a opção de bateria.", "error");
        return;
      }

      const photoError = validatePhoto(photoFile);
      if (photoError) {
        setFeedback(photoError, "error");
        return;
      }

      saveWatchButton.disabled = true;

      try {
        let photoUrlToSave = watch.photoUrl || null;
        if (photoFile) {
          photoUrlToSave = await uploadWatchPhoto(currentUserId, watch.id, photoFile);
        }

        await updateDoc(doc(db, "users", currentUserId, "watches", watch.id), {
          brand,
          model,
          purchaseDate,
          price,
          hasBattery: hasBatteryValue,
          batteryDuration: hasBatteryValue ? batteryDuration : null,
          note,
          photoUrl: photoUrlToSave,
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
  if (!hasBatteryInput.checked) {
    batteryDurationInput.value = "";
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
  const purchaseDate = purchaseDateInput.value;
  const price = Number(priceInput.value);
  const hasBattery = hasBatteryInput.checked;
  const batteryDuration = batteryDurationInput.value.trim();
  const photoFile = photoInput.files?.[0] || null;

  if (!brand || !model || !purchaseDate || Number.isNaN(price) || price < 0) {
    setFeedback("Preencha todos os campos obrigatórios do relógio.", "error");
    return;
  }

  if (hasBattery && !batteryDuration) {
    setFeedback("Informe a duração da bateria ou desmarque a opção de bateria.", "error");
    return;
  }

  const photoError = validatePhoto(photoFile);
  if (photoError) {
    setFeedback(photoError, "error");
    return;
  }

  setWatchLoading(true);

  try {
    const watchDocRef = doc(collection(db, "users", currentUserId, "watches"));
    let photoUrl = null;
    if (photoFile) {
      photoUrl = await uploadWatchPhoto(currentUserId, watchDocRef.id, photoFile);
    }

    await setDoc(watchDocRef, {
      brand,
      model,
      purchaseDate,
      price,
      hasBattery,
      batteryDuration: hasBattery ? batteryDuration : null,
      photoUrl,
      createdAt: serverTimestamp(),
    });

    watchForm.reset();
    batteryDurationInput.disabled = true;
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
    welcomeMessage.textContent = `Usuário autenticado: ${user.email}`;
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