import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Briefcase, Calendar, MessageSquare, FileText, X, Send, 
  Paperclip, CreditCard, Video, BrainCircuit, ChevronRight, Clock, Search, Building2 
} from 'lucide-react';

const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let socket;

export default function InvestorDashboard() {
  const [activeView, setActiveView] = useState('discovery');
  
  const [startups, setStartups] = useState([{
    _id: "dummy123",
    companyName: "VenRoh Test Startup",
    cin: "U72900KA2015PTC082988",
    pitch: { oneLinePitch: "This is a fake startup so I can test my UI and see my buttons!" },
    investmentDetails: { amountRequired: 5000000, fundingStage: "Seed" },
    valuationAsk: 20000000,
    pitchDeckUrl: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1000&auto=format&fit=crop",
    availabilitySlots: []
  }]);
  
  const [dummyChats] = useState([
    {
      _id: "chat1",
      startupName: "Test Startup Pvt Ltd",
      founderName: "bob",
      lastUpdated: "4 Jun 2026, 2:45 am",
      hasAttachment: true,
      isLive: true
    },
    {
      _id: "chat2",
      startupName: "Nexa Private Limited",
      founderName: "founder2",
      lastUpdated: "23 May 2026, 9:10 pm",
      hasAttachment: false,
      isLive: false
    }
  ]);

  const [selectedStartup, setSelectedStartup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);

  const [chatOpen, setChatOpen] = useState(false);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef(null);

  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  const [customTimeModalOpen, setCustomTimeModalOpen] = useState(false);
  const [customDateTime, setCustomDateTime] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return;

    socket = io(SERVER_URL, {
      auth: { token },
      transports: ['websocket']
    });

    socket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
      scrollToBottom();
    });

    fetchStartups();
    fetchMeetings();

    return () => socket.disconnect();
  }, [token]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const fetchStartups = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/startups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setStartups(data.startups);
    } catch (err) {
      console.error('Failed to fetch startups', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetings = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/v1/meetings/upcoming`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setUpcomingMeetings(data.meetings);
    } catch (err) {
      console.error('Failed to fetch meetings', err);
    }
  };

  const handleSummarizePitch = async () => {
    setIsSummarizing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockSummary = "This startup is revolutionizing their domain by addressing key market inefficiencies. They require funding to scale their proven MVP and capture a $10B TAM. Projected ROI is significant given their lean business model and unique competitive moat.";
      setSummary(mockSummary);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSummarizing(false);
    }
  };

  const openChatWithFounder = async (startupId, startupName = "VenRoh Test Startup") => {
    setActiveConversation({ 
      _id: "dummy_chat_123", 
      startupId: { companyName: startupName } 
    });
    setMessages([
      { 
        text: "Hi! Thanks for viewing our pitch. Let me know if you have questions.", 
        senderId: { role: 'founder' },
        createdAt: new Date().toISOString()
      }
    ]);
    setChatOpen(true);
  };

  const sendMessage = () => {
    if (!chatInput.trim() || !activeConversation) return;
    
    socket?.emit('send_message', {
      conversationId: activeConversation._id,
      text: chatInput
    });
    setChatInput('');
  };

  const bookSlot = async (slotId) => {
    try {
      const res = await fetch(`${SERVER_URL}/api/v1/meetings/book`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ startupId: selectedStartup._id, slotId })
      });
      const data = await res.json();
      if (data.success) {
        alert('Meeting Booked Successfully! Check your calendar.');
        fetchMeetings(); 
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error('Booking failed', err);
    }
  };

  const submitCustomTimeRequest = async () => {
    if (!customDateTime) return;
    
    try {
      const res = await fetch(`${SERVER_URL}/api/v1/meetings/request`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ startupId: selectedStartup._id, scheduledAt: new Date(customDateTime) })
      });
      const data = await res.json();
      if (data.success) {
        alert('Meeting request sent to founder!');
        setCustomTimeModalOpen(false);
        setCustomDateTime('');
      }
    } catch (err) {
      console.error('Request failed', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex">
      
      <aside className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col hidden md:flex">
        <h1 className="text-2xl font-bold text-[#0B0F19] mb-8">
          VenRoh Hub
        </h1>
        
        <div className="flex-1 flex flex-col">
          <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider flex items-center gap-2">
            <Calendar size={16} /> Upcoming Meetings
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3">
            {upcomingMeetings.length === 0 ? (
              <p className="text-sm text-gray-400 bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                No upcoming meetings scheduled.
              </p>
            ) : (
              upcomingMeetings.map(meet => (
                <div key={meet._id} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition">
                  <p className="text-sm font-bold text-gray-900">{meet.startupId?.companyName || 'Founder Meeting'}</p>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1 font-medium">
                    <Clock size={12}/> {new Date(meet.scheduledAt).toLocaleDateString()}
                  </p>
                  <a href={meet.meetingUrl} target="_blank" rel="noreferrer" className="mt-3 flex justify-center items-center gap-2 text-xs font-semibold bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition">
                    <Video size={14}/> Join Room
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="bg-[#0B0F19] text-white rounded-3xl p-8 mb-8 shadow-xl flex justify-between items-center">
          <div>
            <div className="bg-white/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <MessageSquare size={24} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold">
              {activeView === 'discovery' ? 'Live Opportunities' : 'Messages'}
            </h2>
            <p className="text-gray-400 mt-2 text-sm">
              {activeView === 'discovery' ? 'Discover, evaluate, and connect with verified startups.' : 'Manage your founder-investor conversations in one secure inbox.'}
            </p>
          </div>
          
          <div className="flex bg-white/10 p-1 rounded-xl">
            <button 
              onClick={() => setActiveView('discovery')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition ${activeView === 'discovery' ? 'bg-white text-[#0B0F19] shadow-md' : 'text-gray-300 hover:text-white'}`}
            >
              Discovery Board
            </button>
            <button 
              onClick={() => setActiveView('chats')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition ${activeView === 'chats' ? 'bg-white text-[#0B0F19] shadow-md' : 'text-gray-300 hover:text-white'}`}
            >
              My Chats
            </button>
          </div>
        </div>

        {activeView === 'chats' && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Conversation Inbox</h3>
                <p className="text-sm text-gray-500">{dummyChats.length} conversations</p>
              </div>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search startup or user..." 
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-64"
                />
              </div>
            </div>
            
            <div className="divide-y divide-gray-100">
              {dummyChats.map(chat => (
                <div 
                  key={chat._id} 
                  onClick={() => openChatWithFounder(chat._id, chat.startupName)}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#0B0F19] rounded-xl flex items-center justify-center shadow-md">
                      <Building2 size={20} className="text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition">{chat.startupName}</h4>
                        {chat.isLive && (
                          <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                            Live
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">With: <span className="font-medium text-gray-700">{chat.founderName}</span></p>
                      {chat.hasAttachment ? (
                        <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                          <Paperclip size={12} /> Attachment
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-1.5">No messages yet. Open conversation to start.</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Last Updated</p>
                    <p className="text-xs text-gray-600 font-medium mt-1">{chat.lastUpdated}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'discovery' && (
          loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {startups.map(startup => (
                <div 
                  key={startup._id} 
                  onClick={() => { setSelectedStartup(startup); setSummary(''); }}
                  className="bg-white border border-gray-200 rounded-2xl p-6 cursor-pointer hover:border-blue-400 hover:shadow-xl hover:-translate-y-1 transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition">{startup.companyName}</h3>
                      <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mt-1">{startup.investmentDetails?.fundingStage || 'Early Stage'}</p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                      MCA Verified
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm line-clamp-3 mb-6 leading-relaxed">
                    {startup.pitch?.oneLinePitch || "A revolutionary idea disrupting the market. Click to view full pitch details."}
                  </p>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Asking</p>
                      <p className="text-sm font-bold text-gray-900">₹{(startup.investmentDetails?.amountRequired || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Valuation</p>
                      <p className="text-sm font-bold text-gray-900">₹{(startup.valuationAsk || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 p-2 rounded-full group-hover:bg-blue-600 group-hover:border-blue-600 transition">
                      <ChevronRight size={16} className="text-gray-400 group-hover:text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>

      {selectedStartup && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex justify-end">
          <div className="w-full max-w-3xl bg-white h-full border-l border-gray-200 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300">
            
            <div className="sticky top-0 bg-white/95 backdrop-blur z-10 border-b border-gray-100 p-6 flex justify-between items-center shadow-sm">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedStartup.companyName}</h2>
                <p className="text-sm text-gray-500 font-medium mt-1">CIN: {selectedStartup.cin}</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => openChatWithFounder(selectedStartup._id, selectedStartup.companyName)}
                  className="bg-[#0B0F19] hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold transition shadow-md"
                >
                  <MessageSquare size={16} /> Chat Founder
                </button>
                <button onClick={() => setSelectedStartup(null)} className="p-2.5 bg-gray-100 rounded-xl hover:bg-red-50 hover:text-red-500 text-gray-600 transition">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-10">
              
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                    <BrainCircuit className="text-blue-600" /> Neural Pitch Summary
                  </h3>
                  <button 
                    onClick={handleSummarizePitch}
                    disabled={isSummarizing}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm px-5 py-2 rounded-xl font-bold transition shadow-md shadow-blue-600/20"
                  >
                    {isSummarizing ? 'Analyzing...' : 'Generate Summary'}
                  </button>
                </div>
                {summary && (
                  <div className="bg-white p-5 rounded-xl text-gray-700 text-sm leading-relaxed border border-blue-100 shadow-sm">
                    {summary}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="text-gray-400" /> Executive Pitch Deck
                </h3>
                <div className="bg-gray-100 rounded-2xl border border-gray-200 h-[500px] overflow-hidden flex justify-center items-center relative shadow-inner">
                  {selectedStartup.pitchDeckUrl ? (
                    <iframe 
                      src={selectedStartup.pitchDeckUrl} 
                      className="w-full h-full"
                      title="Pitch Deck"
                    />
                  ) : (
                    <p className="text-gray-500 font-medium">No pitch deck uploaded yet.</p>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-10">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Calendar className="text-gray-400" /> Schedule a Pitch Meeting
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {selectedStartup.availabilitySlots?.filter(s => s.status === 'available').length > 0 ? (
                    selectedStartup.availabilitySlots.filter(s => s.status === 'available').map(slot => (
                      <button 
                        key={slot._id}
                        onClick={() => bookSlot(slot._id)}
                        className="bg-white border border-gray-200 p-5 rounded-xl hover:border-blue-500 hover:shadow-md transition text-left group"
                      >
                        <p className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition">Available Slot</p>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                          {new Date(slot.startTime).toLocaleString()}
                        </p>
                      </button>
                    ))
                  ) : (
                    <div className="col-span-2 bg-gray-50 border border-dashed border-gray-200 p-6 rounded-xl text-center text-sm font-medium text-gray-500">
                      Founder has no available slots right now.
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setCustomTimeModalOpen(true)}
                  className="w-full bg-white border border-gray-300 hover:border-gray-900 text-gray-700 hover:text-gray-900 px-4 py-3 rounded-xl text-sm font-bold transition shadow-sm"
                >
                  Request Custom Time
                </button>
              </div>

              <div className="border-t border-gray-100 pt-10 pb-10">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-8 text-center">
                  <h3 className="text-xl font-extrabold text-emerald-700 mb-2">Ready to Invest?</h3>
                  <p className="text-sm text-emerald-600/80 font-medium mb-6">Proceed to secure escrow payment to lock your equity.</p>
                  <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-emerald-600/20 transition">
                    <CreditCard size={20} /> Initiate Investment Payment (Coming Soon)
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {customTimeModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Request Custom Time</h3>
              <button onClick={() => setCustomTimeModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-lg transition">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Select Date and Time</label>
              <input 
                type="datetime-local" 
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
              <p className="text-xs text-gray-500 font-medium mt-3">The founder will be notified of your requested time.</p>
            </div>
            <div className="p-6 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
              <button 
                onClick={() => setCustomTimeModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button 
                onClick={submitCustomTimeRequest}
                disabled={!customDateTime}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 transition shadow-md"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {chatOpen && activeConversation && (
        <div className="fixed bottom-6 right-6 w-[400px] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-8">
          
          <div className="bg-[#0B0F19] p-4 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-white">
                {activeConversation.startupId?.companyName || 'Founder'}
              </h3>
              <p className="text-xs font-medium text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Online
              </p>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white bg-white/10 p-1.5 rounded-lg transition">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 h-96 overflow-y-auto p-5 space-y-4 bg-gray-50">
            {messages.map((msg, idx) => {
              const isMine = msg.senderId?.role === 'investor'; 
              
              return (
                <div key={idx} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm ${isMine ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'}`}>
                    {msg.text}
                    {msg.attachments?.length > 0 && (
                      <a href={msg.attachments[0].url} target="_blank" rel="noreferrer" className={`flex items-center gap-2 mt-2 text-xs p-2 rounded-lg transition ${isMine ? 'bg-black/20 hover:bg-black/30 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}>
                        <FileText size={14} /> View Attachment
                      </a>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-gray-400 mt-1.5">
                    {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-gray-100 flex items-center gap-3">
            <button 
              className="p-2.5 text-gray-400 bg-gray-50 rounded-xl hover:bg-gray-100 hover:text-gray-600 transition"
              title="Upload File"
              onClick={() => alert('Connects to createCloudinaryChatUploadSignature endpoint')}
            >
              <Paperclip size={18} />
            </button>
            <input 
              type="text" 
              placeholder="Type a message..." 
              className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button 
              onClick={sendMessage}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-md shadow-blue-600/20"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}