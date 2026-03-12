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
  addDoc,
  doc,
  getDocs,
  query,
  orderBy,
  setDoc,
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
const purchaseDateInput = document.getElementById("purchase-date");
const priceInput = document.getElementById("price");
const hasBatteryInput = document.getElementById("has-battery");
const batteryDurationInput = document.getElementById("battery-duration");
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
    const batteryText = watch.hasBattery
      ? watch.batteryDuration || "Informação não preenchida"
      : "Não usa bateria";

    item.innerHTML = `
      <p><strong>Marca:</strong> ${watch.brand}</p>
      <p><strong>Modelo:</strong> ${watch.model}</p>
      <p><strong>Data da compra:</strong> ${formatDate(watch.purchaseDate)}</p>
      <p><strong>Preço:</strong> ${formatCurrency(watch.price)}</p>
      <p><strong>Duração da bateria:</strong> ${batteryText}</p>
    `;

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

  if (!brand || !model || !purchaseDate || Number.isNaN(price) || price < 0) {
    setFeedback("Preencha todos os campos obrigatórios do relógio.", "error");
    return;
  }

  if (hasBattery && !batteryDuration) {
    setFeedback("Informe a duração da bateria ou desmarque a opção de bateria.", "error");
    return;
  }

  setWatchLoading(true);

  try {
    await addDoc(collection(db, "users", currentUserId, "watches"), {
      brand,
      model,
      purchaseDate,
      price,
      hasBattery,
      batteryDuration: hasBattery ? batteryDuration : null,
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