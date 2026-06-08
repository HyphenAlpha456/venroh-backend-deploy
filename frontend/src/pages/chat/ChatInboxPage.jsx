import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  ArrowLeft,
  Building2,
  LogOut,
  MessageCircle,
  Search
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { getMyConversations } from '../../services/chatService';

const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ChatInboxPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let socket;
    const token = localStorage.getItem('token');

    const initInbox = async () => {
      try {
        setLoading(true);
        setError('');

        const data = await getMyConversations();
        const loadedConvos = data.conversations || [];
        
        setConversations(loadedConvos);
        setFilteredConversations(loadedConvos);

        if (token) {
          socket = io(SERVER_URL, {
            auth: { token },
            transports: ['websocket']
          });

          loadedConvos.forEach((conversation) => {
            socket.emit('join_conversation', { conversationId: conversation._id });
          });

          socket.on('new_message', (msg) => {
            setConversations((prev) => {
              const updated = prev.map((c) => {
                if (c._id === msg.conversationId) {
                  return {
                    ...c,
                    lastMessageText: msg.text || '📎 Attachment',
                    updatedAt: msg.createdAt
                  };
                }
                return c;
              });
              return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            });
          });
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    initInbox();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) {
      setFilteredConversations(conversations);
      return;
    }

    const filtered = conversations.filter((conversation) => {
      const startupName = conversation.startupId?.companyName || '';
      const participants = conversation.participants || [];

      const participantText = participants
        .map((participant) => `${participant.name} ${participant.email}`)
        .join(' ');

      return (
        startupName.toLowerCase().includes(keyword) ||
        participantText.toLowerCase().includes(keyword)
      );
    });

    setFilteredConversations(filtered);
  }, [search, conversations]);

  const getOtherParticipant = (conversation) => {
    return conversation.participants?.find(
      (participant) => participant._id?.toString() !== user?.id?.toString()
    );
  };

  const formatDate = (date) => {
    if (!date) return '';

    return new Date(date).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const goBackByRole = () => {
    if (user?.role === 'founder') navigate('/founder');
    else if (user?.role === 'investor') navigate('/investor');
    else navigate('/login');
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="flex-none border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button
            onClick={goBackByRole}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <LogOut size={17} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-hidden px-6 py-8">
        <section className="flex-none mb-8 rounded-3xl bg-slate-950 p-8 text-white">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-950">
            <MessageCircle size={28} />
          </div>

          <h1 className="mt-5 text-4xl font-bold">
            Messages
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Manage your founder-investor conversations in one secure inbox.
          </p>
        </section>

        <section className="flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex-none border-b border-slate-200 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Conversation Inbox
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="relative w-full md:max-w-sm">
                <Search
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search startup or user..."
                  className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex-none m-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-200">
            {loading ? (
              <div className="p-8 text-center text-sm font-medium text-slate-500">
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-10 text-center">
                <MessageCircle className="mx-auto mb-4 text-slate-400" size={36} />

                <h3 className="text-lg font-bold text-slate-950">
                  No conversations found
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Investor conversations will appear here after contact is started.
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const otherParticipant = getOtherParticipant(conversation);
                const startup = conversation.startupId;

                return (
                  <Link
                    key={conversation._id}
                    to={`/chat/${conversation._id}`}
                    className="block p-6 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                          <Building2 size={22} />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-950">
                              {startup?.companyName || 'Startup Conversation'}
                            </h3>

                            {startup?.isLive && (
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                Live
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-sm text-slate-500">
                            With:{' '}
                            <span className="font-medium text-slate-700">
                              {otherParticipant?.name ||
                                otherParticipant?.email ||
                                'User'}
                            </span>
                          </p>

                          <p className="mt-2 line-clamp-1 text-sm text-slate-500">
                            {conversation.lastMessageText ||
                              'No messages yet. Open conversation to start.'}
                          </p>
                        </div>
                      </div>

                      <div className="text-left md:text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Last Updated
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-600">
                          {formatDate(conversation.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ChatInboxPage;