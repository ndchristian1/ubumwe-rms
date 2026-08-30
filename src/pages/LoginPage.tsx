import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authenticate } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';

export function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const user = authenticate(username, password);
    if (user) {
      setUser(user);
      navigate('/');
    } else {
      setError('Invalid username or password');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-brand-500">UBUMWE RMS</h1>
          <p className="mt-2 text-slate-400">Retail Management System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Username</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 rounded-lg bg-slate-800 p-4 text-xs text-slate-400">
          <p className="font-medium text-slate-300">Demo accounts:</p>
          <p>admin / admin123 · manager / manager123 · cashier / cashier123</p>
        </div>
      </div>
    </div>
  );
}
