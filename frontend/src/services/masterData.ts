import { apiRequest } from './api';
import type { CategoryOut, PaymentMethodOut, AccountOut } from './types';

export const getCategories = () => apiRequest<CategoryOut[]>('/categories');
export const getPaymentMethods = () => apiRequest<PaymentMethodOut[]>('/payment-methods');
export const getAccounts = () => apiRequest<AccountOut[]>('/accounts');