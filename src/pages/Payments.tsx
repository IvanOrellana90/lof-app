import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  Plus, CreditCard, TrendingDown, TrendingUp, Clock,
  Download, Trash2, Pencil, CheckCircle2,
  X, ChevronDown, ArrowDownLeft, ArrowUpRight,
  RotateCcw, Banknote, Filter, RefreshCw, Calendar as CalendarIcon,
} from 'lucide-react';

import { format, parseISO } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';

import { useLanguage } from '../context/LanguageContext';
import { usePropertyAdmin } from '../hooks/usePropertyAdmin';
import {
  getPayments,
  createPayment,
  updatePayment,
  deletePayment,
  markPaymentAsPaid,
  syncMonthlyExpensesToPayments,
  type CreatePaymentPayload,
} from '../services/paymentsService';
import type { PaymentRecord, PaymentType, PaymentStatus } from '../types';

// ─── helpers ───────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];

const daysUntilDue = (dueDate?: string): number | null => {
  if (!dueDate) return null;
  const diff = new Date(dueDate).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / 86_400_000);
};

const TYPE_CONFIG: Record<
  PaymentType,
  { labelKey: string; icon: React.ReactNode; color: string; bg: string; border: string }
> = {
  outgoing_external: {
    labelKey: 'outgoing_external',
    icon: <ArrowUpRight size={16} />,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
  },
  outgoing_recurring: {
    labelKey: 'outgoing_recurring',
    icon: <RotateCcw size={16} />,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  outgoing_unique: {
    labelKey: 'outgoing_unique',
    icon: <TrendingDown size={16} />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  incoming: {
    labelKey: 'incoming',
    icon: <ArrowDownLeft size={16} />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
};

// ─── status badge ──────────────────────────────────────────────────────────
const StatusBadge = ({ status, strings }: { status: PaymentStatus; strings: any }) => {
  const map: Record<PaymentStatus, { cls: string; label: string }> = {
    paid: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: strings.payments.statusPaid },
    pending: { cls: 'bg-amber-100 text-amber-700 border-amber-200', label: strings.payments.statusPending },
    overdue: { cls: 'bg-rose-100 text-rose-700 border-rose-200', label: strings.payments.statusOverdue },
  };
  const { cls, label } = map[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {label}
    </span>
  );
};

// ─── empty form factory ────────────────────────────────────────────────────
const emptyForm = (): CreatePaymentPayload & { isPaid: boolean; createdAtDate: string } => ({
  title: '',
  description: '',
  amount: 0,
  type: 'outgoing_unique',
  category: '',
  dueDate: '',
  paidDate: '',
  notes: '',
  isPaid: false,
  createdAtDate: today(),
});

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
const Payments = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const { strings, language } = useLanguage();
  const s = strings.payments;
  const { isPropertyAdmin } = usePropertyAdmin();

  const locale = language === 'es' ? es : enUS;

  // ── data ──────────────────────────────────────────────────────────────────
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // ── ui ────────────────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Date picker popovers state
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [showPaidDatePicker, setShowPaidDatePicker] = useState(false);
  const [showCreatedAtPicker, setShowCreatedAtPicker] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<PaymentType | 'all'>('all');
  const [monthFilter, setMonthFilter] = useState(() => today().slice(0, 7)); // YYYY-MM

  // ── load ──────────────────────────────────────────────────────────────────
  const loadPayments = async () => {
    if (!propertyId) return;
    setLoading(true);
    const data = await getPayments(propertyId);
    setPayments(data);
    setLoading(false);
  };

  useEffect(() => { loadPayments(); }, [propertyId]);

  // ── filtered + stats ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return payments.filter(p => {
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchType = typeFilter === 'all' || p.type === typeFilter;

      // Month filter: apply against dueDate or createdAt
      const dateStr = p.dueDate || (p.createdAt?.toDate ? p.createdAt.toDate().toISOString() : '');
      const matchMonth = !monthFilter || dateStr.startsWith(monthFilter);

      return matchStatus && matchType && matchMonth;
    });
  }, [payments, statusFilter, typeFilter, monthFilter]);

  const stats = useMemo(() => {
    const [year, month] = monthFilter.split('-').map(Number);
    const thisMonth = (p: PaymentRecord) => {
      const date = p.paidDate || (p.dueDate || '');
      return date.startsWith(`${year}-${String(month).padStart(2, '0')}`);
    };

    // Pendientes totales o atrasados (globales)
    const pendingIncoming = payments
      .filter(p => p.status !== 'paid' && p.type === 'incoming')
      .reduce((s, p) => s + p.amount, 0);

    const pendingOutgoing = payments
      .filter(p => p.status !== 'paid' && p.type !== 'incoming')
      .reduce((s, p) => s + p.amount, 0);

    // Balance mensual (ingresos vs gastos)
    const incomeMonth = payments
      .filter(p => p.type === 'incoming' && thisMonth(p) && p.status === 'paid')
      .reduce((s, p) => s + p.amount, 0);

    const expenseMonth = payments
      .filter(p => p.type !== 'incoming' && thisMonth(p) && p.status === 'paid')
      .reduce((s, p) => s + p.amount, 0);

    const balanceMonth = incomeMonth - expenseMonth;

    // Balance total (todos los meses)
    const incomeTotal = payments
      .filter(p => p.type === 'incoming' && p.status === 'paid')
      .reduce((s, p) => s + p.amount, 0);
    const expenseTotal = payments
      .filter(p => p.type !== 'incoming' && p.status === 'paid')
      .reduce((s, p) => s + p.amount, 0);
    const totalBalance = incomeTotal - expenseTotal;

    return { pendingIncoming, pendingOutgoing, balanceMonth, incomeMonth, expenseMonth, totalBalance };
  }, [payments, monthFilter]);

  // ── modal helpers ─────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowDueDatePicker(false);
    setShowPaidDatePicker(false);
    setShowCreatedAtPicker(false);
    setShowModal(true);
  };

  const openEdit = (p: PaymentRecord) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      description: p.description || '',
      amount: p.amount,
      type: p.type,
      category: p.category,
      dueDate: p.dueDate,
      isPaid: !!p.paidDate,
      paidDate: p.paidDate || '',
      notes: p.notes || '',
      createdAtDate: p.createdAt?.toDate ? format(p.createdAt.toDate(), 'yyyy-MM-dd') : today(),
    });
    setShowDueDatePicker(false);
    setShowPaidDatePicker(false);
    setShowCreatedAtPicker(false);
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingId(null); };

  const handleSave = async () => {
    if (!propertyId || !form.title || form.amount <= 0) return;
    setSaving(true);
    const payload: CreatePaymentPayload = {
      title: form.title,
      description: form.description || undefined,
      amount: form.amount,
      type: form.type,
      category: form.category || undefined,
      dueDate: form.dueDate || undefined,
      paidDate: form.isPaid ? (form.paidDate || today()) : undefined,
      notes: form.notes || undefined,
      createdAtOverride: form.createdAtDate,
    };

    if (editingId) {
      const { success } = await updatePayment(editingId, payload);
      if (success) { toast.success(s.toast.updated); }
      else { toast.error(s.toast.error); }
    } else {
      const { success } = await createPayment(propertyId, payload);
      if (success) { toast.success(s.toast.created); }
      else { toast.error(s.toast.error); }
    }

    setSaving(false);
    closeModal();
    loadPayments();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(s.deleteConfirm)) return;
    const { success } = await deletePayment(id);
    if (success) { toast.success(s.toast.deleted); loadPayments(); }
    else { toast.error(s.toast.deleteError); }
  };

  const handleMarkAsPaid = async (id: string) => {
    const { success } = await markPaymentAsPaid(id, today());
    if (success) { toast.success(s.toast.markedPaid); loadPayments(); }
    else { toast.error(s.toast.error); }
  };

  const handleSync = async () => {
    if (!propertyId) return;
    setSyncing(true);
    // Sync the current month relative to the currently selected monthFilter
    const [filterYear, filterMonth] = monthFilter.split('-').map(Number);
    const result = await syncMonthlyExpensesToPayments(propertyId, filterYear, filterMonth);
    setSyncing(false);
    if (!result.success) {
      toast.error(s.syncError);
    } else if (result.created === 0) {
      toast.info(s.syncNone);
    } else {
      toast.success(`${s.syncSuccess} (${result.created} nuevos)`);
      loadPayments();
    }
  };

  // ── export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = filtered.map(p => ({
      Título: p.title,
      Descripción: p.description || '',
      Monto: p.amount,
      Tipo: s.types[p.type],
      Categoría: p.category || '',
      Vencimiento: p.dueDate || '',
      'Fecha Pago': p.paidDate || '',
      Estado: s[`status${p.status.charAt(0).toUpperCase()}${p.status.slice(1)}` as 'statusPaid' | 'statusPending' | 'statusOverdue'],
      Notas: p.notes || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Pagos');
    XLSX.writeFile(wb, `Pagos_${propertyId}_${monthFilter}.xlsx`);
  };

  // ── reminder pill ─────────────────────────────────────────────────────────
  const ReminderPill = ({ p }: { p: PaymentRecord }) => {
    if (p.status === 'paid') return null;
    const days = daysUntilDue(p.dueDate);
    if (days === null) return null;
    if (days < 0) {
      return null;
    }
    if (days <= 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
          <Clock size={11} /> {s.reminderSoon} ({days}d)
        </span>
      );
    }
    return null;
  };

  // ── type tab bar ──────────────────────────────────────────────────────────
  const PAYMENT_TYPES: (PaymentType | 'all')[] = ['all', 'outgoing_external', 'outgoing_recurring', 'outgoing_unique', 'incoming'];

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
        <div className="w-5 h-5 border-2 border-lof-600 border-t-transparent rounded-full animate-spin" />
        {strings.common.loading}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="px-4 py-8 pb-28">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              {s.title}
            </h1>
          </div>
          <p className="text-slate-500 mt-1 ml-1 mb-2">{s.subtitle}</p>
          <div className={`px-3 py-1 rounded-full text-sm font-bold border flex items-center gap-1.5 ${stats.totalBalance > 0
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : stats.totalBalance < 0
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}>
            <Banknote size={14} />
            {s.totalBalance}: ${stats.totalBalance.toLocaleString('es-CL')}
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold text-sm transition-all shadow-sm"
          >
            <Download size={16} /> {s.exportExcel}
          </button>
          {isPropertyAdmin && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-emerald-300 text-emerald-700 rounded-xl hover:bg-emerald-50 font-semibold text-sm transition-all shadow-sm disabled:opacity-60"
              title={`Sincronizar gastos del mes anterior al seleccionado`}
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? s.syncing : s.syncBtn}
            </button>
          )}
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-700 hover:to-purple-700 font-bold text-sm transition-all shadow-lg shadow-purple-500/30"
          >
            <Plus size={18} /> {s.newPayment}
          </button>
        </div>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={openCreate}
        className="md:hidden fixed bottom-24 right-4 w-14 h-14 bg-gradient-to-br from-violet-600 to-purple-600 text-white rounded-full shadow-xl shadow-purple-500/40 flex items-center justify-center z-50 hover:scale-105 transition-transform"
      >
        <Plus size={26} />
      </button>

      {/* ── STATS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className={`p-5 rounded-2xl border ${stats.balanceMonth > 0
          ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200'
          : stats.balanceMonth < 0
            ? 'bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200'
            : 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200'
          }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-semibold ${stats.balanceMonth > 0 ? 'text-emerald-700' : stats.balanceMonth < 0 ? 'text-rose-700' : 'text-slate-700'
              }`}>{s.balanceMonth}</span>
            <Banknote className={stats.balanceMonth > 0 ? 'text-emerald-500' : stats.balanceMonth < 0 ? 'text-rose-500' : 'text-slate-500'} size={20} />
          </div>
          <p className={`text-2xl font-bold ${stats.balanceMonth > 0 ? 'text-emerald-900' : stats.balanceMonth < 0 ? 'text-rose-900' : 'text-slate-900'
            }`}>${stats.balanceMonth.toLocaleString('es-CL')}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-2xl border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-blue-700">{s.pendingIncoming}</span>
            <TrendingUp className="text-blue-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-blue-900">${stats.pendingIncoming.toLocaleString('es-CL')}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-5 rounded-2xl border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-orange-700">{s.pendingOutgoing}</span>
            <TrendingDown className="text-orange-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-orange-900">${stats.pendingOutgoing.toLocaleString('es-CL')}</p>
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">

          {/* Month picker */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400 flex-shrink-0" />
            <div className="relative flex items-center">
              <input
                type="month"
                value={monthFilter}
                onChange={e => setMonthFilter(e.target.value)}
                className={`border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-400 transition-colors ${monthFilter ? 'bg-purple-50 text-purple-700 border-purple-200' : 'text-slate-700 bg-white'
                  }`}
              />
              {monthFilter && (
                <button
                  onClick={() => setMonthFilter('')}
                  className="absolute right-1.5 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Mostrar todos los meses"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Status filter */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'overdue', 'paid'] as (PaymentStatus | 'all')[]).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${statusFilter === st
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
              >
                {st === 'all' ? s.filterAll : st === 'pending' ? s.filterPending : st === 'paid' ? s.filterPaid : s.filterOverdue}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <div className="relative ml-auto">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as PaymentType | 'all')}
              className="appearance-none pl-3 pr-8 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-purple-400 bg-white"
            >
              {PAYMENT_TYPES.map(t => (
                <option key={t} value={t}>
                  {t === 'all' ? s.filterAll : s.types[t]}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── PAYMENTS LIST ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
          <CreditCard className="mx-auto mb-4 text-slate-300" size={48} />
          <p className="font-semibold text-slate-600">{s.noPayments}</p>
          <p className="text-sm text-slate-400 mt-1">{s.noPaymentsDesc}</p>
          <button
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-700 transition-colors"
          >
            <Plus size={16} /> {s.newPayment}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const tc = TYPE_CONFIG[p.type];
            return (
              <div
                key={p.id}
                className={`bg-white border rounded-2xl p-4 hover:shadow-md transition-all group ${p.status === 'overdue' ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200'
                  }`}
              >
                <div className="flex items-start gap-4">
                  {/* Type icon */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${tc.bg} ${tc.color} border ${tc.border}`}>
                    {tc.icon}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start gap-2 mb-1">
                      <h3 className="font-bold text-slate-900 leading-tight">{p.title}</h3>
                      <StatusBadge status={p.status} strings={strings} />
                      <ReminderPill p={p} />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className={`font-semibold ${tc.color}`}>{s.types[p.type]}</span>
                      {p.category && <span>📁 {p.category}</span>}
                      {p.dueDate && <span>📅 {s.dueDate}: {p.dueDate}</span>}
                      {p.paidDate && <span>✅ {s.paidOn}: {p.paidDate}</span>}
                    </div>
                  </div>

                  {/* Amount + actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`text-lg font-bold tabular-nums ${p.type === 'incoming' ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {p.type === 'incoming' ? '+' : '-'}${p.amount.toLocaleString('es-CL')}
                    </span>

                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      {p.status !== 'paid' && (
                        <button
                          onClick={() => handleMarkAsPaid(p.id)}
                          title={s.markAsPaid}
                          className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(p)}
                        title={s.editPayment}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        title={strings.common.delete}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Description row */}
                {p.description && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl text-sm text-slate-600 border border-slate-100 whitespace-pre-wrap">
                    {p.description}
                  </div>
                )}

                {/* Notes row */}
                {p.notes && (
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 italic">
                    💬 {p.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">

            {/* Modal header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-900">
                {editingId ? s.editPayment : s.newPayment}
              </h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal body — scrollable */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{s.form.title} *</label>
                <input
                  type="text"
                  placeholder={s.form.titlePlaceholder}
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{s.form.description}</label>
                <textarea
                  placeholder={s.form.descriptionPlaceholder}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-400 min-h-[80px] resize-y"
                />
              </div>

              {/* Amount + Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{s.form.amount} *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.amount || ''}
                    onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{s.form.category}</label>
                  <input
                    type="text"
                    placeholder={s.form.categoryPlaceholder}
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>

              {/* Payment Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">{s.form.type}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(TYPE_CONFIG) as PaymentType[]).map(t => {
                    const tc = TYPE_CONFIG[t];
                    const active = form.type === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm({ ...form, type: t })}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${active
                          ? `${tc.bg} ${tc.color} ${tc.border} ring-1 ring-current shadow-sm`
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                      >
                        <span className={`flex-shrink-0 ${active ? tc.color : 'text-slate-400'}`}>{tc.icon}</span>
                        <span>{s.types[t]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Created At & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Creation date */}
                <div className="relative">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{s.form.createdAt}</label>
                  <div
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
                    onClick={() => {
                      setShowCreatedAtPicker(!showCreatedAtPicker);
                      setShowDueDatePicker(false);
                      setShowPaidDatePicker(false);
                    }}
                  >
                    <span className={form.createdAtDate ? 'text-slate-900' : 'text-slate-400'}>
                      {form.createdAtDate ? format(parseISO(form.createdAtDate), 'dd/MM/yyyy') : 'DD/MM/YYYY'}
                    </span>
                    <CalendarIcon size={16} className="text-slate-400" />
                  </div>

                  {showCreatedAtPicker && (
                    <div className="absolute z-50 top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-3">
                      <DayPicker
                        mode="single"
                        selected={form.createdAtDate ? parseISO(form.createdAtDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setForm({ ...form, createdAtDate: format(date, 'yyyy-MM-dd') });
                            setShowCreatedAtPicker(false);
                          }
                        }}
                        locale={locale}
                        className="!m-0 lof-calendar"
                        modifiersClassNames={{
                          selected: 'bg-lof-600 text-white hover:bg-lof-700',
                          today: 'text-lof-600 font-bold',
                        }}
                      />
                    </div>
                  )}

                  {showCreatedAtPicker && (
                    <div className="fixed inset-0 z-40" onClick={() => setShowCreatedAtPicker(false)} />
                  )}
                </div>

                {/* Due date */}
                <div className="relative">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{s.form.dueDate}</label>
                  <div
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
                    onClick={() => {
                      setShowDueDatePicker(!showDueDatePicker);
                      setShowCreatedAtPicker(false);
                      setShowPaidDatePicker(false);
                    }}
                  >
                    <span className={form.dueDate ? 'text-slate-900' : 'text-slate-400'}>
                      {form.dueDate ? format(parseISO(form.dueDate), 'dd/MM/yyyy') : 'DD/MM/YYYY'}
                    </span>
                    <CalendarIcon size={16} className="text-slate-400" />
                  </div>

                  {showDueDatePicker && (
                    <div className="absolute z-50 top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-3">
                      <DayPicker
                        mode="single"
                        selected={form.dueDate ? parseISO(form.dueDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setForm({ ...form, dueDate: format(date, 'yyyy-MM-dd') });
                            setShowDueDatePicker(false);
                          }
                        }}
                        locale={locale}
                        className="!m-0 lof-calendar"
                        modifiersClassNames={{
                          selected: 'bg-lof-600 text-white hover:bg-lof-700',
                          today: 'text-lof-600 font-bold',
                        }}
                      />
                    </div>
                  )}

                  {showDueDatePicker && (
                    <div className="fixed inset-0 z-40" onClick={() => setShowDueDatePicker(false)} />
                  )}
                </div>
              </div>

              {/* Is paid toggle */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isPaid: !form.isPaid, paidDate: !form.isPaid ? today() : '' })}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.isPaid ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isPaid ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <span className="text-sm font-medium text-slate-700">{s.form.isPaid}</span>
              </div>

              {/* Paid date (shown when isPaid) */}
              {form.isPaid && (
                <div className="relative">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{s.form.paidDate}</label>
                  <div
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
                    onClick={() => {
                      setShowPaidDatePicker(!showPaidDatePicker);
                      setShowDueDatePicker(false);
                    }}
                  >
                    <span className={form.paidDate ? 'text-slate-900' : 'text-slate-400'}>
                      {form.paidDate ? format(parseISO(form.paidDate), 'dd/MM/yyyy') : 'DD/MM/YYYY'}
                    </span>
                    <CalendarIcon size={16} className="text-slate-400" />
                  </div>

                  {showPaidDatePicker && (
                    <div className="absolute z-50 top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-3">
                      <DayPicker
                        mode="single"
                        selected={form.paidDate ? parseISO(form.paidDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setForm({ ...form, paidDate: format(date, 'yyyy-MM-dd') });
                            setShowPaidDatePicker(false);
                          }
                        }}
                        locale={locale}
                        className="!m-0 lof-calendar"
                        modifiersClassNames={{
                          selected: 'bg-lof-600 text-white hover:bg-lof-700',
                          today: 'text-lof-600 font-bold',
                        }}
                      />
                    </div>
                  )}

                  {showPaidDatePicker && (
                    <div className="fixed inset-0 z-40" onClick={() => setShowPaidDatePicker(false)} />
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{s.form.notes}</label>
                <textarea
                  rows={3}
                  placeholder={s.form.notesPlaceholder}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
              <button
                onClick={handleSave}
                disabled={saving || !form.title || form.amount <= 0}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 transition-all shadow-md shadow-purple-500/25"
              >
                {saving ? s.form.saving : s.form.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
