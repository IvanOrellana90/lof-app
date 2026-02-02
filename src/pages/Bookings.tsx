import { useState, useEffect } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { format, differenceInDays } from 'date-fns';
import { useParams } from 'react-router-dom';
import { es } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import {
  Calendar as CalendarIcon,
  X,
  Users,
  Baby,
  Minus,
  Plus,
  Loader2,
  Check,
  Ban
} from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';

// Imports locales (removed static import)
import {
  createBooking,
  getBookings,
  updateBookingStatus,
  type Booking
} from '../services/bookingService';
import { checkPropertyAdmin } from '../services/propertyService';

const Bookings = () => {
  const { user } = useAuth();
  const { propertyId } = useParams();
  const { strings } = useLanguage();

  // --- ESTADOS ---
  const [range, setRange] = useState<DateRange | undefined>();
  const [counts, setCounts] = useState({ adults: 1, children: 0 });
  const [selectedOptionalIds, setSelectedOptionalIds] = useState<string[]>([]);

  // Estados de carga y datos
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [isPropertyAdmin, setIsPropertyAdmin] = useState(false);

  const { settings, loading: loadingSettings } = useSettings();

  useEffect(() => {
    const verifyAdmin = async () => {
      if (user && propertyId) {
        const isAdmin = await checkPropertyAdmin(propertyId, user.uid);
        setIsPropertyAdmin(isAdmin);
      }
    };
    verifyAdmin();
  }, [user, propertyId]);

  const loadData = async () => {
    if (!propertyId) return;

    setLoadingList(true);
    // Pasamos el ID al servicio
    const data = await getBookings(propertyId);
    setExistingBookings(data);
    setLoadingList(false);
  };

  useEffect(() => {
    loadData();
  }, [propertyId]);

  // --- LÓGICA DEL CALENDARIO (BLOQUEOS) ---
  // Bloqueamos días pasados Y cualquier reserva (ya sea pendiente o confirmada)
  const disabledDays = [
    { before: new Date() },
    // CAMBIO IMPORTANTE: Filtramos para que las rechazadas NO bloqueen el calendario
    ...existingBookings
      .filter(b => b.status !== 'rejected')
      .map(b => ({ from: b.startDate, to: b.endDate }))
  ];

  if (loadingSettings) {
    return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;
  }

  // --- LÓGICA DE PRECIOS Y CONTADORES ---
  const PRICE_ADULT = settings.prices.adultPerDay;
  const PRICE_CHILD = settings.prices.childPerDay;

  const totalDays = range?.from && range?.to ? differenceInDays(range.to, range.from) : 0;

  // Costo variable (días × personas)
  const variableCost = totalDays * (
    (counts.adults * PRICE_ADULT) +
    (counts.children * PRICE_CHILD)
  );

  // Costos fijos obligatorios
  const mandatoryFixedCost = (settings.fixedCosts || [])
    .filter(cost => !cost.isOptional)
    .reduce((sum, cost) => sum + cost.value, 0);

  // Costos opcionales seleccionados
  const selectedOptionalCost = (settings.fixedCosts || [])
    .filter(cost => selectedOptionalIds.includes(cost.id))
    .reduce((sum, cost) => sum + cost.value, 0);

  const totalCost = variableCost + mandatoryFixedCost + selectedOptionalCost;

  const updateCount = (type: 'adults' | 'children', delta: number) => {
    setCounts(prev => {
      const newValue = prev[type] + delta;
      if (newValue < 0) return prev;
      if (type === 'adults' && newValue < 1) return prev;
      return { ...prev, [type]: newValue };
    });
  };

  // --- ACCIÓN 1: SOLICITAR RESERVA ---
  const handleReservation = async () => {
    if (!range?.from || !range?.to || !propertyId) return; // Validar ID

    setIsSubmitting(true);
    const toastId = toast.loading(strings.bookings.processing);

    const result = await createBooking(
      propertyId,
      range,
      counts.adults,
      counts.children,
      totalCost,
      { uid: user!.uid, name: user!.displayName || 'Usuario' },
      selectedOptionalIds
    );

    toast.dismiss(toastId);

    if (result.success) {
      toast.success(strings.bookings.successTitle, {
        description: strings.bookings.successMsg,
        duration: 5000,
      });

      // Limpiamos formulario y recargamos la lista para ver la solicitud
      setRange(undefined);
      setCounts({ adults: 1, children: 0 });
      setSelectedOptionalIds([]);
      loadData();
    } else {
      toast.error("Error", {
        description: strings.bookings.errorMsg
      });
    }
    setIsSubmitting(false);
  };

  // --- ACCIÓN 2: ADMINISTRAR (APROBAR/RECHAZAR) ---
  const handleStatusChange = async (id: string, newStatus: 'confirmed' | 'rejected') => {
    const toastId = toast.loading(strings.bookings.processing, { id: "status-update" });

    const res = await updateBookingStatus(id, newStatus);

    toast.dismiss(toastId);

    if (res.success) {
      if (newStatus === 'confirmed') {
        toast.success(strings.bookings.toastApproved, { description: strings.bookings.toastApprovedDesc });
      } else {
        toast.info(strings.bookings.toastRejected, { description: strings.bookings.toastRejectedDesc });
      }
      loadData(); // Recargar para ver cambios
    } else {
      toast.error(strings.bookings.toastError);
    }
  };

  return (
    <div className="px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">{strings.bookings.title}</h1>
        <p className="text-slate-600 mt-1">{strings.bookings.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* === COLUMNA IZQUIERDA: CALENDARIO Y LISTA === */}
        <div className="lg:col-span-2 space-y-6">

          {/* 1. Componente Calendario */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-center h-fit">
            <style>{`.rdp-root { --rdp-accent-color: #0ea5e9; }`}</style>
            <DayPicker
              mode="range"
              selected={range}
              onSelect={setRange}
              locale={es}
              min={1}
              disabled={disabledDays}
              showOutsideDays
              className="p-4"
            />
          </div>

          {/* 2. Lista de Reservas / Solicitudes */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800">{strings.bookings.calendarStatus}</h3>
              {loadingList && <Loader2 className="animate-spin text-slate-400" size={16} />}
            </div>

            {existingBookings.length === 0 ? (
              <p className="text-slate-500 text-sm">{strings.bookings.noBookings}</p>
            ) : (
              <div className="space-y-3">
                {existingBookings.map((booking) => {
                  const isPending = booking.status === 'pending';
                  const isRejected = booking.status === 'rejected'; // Nuevo estado

                  // Definimos estilos dinámicos según el estado
                  let cardStyles = 'bg-slate-50 border-slate-100'; // Default (Confirmada)
                  let badgeStyles = 'bg-green-100 text-green-700';
                  let statusText = strings.bookings.statusConfirmed;
                  let avatarStyles = 'bg-lof-100 text-lof-700';

                  if (isPending) {
                    cardStyles = 'bg-yellow-50 border-yellow-200';
                    badgeStyles = 'bg-yellow-200 text-yellow-800';
                    statusText = strings.bookings.statusPending;
                    avatarStyles = 'bg-yellow-200 text-yellow-800';
                  } else if (isRejected) {
                    // Estilo para rechazadas (Grisáceo/Rojo suave y opaco)
                    cardStyles = 'bg-red-50/50 border-red-100 opacity-75 grayscale-[0.5]';
                    badgeStyles = 'bg-red-100 text-red-600 line-through';
                    statusText = strings.bookings.statusRejected;
                    avatarStyles = 'bg-slate-200 text-slate-500';
                  }

                  return (
                    <div
                      key={booking.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition-colors ${cardStyles}`}
                    >

                      {/* Información de la Reserva */}
                      <div className="flex items-center gap-3 mb-3 sm:mb-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${avatarStyles}`}>
                          {booking.userName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`font-medium text-sm ${isRejected ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                              {booking.userName}
                            </p>
                            {/* Etiqueta de Estado */}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${badgeStyles}`}>
                              {statusText}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 capitalize">
                            {format(booking.startDate, 'dd MMM', { locale: es })} - {format(booking.endDate, 'dd MMM', { locale: es })}
                          </p>
                        </div>
                      </div>

                      {/* Botones de Acción (Solo visibles si está Pendiente) */}
                      {isPending && isPropertyAdmin && (
                        <div className="flex items-center gap-2 pl-2 border-t sm:border-t-0 sm:border-l border-yellow-200 pt-2 sm:pt-0 sm:ml-2">
                          <button
                            onClick={() => handleStatusChange(booking.id, 'confirmed')}
                            className="p-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors"
                            title={strings.bookings.btnApprove}
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => handleStatusChange(booking.id, 'rejected')}
                            className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors"
                            title={strings.bookings.btnReject}
                          >
                            <Ban size={18} />
                          </button>
                        </div>
                      )}

                      {/* Si está rechazada, mostramos un ícono informativo opcional */}
                      {isRejected && (
                        <div className="hidden sm:block text-red-300 pr-2">
                          <Ban size={20} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* === COLUMNA DERECHA: FORMULARIO === */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <CalendarIcon size={20} className="text-lof-600" />
            {strings.bookings.summaryTitle}
          </h3>

          <div className="space-y-6">

            {/* Fechas Seleccionadas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="block text-xs text-slate-500 mb-1">{strings.bookings.checkIn}</span>
                <span className="block font-medium text-slate-900">
                  {range?.from ? format(range.from, 'dd/MM/yyyy') : '-'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="block text-xs text-slate-500 mb-1">{strings.bookings.checkOut}</span>
                <span className="block font-medium text-slate-900">
                  {range?.to ? format(range.to, 'dd/MM/yyyy') : '-'}
                </span>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Contadores */}
            <div className="space-y-4">
              {/* Adultos */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-lof-100 p-2 rounded-full text-lof-600">
                    <Users size={18} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{strings.bookings.adultsLabel}</p>
                    <p className="text-xs text-slate-500">${PRICE_ADULT.toLocaleString('es-CL')} / día</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1 border border-slate-200">
                  <button onClick={() => updateCount('adults', -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm hover:bg-slate-50 text-slate-600">
                    <Minus size={14} />
                  </button>
                  <span className="font-bold w-4 text-center">{counts.adults}</span>
                  <button onClick={() => updateCount('adults', 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm hover:bg-slate-50 text-slate-600">
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Niños */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-2 rounded-full text-orange-600">
                    <Baby size={18} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {strings.bookings.childrenLabel} ({'>'} {settings.limits.childMaxAge})
                    </p>
                    <p className="text-xs text-green-600 font-medium">
                      {PRICE_CHILD === 0 ? strings.bookings.freeLabel : `$${PRICE_CHILD} / día`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1 border border-slate-200">
                  <button onClick={() => updateCount('children', -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm hover:bg-slate-50 text-slate-600">
                    <Minus size={14} />
                  </button>
                  <span className="font-bold w-4 text-center">{counts.children}</span>
                  <button onClick={() => updateCount('children', 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm hover:bg-slate-50 text-slate-600">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Total Precio */}
            {totalDays > 0 ? (
              <div className="bg-lof-50 p-4 rounded-xl border border-lof-100">
                {/* Desglose de costos */}
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">{strings.bookings.variableCost} ({totalDays} {strings.bookings.totalDays})</span>
                    <span className="font-medium text-slate-800">${variableCost.toLocaleString('es-CL')}</span>
                  </div>

                  {/* Costos Obligatorios */}
                  {(settings.fixedCosts || []).filter(c => !c.isOptional).map((cost) => (
                    <div key={cost.id} className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">{cost.name}</span>
                      <span className="font-medium text-slate-800">${cost.value.toLocaleString('es-CL')}</span>
                    </div>
                  ))}

                  {/* Costos Opcionales (Seleccionables) */}
                  {(settings.fixedCosts || []).filter(c => c.isOptional).length > 0 && (
                    <div className="pt-2 space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Servicios Opcionales</p>
                      {(settings.fixedCosts || []).filter(c => c.isOptional).map((cost) => (
                        <label key={cost.id} className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-white cursor-pointer transition-all">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedOptionalIds.includes(cost.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedOptionalIds([...selectedOptionalIds, cost.id]);
                                } else {
                                  setSelectedOptionalIds(selectedOptionalIds.filter(id => id !== cost.id));
                                }
                              }}
                              className="w-4 h-4 text-lof-600 rounded border-slate-300 focus:ring-lof-500"
                            />
                            <span className="text-sm text-slate-700">{cost.name}</span>
                          </div>
                          <span className="text-sm font-bold text-slate-900">${cost.value.toLocaleString('es-CL')}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <hr className="border-lof-200 mb-3" />

                {/* Total */}
                <div className="flex justify-between items-center text-lg">
                  <span className="text-lof-900 font-bold">{strings.bookings.estTotal}</span>
                  <span className="font-bold text-lof-600 text-2xl">
                    ${totalCost.toLocaleString('es-CL')}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center italic">
                {strings.bookings.helperText}
              </p>
            )}

            {/* Botón Principal */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleReservation}
                disabled={!range?.to || isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-lof-600 disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-lof-700 text-white py-3.5 px-4 rounded-xl font-bold transition-all shadow-lg shadow-lof-500/20 disabled:shadow-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    {strings.bookings.processing}
                  </>
                ) : (
                  strings.bookings.btnReserve
                )}
              </button>

              {range?.to && !isSubmitting && (
                <button
                  onClick={() => setRange(undefined)}
                  className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-red-500 text-xs py-2 transition-colors"
                >
                  <X size={14} /> {strings.bookings.cleanSelection}
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Bookings;