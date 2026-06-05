import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, ShieldCheck, TrendingUp } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectByRole = (role) => {
    if (role === 'founder') navigate('/founder');
    else if (role === 'investor') navigate('/investor');
    else if (role === 'admin') navigate('/admin');
    else navigate('/login');
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);

      const user = await login(formData);
      redirectByRole(user.role);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-2">
      <div className="hidden bg-slate-950 px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-950">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Venroh</h1>
              <p className="text-sm text-slate-400">Investor Startup Network</p>
            </div>
          </div>

          <div className="mt-24 max-w-xl">
            <p className="mb-4 inline-flex rounded-full border border-white/10 px-4 py-1 text-sm text-slate-300">
              Private startup-investor communication platform
            </p>

            <h2 className="text-5xl font-bold leading-tight">
              Connect verified startups with serious investors.
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-300">
              Manage founder pitches, investor discovery, secure chat, wallet
              deposits, and admin verification from one professional platform.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <TrendingUp className="mb-3 text-indigo-300" />
            <p className="text-sm text-slate-300">Live startup discovery</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <ShieldCheck className="mb-3 text-emerald-300" />
            <p className="text-sm text-slate-300">Admin verified pitches</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <Building2 className="mb-3 text-amber-300" />
            <p className="text-sm text-slate-300">Founder investor chat</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-950">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-500">
              Login to continue to your dashboard.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? 'Logging in...' : 'Login'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            New to Venroh?{' '}
            <Link to="/register" className="font-semibold text-slate-950">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;