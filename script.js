let stack = { X: 0, Y: 0, Z: 0, T: 0 };
let finReg = { n: 0, i: 0, PV: 0, PMT: 0, FV: 0 };
let paymentMode = "END";      // "END" (g + 8) ou "BEG" (g + 7)
let compoundFraction = false; // Alternado com STO + EEX (indicador 'c' no visor)
let lastWasTVM = false;       // Controla se armazena ou calcula a incógnita
let inputBuffer = "";
let isEntering = false;
let decimals = 2;
let prefix = null;
let stackLiftEnabled = true;
let dateFormat = "MDY";
let dateResultDisplay = null;

const mainDisplay = document.getElementById("main-display");
const modifierStatus = document.getElementById("modifier-status");
const keypad = document.querySelector(".keypad");
const dateModeStatus = document.getElementById("date-mode-status");

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
  if (dateModeStatus) {
    dateModeStatus.textContent = dateFormat === "DMY" ? "D.MY" : "";
  }

  if (dateResultDisplay !== null) {
    mainDisplay.textContent = dateResultDisplay;
  } else if (isEntering) {
    const hasDecimal = inputBuffer.includes(".");
    const parts = inputBuffer.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    mainDisplay.textContent = hasDecimal ? parts.join(".") : parts[0];
  } else {
    mainDisplay.textContent = formatHPNumber(stack.X, decimals);
  }

  debugStack();
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
  dateResultDisplay = null;

  if (prefix === "f") {
    const num = parseInt(digit, 10);
    if (!isNaN(num)) decimals = num;
    prefix = null;
    updateDisplay();
    return;
  }

  if (prefix === "g") {
    if (digit === "4") {
      dateFormat = "DMY";
    } else if (digit === "5") {
      dateFormat = "MDY";
    } else if (digit === "7") {
      paymentMode = "BEG";
    } else if (digit === "8") {
      paymentMode = "END";
    }
    prefix = null;
    updateDisplay();
    return;
  }

  if (!isEntering) {
    if (stackLiftEnabled) {
      pushStack(0);
    }
    inputBuffer = digit;
    isEntering = true;
    stackLiftEnabled = true;
  } else {
    if (inputBuffer.length < 10) inputBuffer += digit;
  }

  lastWasTVM = false; // Garante que a próxima tecla financeira ARMAZENE este novo número
  stack.X = parseFloat(inputBuffer) || 0;
  prefix = null;
  updateDisplay();
}

function parseHPDate(num) {
  const absNum = Math.abs(num);
  const firstPart = Math.floor(absNum + 1e-9);
  const fracStr = (absNum - firstPart).toFixed(6).substring(2);

  const secondPart = parseInt(fracStr.substring(0, 2), 10);
  const year = parseInt(fracStr.substring(2, 6), 10);

  let day, month;
  if (dateFormat === "DMY") {
    day = firstPart;
    month = secondPart;
  } else {
    month = firstPart;
    day = secondPart;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1582 || year > 4046) {
    return null;
  }

  const dateObj = new Date(Date.UTC(year, month - 1, day));
  if (
    dateObj.getUTCFullYear() !== year ||
    dateObj.getUTCMonth() !== month - 1 ||
    dateObj.getUTCDate() !== day
  ) {
    return null;
  }

  return { dateObj, day, month, year };
}

function handleDecimal() {
  dateResultDisplay = null;

  if (prefix === "f") {
    prefix = null;
    updateDisplay();
    return;
  }

  if (!isEntering) {
    if (stackLiftEnabled) {
      pushStack(0);
    }
    inputBuffer = "0.";
    isEntering = true;
    stackLiftEnabled = true;
  } else {
    if (!inputBuffer.includes(".")) {
      inputBuffer += ".";
    }
  }

  lastWasTVM = false;
  stack.X = parseFloat(inputBuffer) || 0;
  prefix = null;
  updateDisplay();
}

