// src/config/rules.ts

export const BUSINESS_RULES = {
  prices: {
    adultPerDay: 3600,
    childPerDay: 0,     // Si en el futuro deciden cobrar, cambias este 0 por el monto
    currency: 'CLP'
  },
  limits: {
    childMaxAge: 6,     // Edad límite para ser considerado "niño gratis"
    minDaysToBook: 1
  },
  fixedFees: {
    gen1: 160133,
    gen2: 17157
  }
};