import MasterDataList from './MasterDataList';
import { getCategories, createCategory, updateCategory, deactivateCategory } from '../../../../services/masterData';

export default function Categories() {
  return (
    <MasterDataList
      title="Categories"
      fetchList={getCategories}
      createItem={createCategory}
      updateItem={updateCategory}
      deactivateItem={deactivateCategory}
    />
  );
}
