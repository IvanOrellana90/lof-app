import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { usePropertyAdmin } from '../hooks/usePropertyAdmin';

import { useLanguage } from '../context/LanguageContext';
import { getSharedExpenses, getMemberTags, getMemberShares, createMemberTag, deleteMemberTag, createSharedExpense, deleteSharedExpense, createMemberShare, updateMemberShare, calculateMemberPayments, type SharedExpense, type MemberTag, type MemberShare } from '../services/expensesService';
import { getBookings, type Booking } from '../services/bookingService';
import { getAllUsers, type UserData } from '../services/userService';
import Avatar from '../components/ui/Avatar';
import { getPropertyById } from '../services/propertyService';
import { Plus, Tag, DollarSign, Trash2, Users, Receipt, Home, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const Expenses = () => {
  const { propertyId } = useParams();
  const { isPropertyAdmin, loading: adminLoading } = usePropertyAdmin();
  const { strings } = useLanguage();

  // Data State
  const [expenses, setExpenses] = useState<SharedExpense[]>([]);
  const [tags, setTags] = useState<MemberTag[]>([]);
  const [shares, setShares] = useState<MemberShare[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [showTagModal, setShowTagModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editShareData, setEditShareData] = useState<{ tagId: string, customAmount: string, useTag: boolean }>({
    tagId: '',
    customAmount: '',
    useTag: true
  });

  // Nuevo: Estado para el mes seleccionado
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [calculatedPayments, setCalculatedPayments] = useState<Record<string, number>>({});

  const [newTag, setNewTag] = useState({ name: '', sharePercentage: 0, fixedFee: 0, color: 'blue' });
  const [newExpense, setNewExpense] = useState<{ name: string, amount: number, frequency: 'monthly' | 'quarterly' | 'yearly' | 'one-time' }>({
    name: '',
    amount: 0,
    frequency: 'monthly'
  });

  useEffect(() => {
    loadData();
  }, [propertyId]);

  const loadData = async () => {
    if (!propertyId) return;
    setLoading(true);
    try {
      const [expensesData, tagsData, sharesData, propData, bookingsData, usersData] = await Promise.all([
        getSharedExpenses(propertyId),
        getMemberTags(propertyId),
        getMemberShares(propertyId),
        getPropertyById(propertyId),
        getBookings(propertyId),
        getAllUsers()
      ]);

      setExpenses(expensesData);
      setTags(tagsData);
      setShares(sharesData);
      setBookings(bookingsData);
      setUsers(usersData);

      if (propData?.allowedEmails) {
        setAllowedEmails(propData.allowedEmails);
      }
    } catch (error) {
      console.error("Error loading expenses data:", error);
      toast.error("Error cargando los gastos");
    } finally {
      setLoading(false);
    }
  };

  // Filtrar gastos por mes seleccionado
  const filteredExpenses = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);

    return expenses.filter(exp => {
      if (!exp.createdAt) return false;
      const createdDate = new Date(exp.createdAt);
      const createdYear = createdDate.getFullYear();
      const createdMonth = createdDate.getMonth() + 1;

      // Un solo pago: solo el mes que se creó
      if (exp.frequency === 'one-time') {
        return createdYear === year && createdMonth === month;
      }

      // Recurrentes: desde el mes que se creó en adelante
      return createdYear < year || (createdYear === year && createdMonth <= month);
    });
  }, [expenses, selectedMonth]);

  // Recalcular pagos cuando cambian los gastos filtrados o la configuración de miembros
  useEffect(() => {
    const payments = calculateMemberPayments(filteredExpenses, shares, tags, allowedEmails);
    setCalculatedPayments(payments);
  }, [filteredExpenses, shares, tags, allowedEmails]);

  // Funciones para manejar el mes
  const getMonthName = (monthKey: string): string => {
    const [year, month] = monthKey.split('-');
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);

    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }

    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  // Filtrar bookings por mes seleccionado
  const getBookingsForMonth = (userId: string): Booking[] => {
    const [year, month] = selectedMonth.split('-').map(Number);

    return bookings.filter(b => {
      if (b.userId !== userId || b.status !== 'confirmed') return false;

      const startDate = new Date(b.startDate);
      const endDate = new Date(b.endDate);

      // Verificar si la reserva cae en el mes seleccionado
      return (
        (startDate.getFullYear() === year && startDate.getMonth() + 1 === month) ||
        (endDate.getFullYear() === year && endDate.getMonth() + 1 === month) ||
        (startDate < new Date(year, month - 1, 1) && endDate > new Date(year, month, 0))
      );
    });
  };

  // Calcular arriendos del mes para un usuario
  const getRentalAmountForMonth = (email: string): number => {
    const userForEmail = users.find(u => u.email === email);
    if (!userForEmail) return 0;

    const monthBookings = getBookingsForMonth(userForEmail.uid);
    return monthBookings.reduce((sum, b) => sum + (b.totalCost || 0), 0);
  };

  // Calcular total de arriendos del mes
  const getTotalRentalsForMonth = (): number => {
    return allowedEmails.reduce((sum, email) => {
      return sum + getRentalAmountForMonth(email);
    }, 0);
  };

  // Función helper para obtener el displayName del usuario
  const getUserDisplayName = (email: string): string => {
    const user = users.find(u => u.email === email);
    return user?.displayName || email;
  };

  // Función helper para obtener la foto del usuario
  const getUserPhoto = (email: string): string | null => {
    const user = users.find(u => u.email === email);
    return user?.photoURL || null;
  };

  // --- TAG MANAGEMENT ---
  const handleCreateTag = async () => {
    if (!propertyId || !newTag.name) return;
    if (newTag.sharePercentage < 0 || newTag.sharePercentage > 100) {
      toast.error(strings.expenses.validationPercentage);
      return;
    }

    try {
      await createMemberTag(propertyId, newTag);
      toast.success(strings.expenses.tagCreated);
      setNewTag({ name: '', sharePercentage: 0, fixedFee: 0, color: 'blue' });
      const updatedTags = await getMemberTags(propertyId);
      setTags(updatedTags);
    } catch (error) {
      console.error(error);
      toast.error(strings.expenses.errorCreateTag);
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm(strings.expenses.confirmDeleteTag)) return;
    try {
      await deleteMemberTag(id);
      toast.success(strings.expenses.tagDeleted);
      setTags(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      toast.error(strings.expenses.errorDeleteTag);
    }
  };

  // --- EXPENSE MANAGEMENT ---
  const handleCreateExpense = async () => {
    if (!propertyId || !newExpense.name || newExpense.amount <= 0) return;

    try {
      await createSharedExpense(propertyId, newExpense);
      toast.success(strings.expenses.expenseCreated);
      setNewExpense({ name: '', amount: 0, frequency: 'monthly' });
      setShowExpenseModal(false);
      const updatedExpenses = await getSharedExpenses(propertyId);
      setExpenses(updatedExpenses);
    } catch (error) {
      console.error(error);
      toast.error(strings.expenses.errorCreateExpense);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm(strings.expenses.confirmDeleteExpense)) return;
    try {
      await deleteSharedExpense(id);
      toast.success(strings.expenses.expenseDeleted);
      const updatedExpenses = expenses.filter(e => e.id !== id);
      setExpenses(updatedExpenses);
    } catch (error) {
      console.error(error);
      toast.error(strings.expenses.errorDeleteExpense);
    }
  };

  // --- MEMBER SHARE MANAGEMENT ---
  const handleEditMember = (email: string) => {
    const share = shares.find(s => s.memberEmail === email);
    setEditingMember(email);

    if (share) {
      setEditShareData({
        tagId: share.tagId || '',
        customAmount: share.customAmount?.toString() || '',
        useTag: !!share.tagId
      });
    } else {
      setEditShareData({
        tagId: '',
        customAmount: '',
        useTag: true
      });
    }
  };

  const handleSaveMemberShare = async () => {
    if (!propertyId || !editingMember) return;

    try {
      const existingShare = shares.find(s => s.memberEmail === editingMember);

      const shareData: any = {
        memberEmail: editingMember,
        propertyId
      };

      if (editShareData.useTag) {
        if (!editShareData.tagId) {
          toast.error(strings.expenses.validationTagRequired);
          return;
        }
        shareData.tagId = editShareData.tagId;
        shareData.customAmount = null;
      } else {
        const amount = Number(editShareData.customAmount);
        if (isNaN(amount) || amount < 0) {
          toast.error(strings.expenses.validationAmount);
          return;
        }
        shareData.customAmount = amount;
        shareData.tagId = null;
      }

      if (existingShare) {
        await updateMemberShare(existingShare.id, shareData);
      } else {
        await createMemberShare(propertyId, shareData);
      }

      toast.success(strings.expenses.shareUpdated);
      setEditingMember(null);

      const [newShares, newTags] = await Promise.all([
        getMemberShares(propertyId),
        getMemberTags(propertyId)
      ]);
      setShares(newShares);
      setTags(newTags);

    } catch (error) {
      console.error(error);
      toast.error("Error guardando asignación");
    }
  };

  if (loading || adminLoading) {
    return <div className="p-8 text-center text-slate-500">Cargando gastos...</div>;
  }

  // Calcular totales
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSharedPayments = Object.values(calculatedPayments).reduce((sum, val) => sum + val, 0);
  const totalRentalsThisMonth = getTotalRentalsForMonth();

  return (
    <div className="px-4 py-8 pb-24">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gastos Compartidos</h1>
          <p className="text-slate-600 mt-1">Administra los gastos comunes y su división entre miembros</p>
        </div>

        {isPropertyAdmin && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowTagModal(true)}
              className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 font-bold transition-all shadow-sm"
            >
              <Tag size={20} /> <span className="hidden sm:inline">Gestionar Tags</span>
            </button>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-lof-600 text-white rounded-2xl hover:bg-lof-700 font-bold transition-all shadow-lg shadow-lof-500/30"
            >
              <Plus size={20} /> <span className="hidden sm:inline">Nuevo Gasto</span>
            </button>
          </div>
        )}
      </div>

      {/* Botón flotante móvil */}
      {isPropertyAdmin && (
        <button
          onClick={() => setShowExpenseModal(true)}
          className="md:hidden fixed bottom-24 right-4 w-14 h-14 bg-lof-600 text-white rounded-full shadow-xl shadow-lof-600/40 flex items-center justify-center z-50 hover:scale-105 transition-transform"
        >
          <Plus size={28} />
        </button>
      )}

      {/* SELECTOR DE MES - NUEVO */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="text-lof-600" size={24} />
            <div>
              <p className="text-sm text-slate-600 font-medium">{strings.expenses.labels.periodSelected}</p>
              <p className="text-lg font-bold text-slate-900">{getMonthName(selectedMonth)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => changeMonth('prev')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Mes anterior"
            >
              <ChevronLeft size={20} className="text-slate-600" />
            </button>
            <button
              onClick={() => {
                const now = new Date();
                setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
              }}
              className="px-4 py-2 text-sm font-medium text-lof-600 hover:bg-lof-50 rounded-lg transition-colors"
            >
              {strings.common.today}
            </button>
            <button
              onClick={() => changeMonth('next')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Mes siguiente"
            >
              <ChevronRight size={20} className="text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* MODALES */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900">{strings.expenses.tagsTitle}</h3>
              <button onClick={() => setShowTagModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                <label className="block text-sm font-medium text-slate-700">{strings.expenses.newTag}</label>
                <input
                  type="text"
                  placeholder={strings.expenses.tagNamePlaceholder}
                  value={newTag.name}
                  onChange={e => setNewTag({ ...newTag, name: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-lof-500"
                />
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">% Variable</label>
                    <input
                      type="number"
                      placeholder="%"
                      value={newTag.sharePercentage}
                      onChange={e => setNewTag({ ...newTag, sharePercentage: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-lof-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">Cuota Fija ($)</label>
                    <input
                      type="number"
                      placeholder="$"
                      value={newTag.fixedFee}
                      onChange={e => setNewTag({ ...newTag, fixedFee: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-lof-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleCreateTag}
                      disabled={!newTag.name}
                      className="h-[38px] px-4 bg-black text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 font-medium"
                    >
                      {strings.common.add}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                <label className="block text-sm font-medium text-slate-700">{strings.expenses.existingTags}</label>
                {tags.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">{strings.expenses.noTags}</p>
                ) : (
                  tags.map(tag => (
                    <div key={tag.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                        <div>
                          <p className="font-medium text-slate-800">{tag.name}</p>
                          <p className="border-t border-slate-100 mt-1 pt-1 text-xs text-slate-500">
                            {tag.sharePercentage}% Var. {tag.fixedFee ? `+ $${tag.fixedFee.toLocaleString()} Fijo` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="text-red-400 hover:text-red-600 p-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900">{strings.expenses.newExpenseTitle}</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{strings.common.name}</label>
                <input
                  type="text"
                  placeholder={strings.expenses.expenseNamePlaceholder}
                  value={newExpense.name}
                  onChange={e => setNewExpense({ ...newExpense, name: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lof-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{strings.common.amount} ($)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={newExpense.amount}
                  onChange={e => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lof-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">{strings.common.frequency}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setNewExpense({ ...newExpense, frequency: 'monthly' })}
                    className={`p-3 rounded-xl border text-left transition-all ${newExpense.frequency === 'monthly' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                  >
                    <span className="block text-sm font-bold text-slate-900">Mensual</span>
                    <span className="block text-xs text-slate-500">Recurrente</span>
                  </button>
                  <button
                    onClick={() => setNewExpense({ ...newExpense, frequency: 'one-time' })}
                    className={`p-3 rounded-xl border text-left transition-all ${newExpense.frequency === 'one-time' ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                  >
                    <span className="block text-sm font-bold text-slate-900">Único</span>
                    <span className="block text-xs text-slate-500">Solo una vez</span>
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleCreateExpense}
              disabled={!newExpense.name || newExpense.amount <= 0}
              className="w-full py-3 bg-lof-600 text-white rounded-xl hover:bg-lof-700 font-bold transition-all disabled:opacity-50 mt-4"
            >
              {strings.expenses.createExpenseBtn}
            </button>
          </div>
        </div>
      )}

      {editingMember && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{strings.expenses.editShareTitle}</h3>
                <p className="text-sm text-slate-500">{editingMember ? getUserDisplayName(editingMember) : ''}</p>
              </div>
              <button onClick={() => setEditingMember(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-6">
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${editShareData.useTag ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setEditShareData({ ...editShareData, useTag: true })}
                >
                  {strings.expenses.useTag}
                </button>
                <button
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!editShareData.useTag ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setEditShareData({ ...editShareData, useTag: false })}
                >
                  {strings.expenses.fixedAmount}
                </button>
              </div>

              {editShareData.useTag ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{strings.expenses.selectTag}</label>
                  {tags.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {tags.map(tag => (
                        <button
                          key={tag.id}
                          onClick={() => setEditShareData({ ...editShareData, tagId: tag.id })}
                          className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${editShareData.tagId === tag.id ? 'border-lof-500 bg-lof-50 ring-1 ring-lof-500' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                            <span className="font-medium text-slate-700">{tag.name}</span>
                          </div>
                          <span className="text-sm text-slate-500">
                            {tag.sharePercentage}% {tag.fixedFee ? `+ $${tag.fixedFee}` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
                      {strings.expenses.noTags}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{strings.expenses.fixedAmount} ($)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={editShareData.customAmount}
                    onChange={e => setEditShareData({ ...editShareData, customAmount: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lof-500"
                  />
                  <p className="text-xs text-slate-500">
                    {strings.expenses.manualOverrideDesc}
                  </p>
                </div>
              )}

              <button
                onClick={handleSaveMemberShare}
                className="w-full py-3 bg-lof-600 text-white rounded-xl hover:bg-lof-700 font-bold transition-all"
              >
                {strings.expenses.saveShareBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATS CARDS - ACTUALIZADO CON DATOS DEL MES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">Gastos Comunes</span>
            <Receipt className="text-blue-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-blue-900">${totalExpenses.toLocaleString('es-CL')}</p>
          <p className="text-xs text-blue-600 mt-1">{strings.expenses.labels.recurring}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-700">Arriendos {getMonthName(selectedMonth).split(' ')[0]}</span>
            <Home className="text-purple-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-purple-900">${totalRentalsThisMonth.toLocaleString('es-CL')}</p>
          <p className="text-xs text-purple-600 mt-1">{bookings.filter(b => {
            const [year, month] = selectedMonth.split('-').map(Number);
            const startDate = new Date(b.startDate);
            return b.status === 'confirmed' && startDate.getFullYear() === year && startDate.getMonth() + 1 === month;
          }).length} {strings.expenses.labels.confirmedReservations}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">Total del Mes</span>
            <DollarSign className="text-green-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-green-900">
            ${(totalSharedPayments + totalRentalsThisMonth).toLocaleString('es-CL')}
          </p>
          <p className="text-xs text-green-600 mt-1">
            {strings.expenses.labels.expensesAndRentals}
          </p>
        </div>
      </div>

      {/* Main Content Grid - MEJORADO */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* COLUMNA IZQUIERDA - Lista de Gastos (2 columnas en XL) */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                <Receipt size={22} className="text-blue-600" />
                {strings.expenses.expenseListTitle}
              </h2>
              <div className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-full">
                ${totalExpenses.toLocaleString('es-CL')}
              </div>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Receipt className="mx-auto mb-3 opacity-50" size={40} />
                <p className="font-medium">{strings.expenses.noExpenses}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExpenses.map(expense => (
                  <div key={expense.id} className="p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-100 group hover:border-blue-200 hover:shadow-md transition-all">
                    <div className="flex items-start gap-4">
                      {/* Icono */}
                      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                        <DollarSign size={22} strokeWidth={2.5} />
                      </div>

                      {/* Contenido principal */}
                      <div className="flex-1 min-w-0">
                        {/* Nombre y botón en la misma línea */}
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <h4 className="font-bold text-slate-900 leading-tight break-words">
                            {expense.name}
                          </h4>

                          {/* Botón eliminar - siempre visible en móvil, hover en desktop */}
                          {isPropertyAdmin && (
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0 md:opacity-0 md:group-hover:opacity-100"
                              title="Eliminar gasto"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>

                        {/* Frecuencia y monto */}
                        <div className="flex items-center justify-between gap-4 mt-2">
                          <span className="text-xs text-slate-500 uppercase font-semibold tracking-wide">
                            {expense.frequency === 'monthly' ? '📅 Mensual' :
                              expense.frequency === 'quarterly' ? '📅 Trimestral' :
                                expense.frequency === 'yearly' ? '📅 Anual' : '⚡ Único'}
                          </span>

                          <span className="font-bold text-xl text-slate-900 whitespace-nowrap">
                            ${expense.amount.toLocaleString('es-CL')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumen por Tag */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
              <Tag size={22} className="text-purple-600" />
              {strings.expenses.tagSummaryTitle}
            </h2>

            <div className="space-y-3">
              {tags.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">{strings.expenses.noTags}</p>
              ) : (
                tags.map(tag => {
                  const tagVariableTotal = (totalExpenses * tag.sharePercentage) / 100;

                  const membersInTag = allowedEmails.filter(email => {
                    const share = shares.find(s => s.memberEmail === email);
                    return share?.tagId === tag.id;
                  }).length;

                  const tagFixedTotal = (tag.fixedFee || 0) * membersInTag;
                  const grandTotal = Math.round(tagVariableTotal + tagFixedTotal);

                  return (
                    <div key={tag.id} className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                          <div>
                            <span className="font-bold text-slate-900">{tag.name}</span>
                            <p className="text-xs text-slate-600 mt-0.5">{membersInTag} miembros</p>
                          </div>
                        </div>
                        <span className="font-bold text-xl text-purple-900">${grandTotal.toLocaleString('es-CL')}</span>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <span className="bg-white/60 px-2 py-1 rounded text-slate-700">
                          {tag.sharePercentage}% Variable
                        </span>
                        {(tag.fixedFee ?? 0) > 0 && (
                          <span className="bg-white/60 px-2 py-1 rounded text-slate-700">
                            ${tagFixedTotal.toLocaleString('es-CL')} Fijo
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA - Resumen de Miembros CON ARRIENDOS DEL MES */}
        <div className="xl:col-span-3">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                <Users size={22} className="text-lof-600" />
                {strings.expenses.labels.monthlyPayments} {getMonthName(selectedMonth)}
              </h2>
              <div className="text-sm font-bold text-lof-600 bg-lof-50 px-4 py-2 rounded-full">
                Total: ${(totalSharedPayments + totalRentalsThisMonth).toLocaleString('es-CL')}
              </div>
            </div>

            <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
              {allowedEmails.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Users className="mx-auto mb-3 opacity-50" size={40} />
                  <p className="font-medium">{strings.expenses.noMembers}</p>
                </div>
              ) : (
                allowedEmails.map(email => {
                  const share = shares.find(s => s.memberEmail === email);
                  const sharedAmount = calculatedPayments[email] || 0;
                  const rentalAmount = getRentalAmountForMonth(email);
                  const totalToPay = sharedAmount + rentalAmount;

                  const hasTag = share?.tagId;
                  const tagName = hasTag ? tags.find(t => t.id === share.tagId)?.name : null;
                  const photoURL = getUserPhoto(email);
                  const displayName = getUserDisplayName(email);

                  const userForEmail = users.find(u => u.email === email);
                  const userBookings = userForEmail ? getBookingsForMonth(userForEmail.uid) : [];

                  return (
                    <div key={email} className="p-5 bg-gradient-to-r from-slate-50 to-white rounded-2xl border border-slate-200 hover:border-lof-300 hover:shadow-lg transition-all">
                      {/* Header con foto y nombre */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar src={photoURL} name={displayName} size="lg" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 truncate">{displayName}</p>
                            <p className="text-xs text-slate-500 truncate">{email}</p>
                          </div>
                        </div>

                        {isPropertyAdmin && (
                          <button
                            onClick={() => handleEditMember(email)}
                            className="text-lof-600 hover:text-lof-700 text-sm font-semibold px-3 py-1.5 hover:bg-lof-50 rounded-lg transition-all"
                          >
                            Editar
                          </button>
                        )}
                      </div>

                      {/* Tag Badge */}
                      {tagName && (
                        <div className="mb-4">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-100 px-3 py-1.5 rounded-full">
                            <Tag size={12} />
                            {tagName}
                          </span>
                        </div>
                      )}

                      {/* Desglose de Pagos */}
                      <div className="space-y-3 bg-white rounded-xl p-4 border border-slate-100">
                        {sharedAmount > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600 flex items-center gap-2">
                              <Receipt size={14} className="text-blue-500" />
                              {strings.expenses.title}
                            </span>
                            <span className="font-semibold text-slate-900">${sharedAmount.toLocaleString('es-CL')}</span>
                          </div>
                        )}

                        {rentalAmount > 0 && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600 flex items-center gap-2">
                                <Home size={14} className="text-green-500" />
                                {strings.nav.bookings} ({userBookings.length})
                              </span>
                              <span className="font-semibold text-slate-900">${rentalAmount.toLocaleString('es-CL')}</span>
                            </div>

                            {/* Detalles de arriendos */}
                            <div className="ml-6 space-y-1 mt-2">
                              {userBookings.map((booking, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs text-slate-500">
                                  <span>
                                    {new Date(booking.startDate).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} - {new Date(booking.endDate).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                                  </span>
                                  <span>${booking.totalCost?.toLocaleString('es-CL')}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {/* Total */}
                        <div className="flex justify-between items-center pt-3 border-t-2 border-slate-200">
                          <span className="text-sm font-bold text-slate-700">{strings.expenses.labels.totalFor} {getMonthName(selectedMonth).split(' ')[0].toUpperCase()}</span>
                          <span className="font-bold text-2xl text-lof-600">
                            ${totalToPay.toLocaleString('es-CL')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Expenses;