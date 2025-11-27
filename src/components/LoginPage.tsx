import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, UserPlus, Database } from 'lucide-react';
import { createDemoUser } from '../utils/createDemoUser';
import { seedDatabase } from '../utils/seedDatabase';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@clp.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDemoUser = async () => {
    setError('');
    setSuccess('');
    setCreating(true);

    try {
      const result = await createDemoUser();

      if (result.error) {
        setError('User may already exist. Try signing in with admin@clp.com / admin123');
      } else {
        setSuccess('Demo user created successfully! You can now sign in.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create demo user');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-4 rounded-2xl">
              <Lock className="w-10 h-10 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-slate-900 mb-2">PQMAP</h1>
          <p className="text-center text-slate-600 mb-8">Power Quality Monitoring & Analysis Platform</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="user@clp.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-600 font-semibold mb-2">Demo Credentials:</p>
            <p className="text-xs text-slate-500">Email: admin@clp.com</p>
            <p className="text-xs text-slate-500">Password: admin123</p>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={handleCreateDemoUser}
              disabled={creating}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 hover:border-slate-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-5 h-5" />
              {creating ? 'Creating Demo User...' : 'Create Demo User Account'}
            </button>
            <p className="text-xs text-slate-500 text-center mt-2">
              Click this button if you haven't created a demo account yet
            </p>
          </div>
        </div>

        <p className="text-center text-slate-400 text-sm mt-6">
          CLP Power Hong Kong Limited
        </p>
      </div>
    </div>
  );
}
