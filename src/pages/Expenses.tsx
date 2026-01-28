import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getSharedExpenses,
  getMemberTags,
  getMemberShares,
  createMemberTag,
  deleteMemberTag,
  createSharedExpense,
  deleteSharedExpense,
  createMemberShare,
  updateMemberShare,
  calculateMemberPayments
} from '../services/expensesService';

import type {
  SharedExpense,
  MemberTag,
  MemberShare
} from '../services/expensesService';
import { getPropertyById } from '../services/propertyService';
import { Plus, Tag, DollarSign, Trash2, Users, Receipt, UserCog, Calculator } from 'lucide-react';
import { toast } from 'sonner';

const Expenses = () => {
  const { propertyId } = useParams();
  const { isAdmin, user } = useAuth();
  const { strings } = useLanguage();

  // Data State
  const [expenses, setExpenses] = useState<SharedExpense[]>([]);
  const [tags, setTags] = useState<MemberTag[]>([]);
  const [shares, setShares] = useState<MemberShare[]>([]);
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [showTagModal, setShowTagModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null); // Email of member being edited
  const [editShareData, setEditShareData] = useState<{ tagId: string, customAmount: string, useTag: boolean }>({
    tagId: '',
    customAmount: '',
    useTag: true
  });

  const [calculatedPayments, setCalculatedPayments] = useState<Record<string, number>>({});

  const [newTag, setNewTag] = useState({ name: '', sharePercentage: 0, color: 'blue' });
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
      const [expensesData, tagsData, sharesData, propData] = await Promise.all([
        getSharedExpenses(propertyId),
        getMemberTags(propertyId),
        getMemberShares(propertyId),
        getPropertyById(propertyId)
      ]);

      setExpenses(expensesData);
      setTags(tagsData);
      setShares(sharesData);
      if (propData?.allowedEmails) {
        setAllowedEmails(propData.allowedEmails);
      }

      // Calculate payments
      const payments = calculateMemberPayments(expensesData, sharesData, tagsData);
      setCalculatedPayments(payments);
    } catch (error) {
      console.error("Error loading expenses data:", error);
      toast.error("Error cargando los gastos");
    } finally {
      setLoading(false);
    }
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
      setNewTag({ name: '', sharePercentage: 0, color: 'blue' });
      // Reload tags
      const updatedTags = await getMemberTags(propertyId);
      setTags(updatedTags);
    } catch (error) {
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
      // Reload expenses
      const updatedExpenses = await getSharedExpenses(propertyId);
      setExpenses(updatedExpenses);
      // Recalculate
      const payments = calculateMemberPayments(updatedExpenses, shares, tags);
      setCalculatedPayments(payments);
    } catch (error) {
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
      // Recalculate
      const payments = calculateMemberPayments(updatedExpenses, shares, tags);
      setCalculatedPayments(payments);
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
        shareData.customAmount = null; // Clear custom amount
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

      // Reload Data
      const [updatedShares, updatedTags] = await Promise.all([
        getMemberShares(propertyId),
        getMemberTags(propertyId)
      ]);
      setShares(updatedShares);
      // Recalculate
      const payments = calculateMemberPayments(expenses, updatedShares, updatedTags);
      setCalculatedPayments(payments);

    } catch (error) {
      console.error(error);
      toast.error("Error guardando asignación");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Cargando gastos...</div>;
  }

  return (
    <div className="px-4 py-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Gastos Compartidos</h1>
          <p className="text-slate-600 mt-1">Administra los gastos comunes y su división entre miembros</p>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowTagModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-colors"
            >
              <Tag size={18} /> Gestionar Tags
            </button>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-lof-600 text-white rounded-xl hover:bg-lof-700 font-medium transition-colors shadow-lg shadow-lof-500/20"
            >
              <Plus size={18} /> Nuevo Gasto
            </button>
          </div>
        )}
      </div>

      {/* MODAL GESTIÓN DE TAGS */}
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
                    <input
                      type="number"
                      placeholder="%"
                      value={newTag.sharePercentage}
                      onChange={e => setNewTag({ ...newTag, sharePercentage: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-lof-500"
                    />
                  </div>
                  <button
                    onClick={handleCreateTag}
                    disabled={!newTag.name}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 font-medium"
                  >
                    {strings.common.add}
                  </button>
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
                        <span className={`w-3 h-3 rounded-full bg-${tag.color}-500`}></span>
                        <div>
                          <p className="font-medium text-slate-800">{tag.name}</p>
                          <p className="text-xs text-slate-500">{tag.sharePercentage}% del total</p>
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

      {/* MODAL NUEVO GASTO */}
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

              <div className="grid grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">{strings.common.frequency}</label>
                  <select
                    value={newExpense.frequency}
                    onChange={e => setNewExpense({ ...newExpense, frequency: e.target.value as any })}
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lof-500 bg-white"
                  >
                    <option value="monthly">{strings.expenses.frequencies.monthly}</option>
                    <option value="quarterly">{strings.expenses.frequencies.quarterly}</option>
                    <option value="yearly">{strings.expenses.frequencies.yearly}</option>
                    <option value="one-time">{strings.expenses.frequencies.oneTime}</option>
                  </select>
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
        </div>
      )}

      {/* MODAL EDITAR MIEMBRO */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{strings.expenses.editShareTitle}</h3>
                <p className="text-sm text-slate-500">{editingMember}</p>
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
                            <span className={`w-3 h-3 rounded-full bg-${tag.color}-500`}></span>
                            <span className="font-medium text-slate-700">{tag.name}</span>
                          </div>
                          <span className="text-sm text-slate-500">{tag.sharePercentage}%</span>
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Section for Shared Expenses List */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-lg text-slate-800">{strings.expenses.expenseListTitle}</h2>
              <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {strings.common.total}: ${expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString('es-CL')}
              </div>
            </div>

            {expenses.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Receipt className="mx-auto mb-3 opacity-50" size={32} />
                <p>{strings.expenses.noExpenses}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map(expense => (
                  <div key={expense.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-lof-200 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <DollarSign size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{expense.name}</h4>
                        <span className="text-xs text-slate-500 uppercase font-medium tracking-wide">
                          {expense.frequency === 'monthly' ? strings.expenses.frequencies.monthly :
                            expense.frequency === 'quarterly' ? strings.expenses.frequencies.quarterly :
                              expense.frequency === 'yearly' ? strings.expenses.frequencies.yearly : strings.expenses.frequencies.oneTime}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-lg text-slate-900">
                        ${expense.amount.toLocaleString('es-CL')}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Section for Member Balances */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
              <Users size={20} className="text-lof-600" />
              {strings.expenses.memberSummaryTitle}
            </h2>

            <div className="space-y-4">
              {allowedEmails.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-4">
                  {strings.expenses.noMembers}
                </p>
              ) : allowedEmails.map(email => {
                const share = shares.find(s => s.memberEmail === email);
                const amount = calculatedPayments[email] || 0;
                const hasTag = share?.tagId;
                const tagName = hasTag ? tags.find(t => t.id === share.tagId)?.name : null;
                const isCustom = share?.customAmount !== undefined && share?.customAmount !== null;

                return (
                  <div key={email} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-slate-800 text-sm break-all">{email}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {isCustom ? (
                            <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <UserCog size={10} /> {strings.expenses.labels.manual}
                            </span>
                          ) : tagName ? (
                            <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Tag size={10} /> {tagName}
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                              {strings.expenses.labels.unassigned}
                            </span>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handleEditMember(email)}
                          className="text-lof-600 hover:text-lof-700 text-xs font-medium"
                        >
                          {strings.common.edit}
                        </button>
                      )}
                    </div>

                    <div className="flex justify-between items-end mt-3">
                      <span className="text-xs text-slate-500">{strings.expenses.labels.toPay}</span>
                      <span className="font-bold text-lg text-slate-900">
                        ${amount.toLocaleString('es-CL')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Expenses;
