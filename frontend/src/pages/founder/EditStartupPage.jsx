import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Save } from 'lucide-react';

import { getMyStartup, updateMyStartup } from '../../services/startupService';

const EditStartupPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    companyName: '',
    authorizedCapital: '',
    paidUpCapital: '',
    valuationAsk: '',
    pitchDeckUrl: '',
    pitchVideoUrl: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchStartup = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await getMyStartup();
      const startup = data.startup;

      setFormData({
        companyName: startup.companyName || '',
        authorizedCapital: startup.authorizedCapital || '',
        paidUpCapital: startup.paidUpCapital || '',
        valuationAsk: startup.valuationAsk || '',
        pitchDeckUrl: startup.pitchDeckUrl || '',
        pitchVideoUrl: startup.pitchVideoUrl || ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load startup');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStartup();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const payload = {
        companyName: formData.companyName,
        authorizedCapital: Number(formData.authorizedCapital || 0),
        paidUpCapital: Number(formData.paidUpCapital || 0),
        valuationAsk: Number(formData.valuationAsk || 0),
        pitchDeckUrl: formData.pitchDeckUrl,
        pitchVideoUrl: formData.pitchVideoUrl
      };

      const response = await updateMyStartup(payload);

      setSuccess(response.message || 'Startup updated successfully');

      setTimeout(() => {
        navigate('/founder');
      }, 800);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update startup');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Loading startup details...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <button
            onClick={() => navigate('/founder')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <p className="text-sm font-semibold text-slate-500">
            Edit Startup Details
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Building2 size={28} />
          </div>

          <h1 className="text-3xl font-bold text-slate-950">
            Edit basic startup details
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Updating these details will send your startup back to pending
            approval.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
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

          <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Company name
              </label>
              <input
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Valuation ask
              </label>
              <input
                name="valuationAsk"
                type="number"
                value={formData.valuationAsk}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Authorized capital
              </label>
              <input
                name="authorizedCapital"
                type="number"
                value={formData.authorizedCapital}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Paid-up capital
              </label>
              <input
                name="paidUpCapital"
                type="number"
                value={formData.paidUpCapital}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Pitch deck URL
              </label>
              <input
                name="pitchDeckUrl"
                value={formData.pitchDeckUrl}
                onChange={handleChange}
                placeholder="Optional"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Pitch video URL
              </label>
              <input
                name="pitchVideoUrl"
                value={formData.pitchVideoUrl}
                onChange={handleChange}
                placeholder="Optional"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default EditStartupPage;