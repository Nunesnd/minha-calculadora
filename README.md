# Calculadora

Projeto separado em arquivos por responsabilidade:

- `index.html`: estrutura da página.
- `styles.css`: aparência e responsividade.
- `script.js`: operações matemáticas, teclado físico e instalação.
- `manifest.webmanifest`: informações de instalação do PWA.
- `service-worker.js`: cache dos arquivos para funcionamento offline.
- `icon.svg`: ícone da aplicação.

## Executar localmente

O Service Worker e a instalação PWA precisam de um contexto seguro (`https://`) ou de `localhost`.

Na pasta do projeto, execute:

```bash
python3 -m http.server 8000
```

Depois abra:

```text
http://localhost:8000
```

Para testar em um celular na mesma rede, use o IP local do computador no navegador do celular. Para instalação PWA no celular, normalmente será necessário publicar o site em HTTPS.

## Observação

Esta versão mantém a calculadora básica original. Ela ainda não é uma emulação HP 12C: não implementa RPN, registradores financeiros, programação ou funções financeiras específicas.
