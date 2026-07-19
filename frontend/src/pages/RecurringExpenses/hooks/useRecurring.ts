import { useEffect, useState } from 'react';
import {
  listRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
  logRecurringNow,
  pauseRecurring,
  resumeRecurring,
  skipRecurring,
  completeRecurring,
  cancelRecurring,
} from '../../../services/recurring';
import { getAccounts, getExpenseTemplates, getIncomeTemplates } from '../../../services/masterData';
import { listInvestmentHoldings } from '../../../services/investments';
import { listLendings } from '../../../services/lending';
import { listBorrowings } from '../../../services/borrowing';
import { ApiError } from '../../../services/api';
import type {
  RecurringTransactionOut,
  RecurringTransactionCreate,
  RecurringTransactionUpdate,
  AccountOut,
  ExpenseTemplateOut,
  IncomeTemplateOut,
  InvestmentHoldingOut,
  LendingOut,
  BorrowingOut,
} from '../../../services/types';

export interface RecurringForm {
  name: string;
  amount: string;
  transaction_type: 'expense' | 'income' | 'investment' | 'lending' | 'borrowing';
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date: string;
  // Only used for expense/income. Investment/lending/borrowing derive their
  // account from the referenced holding/agreement - see MasterData below.
  account_id: string;
  notes: string;
  tags: string;
  // Type-specific references (exactly one used based on transaction_type)
  expense_template_id: string;
  income_template_id: string;
  investment_holding_id: string;
  lending_id: string;
  borrowing_id: string;
}

export interface MasterData {
  accounts: AccountOut[];
  expenseTemplates: ExpenseTemplateOut[];
  incomeTemplates: IncomeTemplateOut[];
  investmentHoldings: InvestmentHoldingOut[];
  lendings: LendingOut[];
  borrowings: BorrowingOut[];
}

const blankForm = (): RecurringForm => ({
  name: '',
  amount: '',
  transaction_type: 'expense',
  frequency: 'monthly',
  start_date: new Date().toISOString().slice(0, 10),
  end_date: '',
  account_id: '',
  notes: '',
  tags: '',
  expense_template_id: '',
  income_template_id: '',
  investment_holding_id: '',
  lending_id: '',
  borrowing_id: '',
});

// Types whose account is derived backend-side from the referenced entity.
// The form must never send account_id for these - the backend rejects it.
const DERIVES_ACCOUNT = new Set(['investment', 'lending', 'borrowing']);

