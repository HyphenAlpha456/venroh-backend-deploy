import { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Eye,
  LogOut,
  ShieldCheck,
  Trash2,
  XCircle
} from 'lucide-react';
import axios from 'axios';

import { useAuth } from '../../contexts/AuthContext';
import {
  deleteStartup,
  getStartups,
  unverifyStartup,
  verifyStartup
} from '../../services/startupService';

const AdminDashboard = () => {
  const { user, logout } = useAuth();

  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchStartups = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await getStartups();
      setStartups(data.startups || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch startups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStartups();
  }, []);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const handleVerify = async (startupId) => {
    try {
      setActionLoading(startupId);
      setError('');
      setSuccess('');

      const response = await verifyStartup(startupId, {
        mcaStatus: 'Verified'
      });

      setSuccess(response.message || 'Startup verified successfully');
      await fetchStartups();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify startup');
    } finally {
      setActionLoading('');
    }
  };

  const handleUnverify = async (startupId) => {
    try {
      setActionLoading(startupId);
      setError('');
      setSuccess('');

      const response = await unverifyStartup(startupId);

      setSuccess(response.message || 'Startup removed from live listing');
      await fetchStartups();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to unverify startup');
    } finally {
      setActionLoading('');
    }
  };

  const handleDelete = async (startupId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this startup?'
    );

    if (!confirmed) return;

    try {
      setActionLoading(startupId);
      setError('');
      setSuccess('');

      const response = await deleteStartup(startupId);

      setSuccess(response.message || 'Startup deleted successfully');
      await fetchStartups();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete startup');
    } finally {
      setActionLoading('');
    }
  };

  const handleViewPitch = async (startupId) => {
    try {
      setActionLoading(`deck-${startupId}`);
      setError('');
      const response = await axios.get(`/api/startups/${startupId}/pitch-url`, {
        withCredentials: true
      });
      window.open(response.data.url, '_blank');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load secure pitch deck');
    } finally {
      setActionLoading('');
    }
  };

  const pendingCount = startups.filter((startup) => !startup.isLive).length;
  const liveCount = startups.filter((startup) => startup.isLive).length;
  const completedPitchCount = startups.filter(
    (startup) => startup.pitchCompleted
  ).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <ShieldCheck size={22} />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-950">
                Admin Dashboard
              </h1>
              <p className="text-sm text-slate-500">
                Welcome, {user?.name}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 rounded-3xl bg-slate-950 p-8 text-white">
          <p className="text-sm text-slate-300">Platform control</p>
          <h2 className="mt-2 text-4xl font-bold">
            Startup Verification Panel
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Review founder startups, check pitch completion, verify eligible
            startups, or remove them from investor listing.
          </p>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-4">
          <StatCard title="Total Startups" value={startups.length} />
          <StatCard title="Pending Approval" value={pendingCount} />
          <StatCard title="Live Startups" value={liveCount} />
          <StatCard title="Pitch Completed" value={completedPitchCount} />
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h3 className="text-lg font-bold text-slate-950">
              Startup Applications
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Admin can verify only startups with complete pitch.
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm font-medium text-slate-500">
              Loading startups...
            </div>
          ) : startups.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="mx-auto mb-3 text-slate-400" />
              <p className="text-sm font-medium text-slate-500">
                No startups found
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {startups.map((startup) => (
                <div
                  key={startup._id}
                  className="grid gap-5 p-6 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-bold text-slate-950">
                        {startup.companyName}
                      </h4>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          startup.isLive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {startup.isLive ? 'Live' : 'Pending'}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      CIN: {startup.cin}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Founder:{' '}
                      {startup.founderId?.name ||
                        startup.founderId?.email ||
                        'Unknown'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Valuation
                    </p>
                    <p className="mt-2 text-base font-bold text-slate-950">
                      {formatMoney(startup.valuationAsk)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Pitch Status
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      {startup.pitchCompleted ? (
                        <>
                          <CheckCircle2 size={18} className="text-emerald-600" />
                          <span className="text-sm font-semibold text-emerald-700">
                            Complete
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle size={18} className="text-rose-600" />
                          <span className="text-sm font-semibold text-rose-700">
                            Incomplete
                          </span>
                        </>
                      )}
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      MCA: {startup.mcaStatus}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    {startup.pitchDeckUrl && (
                      <button
                        onClick={() => handleViewPitch(startup._id)}
                        disabled={actionLoading === `deck-${startup._id}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Eye size={16} />
                        {actionLoading === `deck-${startup._id}` ? 'Loading...' : 'Deck'}
                      </button>
                    )}

                    {!startup.isLive ? (
                      <button
                        onClick={() => handleVerify(startup._id)}
                        disabled={
                          actionLoading === startup._id ||
                          !startup.pitchCompleted
                        }
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {actionLoading === startup._id
                          ? 'Working...'
                          : 'Verify'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUnverify(startup._id)}
                        disabled={actionLoading === startup._id}
                        className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                      >
                        {actionLoading === startup._id
                          ? 'Working...'
                          : 'Unverify'}
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(startup._id)}
                      disabled={actionLoading === startup._id}
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const StatCard = ({ title, value }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <h3 className="mt-2 text-3xl font-bold text-slate-950">{value}</h3>
    </div>
  );
};

export default AdminDashboard;