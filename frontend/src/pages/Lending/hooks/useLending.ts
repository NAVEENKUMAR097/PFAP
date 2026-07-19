import { useEffect, useState } from 'react';
import {
  listLendings,
  createLending,
  updateLending,
  deleteLending,
  addRepayment,
  deleteRepayment,
} from '../../../services/lending';
import { getAccounts, getPeople } from '../../../services/masterData';
import type {
  AccountOut,
  PersonOut,
  LendingOut,
  LendingCreatePayload,
  LendingRepaymentCreatePayload,
} from '../../../services/types';
import { ApiError } from '../../../services/api';

interface UseLendingResult {
  lendings: LendingOut[];
  accounts: AccountOut[];
  people: PersonOut[];
  loading: boolean;
  submitting: boolean;
  error: string | null;

  editingLending: LendingOut | null;
  startEditing: (lending: LendingOut) => void;
  cancelEditing: () => void;

  submitLending: (payload: LendingCreatePayload) => Promise<void>;
  removeLending: (id: number) => Promise<void>;

  submitRepayment: (lendingId: number, payload: LendingRepaymentCreatePayload) => Promise<void>;
  removeRepayment: (lendingId: number, repaymentId: number) => Promise<void>;
}

import { UNREACHABLE_MESSAGE } from "../../../config";

export function useLending(): UseLendingResult {
  const [lendings, setLendings] = useState<LendingOut[]>([]);
  const [accounts, setAccounts] = useState<AccountOut[]>([]);
  const [people, setPeople] = useState<PersonOut[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingLending, setEditingLending] = useState<LendingOut | null>(null);

  async function loadEverything() {
    setLoading(true);
    setError(null);
    try {
      const [accountsRes, peopleRes, lendingsRes] = await Promise.all([
        getAccounts(),
        getPeople(),
        listLendings(),
      ]);
      setAccounts(accountsRes);
      setPeople(peopleRes);
      setLendings(lendingsRes);
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

  function startEditing(lending: LendingOut) {
    setEditingLending(lending);
  }

  function cancelEditing() {
    setEditingLending(null);
  }

  async function submitLending(payload: LendingCreatePayload) {
    setSubmitting(true);
    setError(null);
    try {
      if (editingLending) {
        const updated = await updateLending(editingLending.id, payload);
        setLendings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
        setEditingLending(null);
      } else {
        const created = await createLending(payload);
        setLendings((prev) => [created, ...prev]);
      }
      // A brand-new person typed into the form won't be in `people` yet;
      // refresh silently so the next form load has it for autocomplete.
      getPeople().then(setPeople).catch(() => {});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the lending entry.');
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  async function removeLending(id: number) {
    setError(null);
    try {
      await deleteLending(id);
      setLendings((prev) => prev.filter((l) => l.id !== id));
      if (editingLending?.id === id) setEditingLending(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the lending entry.');
    }
  }

  async function submitRepayment(lendingId: number, payload: LendingRepaymentCreatePayload) {
    setError(null);
    try {
      const updated = await addRepayment(lendingId, payload);
      setLendings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not record the repayment.');
      throw err;
    }
  }

  async function removeRepayment(lendingId: number, repaymentId: number) {
    setError(null);
    try {
      const updated = await deleteRepayment(lendingId, repaymentId);
      setLendings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove the repayment.');
    }
  }

  return {
    lendings,
    accounts,
    people,
    loading,
    submitting,
    error,
    editingLending,
    startEditing,
    cancelEditing,
    submitLending,
    removeLending,
    submitRepayment,
    removeRepayment,
  };
}