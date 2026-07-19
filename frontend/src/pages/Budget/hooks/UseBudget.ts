import { useEffect, useState } from 'react';
import { listBudgets, createBudget, updateBudget, deleteBudget } from '../../../services/Budget';
import { getCategories } from '../../../services/masterData';
import type { CategoryOut, BudgetOut, BudgetCreatePayload } from '../../../services/types';
import { ApiError } from '../../../services/api';

interface UseBudgetResult {
  budgets: BudgetOut[];
  categories: CategoryOut[];
  loading: boolean;
  submitting: boolean;
  error: string | null;

  editingBudget: BudgetOut | null;
  startEditing: (budget: BudgetOut) => void;
  cancelEditing: () => void;

  submitBudget: (payload: BudgetCreatePayload) => Promise<void>;
  removeBudget: (id: number) => Promise<void>;
}

import { UNREACHABLE_MESSAGE } from "../../../config";

export function useBudget(month: string): UseBudgetResult {
  const [budgets, setBudgets] = useState<BudgetOut[]>([]);
  const [categories, setCategories] = useState<CategoryOut[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingBudget, setEditingBudget] = useState<BudgetOut | null>(null);

  async function loadEverything() {
    setLoading(true);
    setError(null);
    try {
      const [categoriesRes, budgetsRes] = await Promise.all([getCategories(), listBudgets(month)]);
      setCategories(categoriesRes);
      setBudgets(budgetsRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : UNREACHABLE_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  // Re-fetches whenever the selected month changes, and clears any
  // in-progress edit — an edit started on July's budget shouldn't carry
  // over if the person switches to viewing August.
  useEffect(() => {
    setEditingBudget(null);
    loadEverything();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  function startEditing(budget: BudgetOut) {
    setEditingBudget(budget);
  }

  function cancelEditing() {
    setEditingBudget(null);
  }

  async function submitBudget(payload: BudgetCreatePayload) {
    setSubmitting(true);
    setError(null);
    try {
      if (editingBudget) {
        const updated = await updateBudget(editingBudget.id, payload);
        setBudgets((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
        setEditingBudget(null);
      } else {
        const created = await createBudget(payload);
        setBudgets((prev) => [...prev, created]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the budget.');
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  async function removeBudget(id: number) {
    setError(null);
    try {
      await deleteBudget(id);
      setBudgets((prev) => prev.filter((b) => b.id !== id));
      if (editingBudget?.id === id) setEditingBudget(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the budget.');
    }
  }

  return {
    budgets,
    categories,
    loading,
    submitting,
    error,
    editingBudget,
    startEditing,
    cancelEditing,
    submitBudget,
    removeBudget,
  };
}