import { useState } from 'react';
import TemplateList from './TemplateList';
import TemplateEditor from './TemplateEditor';
import type { NotificationTemplate } from '../../types/database';

export default function TemplateManagement() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEdit = (template: NotificationTemplate) => {
    setSelectedTemplateId(template.id);
    setEditorOpen(true);
  };

  const handleNew = () => {
    setSelectedTemplateId(undefined);
    setEditorOpen(true);
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
    setSelectedTemplateId(undefined);
  };

  const handleEditorSaved = () => {
    setEditorOpen(false);
    setSelectedTemplateId(undefined);
    // Increment refreshKey to trigger list reload
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="p-6">
      <TemplateList onEdit={handleEdit} onNew={handleNew} refreshKey={refreshKey} />
      
      {editorOpen && (
        <TemplateEditor
          templateId={selectedTemplateId}
          onClose={handleEditorClose}
          onSaved={handleEditorSaved}
        />
      )}
    </div>
  );
}
