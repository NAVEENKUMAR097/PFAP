import type { FormEvent } from "react";
import type { ExpenseOut } from "../../../services/types";
import type {
  AccountOut,
  CategoryOut,
  PaymentMethodOut,
} from "../../../services/types";

interface ExpenseFormProps {
  loading: boolean;
  submitting: boolean;
  error: string | null;

  masterData: {
    categories: CategoryOut[];
    accounts: AccountOut[];
    paymentMethods: PaymentMethodOut[];
  };

    editingExpense: ExpenseOut | null;

    onCancelEdit: () => void;

 onSaveAsTemplate?: () => void;

    form: {
    amount: string;
    setAmount: (value: string) => void;

    date: string;
    setDate: (value: string) => void;

    categoryId: string;
    setCategoryId: (value: string) => void;

    paymentMethodId: string;
    setPaymentMethodId: (value: string) => void;

    accountId: string;
    setAccountId: (value: string) => void;

    merchantName: string;
    setMerchantName: (value: string) => void;

    notes: string;
    setNotes: (value: string) => void;
  };

  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

export default function ExpenseForm({
  loading,
  submitting,
  error,
  masterData,
  form,
  editingExpense,
  onCancelEdit,
  onSaveAsTemplate,
  onSubmit,
}: ExpenseFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 flex flex-col gap-3 rounded-2xl bg-surface p-4"
    >
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
          Amount

          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => form.setAmount(e.target.value)}
            placeholder="0.00"
            className="rounded-xl bg-surface-2 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-gold"
          />
        </label>

        <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
          Date

          <input
            type="date"
            value={form.date}
            onChange={(e) => form.setDate(e.target.value)}
            className="rounded-xl bg-surface-2 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-gold"
          />
        </label>
      </div>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
          Category

          <select
            value={form.categoryId}
            onChange={(e) => form.setCategoryId(e.target.value)}
            className="rounded-xl bg-surface-2 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-gold"
          >
            {masterData.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-1 flex-col gap-1 text-sm text-muted">
          Payment Method

          <select
            value={form.paymentMethodId}
            onChange={(e) => form.setPaymentMethodId(e.target.value)}
            className="rounded-xl bg-surface-2 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-gold"
          >
            {masterData.paymentMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Account

        <select
          value={form.accountId}
          onChange={(e) => form.setAccountId(e.target.value)}
          disabled={loading || masterData.accounts.length === 0}
          className="rounded-xl bg-surface-2 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-gold"
        >
          <option value="" disabled>
            {loading
              ? "Loading accounts..."
              : masterData.accounts.length === 0
              ? "No accounts available"
              : "Select an account"}
          </option>
          {masterData.accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Merchant (Optional)

        <input
          type="text"
          value={form.merchantName}
          onChange={(e) => form.setMerchantName(e.target.value)}
          placeholder="e.g. Swiggy"
          className="rounded-xl bg-surface-2 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-gold"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-muted">
        Notes (Optional)

        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => form.setNotes(e.target.value)}
          placeholder="Additional notes..."
          className="resize-none rounded-xl bg-surface-2 px-3 py-2 text-ink outline-none focus:ring-2 focus:ring-gold"
        />
      </label>

      {error && (
        <p className="text-sm text-negative">
          {error}
        </p>
      )}

          <div className="mt-4 flex gap-3">

              <button
                  type="submit"
                  disabled={loading || submitting}
                  className="flex-1 rounded-xl bg-gold py-3 text-sm font-semibold text-base disabled:opacity-50"
              >
                  {submitting
                      ? "Saving..."
                      : editingExpense
                          ? "Update Expense"
                          : "Add Expense"}
              </button>

              {onSaveAsTemplate && !editingExpense && (
                  <button
                      type="button"
                      onClick={onSaveAsTemplate}
                      disabled={loading || submitting}
                      className="rounded-xl border border-white/10 px-4 py-3 text-sm text-muted disabled:opacity-50"
                  >
                      Save as Template
                  </button>
              )}

              {editingExpense && (
                  <button
                      type="button"
                      onClick={onCancelEdit}
                      className="rounded-xl border border-white/10 px-6 py-3"
                  >
                      Cancel
                  </button>
              )}

          </div>
    </form>
  );
}