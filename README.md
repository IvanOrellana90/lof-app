# Lof 🏔️🌊

> **Lof** (del mapudungún): *Unidad básica de organización social y territorial de la cultura mapuche, basada en lazos familiares.*

**Lof** es una aplicación web (PWA) diseñada para llevar la **gestión, transparencia y organización** de una casa de vacaciones familiar. Su objetivo es eliminar malentendidos mediante un sistema centralizado de reservas, cálculo automático de costos y reglas claras.

![Vista Previa de la App](./public/images/screenshot.png)

## 🚀 Funcionalidades Principales

- **📅 Calendario Inteligente:**
  - Visualización clara de fechas disponibles y ocupadas.
  - Bloqueo automático de fechas confirmadas.
  - Soporte para rangos de fechas (Check-in / Check-out).

- **💰 Calculadora de Costos ("La Vaca"):**
  - Cálculo automático basado en reglas de negocio configurables.
  - Diferenciación de tarifas por Adultos vs Niños.
  - Lógica de exención de pago por edad (ej: menores de 6 años gratis).

- **✅ Flujo de Aprobación:**
  - Las reservas nacen como **Solicitudes (Pendientes)**.
  - Panel de administración para **Aprobar** o **Rechazar** solicitudes.
  - Historial de rechazos (las fechas se liberan pero queda el registro).

- **📊 Transparencia Financiera:**
  - Visualización de datos bancarios para transferencias.
  - Resumen de reglas de cobro (Gastos Fijos vs Variables).

## 🛠️ Stack Tecnológico

El proyecto está construido con tecnologías modernas pensando en escalabilidad y futura migración a App Móvil (React Native).

- **Frontend:** [React](https://react.dev/) + [Vite](https://vitejs.dev/) + TypeScript.
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/) (Diseño Responsive).
- **Iconos:** [Lucide React](https://lucide.dev/).
- **Manejo de Fechas:** `date-fns` + `react-day-picker`.
- **Backend (BaaS):** [Firebase](https://firebase.google.com/) (Firestore Database).
- **Notificaciones:** `sonner` (Toasts).

## ⚙️ Configuración y Reglas de Negocio

El proyecto está diseñado para ser flexible. Las tarifas y reglas no están "duras" en el código, sino centralizadas en `src/config/rules.ts`:

```typescript
export const BUSINESS_RULES = {
  prices: {
    adultPerDay: 3600, // Tarifa variable
    childPerDay: 0,
  },
  limits: {
    childMaxAge: 6, // Edad límite para gratuidad
  }
  // ...
};