import MasterDataList from './MasterDataList';
import { getAccounts, createAccount, updateAccount, deactivateAccount } from '../../../../services/masterData';

export default function Accounts() {
  return (
    <MasterDataList
      title="Accounts"
      fetchList={getAccounts}
      createItem={createAccount}
      updateItem={updateAccount}
      deactivateItem={deactivateAccount}
    />
  );
}
