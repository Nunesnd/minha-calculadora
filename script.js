let stack = { X: 0, Y: 0, Z: 0, T: 0 };
let finReg = { n: 0, i: 0, PV: 0, PMT: 0, FV: 0 };
let inputBuffer = "";
let isEntering = false;
let decimals = 2;
let prefix = null;
let stackLiftEnabled = true;
let dateFormat = "MDY"; // "MDY" (americano, padrão) ou "DMY" (brasileiro)

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

  if (prefix === 'f') {
    const num = parseInt(digit, 10);
    if (!isNaN(num)) decimals = num;
    prefix = null;
    updateDisplay();
    return;
  }

  // Novo bloco para o prefixo azul 'g' nas teclas numéricas
  if (prefix === "g") {
    if (digit === "4") {
      dateFormat = "DMY"; // Ativa modo Dia.MêsAno (Brasil)
    } else if (digit === "5") {
      dateFormat = "MDY"; // Ativa modo Mês.DiaAno (EUA)
    }
    prefix = null;
    updateDisplay();
    return;
  }

  if (!isEntering) {

    // Só desloca a pilha se a elevação estiver habilitada
    if (stackLiftEnabled) {
      pushStack(0);
    }

    inputBuffer = digit;
    isEntering = true;

    // Após começar a digitação, a próxima entrada
    // deverá respeitar a elevação normal da pilha
    stackLiftEnabled = true;

  } else {
    if (inputBuffer.length < 10) inputBuffer += digit;
  }

  stack.X = parseFloat(inputBuffer) || 0;
  prefix = null;
  updateDisplay();
}

function parseHPDate(num) {
  // Separa parte inteira e os 6 dígitos decimais (ex: 7.091822 -> int=7, dec="091822")
  const absNum = Math.abs(num);
  const firstPart = Math.floor(absNum + 1e-9);
  const fracStr = (absNum - firstPart).toFixed(6).substring(2); // 6 dígitos após o ponto

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

  // Validação de limites da HP 12C
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1582 || year > 4046) {
    return null;
  }

  // Cria a data em UTC para evitar problemas de horário de verão (DST)
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  if (
    dateObj.getUTCFullYear() !== year ||
    dateObj.getUTCMonth() !== month - 1 ||
    dateObj.getUTCDate() !== day
  ) {
    return null; // Ex: 30 de fevereiro
  }

  return { dateObj, day, month, year };
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

  // ENTER desabilita a elevação automática
  stackLiftEnabled = false;

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

  stackLiftEnabled = true;

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
    Prefixo: prefix
  });
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

    case "EEX": {
      if (isEntering) {
        stack.X = parseFloat(inputBuffer) || 0;
        isEntering = false;
        inputBuffer = "";
      }

      if (prefix === "g") {
        // Função ΔDYS: diferença entre data em Y (inicial) e data em X (final)
        const start = parseHPDate(stack.Y);
        const end = parseHPDate(stack.X);

        if (!start || !end) {
          mainDisplay.textContent = "Error 8"; // Código oficial da HP 12C para data inválida
          prefix = null;
          updateLedStatus();
          return;
        }

        // 1. Dias exatos (calendário civil) -> vai para X
        const msPerDay = 24 * 60 * 60 * 1000;
        const actualDays = Math.round((end.dateObj - start.dateObj) / msPerDay);

        // 2. Dias comerciais (base 30/360 padrão HP 12C) -> vai para Y
        const d1 = Math.min(start.day, 30);
        const d2 = (end.day === 31 && (start.day === 30 || start.day === 31)) ? 30 : end.day;
        const days360 = (end.year - start.year) * 360 + (end.month - start.month) * 30 + (d2 - d1);

        // Atualiza X e Y (Z e T permanecem intactos, igual na HP 12C)
        stack.Y = days360;
        stack.X = actualDays;
        break;
      }

      // Aqui entrará a notação científica (EEX normal) quando não houver prefixo 'g'
      break;
    }

    case "reciprocal": {
          // 1. Confirma a digitação atual em X, se o usuário estiver digitando
          if (isEntering) {
            stack.X = parseFloat(inputBuffer) || 0;
            isEntering = false;
            inputBuffer = "";
          }

          // 2. Regra da HP 12C: divisão por zero (1 / 0) gera Error 0
          if (stack.X === 0) {
            mainDisplay.textContent = "Error 0";
            prefix = null;
            updateLedStatus();
            return;
          }

          // 3. Calcula o inverso de X mantendo Y, Z e T preservados
          stack.X = 1 / stack.X;
          break;
        }

    case "power": {
      // Confirma a entrada do número
      if (isEntering) {
        stack.X = parseFloat(inputBuffer) || 0;
        isEntering = false;
        inputBuffer = "";
      }

        if (prefix === "g") {
          // Regra da HP 12C: raiz quadrada de número negativo gera Error 0
          if (stack.X < 0) {
            mainDisplay.textContent = "Error 0";
            prefix = null;
            updateLedStatus();
            return;
          }

          // Calcula √X mantendo Y, Z e T intactos
          stack.X = Math.sqrt(stack.X);
          break;
        }

      // Recupera os dois operandos antes de alterar a pilha
      const exponent = stack.X;
      const base = stack.Y;

      // Verifica condições matemáticas inválidas
      if (
        (base === 0 && exponent <= 0) ||
        (base < 0 && !Number.isInteger(exponent))
      ) {
        mainDisplay.textContent = "Error 0";
        prefix = null;
        return;
      }

      // Calcula a potência
      const result = Math.pow(base, exponent);

      // Armazena o resultado em X
      stack.X = result;

      // Desce a pilha
      stack.Y = stack.Z;
      stack.Z = stack.T;

      stackLiftEnabled = true;

      prefix = null;
      break;
    }
    
    case "percent":
      // Funcionamento da tecla %
      if (isEntering) {
        stack.X = parseFloat(inputBuffer) || 0;
        isEntering = false;
        inputBuffer = "";
      }
      
      stack.X = (stack.Y * stack.X) / 100;
      break;

    case "pct_delta":
      // Funcionamento da tecla Δ%
      if (isEntering) {
        stack.X = parseFloat(inputBuffer) || 0;
        isEntering = false;
        inputBuffer = "";
      }
      // Evita divisão por zero caso a base Y seja 0
      if (stack.Y === 0) {
        stack.X = 0;
      } else {
      // Calcula a variação percentual mantendo Y intacto
        stack.X = ((stack.X - stack.Y) / stack.Y) * 100;
      }
      break;

    case "pct_total":
      // Funcionamento da tecla %T
      if (isEntering) {
        stack.X = parseFloat(inputBuffer) || 0;
        isEntering = false;
        inputBuffer = "";
      }
      // Evita divisão por zero caso o total (Y) seja 0
      if (stack.Y === 0) {
        stack.X = 0;
      } else {
        // Calcula quanto X representa de Y, mantendo Y intacto
        stack.X = (stack.X / stack.Y) * 100;
      }
      break;

    case "CHS":
      //Inverte o sinal do número
      stack.X = stack.X * -1;
      if (isEntering) inputBuffer = String(stack.X);
      break;

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