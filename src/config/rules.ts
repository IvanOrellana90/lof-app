// src/config/rules.ts

export const BUSINESS_RULES = {
  prices: {
    adultPerDay: 3600,
    childPerDay: 0,     // Si en el futuro deciden cobrar, cambias este 0 por el monto
    currency: 'CLP'
  },
  limits: {
    childMaxAge: 6,    // Edad límite para ser considerado "niño gratis"
    minDaysToBook: 1
  },
  fixedCosts: [],  // Array vacío por defecto, se configura por propiedad
  fixedFees: {
    gen1: 160133,
    gen2: 17157
  },
  bankDetails: {
    accountName: "Nombre Titular",
    rut: "12.345.678-9",
    bankName: "Banco Estado",
    accountType: "Cuenta Vista",
    accountNumber: "12345678",
    email: "correo@ejemplo.com"
  }
};