function handleEnter() {
  dateResultDisplay = null;

  if (isEntering) {
    isEntering = false;
    inputBuffer = "";
  }

  pushStack(stack.X);
  stackLiftEnabled = false;
  lastWasTVM = false;
  prefix = null;
  updateDisplay();
}

function handleOperation(op) {
  dateResultDisplay = null;

  if (isEntering) {
    stack.X = parseFloat(inputBuffer) || 0;
    isEntering = false;
    inputBuffer = "";
  }

  const x = popStack();
  const y = stack.X;

  switch (op) {
    case "+": stack.X = y + x; break;
    case "-": stack.X = y - x; break;
    case "*": stack.X = y * x; break;
    case "/": stack.X = x !== 0 ? y / x : 0; break;
  }

  stackLiftEnabled = true;
  lastWasTVM = false;
  prefix = null;
  updateDisplay();
}

function debugStack() {
  console.clear();
  console.log("=== HP-12C | ESTADO DA PILHA ===");
  console.table([
    { Registrador: "T", Valor: stack.T },
    { Registrador: "Z", Valor: stack.Z },
    { Registrador: "Y", Valor: stack.Y },
    { Registrador: "X", Valor: stack.X }
  ]);
  console.log({
    Entrada: inputBuffer,
    Digitando: isEntering,
    ElevacaoDaPilha: stackLiftEnabled,
    Prefixo: prefix,
    FormatoData: dateFormat,
    RegistradoresTVM: { ...finReg }
  });
}

