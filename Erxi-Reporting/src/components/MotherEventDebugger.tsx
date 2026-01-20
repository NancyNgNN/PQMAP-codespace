import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface MotherEventDebugInfo {
  motherEvents: any[];
  childEventsByMother: Record<string, any[]>;
  orphanedChildren: any[];
  allRelations: any[];
}

export default function MotherEventDebugger() {
  const [debugInfo, setDebugInfo] = useState<MotherEventDebugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const runDebugCheck = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🔍 Running Mother Event Debug Check...');
      
      // 1. Get all mother events
      const { data: motherEvents, error: motherError } = await supabase
        .from('pq_events')
        .select(`
          id, 
          event_type, 
          timestamp, 
          is_mother_event, 
          is_child_event, 
          parent_event_id,
          root_cause,
          substation_id,
          substation:substation_id(name)
        `)
        .eq('is_mother_event', true)
        .order('timestamp', { ascending: false });
        
      if (motherError) {
        throw new Error(`Mother events query failed: ${motherError.message}`);
      }

      console.log(`Found ${motherEvents?.length || 0} mother events`);

      // 2. For each mother event, get its children
      const childEventsByMother: Record<string, any[]> = {};
      
      if (motherEvents && motherEvents.length > 0) {
        for (const motherEvent of motherEvents) {
          const { data: childEvents, error: childError } = await supabase
            .from('pq_events')
            .select(`
              id, 
              event_type, 
              timestamp, 
              is_child_event, 
              parent_event_id,
              substation:substation_id(name)
            `)
            .eq('parent_event_id', motherEvent.id)
            .order('timestamp', { ascending: true });
            
          if (!childError && childEvents) {
            childEventsByMother[motherEvent.id] = childEvents;
            console.log(`Mother ${motherEvent.id.substring(0, 8)}... has ${childEvents.length} children`);
          }
        }
      }

      // 3. Check for orphaned children
      const { data: orphanedChildren } = await supabase
        .from('pq_events')
        .select('id, event_type, parent_event_id, is_child_event')
        .eq('is_child_event', true);

      // 4. Get all relationship data
      const { data: allRelations } = await supabase
        .from('pq_events')
        .select('id, is_mother_event, is_child_event, parent_event_id, event_type, timestamp')
        .or('is_mother_event.eq.true,is_child_event.eq.true,parent_event_id.not.is.null')
        .order('timestamp', { ascending: false })
        .limit(20);

      setDebugInfo({
        motherEvents: motherEvents || [],
        childEventsByMother,
        orphanedChildren: orphanedChildren || [],
        allRelations: allRelations || []
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Debug check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDebugCheck();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          🔍 Mother Event Debugger
        </h3>
        <div className="text-slate-600">Loading debug information...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-4">
          ❌ Debug Error
        </h3>
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={runDebugCheck}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry Debug Check
        </button>
      </div>
    );
  }

  if (!debugInfo) return null;

  const totalChildEvents = Object.values(debugInfo.childEventsByMother).reduce(
    (sum, children) => sum + children.length, 0
  );

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        🔍 Mother Event Debug Results
      </h3>
      
      <div className="space-y-6">
        {/* Summary */}
        <div className="bg-slate-50 rounded p-4">
          <h4 className="font-medium text-slate-800 mb-2">📊 Summary</h4>
          <div className="space-y-1 text-sm">
            <div>Mother Events: {debugInfo.motherEvents.length}</div>
            <div>Child Events: {totalChildEvents}</div>
            <div>Orphaned Children: {debugInfo.orphanedChildren.length}</div>
            <div>Total Related Events: {debugInfo.allRelations.length}</div>
          </div>
        </div>

        {/* Mother Events */}
        <div>
          <h4 className="font-medium text-slate-800 mb-2">👩 Mother Events</h4>
          {debugInfo.motherEvents.length === 0 ? (
            <div className="text-red-600">❌ No mother events found!</div>
          ) : (
            <div className="space-y-2">
              {debugInfo.motherEvents.map((event, index) => (
                <div key={event.id} className="border rounded p-3 text-sm">
                  <div className="font-medium">
                    {index + 1}. {event.event_type} - {event.id.substring(0, 8)}...
                  </div>
                  <div className="text-slate-600">
                    Location: {event.substation?.name || 'Unknown'}
                  </div>
                  <div className="text-slate-600">
                    Root Cause: {event.root_cause}
                  </div>
                  <div className="text-purple-600 font-medium">
                    Children: {debugInfo.childEventsByMother[event.id]?.length || 0}
                  </div>
                  {debugInfo.childEventsByMother[event.id]?.map((child, childIndex) => (
                    <div key={child.id} className="ml-4 text-slate-500 text-xs">
                      → {childIndex + 1}. {child.event_type} - {child.id.substring(0, 8)}...
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Relations Table */}
        <div>
          <h4 className="font-medium text-slate-800 mb-2">🔗 Event Relationships</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border border-slate-200 px-2 py-1">ID</th>
                  <th className="border border-slate-200 px-2 py-1">Event Type</th>
                  <th className="border border-slate-200 px-2 py-1">Is Mother</th>
                  <th className="border border-slate-200 px-2 py-1">Is Child</th>
                  <th className="border border-slate-200 px-2 py-1">Parent ID</th>
                </tr>
              </thead>
              <tbody>
                {debugInfo.allRelations.map((event) => (
                  <tr key={event.id}>
                    <td className="border border-slate-200 px-2 py-1">
                      {event.id.substring(0, 8)}...
                    </td>
                    <td className="border border-slate-200 px-2 py-1">
                      {event.event_type}
                    </td>
                    <td className="border border-slate-200 px-2 py-1">
                      {event.is_mother_event ? '✅' : '❌'}
                    </td>
                    <td className="border border-slate-200 px-2 py-1">
                      {event.is_child_event ? '✅' : '❌'}
                    </td>
                    <td className="border border-slate-200 px-2 py-1">
                      {event.parent_event_id?.substring(0, 8) || 'null'}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={runDebugCheck}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🔄 Refresh Debug Data
        </button>
      </div>
    </div>
  );
}