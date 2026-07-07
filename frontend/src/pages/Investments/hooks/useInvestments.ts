import { useEffect, useState } from 'react';
import { listInvestments, createInvestment, updateInvestment, deleteInvestment } from '../../../services/investments';
import { getAccounts, getInvestmentTypes } from '../../../services/masterData';
import type {
  AccountOut,
  InvestmentTypeOut,
  InvestmentOut,
  InvestmentCreatePayload,
} from '../../../services/types';
import { ApiError } from '../../../services/api';

interface UseInvestmentsResult {
  investments: InvestmentOut[];
  accounts: AccountOut[];
  investmentTypes: InvestmentTypeOut[];
  loading: boolean;
  submitting: boolean;
  error: string | null;

  editingInvestment: InvestmentOut | null;
  startEditing: (investment: InvestmentOut) => void;
  cancelEditing: () => void;

  submitInvestment: (payload: InvestmentCreatePayload) => Promise<void>;
  removeInvestment: (id: number) => Promise<void>;
}

const UNREACHABLE_MESSAGE = 'Could not reach the backend. Is it running on http://localhost:8000?';

export function useInvestments(): UseInvestmentsResult {
  const [investments, setInvestments] = useState<InvestmentOut[]>([]);
  const [accounts, setAccounts] = useState<AccountOut[]>([]);
  const [investmentTypes, setInvestmentTypes] = useState<InvestmentTypeOut[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingInvestment, setEditingInvestment] = useState<InvestmentOut | null>(null);

  async function loadEverything() {
    setLoading(true);
    setError(null);
    try {
      const [accountsRes, investmentTypesRes, investmentsRes] = await Promise.all([
        getAccounts(),
        getInvestmentTypes(),
        listInvestments(),
      ]);
      setAccounts(accountsRes);
      setInvestmentTypes(investmentTypesRes);
      setInvestments(investmentsRes);
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

  function startEditing(investment: InvestmentOut) {
    setEditingInvestment(investment);
  }

  function cancelEditing() {
    setEditingInvestment(null);
  }

  async function submitInvestment(payload: InvestmentCreatePayload) {
    setSubmitting(true);
    setError(null);
    try {
      if (editingInvestment) {
        const updated = await updateInvestment(editingInvestment.id, payload);
        setInvestments((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
        setEditingInvestment(null);
      } else {
        const created = await createInvestment(payload);
        setInvestments((prev) => [created, ...prev]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the investment.');
      throw err; // let the form know submission failed, so it doesn't clear itself
    } finally {
      setSubmitting(false);
    }
  }

  async function removeInvestment(id: number) {
    setError(null);
    try {
      await deleteInvestment(id);
      setInvestments((prev) => prev.filter((inv) => inv.id !== id));
      if (editingInvestment?.id === id) setEditingInvestment(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the investment.');
    }
  }

  return {
    investments,
    accounts,
    investmentTypes,
    loading,
    submitting,
    error,
    editingInvestment,
    startEditing,
    cancelEditing,
    submitInvestment,
    removeInvestment,
  };
}