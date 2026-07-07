import { apiRequest } from './api';
import type {
  CategoryOut,
  PaymentMethodOut,
  AccountOut,
  IncomeSourceOut,
  InvestmentTypeOut,
  PersonOut,
} from './types';

export const getCategories = () => apiRequest<CategoryOut[]>('/categories');
export const getPaymentMethods = () => apiRequest<PaymentMethodOut[]>('/payment-methods');
export const getAccounts = () => apiRequest<AccountOut[]>('/accounts');
export const getIncomeSources = () => apiRequest<IncomeSourceOut[]>('/income-sources');
export const getInvestmentTypes = () => apiRequest<InvestmentTypeOut[]>('/investment-types');
export const getPeople = () => apiRequest<PersonOut[]>('/people');