import { useEffect, useRef, useState, type FormEvent } from "react";

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
  createExpenseTemplate,
} from "../../../services/masterData";
import { currentMonth, dateInMonth } from "../../../utils/month";

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

  // Month filter - defaults to the current month, same convention as
  // Dashboard/Analytics/Investments.
  const [month, setMonth] = useState(currentMonth());
  // isFirstMonthRun guards against double-fetching expenses on mount: the
  // initial load already fetches expenses for the initial month below, so
  // the month-change effect should only act on *changes* after that.
  const isFirstMonthRun = useRef(true);

  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
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
        listExpenses(month),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch only the expense list (not categories/payment methods/accounts)
  // whenever the selected month changes after the initial load.
  useEffect(() => {
    if (isFirstMonthRun.current) {
      isFirstMonthRun.current = false;
      return;
    }

    let cancelled = false;

    (async () => {
      setListLoading(true);
      setError(null);
      try {
        const expensesRes = await listExpenses(month);
        if (!cancelled) setExpenses(expensesRes);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Unable to load expenses."
          );
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [month]);

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

async function handleSaveAsTemplate() {
  const templateName = prompt("Enter a name for this expense template:");
  if (!templateName || !templateName.trim()) return;

  const parsedAmount = Number(amount);
  if (!parsedAmount || parsedAmount <= 0) {
    setError("Enter a valid amount before saving as template.");
    return;
  }

  if (!categoryId || !paymentMethodId || !accountId) {
    setError("Please fill all required fields before saving as template.");
    return;
  }

  setSubmitting(true);
  setError(null);

  try {
    await createExpenseTemplate({
      name: templateName.trim(),
      amount: parsedAmount,
      category_id: Number(categoryId),
      payment_method_id: Number(paymentMethodId),
      account_id: Number(accountId),
      merchant_name: merchantName.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    alert("Expense template saved successfully!");
  } catch (err) {
    setError(
      err instanceof ApiError
        ? err.message
        : "Unable to save expense template.",
    );
  } finally {
    setSubmitting(false);
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

      setExpenses((prev) => {
        // If the edited date moved outside the month currently being
        // viewed, drop it from this list instead of leaving a
        // now-mismatched row visible under the wrong month's filter.
        if (!dateInMonth(updated.date, month)) {
          return prev.filter((expense) => expense.id !== updated.id);
        }
        return prev.map((expense) =>
          expense.id === updated.id ? updated : expense
        );
      });

      cancelEditing();
    }

    // -----------------------------------------------------
    // CREATE MODE
    // -----------------------------------------------------
    else {
      const created = await createExpense(payload);

      // Only show it in the list if it actually belongs to the month
      // currently being viewed (e.g. backdating an expense while looking
      // at the current month shouldn't make it appear here).
      if (dateInMonth(created.date, month)) {
        setExpenses((prev) => [created, ...prev]);
      }

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
        listLoading,
        submitting,
        error,

        month,

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

            setMonth,
            startEditing,
            cancelEditing,
            handleDelete,
            handleSaveAsTemplate,
        },
    };
}