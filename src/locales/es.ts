export const strings = {
  common: {
    welcomeTitle: "¡Mari mari kom pu che! 👋",
    welcomeSubtitle: (propertyName: string) =>
    `Bienvenido a ${propertyName}. Gestionemos nuestra casa juntos.`,
    loading: "Cargando...",
    currency: "$",
    emailLabel: "Correo",
  },
  nav: {
    dashboard: "Panel",
    home: "Inicio",
    bookings: "Reservas",
    expenses: "Gastos y Pagos",
    profile: "Mi Perfil",
    logout: "Cerrar Sesión",
    settings: "Configuración"
  },
  profile: {
    title: "Mi Perfil",
    subtitle: "Gestiona tu información personal",
    lblName: "Nombre visible",
    lblEmail: "Correo electrónico",
    btnSave: "Guardar Cambios",
    successUpdate: "Perfil actualizado correctamente"
  },
  home: {
    houseStatusTitle: "Estado de la Casa",
    statusAvailable: "Disponible",
    nobodyHome: "No hay nadie ocupando la casa en este momento.",
    btnNewBooking: "Nueva Reserva",
    btnHistory: "Historial de Gastos",
    historySubtitle: "Revisa los pagos anteriores",
    pricingTitle: "Tarifas Vigentes"
  },
  bankCard: {
    title: "Datos de Transferencia",
    bankLabel: "Banco",
    accountTypeLabel: "Tipo de Cuenta",
    accountLabel: "Número de Cuenta",
    copiedMsg: "¡Copiado!"
  },
  pricing: {
    title: "Reglas de Cobro (Vigentes)",
    sectionFixed: "1. Gastos Fijos (Mensual)",
    sectionVariable: "2. Gastos Variables (Por uso)",
    gen1: "1ra Generación",
    gen2: "2da Generación",
    noteFixed: "* Se paga el 1 de cada mes.",
    adults: "Adultos",
    perDay: "Por persona / día",
    childrenFree: "👶 Niños pequeños no pagan (ver edad límite).",
  },
  bookings: {
    title: "Calendario de Reservas",
    subtitle: "Selecciona tus fechas de llegada y salida.",
    checkIn: "Fecha de Llegada",
    checkOut: "Fecha de Salida",
    totalDays: "Días totales",
    summaryTitle: "Resumen de Reserva",
    calculateBtn: "Calcular Total",
    cleanSelection: "Limpiar fechas",
    helperText: "Selecciona un rango en el calendario.",
    adultsLabel: "Adultos",
    childrenLabel: "Niños",
    pricePerDay: "$3.600 / día",
    freeLabel: "Gratis",
    estTotal: "Total Estimado",
    btnReserve: "Solicitar Reserva",
    processing: "Procesando...",
    successTitle: "¡Solicitud Enviada!",
    successMsg: "El administrador revisará tu solicitud pronto.",
    errorMsg: "Hubo un error al guardar. Inténtalo de nuevo.",
    statusPending: "Pendiente de Aprobación",
    statusConfirmed: "Confirmada",
    btnApprove: "Aprobar",
    btnReject: "Rechazar",
  },
  auth: {
    loginTitle: "Ingresar al Lof App",
    loginSubtitle: "Inicia sesión con tu cuenta de Google para gestionar reservas y ver gastos.",
    btnGoogle: "Continuar con Google",
    loggingIn: "Iniciando sesión...",
    logout: "Cerrar Sesión",
    notAuthorized: "No tienes permisos para ver esta página."
  },
  notFound: {
    code: "404",
    title: "¡Te has perdido!",
    description: "Parece que te alejaste demasiado del Lof. La página que buscas no existe o la ruta es incorrecta.",
    btnHome: "Volver a Casa"
  }
};