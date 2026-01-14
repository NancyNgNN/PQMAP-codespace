import { useState } from 'react';
import RuleList from './RuleList';
import RuleBuilder from './RuleBuilder.tsx';

export default function RuleManagement() {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState<string | undefined>();

  const handleEdit = (ruleId: string) => {
    setSelectedRuleId(ruleId);
    setBuilderOpen(true);
  };

  const handleNew = () => {
    setSelectedRuleId(undefined);
    setBuilderOpen(true);
  };

  const handleBuilderClose = () => {
    setBuilderOpen(false);
    setSelectedRuleId(undefined);
  };

  const handleBuilderSaved = () => {
    setBuilderOpen(false);
    setSelectedRuleId(undefined);
  };

  return (
    <div>
      <RuleList onEdit={handleEdit} onNew={handleNew} />
      
      {builderOpen && (
        <RuleBuilder
          ruleId={selectedRuleId}
          onClose={handleBuilderClose}
          onSaved={handleBuilderSaved}
        />
      )}
    </div>
  );
}