export default function useRecurring() {
  const [items, setItems] = useState<RecurringTransactionOut[]>([]);
  const [masterData, setMasterData] = useState<MasterData>({
    accounts: [],
    expenseTemplates: [],
    incomeTemplates: [],
    investmentHoldings: [],
    lendings: [],
    borrowings: [],
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<RecurringForm>(blankForm());
  const [editingItem, setEditingItem] = useState<RecurringTransactionOut | null>(null);

  const load = async () => {
    try {
      const [recurring, accounts, expenseTemplates, incomeTemplates, investmentHoldings, lendings, borrowings] =
        await Promise.all([
          listRecurring(),
          getAccounts(),
          getExpenseTemplates(),
          getIncomeTemplates(),
          listInvestmentHoldings(),
          listLendings(),
          listBorrowings(),
        ]);
      setItems(recurring);
      setMasterData({ accounts, expenseTemplates, incomeTemplates, investmentHoldings, lendings, borrowings });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startEditing = (item: RecurringTransactionOut) => {
    setEditingItem(item);
    setError(null);
    setForm({
      name: item.name,
      amount: String(item.amount),
      transaction_type: item.transaction_type,
      frequency: item.frequency,
      start_date: item.start_date,
      end_date: item.end_date ?? '',
      account_id: String(item.account.id),
      notes: item.notes ?? '',
      tags: item.tags ?? '',
      expense_template_id: item.expense_template ? String(item.expense_template.id) : '',
      income_template_id: item.income_template ? String(item.income_template.id) : '',
      investment_holding_id: item.investment_holding ? String(item.investment_holding.id) : '',
      lending_id: item.lending_agreement ? String(item.lending_agreement.id) : '',
      borrowing_id: item.borrowing_agreement ? String(item.borrowing_agreement.id) : '',
    });
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setForm(blankForm());
    setError(null);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.amount) {
      setError('Name and amount are required.');
      return;
    }

    const needsAccount = !DERIVES_ACCOUNT.has(form.transaction_type);
    if (needsAccount && !form.account_id) {
      setError('Account is required.');
      return;
    }

    if (form.transaction_type === 'expense' && !form.expense_template_id) {
      setError('Expense template is required for expense transactions.');
      return;
    }
    if (form.transaction_type === 'income' && !form.income_template_id) {
      setError('Income template is required for income transactions.');
      return;
    }
    if (form.transaction_type === 'investment' && !form.investment_holding_id) {
      setError('An investment holding is required for investment transactions.');
      return;
    }
    if (form.transaction_type === 'lending' && !form.lending_id) {
      setError('Lending agreement is required for lending transactions.');
      return;
    }
    if (form.transaction_type === 'borrowing' && !form.borrowing_id) {
      setError('Borrowing agreement is required for borrowing transactions.');
      return;
    }

    const payload: RecurringTransactionCreate = {
      name: form.name.trim(),
      amount: parseFloat(form.amount),
      transaction_type: form.transaction_type,
      frequency: form.frequency,
      start_date: form.start_date,
      end_date: form.end_date || null,
      next_due_date: editingItem ? editingItem.next_due_date : form.start_date,
      // Never send account_id for investment/lending/borrowing - the
      // backend derives and owns it for those types.
      account_id: needsAccount ? parseInt(form.account_id) : null,
      notes: form.notes.trim() || null,
      tags: form.tags.trim() || null,
      expense_template_id: form.transaction_type === 'expense' ? parseInt(form.expense_template_id) : null,
      income_template_id: form.transaction_type === 'income' ? parseInt(form.income_template_id) : null,
      investment_holding_id: form.transaction_type === 'investment' ? parseInt(form.investment_holding_id) : null,
      lending_id: form.transaction_type === 'lending' ? parseInt(form.lending_id) : null,
      borrowing_id: form.transaction_type === 'borrowing' ? parseInt(form.borrowing_id) : null,
    };

    setSubmitting(true);
    setError(null);
    try {
      if (editingItem) {
        // Update payload mirrors create, but only include the reference
        // field relevant to the (possibly changed) transaction_type so we
        // don't accidentally clear a different type's reference.
        const updatePayload: RecurringTransactionUpdate = { ...payload };
        const updated = await updateRecurring(editingItem.id, updatePayload);
        setItems(prev => prev.map(i => (i.id === editingItem.id ? updated : i)));
      } else {
        const created = await createRecurring(payload);
        setItems(prev => [...prev, created]);
      }
      cancelEditing();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this recurring transaction?')) return;
    try {
      await deleteRecurring(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to delete');
    }
  };

  const handleLogNow = async (item: RecurringTransactionOut) => {
    setError(null);
    try {
      await logRecurringNow(item.id);
      const updated = await listRecurring();
      setItems(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to log transaction');
    }
  };

  const handlePause = async (id: number) => {
    setError(null);
    try {
      const updated = await pauseRecurring(id);
      setItems(prev => prev.map(i => (i.id === id ? updated : i)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to pause');
    }
  };

  const handleResume = async (id: number) => {
    setError(null);
    try {
      const updated = await resumeRecurring(id);
      setItems(prev => prev.map(i => (i.id === id ? updated : i)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to resume');
    }
  };

  const handleSkip = async (id: number) => {
    const reason = prompt('Reason for skipping (optional):');
    setError(null);
    try {
      const updated = await skipRecurring(id, reason || undefined);
      setItems(prev => prev.map(i => (i.id === id ? updated : i)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to skip');
    }
  };

  const handleComplete = async (id: number) => {
    if (!confirm('Mark this recurring transaction as completed?')) return;
    setError(null);
    try {
      const updated = await completeRecurring(id);
      setItems(prev => prev.map(i => (i.id === id ? updated : i)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to complete');
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Cancel this recurring transaction?')) return;
    setError(null);
    try {
      const updated = await cancelRecurring(id);
      setItems(prev => prev.map(i => (i.id === id ? updated : i)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to cancel');
    }
  };

  return {
    items,
    masterData,
    loading,
    submitting,
    error,
    form,
    editingItem,
    actions: {
      setForm,
      startEditing,
      cancelEditing,
      handleSubmit,
      handleDelete,
      handleLogNow,
      handlePause,
      handleResume,
      handleSkip,
      handleComplete,
      handleCancel,
    },
  };
}