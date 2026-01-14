import { useState } from 'react';
import GroupList from './GroupList';
import GroupEditor from './GroupEditor.tsx';
import type { NotificationGroup } from '../../types/database';

export default function GroupManagement() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();

  const handleEdit = (group: NotificationGroup) => {
    setSelectedGroupId(group.id);
    setEditorOpen(true);
  };

  const handleNew = () => {
    setSelectedGroupId(undefined);
    setEditorOpen(true);
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
    setSelectedGroupId(undefined);
  };

  const handleEditorSaved = () => {
    setEditorOpen(false);
    setSelectedGroupId(undefined);
  };

  return (
    <div>
      <GroupList onEdit={handleEdit} onNew={handleNew} />
      
      {editorOpen && (
        <GroupEditor
          groupId={selectedGroupId}
          onClose={handleEditorClose}
          onSaved={handleEditorSaved}
        />
      )}
    </div>
  );
}
