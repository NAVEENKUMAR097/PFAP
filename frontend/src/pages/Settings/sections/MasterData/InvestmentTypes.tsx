import MasterDataList from './MasterDataList';
import { getInvestmentTypes, createInvestmentType, updateInvestmentType, deactivateInvestmentType } from '../../../../services/masterData';

export default function InvestmentTypes() {
  return (
    <MasterDataList
      title="Investment Types"
      fetchList={getInvestmentTypes}
      createItem={createInvestmentType}
      updateItem={updateInvestmentType}
      deactivateItem={deactivateInvestmentType}
    />
  );
}
