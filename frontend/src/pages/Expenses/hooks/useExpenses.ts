import { useEffect, useState, type FormEvent } from "react";

import {
  createExpense,
  deleteExpense,
  listExpenses,
  updateExpense,
} from "../../../services/expenses";
import {
  getAccounts,
  getCategories,
  getPaymentMethods,
} from "../../../services/masterData";

import type {
  AccountOut,
  CategoryOut,
  PaymentMethodOut,
} from "../../../services/types";
import type { ExpenseOut } from "../../../services/types";

import { ApiError } from "../../../services/api";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function useExpenses() {
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOut[]>([]);
  const [accounts, setAccounts] = useState<AccountOut[]>([]);
  const [expenses, setExpenses] = useState<ExpenseOut[]>([]);

  const [editingExpense, setEditingExpense] =
  useState<ExpenseOut | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());

  const [categoryId, setCategoryId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [accountId, setAccountId] = useState("");

  const [merchantName, setMerchantName] = useState("");
  const [notes, setNotes] = useState("");

  async function loadEverything() {
    setLoading(true);
    setError(null);

    try {
      const [
        categoriesRes,
        paymentMethodsRes,
        accountsRes,
        expensesRes,
      ] = await Promise.all([
        getCategories(),
        getPaymentMethods(),
        getAccounts(),
        listExpenses(),
      ]);

      setCategories(categoriesRes);
      setPaymentMethods(paymentMethodsRes);
      setAccounts(accountsRes);
      setExpenses(expensesRes);

      if (categoriesRes.length)
        setCategoryId(String(categoriesRes[0].id));

      if (paymentMethodsRes.length)
        setPaymentMethodId(String(paymentMethodsRes[0].id));

      if (accountsRes.length)
        setAccountId(String(accountsRes[0].id));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to connect to backend."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEverything();
  }, []);

  function startEditing(expense: ExpenseOut) {
  setEditingExpense(expense);

  setAmount(String(expense.amount));
  setDate(expense.date);

  setCategoryId(String(expense.category.id));
  setPaymentMethodId(String(expense.payment_method.id));
  setAccountId(String(expense.account.id));

  setMerchantName(expense.merchant?.name ?? "");
  setNotes(expense.notes ?? "");
}

function cancelEditing() {
  setEditingExpense(null);

  setAmount("");
  setDate(todayIso());

  setMerchantName("");
  setNotes("");
}

async function handleDelete(expense: ExpenseOut) {
  const confirmed = window.confirm(
    `Delete expense ₹${expense.amount}?`,
  );

  if (!confirmed) return;

  try {
    await deleteExpense(expense.id);

    setExpenses((prev) =>
      prev.filter((item) => item.id !== expense.id),
    );
  } catch (err) {
    setError(
      err instanceof ApiError
        ? err.message
        : "Unable to delete expense.",
    );
  }
}

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();

  setError(null);

  const parsedAmount = Number(amount);

  if (!parsedAmount || parsedAmount <= 0) {
    setError("Enter a valid amount.");
    return;
  }

  if (!categoryId || !paymentMethodId || !accountId) {
    setError("Please fill all required fields.");
    return;
  }

  setSubmitting(true);

  const payload = {
    amount: parsedAmount,
    date,
    account_id: Number(accountId),
    category_id: Number(categoryId),
    payment_method_id: Number(paymentMethodId),
    merchant_name: merchantName.trim() || null,
    notes: notes.trim() || null,
  };

  try {
    // -----------------------------------------------------
    // EDIT MODE
    // -----------------------------------------------------
    if (editingExpense) {
      const updated = await updateExpense(
        editingExpense.id,
        payload,
      );

      setExpenses((prev) =>
        prev.map((expense) =>
          expense.id === updated.id
            ? updated
            : expense
        )
      );

      cancelEditing();
    }

    // -----------------------------------------------------
    // CREATE MODE
    // -----------------------------------------------------
    else {
      const created = await createExpense(payload);

      setExpenses((prev) => [
        created,
        ...prev,
      ]);

      setAmount("");
      setMerchantName("");
      setNotes("");
    }
  } catch (err) {
    setError(
      err instanceof ApiError
        ? err.message
        : "Unable to save expense."
    );
  } finally {
    setSubmitting(false);
  }
}

    return {
        loading,
        submitting,
        error,

        masterData: {
            categories,
            paymentMethods,
            accounts,
        },

        form: {
            amount,
            setAmount,

            date,
            setDate,

            categoryId,
            setCategoryId,

            paymentMethodId,
            setPaymentMethodId,

            accountId,
            setAccountId,

            merchantName,
            setMerchantName,

            notes,
            setNotes,
        },

        expenses,editingExpense,

        actions: {
            handleSubmit,
            reload: loadEverything,

            
            startEditing,
            cancelEditing,
            handleDelete,
        },
    };
}