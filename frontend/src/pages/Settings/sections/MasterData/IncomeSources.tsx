import MasterDataList from './MasterDataList';
import { getIncomeSources, createIncomeSource, updateIncomeSource, deactivateIncomeSource } from '../../../../services/masterData';

export default function IncomeSources() {
  return (
    <MasterDataList
      title="Income Sources"
      fetchList={getIncomeSources}
      createItem={createIncomeSource}
      updateItem={updateIncomeSource}
      deactivateItem={deactivateIncomeSource}
    />
  );
}
