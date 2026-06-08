import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import {
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  LogOut,
  Plus,
  TrendingUp,
  Search,
  Paperclip,
  Send,
  X,
  MessageSquare,
  Eye
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { getMyStartup } from '../../services/startupService';

const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
let socket;

const FounderDashboard = () => {
  const { user, logout } = useAuth();

  const [activeView, setActiveView] = useState('overview');
  const [startup, setStartup] = useState(null);
  const [loading, setLoading] = useState(true);

  const [conversations, setConversations] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef(null);

  const token = localStorage.getItem('token');

  const fetchStartup = async () => {
    try {
      setLoading(true);
      const data = await getMyStartup();
      setStartup(data.startup);
    } catch {
      setStartup(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/v1/chat/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setConversations(data.conversations);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStartup();

    if (!token) return;

    socket = io(SERVER_URL, {
      auth: { token },
      transports: ['websocket']
    });

    socket.on('new_message', (msg) => {
      setMessages(prev => {
        if (prev.find(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      scrollToBottom();
    });

    fetchConversations();

    return () => socket?.disconnect();
  }, [token]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const openChatWithInvestor = async (conversation) => {
    setActiveConversation(conversation);
    setChatOpen(true);
    
    try {
      const res = await fetch(`${SERVER_URL}/api/v1/chat/conversations/${conversation._id}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages.reverse());
        scrollToBottom();
      }
    } catch (err) {
      console.error(err);
    }

    socket?.emit('join_conversation', { conversationId: conversation._id });
  };

  const sendMessage = () => {
    if (!chatInput.trim() || !activeConversation) return;
    
    socket?.emit('send_message', {
      conversationId: activeConversation._id,
      text: chatInput
    });
    setChatInput('');
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getOtherParticipant = (conv) => {
    return conv.participants?.find(p => p._id !== user.id) || { name: 'Investor' };
  };

  const handleViewPitch = async (startupId) => {
    try {
      const response = await axios.get(`/api/startups/${startupId}/pitch-url`, {
        withCredentials: true
      });
      window.open(response.data.url, '_blank');
    } catch (err) {
      console.error('Failed to load secure pitch deck', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <Building2 size={22} />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-950">
                Founder Dashboard
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
        
        <div className="bg-slate-950 text-white rounded-3xl p-8 mb-8 shadow-xl flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold mb-2">
              {activeView === 'overview' ? 'Startup Overview' : 'Investor Messages'}
            </h2>
            <p className="text-slate-400 text-sm">
              {activeView === 'overview' ? 'Manage your pitch, metrics, and meeting availability.' : 'Respond directly to investors interested in your startup.'}
            </p>
          </div>
          
          <div className="flex bg-white/10 p-1 rounded-xl">
            <button 
              onClick={() => setActiveView('overview')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition ${activeView === 'overview' ? 'bg-white text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveView('chats')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition ${activeView === 'chats' ? 'bg-white text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'}`}
            >
              My Chats
            </button>
          </div>
        </div>

        {activeView === 'chats' && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Conversation Inbox</h3>
                <p className="text-sm text-slate-500">{conversations.length} active conversations</p>
              </div>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search investor..." 
                  className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 w-64"
                />
              </div>
            </div>
            
            <div className="divide-y divide-slate-100">
              {conversations.length === 0 ? (
                <div className="p-10 text-center text-slate-500 text-sm font-medium">
                  No investor chats yet. Conversations initiated by investors will appear here.
                </div>
              ) : (
                conversations.map(conv => (
                  <div 
                    key={conv._id} 
                    onClick={() => openChatWithInvestor(conv)}
                    className="p-6 hover:bg-slate-50 cursor-pointer transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 font-bold text-lg border border-slate-200">
                        {getOtherParticipant(conv).name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-slate-900 group-hover:text-slate-700 transition">
                            {getOtherParticipant(conv).name}
                          </h4>
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
                            Investor
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5 max-w-md truncate">
                          {conv.lastMessageText || 'No messages yet.'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Updated</p>
                      <p className="text-xs text-slate-600 font-medium mt-1">
                        {new Date(conv.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeView === 'overview' && (
          loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Loading startup details...
              </p>
            </div>
          ) : !startup ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
              <div className="max-w-2xl">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Plus size={28} />
                </div>

                <h2 className="text-3xl font-bold text-slate-950">
                  Create your startup profile
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  You have not created a startup yet. Add your company details,
                  CIN, valuation ask, and later complete your pitch for admin
                  verification.
                </p>

                <Link
                  to="/founder/create-startup"
                  className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Create Startup
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8 rounded-3xl bg-slate-950 p-8 text-white">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
                  <div>
                    <p className="text-sm text-slate-300">Your startup</p>
                    <h2 className="mt-2 text-4xl font-bold">
                      {startup.companyName}
                    </h2>
                    <p className="mt-3 text-sm text-slate-300">
                      CIN: {startup.cin}
                    </p>
                  </div>

                  <div
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      startup.isLive
                        ? 'bg-emerald-500/15 text-emerald-200'
                        : 'bg-amber-500/15 text-amber-200'
                    }`}
                  >
                    {startup.isLive ? 'Live for investors' : 'Pending approval'}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <TrendingUp className="mb-4 text-slate-700" />
                  <p className="text-sm text-slate-500">Valuation Ask</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-950">
                    {formatMoney(startup.valuationAsk)}
                  </h3>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <Clock className="mb-4 text-amber-600" />
                  <p className="text-sm text-slate-500">MCA Status</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-950">
                    {startup.mcaStatus}
                  </h3>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <FileText className="mb-4 text-indigo-600" />
                  <p className="text-sm text-slate-500">Pitch</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-950">
                    {startup.pitchCompleted ? 'Complete' : 'Incomplete'}
                  </h3>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <CheckCircle2 className="mb-4 text-emerald-600" />
                  <p className="text-sm text-slate-500">Live Status</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-950">
                    {startup.isLive ? 'Live' : 'Not Live'}
                  </h3>
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-950">
                  Next action
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Complete your pitch details and upload pitch deck. Admin can
                  verify your startup only after pitch completion.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    to={`/founder/startups/${startup._id}/pitch`}
                    className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Update Pitch
                  </Link>

                  {startup.pitchDeckUrl && (
                    <button
                      onClick={() => handleViewPitch(startup._id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Eye size={18} />
                      View Pitch Deck
                    </button>
                  )}

                  <Link
                    to="/founder/edit-startup"
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Edit Basic Details
                  </Link>

                  <Link
                    to="/founder/availability"
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Set Availability
                  </Link>

                  <Link
                    to="/meetings"
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Meetings
                  </Link> 

                  <Link
                    to="/chat"
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Messages
                  </Link>     
                </div>
              </div>
            </>
          )
        )}
      </main>

      {chatOpen && activeConversation && (
        <div className="fixed bottom-6 right-6 w-[400px] max-h-[85vh] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-8">
          
          <div className="bg-slate-950 p-4 flex justify-between items-center flex-none">
            <div>
              <h3 className="font-bold text-white">
                {getOtherParticipant(activeConversation).name}
              </h3>
              <p className="text-xs font-medium text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Investor
              </p>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-white bg-white/10 p-1.5 rounded-lg transition">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 bg-slate-50">
            {messages.map((msg, idx) => {
              const isMine = msg.senderId?._id === user.id || msg.senderId === user.id; 
              
              return (
                <div key={idx} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm ${isMine ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'}`}>
                    {msg.text}
                    {msg.attachments?.length > 0 && (
                      <a href={msg.attachments[0].secureUrl || msg.attachments[0].url} target="_blank" rel="noreferrer" className={`flex items-center gap-2 mt-2 text-xs p-2 rounded-lg transition ${isMine ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                        <FileText size={14} /> View Attachment
                      </a>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 mt-1.5">
                    {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-3 flex-none">
            <button 
              className="p-2.5 text-slate-400 bg-slate-50 rounded-xl hover:bg-slate-100 hover:text-slate-600 transition"
              title="Upload File"
            >
              <Paperclip size={18} />
            </button>
            <input 
              type="text" 
              placeholder="Type a message..." 
              className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-slate-900 focus:bg-white transition"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button 
              onClick={sendMessage}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition shadow-md"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FounderDashboard;