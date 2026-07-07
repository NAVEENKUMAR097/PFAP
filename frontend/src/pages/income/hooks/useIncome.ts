import { useEffect, useState } from 'react';
import { listIncomes, createIncome, updateIncome, deleteIncome } from '../../../services/income';
import { getAccounts, getIncomeSources } from '../../../services/masterData';
import type { AccountOut, IncomeSourceOut, IncomeOut, IncomeCreatePayload } from '../../../services/types';
import { ApiError } from '../../../services/api';

interface UseIncomeResult {
  incomes: IncomeOut[];
  accounts: AccountOut[];
  incomeSources: IncomeSourceOut[];
  loading: boolean;
  submitting: boolean;
  error: string | null;

  editingIncome: IncomeOut | null;
  startEditing: (income: IncomeOut) => void;
  cancelEditing: () => void;

  submitIncome: (payload: IncomeCreatePayload) => Promise<void>;
  removeIncome: (id: number) => Promise<void>;
}

const UNREACHABLE_MESSAGE = 'Could not reach the backend. Is it running on http://localhost:8000?';

export function useIncome(): UseIncomeResult {
  const [incomes, setIncomes] = useState<IncomeOut[]>([]);
  const [accounts, setAccounts] = useState<AccountOut[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSourceOut[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingIncome, setEditingIncome] = useState<IncomeOut | null>(null);

  async function loadEverything() {
    setLoading(true);
    setError(null);
    try {
      const [accountsRes, incomeSourcesRes, incomesRes] = await Promise.all([
        getAccounts(),
        getIncomeSources(),
        listIncomes(),
      ]);
      setAccounts(accountsRes);
      setIncomeSources(incomeSourcesRes);
      setIncomes(incomesRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : UNREACHABLE_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEverything();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEditing(income: IncomeOut) {
    setEditingIncome(income);
  }

  function cancelEditing() {
    setEditingIncome(null);
  }

  async function submitIncome(payload: IncomeCreatePayload) {
    setSubmitting(true);
    setError(null);
    try {
      if (editingIncome) {
        const updated = await updateIncome(editingIncome.id, payload);
        setIncomes((prev) => prev.map((income) => (income.id === updated.id ? updated : income)));
        setEditingIncome(null);
      } else {
        const created = await createIncome(payload);
        setIncomes((prev) => [created, ...prev]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the income.');
      throw err; // let the form know submission failed, so it doesn't clear itself
    } finally {
      setSubmitting(false);
    }
  }

  async function removeIncome(id: number) {
    setError(null);
    try {
      await deleteIncome(id);
      setIncomes((prev) => prev.filter((income) => income.id !== id));
      if (editingIncome?.id === id) setEditingIncome(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the income.');
    }
  }

  return {
    incomes,
    accounts,
    incomeSources,
    loading,
    submitting,
    error,
    editingIncome,
    startEditing,
    cancelEditing,
    submitIncome,
    removeIncome,
  };
}