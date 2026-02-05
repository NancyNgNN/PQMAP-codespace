import { useState } from 'react';
import GroupList from './GroupList';

export default function GroupManagement() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <GroupList refreshKey={refreshKey} />
    </div>
  );
}
