import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Plus, Save, Trash2 } from 'lucide-react';

import { updateAvailabilitySlots } from '../../services/meetingService';

const AvailabilityPage = () => {
  const navigate = useNavigate();

  const [slots, setSlots] = useState([
    {
      startTime: '',
      endTime: ''
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (index, field, value) => {
    setSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot))
    );
  };

  const addSlot = () => {
    setSlots((prev) => [...prev, { startTime: '', endTime: '' }]);
  };

  const removeSlot = (index) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const validSlots = slots
        .filter((slot) => slot.startTime && slot.endTime)
        .map((slot) => ({
          startTime: new Date(slot.startTime).toISOString(),
          endTime: new Date(slot.endTime).toISOString()
        }));

      if (validSlots.length === 0) {
        setError('Add at least one valid slot');
        return;
      }

      const response = await updateAvailabilitySlots(validSlots);

      setMessage(
        `Saved ${response.slots?.length || validSlots.length} availability slots`
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save availability');
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
            Meeting Availability
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <CalendarDays size={28} />
          </div>

          <h1 className="text-3xl font-bold text-slate-950">
            Set available meeting slots
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Investors can book one of these slots from your startup pitch page.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <div className="space-y-5">
            {slots.map((slot, index) => (
              <div
                key={index}
                className="grid gap-4 rounded-2xl border border-slate-200 p-5 md:grid-cols-[1fr_1fr_auto]"
              >
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Start time
                  </label>
                  <input
                    type="datetime-local"
                    value={slot.startTime}
                    onChange={(e) =>
                      handleChange(index, 'startTime', e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    End time
                  </label>
                  <input
                    type="datetime-local"
                    value={slot.endTime}
                    onChange={(e) =>
                      handleChange(index, 'endTime', e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeSlot(index)}
                  className="self-end rounded-xl bg-rose-600 px-4 py-3 text-white hover:bg-rose-700"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={addSlot}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus size={18} />
              Add Slot
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              <Save size={18} />
              {loading ? 'Saving...' : 'Save Availability'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default AvailabilityPage;