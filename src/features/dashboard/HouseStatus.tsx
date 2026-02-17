import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarPlus, Home, User, Calendar } from 'lucide-react';
import { getBookings, type Booking } from '../../services/bookingService';
import { useLanguage } from '../../context/LanguageContext';
import BookingDetailModal from '../../components/BookingDetailModal';

const HouseStatus = () => {
  const { propertyId } = useParams();
  const { strings } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    const loadBookings = async () => {
      if (!propertyId) return;

      setLoading(true);
      const allBookings = await getBookings(propertyId);

      // Solo considerar reservas confirmadas
      const confirmedBookings = allBookings.filter(b => b.status === 'confirmed');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Encontrar reserva actual (hoy está entre startDate y endDate)
      const current = confirmedBookings.find(booking => {
        const start = new Date(booking.startDate);
        const end = new Date(booking.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        return today >= start && today <= end;
      });

      // Encontrar próximas reservas (startDate > hoy)
      const upcoming = confirmedBookings
        .filter(booking => {
          const start = new Date(booking.startDate);
          start.setHours(0, 0, 0, 0);
          return start > today;
        })
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(0, 3); // Mostrar solo las próximas 3

      setCurrentBooking(current || null);
      setUpcomingBookings(upcoming);
      setLoading(false);
    };

    loadBookings();
  }, [propertyId]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDaysUntil = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    return `En ${diffDays} días`;
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-3/4 mb-6"></div>
          <div className="h-10 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  const isOccupied = currentBooking !== null;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      {/* Header con estado */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Home size={20} className="text-slate-600" />
          {strings.home.houseStatusTitle}
        </h3>
        <span
          className={`text-xs px-3 py-1 rounded-full font-medium ${isOccupied
            ? 'bg-red-100 text-red-700'
            : 'bg-green-100 text-green-700'
            }`}
        >
          {isOccupied ? 'Ocupada' : strings.home.statusAvailable}
        </span>
      </div>

      {/* Estado actual */}
      {isOccupied && currentBooking ? (
        <div
          className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl cursor-pointer hover:bg-red-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
          onClick={() => setSelectedBooking(currentBooking)}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User size={20} className="text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">
                {currentBooking.userName}
              </p>
              <p className="text-xs text-red-600 mt-1">
                {formatDate(currentBooking.startDate)} - {formatDate(currentBooking.endDate)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-slate-500 text-sm mb-6">{strings.home.nobodyHome}</p>
      )}

      {/* Próximos Arriendos */}
      {upcomingBookings.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            {strings.houseStatus.upcomingBookings}
          </h4>
          <div className="space-y-2">
            {upcomingBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-lof-200 hover:bg-white transition-all cursor-pointer group"
                onClick={() => setSelectedBooking(booking)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-lof-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-lof-600 transition-colors">
                    <Calendar size={14} className="text-lof-600 group-hover:text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {booking.userName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(booking.startDate)}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-lof-600 bg-lof-50 px-2 py-1 rounded">
                  {getDaysUntil(booking.startDate)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón de nueva reserva */}
      <Link
        to="bookings"
        className="w-full flex items-center justify-center gap-2 bg-lof-600 hover:bg-lof-700 text-white py-3 px-4 rounded-xl font-medium transition-all shadow-lg shadow-lof-500/20"
      >
        <CalendarPlus size={20} />
        {strings.home.btnNewBooking}
      </Link>

      {/* Modal de detalle de reserva */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </div>
  );
};

export default HouseStatus;
