import { useState } from 'react';
import { Database, Trash2, RefreshCcw } from 'lucide-react';
import { seedDatabase, clearDatabase } from '../utils/seedDatabase';

interface DatabaseControlsProps {
  onUpdate?: () => void;
}

export default function DatabaseControls({ onUpdate }: DatabaseControlsProps) {
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const showMessage = (msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const handleSeedDatabase = async () => {
    setLoading(true);
    try {
      const success = await seedDatabase();
      if (success) {
        showMessage('Database seeded successfully with mock data!', 'success');
        onUpdate?.();
      } else {
        showMessage('Failed to seed database. Check console for details.', 'error');
      }
    } catch (error) {
      console.error('Seeding error:', error);
      showMessage('Error seeding database. Check console for details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClearDatabase = async () => {
    if (!window.confirm('This will delete all data. Are you sure?')) {
      return;
    }

    setClearing(true);
    try {
      await clearDatabase();
      showMessage('Database cleared successfully!', 'success');
      onUpdate?.();
    } catch (error) {
      console.error('Clearing error:', error);
      showMessage('Error clearing database. Check console for details.', 'error');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Database className="w-5 h-5" />
        Database Management
      </h3>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          messageType === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-slate-800 mb-2">Populate with Mock Data</h4>
          <p className="text-sm text-slate-600 mb-3">
            Seeds the database with realistic mock data including substations, PQ meters, 
            customers, events, and SARFI metrics.
          </p>
          <button
            onClick={handleSeedDatabase}
            disabled={loading || clearing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCcw className="w-4 h-4 animate-spin" />
                Seeding Database...
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                Seed Database
              </>
            )}
          </button>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium text-slate-800 mb-2">Clear All Data</h4>
          <p className="text-sm text-slate-600 mb-3">
            Removes all data from the database. Use this to start fresh.
          </p>
          <button
            onClick={handleClearDatabase}
            disabled={loading || clearing}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {clearing ? (
              <>
                <RefreshCcw className="w-4 h-4 animate-spin" />
                Clearing Database...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Clear Database
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}