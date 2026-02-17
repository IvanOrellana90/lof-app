import { X, Users, Baby, Calendar, Receipt, Info, Tag, Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { type Booking } from '../services/bookingService';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';

interface BookingDetailModalProps {
  booking: Booking;
  onClose: () => void;
  onEdit?: (booking: Booking) => void;
}

const BookingDetailModal = ({ booking, onClose, onEdit }: BookingDetailModalProps) => {
  const { user } = useAuth();
  const { strings, language } = useLanguage();
  const { settings } = useSettings();

  const isOwner = user?.uid === booking.userId;
  const locale = language === 'es' ? es : undefined;
  const d = strings.bookings.details;

  // Encontrar nombres de servicios opcionales seleccionados
  const selectedServices = (settings.fixedCosts || [])
    .filter(cost => booking.selectedOptionalFees?.includes(cost.id));

  const mandatoryServices = (settings.fixedCosts || [])
    .filter(cost => !cost.isOptional);

  return (
    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
      <div
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-lof-600 to-lof-700 p-6 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <Info size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">{d.title}</h3>
              <p className="text-lof-100 text-sm opacity-90">ID: {booking.id.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Usuario y Estado */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-lof-700 font-bold text-xl border-2 border-white shadow-sm">
                {booking.userName.charAt(0)}
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{d.requestedBy}</p>
                <p className="text-lg font-bold text-slate-900 leading-tight">{booking.userName}</p>
                {booking.userEmail && (
                  <p className="text-xs text-slate-400 font-medium truncate max-w-[150px] md:max-w-[200px]">
                    {booking.userEmail}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">{d.status}</p>
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                {booking.status === 'confirmed' ? strings.bookings.statusConfirmed :
                  booking.status === 'pending' ? strings.bookings.statusPending :
                    strings.bookings.statusRejected}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Periodo */}
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar size={18} className="text-lof-600" />
                {d.period}
              </p>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-lg font-bold text-slate-900">
                  {format(booking.startDate, 'dd MMM', { locale })} - {format(booking.endDate, 'dd MMM', { locale })}
                </p>
                <p className="text-sm text-slate-500 font-medium">
                  {format(booking.startDate, 'yyyy')}
                </p>
              </div>
            </div>

            {/* Huéspedes */}
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users size={18} className="text-lof-600" />
                {d.guests}
              </p>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between">
                <div>
                  <p className="text-lg font-bold text-slate-900">{booking.adults}</p>
                  <p className="text-xs text-slate-500 font-medium">{d.adults}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900 flex items-center justify-end gap-1">
                    <Baby size={16} className="text-orange-500" />
                    {booking.children}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">{d.children}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Servicios y Costos */}
          <div className="space-y-4">
            <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Tag size={18} className="text-lof-600" />
              {d.services}
            </p>
            <div className="space-y-2">
              {[...mandatoryServices, ...selectedServices].map((service) => (
                <div key={service.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl hover:border-lof-200 transition-colors shadow-sm">
                  <span className="text-slate-700 font-medium">{service.name}</span>
                  <span className="font-bold text-slate-900">${service.value.toLocaleString('es-CL')}</span>
                </div>
              ))}
              {([...mandatoryServices, ...selectedServices]).length === 0 && (
                <p className="text-sm text-slate-400 italic">No hay servicios adicionales.</p>
              )}
            </div>
          </div>

          {/* Total */}
          <div className="pt-4 border-t-2 border-slate-100">
            <div className="bg-lof-50 p-6 rounded-2xl border border-lof-100 flex justify-between items-center">
              <div>
                <p className="text-xs text-lof-600 uppercase font-black tracking-widest mb-1">{d.total}</p>
                <p className="text-3xl font-black text-lof-600">
                  ${booking.totalCost.toLocaleString('es-CL')}
                </p>
              </div>
              <div className="bg-white/60 p-3 rounded-2xl">
                <Receipt size={32} className="text-lof-600" />
              </div>
            </div>
          </div>

          {/* Acciones para el dueño */}
          {isOwner && onEdit && (
            <div className="pt-2">
              <button
                onClick={() => {
                  onEdit(booking);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98]"
              >
                <Pencil size={18} />
                {strings.common?.edit || 'Editar Reserva'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingDetailModal;
