import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import {
  acceptMeeting,
  endMeeting,
  getPendingRequests,
  getUpcomingMeetings
} from '../../services/meetingService';

const MeetingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [pending, setPending] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      setError('');

      const upcomingData = await getUpcomingMeetings();
      setUpcoming(upcomingData.meetings || []);

      if (user?.role === 'founder') {
        const pendingData = await getPendingRequests();
        setPending(pendingData.meetings || []);
      } else {
        setPending([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch meetings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role) {
      fetchMeetings();
    }
  }, [user?.role]);

  const handleAccept = async (id) => {
    try {
      setActionLoading(id);
      setError('');

      await acceptMeeting(id);
      await fetchMeetings();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept meeting');
    } finally {
      setActionLoading('');
    }
  };

  const handleEnd = async (id) => {
    try {
      setActionLoading(id);
      setError('');

      await endMeeting(id);
      await fetchMeetings();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to end meeting');
    } finally {
      setActionLoading('');
    }
  };

  const goBackByRole = () => {
    if (user?.role === 'founder') navigate('/founder');
    else if (user?.role === 'investor') navigate('/investor');
    else navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <button
            onClick={goBackByRole}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <p className="text-sm font-semibold text-slate-500">
            Meeting Center
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <CalendarDays size={28} />
          </div>

          <h1 className="text-3xl font-bold text-slate-950">
            Meetings
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage scheduled investor-founder pitch calls.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Loading meetings...
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {user?.role === 'founder' && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-950">
                  Pending Requests
                </h2>

                {pending.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">
                    No pending meeting requests.
                  </p>
                ) : (
                  <div className="mt-5 space-y-4">
                    {pending.map((meeting) => (
                      <MeetingCard
                        key={meeting._id}
                        meeting={meeting}
                        action={
                          <button
                            onClick={() => handleAccept(meeting._id)}
                            disabled={actionLoading === meeting._id}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {actionLoading === meeting._id
                              ? 'Accepting...'
                              : 'Accept'}
                          </button>
                        }
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">
                Upcoming Meetings
              </h2>

              {upcoming.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  No upcoming meetings.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  {upcoming.map((meeting) => (
                    <MeetingCard
                      key={meeting._id}
                      meeting={meeting}
                      action={
                        <div className="flex flex-wrap gap-2">
                          {meeting.meetingUrl && (
                            <a
                              href={meeting.meetingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                            >
                              Join
                              <ExternalLink size={15} />
                            </a>
                          )}

                          {user?.role === 'founder' && (
                            <button
                              onClick={() => handleEnd(meeting._id)}
                              disabled={actionLoading === meeting._id}
                              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              {actionLoading === meeting._id
                                ? 'Ending...'
                                : 'End'}
                            </button>
                          )}
                        </div>
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

const MeetingCard = ({ meeting, action }) => {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 p-5 md:flex-row md:items-center">
      <div>
        <div className="flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600" />

          <p className="font-bold text-slate-950">
            {meeting.startupId?.companyName || 'Startup Meeting'}
          </p>
        </div>

        <p className="mt-2 text-sm text-slate-500">
          {new Date(meeting.scheduledAt).toLocaleString()}
        </p>

        <p className="mt-1 text-xs font-semibold uppercase text-slate-400">
          Status: {meeting.status}
        </p>

        {meeting.participants?.length > 0 && (
          <p className="mt-1 text-xs text-slate-500">
            Participants:{' '}
            {meeting.participants
              .map((participant) => participant.name || participant.email)
              .join(', ')}
          </p>
        )}
      </div>

      {action}
    </div>
  );
};

export default MeetingsPage;