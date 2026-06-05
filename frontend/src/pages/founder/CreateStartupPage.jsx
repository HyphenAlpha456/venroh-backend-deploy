import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';

import { createStartup } from '../../services/startupService';

const CreateStartupPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    companyName: '',
    cin: '',
    authorizedCapital: '',
    paidUpCapital: '',
    valuationAsk: '',
    pitchDeckUrl: '',
    pitchVideoUrl: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'cin' ? value.toUpperCase().trim() : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);

      const payload = {
        companyName: formData.companyName,
        cin: formData.cin,
        authorizedCapital: Number(formData.authorizedCapital || 0),
        paidUpCapital: Number(formData.paidUpCapital || 0),
        valuationAsk: Number(formData.valuationAsk),
        pitchDeckUrl: formData.pitchDeckUrl,
        pitchVideoUrl: formData.pitchVideoUrl
      };

      await createStartup(payload);

      navigate('/founder');
    } catch (err) {
      setError(err.response?.data?.message || 'Startup creation failed');
    } finally {
      setLoading(false);
    }
  };

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
            Founder Startup Setup
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Building2 size={28} />
          </div>

          <h1 className="text-3xl font-bold text-slate-950">
            Create your startup profile
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Add your company identity and valuation details. After this, you can
            complete your pitch and submit it for admin approval.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          {error && (
            <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Company name *
              </label>
              <input
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="Example: Venroh Technologies Pvt Ltd"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                CIN *
              </label>
              <input
                name="cin"
                value={formData.cin}
                onChange={handleChange}
                placeholder="Company Identification Number"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm uppercase outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
              />
              <p className="mt-2 text-xs font-semibold text-blue-600 bg-blue-50 p-2 rounded-lg border border-blue-100">
                TESTING MODE: To pass sandbox MCA verification, please use the exact dummy CIN: U72900KA2015PTC082988
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Valuation ask *
              </label>
              <input
                name="valuationAsk"
                type="number"
                value={formData.valuationAsk}
                onChange={handleChange}
                placeholder="Example: 5000000"
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
                placeholder="Example: 1000000"
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
                placeholder="Example: 500000"
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
                placeholder="Optional for now"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div>
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
                disabled={loading}
                className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {loading ? 'Creating startup...' : 'Create Startup'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default CreateStartupPage;