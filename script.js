let stack = { X: 0, Y: 0, Z: 0, T: 0 };
let finReg = { n: 0, i: 0, PV: 0, PMT: 0, FV: 0 };
let inputBuffer = "";
let isEntering = false;
let decimals = 2;
let prefix = null;

const mainDisplay = document.getElementById("main-display");
const modifierStatus = document.getElementById("modifier-status");
const keypad = document.querySelector(".keypad");

function updateLedStatus() {
  document.body.classList.remove("mode-f-active", "mode-g-active");
  if (prefix === "f") {
    document.body.classList.add("mode-f-active");
  } else if (prefix === "g") {
    document.body.classList.add("mode-g-active");
  }
}

function formatHPNumber(num, decCount) {
  const parsed = Number(num);
  if (isNaN(parsed)) return "0.00";
  
  const parts = parsed.toFixed(decCount).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

function updateDisplay() {
modifierStatus.textContent = prefix ? prefix.toUpperCase() : "";

  if (isEntering) {
    // Se o usuário está digitando, formatamos a parte inteira do buffer sem perder o ponto que ele pode estar colocando
    const hasDecimal = inputBuffer.includes(".");
    const parts = inputBuffer.split(".");
    
    // Formata milhar apenas na parte inteira já digitada
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    
    mainDisplay.textContent = hasDecimal ? parts.join(".") : parts[0];
  } else {
    // Quando exibe o resultado da pilha (após +, -, *, /, ENTER), usa a formatação completa da pilha X
    mainDisplay.textContent = formatHPNumber(stack.X, decimals);
  }
  
  updateLedStatus();
}

function pushStack(val) {
  stack.T = stack.Z;
  stack.Z = stack.Y;
  stack.Y = stack.X;
  stack.X = val;
}

function popStack() {
  const x = stack.X;
  stack.X = stack.Y;
  stack.Y = stack.Z;
  stack.Z = stack.T;
  return x;
}

function handleDigit(digit) {
if (prefix === 'f') {
    const num = parseInt(digit, 10);
    if (!isNaN(num)) decimals = num;
    prefix = null;
    updateDisplay();
    return;
  }

  if (!isEntering) {
    pushStack(0);
    inputBuffer = digit;
    isEntering = true;
  } else {
    if (inputBuffer.length < 10) inputBuffer += digit;
  }
  
  stack.X = parseFloat(inputBuffer) || 0;
  prefix = null;
  updateDisplay();
}

function handleDecimal() {
  if (prefix === 'f') {
    prefix = null;
    updateDisplay();
    return;
  }

  if (!isEntering) {
    pushStack(0);
    inputBuffer = "0.";
    isEntering = true;
  } else {
    // Permite apenas um ponto decimal no buffer de entrada
    if (!inputBuffer.includes(".")) {
      inputBuffer += ".";
    }
  }
  
  stack.X = parseFloat(inputBuffer) || 0;
  prefix = null;
  updateDisplay();
}

function handleEnter() {
  if (isEntering) {
    isEntering = false;
    inputBuffer = "";
  }
  pushStack(stack.X);
  prefix = null;
  updateDisplay();
}

function handleOperation(op) {
// 1. Se o usuário estava digitando um número, confirma a entrada no registrador X
  if (isEntering) {
    stack.X = parseFloat(inputBuffer) || 0;
    isEntering = false;
    inputBuffer = "";
  }

  // 2. Retira o valor do topo (X) e o valor anterior (Y) para calcular
  const x = popStack();
  const y = stack.X;

  // 3. Realiza a operação matemática
  switch (op) {
    case "+": stack.X = y + x; break;
    case "-": stack.X = y - x; break;
    case "*": stack.X = y * x; break;
    case "/": stack.X = x !== 0 ? y / x : 0; break;
  }

  prefix = null;
  updateDisplay();
}

function handleAction(action) {
  if (action === "prefix_f") { 
    prefix = prefix === "f" ? null : "f"; 
    updateDisplay(); 
    return; 
  }
  if (action === "prefix_g") { 
    prefix = prefix === "g" ? null : "g"; 
    updateDisplay(); 
    return; 
  }

  if (action === "decimal") {
    handleDecimal();
    return;
  }

  if (["n", "i", "PV", "PMT", "FV"].includes(action)) {
    if (prefix === "g") {
      if (action === "n") finReg.n = stack.X * 12;
      if (action === "i") finReg.i = stack.X / 12;
    } else {
      finReg[action] = stack.X;
    }
    prefix = null;
    isEntering = false;
    updateDisplay();
    return;
  }

  switch (action) {
    case "CHS":
      stack.X = stack.X * -1;
      if (isEntering) inputBuffer = String(stack.X);
      break;
    case "CLx":
      stack.X = 0;
      inputBuffer = "";
      isEntering = false;
      break;
    case "swap":
      const t = stack.X; stack.X = stack.Y; stack.Y = t;
      break;
    case "roll_down":
      const tx = stack.X; stack.X = stack.Y; stack.Y = stack.Z; stack.Z = stack.T; stack.T = tx;
      break;
  }

  prefix = null;
  updateDisplay();
}

keypad.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  if (btn.dataset.digit !== undefined) handleDigit(btn.dataset.digit);
  else if (btn.dataset.operator) handleOperation(btn.dataset.operator);
  else if (btn.dataset.action === "ENTER") handleEnter();
  else if (btn.dataset.action) handleAction(btn.dataset.action);
});

updateDisplay();