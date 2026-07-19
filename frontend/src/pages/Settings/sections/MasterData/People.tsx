import MasterDataList from './MasterDataList';
import { getPeople, createPerson, updatePerson, deactivatePerson } from '../../../../services/masterData';

export default function People() {
  return (
    <MasterDataList
      title="People"
      fetchList={getPeople}
      createItem={createPerson}
      updateItem={updatePerson}
      deactivateItem={deactivatePerson}
    />
  );
}