function solveTVM(target) {
  let { n, i, PV, PMT, FV } = finReg;
  const S = paymentMode === "BEG" ? 1 : 0;

  if (target !== "i" && i <= -100) return "Error 5";

  const r = i / 100;

  function compoundFactor(rate, periods) {
    if (compoundFraction || Number.isInteger(periods)) {
      return Math.pow(1 + rate, periods);
    }
    const intPart = Math.trunc(periods);
    const fracPart = periods - intPart;
    return Math.pow(1 + rate, intPart) * (1 + rate * fracPart);
  }

  switch (target) {
    case "FV": {
      if (r === 0) return -(PV + PMT * n);
      const factor = compoundFactor(r, n);
      return -(PV * factor + PMT * (1 + r * S) * ((factor - 1) / r));
    }

    case "PV": {
      if (r === 0) return -(FV + PMT * n);
      const factor = compoundFactor(r, n);
      return -(FV + PMT * (1 + r * S) * ((factor - 1) / r)) / factor;
    }

    case "PMT": {
      if (n === 0) return "Error 5";
      if (r === 0) return -(PV + FV) / n;
      const factor = compoundFactor(r, n);
      const denom = (1 + r * S) * ((factor - 1) / r);
      if (denom === 0) return "Error 5";
      return -(PV * factor + FV) / denom;
    }

    case "n": {
      if (r === 0) {
        if (PMT === 0) return "Error 5";
        return -(PV + FV) / PMT;
      }
      if (PMT === 0) {
        if (PV === 0 || FV === 0 || (PV > 0 && FV > 0) || (PV < 0 && FV < 0)) {
          return "Error 5";
        }
        return Math.log(-FV / PV) / Math.log(1 + r);
      }
      const pmtAdj = PMT * (1 + r * S);
      const num = pmtAdj - FV * r;
      const den = pmtAdj + PV * r;
      if (den === 0 || num / den <= 0) return "Error 5";
      const exactN = Math.log(num / den) / Math.log(1 + r);
      return exactN > 0 ? Math.ceil(exactN - 1e-9) : exactN;
    }

    case "i": {
      if (n <= 0) return "Error 5";
      let rate = 0.01;
      for (let iter = 0; iter < 100; iter++) {
        const factor = Math.pow(1 + rate, n);
        const f = PV * factor + PMT * (1 + rate * S) * ((factor - 1) / rate) + FV;
        if (Math.abs(f) < 1e-10) {
          return rate * 100;
        }
        const h = 1e-7;
        const factorH = Math.pow(1 + rate + h, n);
        const fH = PV * factorH + PMT * (1 + (rate + h) * S) * ((factorH - 1) / (rate + h)) + FV;
        const df = (fH - f) / h;
        if (df === 0) break;
        const nextRate = rate - f / df;
        if (nextRate <= -1) rate = rate / 2;
        else rate = nextRate;
      }
      return "Error 5";
    }
  }
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

  dateResultDisplay = null;

  if (action === "decimal") {
    handleDecimal();
    return;
  }

  // Limpar registradores financeiros (f + FIN na tecla x≷y / swap)
  if (action === "swap" && prefix === "f") {
    finReg = { n: 0, i: 0, PV: 0, PMT: 0, FV: 0 };
    lastWasTVM = false;
    prefix = null;
    updateDisplay();
    return;
  }

  // Teclas Financeiras (n, i, PV, PMT, FV)
  if (["n", "i", "PV", "PMT", "FV"].includes(action)) {
    if (isEntering) {
      stack.X = parseFloat(inputBuffer) || 0;
      isEntering = false;
      inputBuffer = "";
    }

    if (prefix === "g") {
      if (action === "n") finReg.n = stack.X * 12;
      if (action === "i") finReg.i = stack.X / 12;
      stack.X = finReg[action];
      lastWasTVM = true;
    } else if (prefix === null) {
      if (!lastWasTVM) {
        finReg[action] = stack.X;
        lastWasTVM = true;
      } else {
        const result = solveTVM(action);
        if (typeof result === "string") {
          mainDisplay.textContent = result;
          prefix = null;
          lastWasTVM = false;
          updateLedStatus();
          return;
        }
        finReg[action] = result;
        stack.X = result;
        lastWasTVM = true;
      }
    }

    stackLiftEnabled = true;
    prefix = null;
    updateDisplay();
    return;
  }

  switch (action) {
    case "EEX": {
      if (isEntering) {
        stack.X = parseFloat(inputBuffer) || 0;
        isEntering = false;
        inputBuffer = "";
      }

      if (prefix === "g") {
        const start = parseHPDate(stack.Y);
        const end = parseHPDate(stack.X);

        if (!start || !end) {
          mainDisplay.textContent = "Error 8";
          prefix = null;
          updateLedStatus();
          return;
        }

        const msPerDay = 24 * 60 * 60 * 1000;
        const actualDays = Math.round((end.dateObj - start.dateObj) / msPerDay);

        const d1 = Math.min(start.day, 30);
        const d2 = (end.day === 31 && (start.day === 30 || start.day === 31)) ? 30 : end.day;
        const days360 = (end.year - start.year) * 360 + (end.month - start.month) * 30 + (d2 - d1);

        stack.Y = days360;
        stack.X = actualDays;
        stackLiftEnabled = true;
        lastWasTVM = false;
        break;
      }
      break;
    }

    case "reciprocal": {
      if (isEntering) {
        stack.X = parseFloat(inputBuffer) || 0;
        isEntering = false;
        inputBuffer = "";
      }

      if (stack.X === 0) {
        mainDisplay.textContent = "Error 0";
        prefix = null;
        updateLedStatus();
        return;
      }

      stack.X = 1 / stack.X;
      stackLiftEnabled = true;
      lastWasTVM = false;
      break;
    }

    case "power": {
      if (isEntering) {
        stack.X = parseFloat(inputBuffer) || 0;
        isEntering = false;
        inputBuffer = "";
      }

      if (prefix === "g") {
        if (stack.X < 0) {
          mainDisplay.textContent = "Error 0";
          prefix = null;
          updateLedStatus();
          return;
        }

        stack.X = Math.sqrt(stack.X);
        stackLiftEnabled = true;
        lastWasTVM = false;
        break;
      }

      const exponent = stack.X;
      const base = stack.Y;

      if (
        (base === 0 && exponent <= 0) ||
        (base < 0 && !Number.isInteger(exponent))
      ) {
        mainDisplay.textContent = "Error 0";
        prefix = null;
        updateLedStatus();
        return;
      }

      stack.X = Math.pow(base, exponent);
      stack.Y = stack.Z;
      stack.Z = stack.T;
      stackLiftEnabled = true;
      lastWasTVM = false;
      break;
    }

    case "percent":
      if (isEntering) {
        stack.X = parseFloat(inputBuffer) || 0;
        isEntering = false;
        inputBuffer = "";
      }
      stack.X = (stack.Y * stack.X) / 100;
      stackLiftEnabled = true;
      lastWasTVM = false;
      break;

    case "pct_delta":
      if (isEntering) {
        stack.X = parseFloat(inputBuffer) || 0;
        isEntering = false;
        inputBuffer = "";
      }
      if (stack.Y === 0) {
        stack.X = 0;
      } else {
        stack.X = ((stack.X - stack.Y) / stack.Y) * 100;
      }
      stackLiftEnabled = true;
      lastWasTVM = false;
      break;

    case "pct_total":
      if (isEntering) {
        stack.X = parseFloat(inputBuffer) || 0;
        isEntering = false;
        inputBuffer = "";
      }
      if (stack.Y === 0) {
        stack.X = 0;
      } else {
        stack.X = (stack.X / stack.Y) * 100;
      }
      stackLiftEnabled = true;
      lastWasTVM = false;
      break;

    case "CHS": {
      if (prefix === "g") {
        if (isEntering) {
          stack.X = parseFloat(inputBuffer) || 0;
          isEntering = false;
          inputBuffer = "";
        }

        const daysOffset = Math.trunc(popStack());
        const baseDate = parseHPDate(stack.X);

        if (!baseDate) {
          mainDisplay.textContent = "Error 8";
          prefix = null;
          updateLedStatus();
          return;
        }

        const resultDate = new Date(baseDate.dateObj.getTime());
        resultDate.setUTCDate(resultDate.getUTCDate() + daysOffset);

        const rDay = resultDate.getUTCDate();
        const rMonth = resultDate.getUTCMonth() + 1;
        const rYear = resultDate.getUTCFullYear();

        if (rYear < 1582 || rYear > 4046) {
          mainDisplay.textContent = "Error 8";
          prefix = null;
          updateLedStatus();
          return;
        }

        const jsDay = resultDate.getUTCDay();
        const hpWeekday = jsDay === 0 ? 7 : jsDay;

        const ddStr = String(rDay).padStart(2, "0");
        const mmStr = String(rMonth).padStart(2, "0");
        const yyyyStr = String(rYear).padStart(4, "0");

        if (dateFormat === "DMY") {
          stack.X = parseFloat(`${rDay}.${mmStr}${yyyyStr}`);
          dateResultDisplay = `${ddStr},${mmStr},${yyyyStr}   ${hpWeekday}`;
        } else {
          stack.X = parseFloat(`${rMonth}.${ddStr}${yyyyStr}`);
          dateResultDisplay = `${mmStr},${ddStr},${yyyyStr}   ${hpWeekday}`;
        }

        stackLiftEnabled = true;
        lastWasTVM = false;
        break;
      }

      stack.X = stack.X * -1;
      if (isEntering) inputBuffer = String(stack.X);
      break;
    }

    case "CLx":
      stack.X = 0;
      inputBuffer = "";
      isEntering = false;
      stackLiftEnabled = false;
      lastWasTVM = false;
      break;

    case "swap": {
      const t = stack.X;
      stack.X = stack.Y;
      stack.Y = t;
      stackLiftEnabled = true;
      lastWasTVM = false;
      break;
    }

    case "roll_down": {
      const tx = stack.X;
      stack.X = stack.Y;
      stack.Y = stack.Z;
      stack.Z = stack.T;
      stack.T = tx;
      stackLiftEnabled = true;
      lastWasTVM = false;
      break;
    }
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