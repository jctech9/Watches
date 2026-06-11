# Watches

> **Acesse o site:** [https://jctech9.github.io/Watches/](https://jctech9.github.io/Watches/)

Gerenciador de coleção de relógios de pulso com Firebase, PWA e design responsivo.

## Funcionalidades

- Autenticação por e-mail/senha via Firebase Auth
- CRUD completo de relógios (marca, modelo, data de compra, preço, precisão, bateria)
- Dashboard com métricas da coleção (total, idade média, status de bateria)
- Indicador visual de saúde da bateria com barra de progresso
- Suporte offline via Service Worker (PWA)
- Design responsivo mobile-first com 6 breakpoints
- Instalável como aplicativo no celular/desktop

## Tecnologias

- **Frontend:** HTML5, CSS3 (vanilla), JavaScript ES Modules
- **Backend:** Firebase Auth + Firestore
- **PWA:** Service Worker + Web App Manifest
- **Fonte:** Outfit (Google Fonts)
- **Hospedagem:** GitHub Pages

## Como usar

1. Acesse [https://jctech9.github.io/Watches/](https://jctech9.github.io/Watches/)
2. Faça login com e-mail e senha
3. Cadastre seus relógios preenchendo o formulário
4. Acompanhe os indicadores no painel

## Desenvolvimento

Não requer build — é só servir os arquivos com qualquer servidor HTTP:

```bash
npx serve .
```

## Estrutura

```
├── index.html              # Página principal
├── styles.css              # Estilos com design responsivo
├── app.js                  # Lógica da aplicação
├── utils.js                # Utilitários
├── service-worker.js       # Cache offline
├── manifest.webmanifest    # Manifest PWA
└── assets/icons/           # Ícones do PWA
```
