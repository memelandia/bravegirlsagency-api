# BraveGirls Agency - API Backend

Backend API para BraveGirls Agency. Proxy para OnlyMonster API y Google Sheets.

## 🚀 Despliegue en Vercel

Este proyecto está configurado para desplegarse automáticamente en Vercel.

## 📡 Endpoints

- `GET /health` - Health check
- `GET /api/sheets/:spreadsheetId/:gid?apiKey=XXX` - Google Sheets data
- `GET /api/accounts` - Lista de cuentas OnlyMonster
- `GET /api/accounts/:accountId/transactions` - Transacciones

## 🔧 Variables de Entorno

Configura en Vercel:
- `ONLYMONSTER_API_KEY` - Token de OnlyMonster API

## 📦 Estructura

```
/api
  /accounts
    /[accountId]
      transactions.js
    index.js
  /sheets
    /[spreadsheetId]
      /[gid].js
  health.js
```
