import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createProperty, getUserProperties, type Property } from '../services/propertyService';
import { getUserBookings, type Booking } from '../services/bookingService';
import { getUserGlobalExpenses, type UserGlobalExpense } from '../services/expensesService';
import { Plus, Home, Loader2, ArrowRight, Calendar, Edit2, Receipt, DollarSign, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';

const PropertiesDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { strings, language } = useLanguage();

  const [properties, setProperties] = useState<Property[]>([]);
  const [userBookings, setUserBookings] = useState<(Booking & { propertyName?: string })[]>([]);
  const [userExpenses, setUserExpenses] = useState<UserGlobalExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newPropName, setNewPropName] = useState("");

  useEffect(() => {
    if (user?.uid) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.uid) return;
    setLoading(true);

    const [propsData, bookingsData, expensesData] = await Promise.all([
      getUserProperties(user.uid, user.email),
      getUserBookings(user.uid),
      (user.uid && user.email) ? getUserGlobalExpenses(user.uid, user.email) : Promise.resolve([])
    ]);

    setProperties(propsData);
    setUserBookings(bookingsData);
    setUserExpenses(expensesData);
    setLoading(false);
  };

  const loadProperties = async () => {
    if (!user?.uid) return;
    const data = await getUserProperties(user.uid, user.email);
    setProperties(data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropName.trim() || !user?.email) return;

    setIsCreating(true);
    const result = await createProperty(newPropName, { uid: user.uid, email: user.email });

    if (result.success) {
      toast.success(strings.dashboard.toastCreated);
      setNewPropName("");
      loadProperties();
    } else {
      toast.error(strings.dashboard.toastError);
    }
    setIsCreating(false);
  };

  const handleSelectProperty = (id: string) => {
    navigate(`/property/${id}`);
  };

  const handleEditBooking = (propertyId: string, bookingId: string) => {
    navigate(`/property/${propertyId}/bookings?edit=${bookingId}`);
  };

  const handleViewExpenses = (propertyId: string) => {
    navigate(`/property/${propertyId}/expenses`);
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-lof-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">{strings.dashboard.title}</h1>
          <p className="text-slate-600">{strings.dashboard.welcome}, {user?.displayName}</p>
        </div>

        {/* Lista de Propiedades */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">

          {/* Card: Crear Nueva */}
          <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col justify-center items-center text-center hover:border-lof-500 transition-colors group">
            <div className="bg-slate-100 p-4 rounded-full mb-4 group-hover:bg-lof-50 transition-colors">
              <Plus className="text-slate-400 group-hover:text-lof-600" size={32} />
            </div>
            <h3 className="font-bold text-slate-700 mb-2">{strings.dashboard.createTitle}</h3>
            <form onSubmit={handleCreate} className="w-full mt-2 space-y-2">
              <input
                type="text"
                placeholder={strings.dashboard.createPlaceholder}
                value={newPropName}
                onChange={e => setNewPropName(e.target.value)}
                className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-lof-500 outline-none"
              />
              <button
                disabled={isCreating || !newPropName}
                className="w-full py-2 bg-lof-600 text-white rounded-lg text-sm font-bold hover:bg-lof-700 disabled:opacity-50"
              >
                {isCreating ? strings.dashboard.creating : strings.dashboard.btnCreate}
              </button>
            </form>
          </div>

          {/* Cards: Propiedades Existentes */}
          {properties.map(prop => {
            const isAdmin = prop.admins.includes(user?.uid || '');

            return (
              <div key={prop.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">

                {/* Badge opcional de Rol */}
                <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-bl-xl ${isAdmin ? 'bg-lof-100 text-lof-700' : 'bg-slate-100 text-slate-500'}`}>
                  {isAdmin ? strings.dashboard.roleAdmin : strings.dashboard.roleMember}
                </div>

                <div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${isAdmin ? 'bg-lof-100 text-lof-700' : 'bg-purple-100 text-purple-600'}`}>
                    <Home size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 truncate">{prop.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {prop.allowedEmails?.length || 0} {strings.dashboard.membersCount}
                  </p>
                </div>

                <button
                  onClick={() => handleSelectProperty(prop.id)}
                  className="mt-6 w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3 rounded-xl transition-colors"
                >
                  {strings.dashboard.enter} <ArrowRight size={18} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
          {/* Sección: Mis Reservas */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="text-lof-600" size={24} />
              <h2 className="text-2xl font-bold text-slate-900">{strings.dashboard.myBookings.title}</h2>
            </div>

            {userBookings.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
                <p className="text-slate-500">{strings.dashboard.myBookings.noBookings}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userBookings.map(booking => {
                  const isPending = booking.status === 'pending';
                  const isRejected = booking.status === 'rejected';

                  let statusBadge = 'bg-green-100 text-green-700';
                  let statusText = strings.bookings.statusConfirmed;

                  if (isPending) {
                    statusBadge = 'bg-yellow-100 text-yellow-700';
                    statusText = strings.bookings.statusPending;
                  } else if (isRejected) {
                    statusBadge = 'bg-red-100 text-red-700';
                    statusText = strings.bookings.statusRejected;
                  }

                  return (
                    <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-slate-900">{booking.propertyName}</h4>
                          <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${statusBadge}`}>
                            {statusText}
                          </div>
                        </div>
                        <button
                          onClick={() => handleEditBooking(booking.propertyId, booking.id)}
                          className="p-2 text-lof-600 hover:bg-lof-50 rounded-lg transition-colors"
                          title={strings.dashboard.myBookings.editBooking}
                        >
                          <Edit2 size={18} />
                        </button>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-slate-400">{strings.bookings.checkIn}</span>
                          <span className="font-medium">{format(booking.startDate, 'dd MMM yyyy', { locale: language === 'es' ? es : undefined })}</span>
                        </div>
                        <ArrowRight size={14} className="text-slate-300" />
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-slate-400">{strings.bookings.checkOut}</span>
                          <span className="font-medium">{format(booking.endDate, 'dd MMM yyyy', { locale: language === 'es' ? es : undefined })}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-sm">
                        <span className="text-slate-500">{booking.adults} {strings.bookings.adultsLabel}, {booking.children} {strings.bookings.childrenLabel}</span>
                        <span className="font-bold text-lof-600">${booking.totalCost.toLocaleString('es-CL')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sección: Mis Gastos */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Receipt className="text-lof-600" size={24} />
              <h2 className="text-2xl font-bold text-slate-900">{strings.dashboard.myExpenses.title}</h2>
            </div>

            {userExpenses.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
                <p className="text-slate-500">{strings.dashboard.myExpenses.noExpenses}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userExpenses.map(expense => (
                  <div key={expense.propertyId} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-slate-900">{expense.propertyName}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                            {expense.tagName}
                          </span>
                          {!expense.isCustom && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              {expense.sharePercentage}% Var. {expense.fixedFee > 0 ? `+ $${expense.fixedFee.toLocaleString('es-CL')}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewExpenses(expense.propertyId)}
                        className="p-2 text-lof-600 hover:bg-lof-50 rounded-lg transition-colors"
                        title={strings.dashboard.myExpenses.viewDetails}
                      >
                        <ExternalLink size={18} />
                      </button>
                    </div>

                    <div className="mt-4 space-y-2">
                      {expense.sharedAmount > 0 && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">{strings.dashboard.myExpenses.sharedLabel}</span>
                          <span className="text-slate-700 font-medium">${expense.sharedAmount.toLocaleString('es-CL')}</span>
                        </div>
                      )}
                      {expense.bookingAmount > 0 && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">{strings.dashboard.myExpenses.bookingLabel}</span>
                          <span className="text-slate-700 font-medium">${expense.bookingAmount.toLocaleString('es-CL')}</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <DollarSign size={16} className="text-lof-500" />
                        <span className="text-sm font-medium">{strings.dashboard.myExpenses.currentMonth}</span>
                      </div>
                      <span className="text-xl font-bold text-slate-900">
                        ${expense.amount.toLocaleString('es-CL')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PropertiesDashboard;