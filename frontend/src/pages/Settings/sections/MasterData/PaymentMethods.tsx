import MasterDataList from './MasterDataList';
import { getPaymentMethods, createPaymentMethod, updatePaymentMethod, deactivatePaymentMethod } from '../../../../services/masterData';

export default function PaymentMethods() {
  return (
    <MasterDataList
      title="Payment Methods"
      fetchList={getPaymentMethods}
      createItem={createPaymentMethod}
      updateItem={updatePaymentMethod}
      deactivateItem={deactivatePaymentMethod}
    />
  );
}
