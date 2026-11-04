// Estado da calculadora
let currentValue = "0";
let previousValue = "";
let operator = null;
let shouldResetDisplay = false;

const mainDisplay = document.getElementById("main-display");
const historyDisplay = document.getElementById("history-display");
const keypad = document.querySelector(".keypad");
const btnInstall = document.getElementById("btn-install");

function formatDisplay(value) {
  return String(value).replace(".", ",");
}

function operatorSymbol(op) {
  return op === "*" ? "×" : op === "/" ? "÷" : op;
}

function updateDisplay() {
  mainDisplay.textContent = formatDisplay(currentValue);

  if (operator && previousValue !== "") {
    historyDisplay.textContent =
      `${formatDisplay(previousValue)} ${operatorSymbol(operator)}`;
  } else {
    historyDisplay.textContent = "";
  }
}

function appendDigit(digit) {
  if (currentValue === "Erro" || currentValue === "0" || shouldResetDisplay) {
    currentValue = digit;
    shouldResetDisplay = false;
  } else if (currentValue.length < 12) {
    currentValue += digit;
  }
  updateDisplay();
}

function appendDecimal() {
  if (currentValue === "Erro") currentValue = "0";

  if (shouldResetDisplay) {
    currentValue = "0.";
    shouldResetDisplay = false;
  } else if (!currentValue.includes(".")) {
    currentValue += ".";
  }
  updateDisplay();
}

function clearAll() {
  currentValue = "0";
  previousValue = "";
  operator = null;
  shouldResetDisplay = false;
  updateDisplay();
}

function backspace() {
  if (shouldResetDisplay || currentValue === "Erro") return;

  if (
    currentValue.length === 1 ||
    (currentValue.length === 2 && currentValue.startsWith("-"))
  ) {
    currentValue = "0";
  } else {
    currentValue = currentValue.slice(0, -1);
  }
  updateDisplay();
}

function toggleSign() {
  if (currentValue === "0" || currentValue === "Erro") return;
  currentValue = String(Number(currentValue) * -1);
  updateDisplay();
}

function percentage() {
  if (currentValue === "Erro") return;
  currentValue = String(Number(currentValue) / 100);
  shouldResetDisplay = true;
  updateDisplay();
}

function setOperator(op) {
  if (currentValue === "Erro") return;

  if (operator && !shouldResetDisplay) {
    calculate();
  }

  previousValue = currentValue;
  operator = op;
  shouldResetDisplay = true;
  updateDisplay();
}

function calculate() {
  if (!operator || previousValue === "") return;

  const previous = Number(previousValue);
  const current = Number(currentValue);
  let result;

  switch (operator) {
    case "+":
      result = previous + current;
      break;
    case "-":
      result = previous - current;
      break;
    case "*":
      result = previous * current;
      break;
    case "/":
      if (current === 0) {
        currentValue = "Erro";
        operator = null;
        previousValue = "";
        shouldResetDisplay = true;
        updateDisplay();
        return;
      }
      result = previous / current;
      break;
    default:
      return;
  }

  if (!Number.isFinite(result)) {
    currentValue = "Erro";
  } else {
    // Limita a precisão exibida e evita resíduos comuns de ponto flutuante.
    result = Math.round((result + Number.EPSILON) * 1e10) / 1e10;
    currentValue = String(result);
  }

  historyDisplay.textContent =
    `${formatDisplay(previousValue)} ${operatorSymbol(operator)} ` +
    `${formatDisplay(String(current))} =`;

  operator = null;
  previousValue = "";
  shouldResetDisplay = true;
  mainDisplay.textContent = formatDisplay(currentValue);
}

function handleAction(action) {
  switch (action) {
    case "clear":
      clearAll();
      break;
    case "sign":
      toggleSign();
      break;
    case "percent":
      percentage();
      break;
    case "backspace":
      backspace();
      break;
    case "decimal":
      appendDecimal();
      break;
    case "equals":
      calculate();
      break;
  }
}

// Um único listener atende todos os botões do teclado.
keypad.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.digit !== undefined) {
    appendDigit(button.dataset.digit);
  } else if (button.dataset.operator) {
    setOperator(button.dataset.operator);
  } else if (button.dataset.action) {
    handleAction(button.dataset.action);
  }
});

// Atalhos do teclado físico.
document.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement) return;

  if (/^[0-9]$/.test(event.key)) {
    appendDigit(event.key);
  } else if (event.key === "." || event.key === ",") {
    appendDecimal();
  } else if (["+", "-", "*", "/"].includes(event.key)) {
    setOperator(event.key);
  } else if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    calculate();
  } else if (event.key === "Backspace") {
    backspace();
  } else if (event.key === "Escape" || event.key.toLowerCase() === "c") {
    clearAll();
  }
});

// Instalação PWA.
let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  btnInstall.hidden = false;
});

btnInstall.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  btnInstall.hidden = true;
});

window.addEventListener("appinstalled", () => {
  btnInstall.hidden = true;
});

// Temas disponíveis. O tema escolhido fica salvo neste dispositivo.
const themes = [
  { id: "classic", label: "Clássico" },
  { id: "dark", label: "Escuro" },
  { id: "light", label: "Claro" }
];

const themeButton = document.getElementById("btn-theme");
const themeLabel = document.getElementById("theme-label");

function applyTheme(themeId) {
  const selectedTheme = themes.find((theme) => theme.id === themeId) || themes[0];

  document.documentElement.dataset.theme = selectedTheme.id;
  themeLabel.textContent = selectedTheme.label;
  themeButton.setAttribute("aria-label", `Tema atual: ${selectedTheme.label}. Clique para alterar.`);
  themeButton.title = `Tema atual: ${selectedTheme.label}. Clique para alterar.`;

  try {
    localStorage.setItem("calculadora-theme", selectedTheme.id);
  } catch (error) {
    // A calculadora continua funcionando mesmo se o armazenamento estiver bloqueado.
  }
}

function cycleTheme() {
  const currentTheme = document.documentElement.dataset.theme || "classic";
  const currentIndex = themes.findIndex((theme) => theme.id === currentTheme);
  const nextTheme = themes[(currentIndex + 1) % themes.length];
  applyTheme(nextTheme.id);
}

themeButton.addEventListener("click", cycleTheme);

let savedTheme = "classic";
try {
  savedTheme = localStorage.getItem("calculadora-theme") || "classic";
} catch (error) {
  // Usa o tema clássico quando o armazenamento não estiver disponível.
}
applyTheme(savedTheme);

updateDisplay();

// Registro do Service Worker externo.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch((error) => console.error("Falha ao registrar o Service Worker:", error));
  });
}
