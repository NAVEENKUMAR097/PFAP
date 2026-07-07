import { useEffect, useState } from 'react';
import {
  listBorrowings,
  createBorrowing,
  updateBorrowing,
  deleteBorrowing,
  addRepayment,
  deleteRepayment,
} from '../../../services/borrowing';
import { getAccounts, getPeople } from '../../../services/masterData';
import type {
  AccountOut,
  PersonOut,
  BorrowingOut,
  BorrowingCreatePayload,
  BorrowingRepaymentCreatePayload,
} from '../../../services/types';
import { ApiError } from '../../../services/api';

interface UseBorrowingResult {
  borrowings: BorrowingOut[];
  accounts: AccountOut[];
  people: PersonOut[];
  loading: boolean;
  submitting: boolean;
  error: string | null;

  editingBorrowing: BorrowingOut | null;
  startEditing: (borrowing: BorrowingOut) => void;
  cancelEditing: () => void;

  submitBorrowing: (payload: BorrowingCreatePayload) => Promise<void>;
  removeBorrowing: (id: number) => Promise<void>;

  submitRepayment: (borrowingId: number, payload: BorrowingRepaymentCreatePayload) => Promise<void>;
  removeRepayment: (borrowingId: number, repaymentId: number) => Promise<void>;
}

const UNREACHABLE_MESSAGE = 'Could not reach the backend. Is it running on http://localhost:8000?';

export function useBorrowing(): UseBorrowingResult {
  const [borrowings, setBorrowings] = useState<BorrowingOut[]>([]);
  const [accounts, setAccounts] = useState<AccountOut[]>([]);
  const [people, setPeople] = useState<PersonOut[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingBorrowing, setEditingBorrowing] = useState<BorrowingOut | null>(null);

  async function loadEverything() {
    setLoading(true);
    setError(null);
    try {
      const [accountsRes, peopleRes, borrowingsRes] = await Promise.all([
        getAccounts(),
        getPeople(),
        listBorrowings(),
      ]);
      setAccounts(accountsRes);
      setPeople(peopleRes);
      setBorrowings(borrowingsRes);
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

  function startEditing(borrowing: BorrowingOut) {
    setEditingBorrowing(borrowing);
  }

  function cancelEditing() {
    setEditingBorrowing(null);
  }

  async function submitBorrowing(payload: BorrowingCreatePayload) {
    setSubmitting(true);
    setError(null);
    try {
      if (editingBorrowing) {
        const updated = await updateBorrowing(editingBorrowing.id, payload);
        setBorrowings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
        setEditingBorrowing(null);
      } else {
        const created = await createBorrowing(payload);
        setBorrowings((prev) => [created, ...prev]);
      }
      getPeople().then(setPeople).catch(() => {});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the borrowing entry.');
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  async function removeBorrowing(id: number) {
    setError(null);
    try {
      await deleteBorrowing(id);
      setBorrowings((prev) => prev.filter((b) => b.id !== id));
      if (editingBorrowing?.id === id) setEditingBorrowing(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the borrowing entry.');
    }
  }

  async function submitRepayment(borrowingId: number, payload: BorrowingRepaymentCreatePayload) {
    setError(null);
    try {
      const updated = await addRepayment(borrowingId, payload);
      setBorrowings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not record the repayment.');
      throw err;
    }
  }

  async function removeRepayment(borrowingId: number, repaymentId: number) {
    setError(null);
    try {
      const updated = await deleteRepayment(borrowingId, repaymentId);
      setBorrowings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove the repayment.');
    }
  }

  return {
    borrowings,
    accounts,
    people,
    loading,
    submitting,
    error,
    editingBorrowing,
    startEditing,
    cancelEditing,
    submitBorrowing,
    removeBorrowing,
    submitRepayment,
    removeRepayment,
  };
}