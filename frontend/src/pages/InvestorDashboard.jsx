import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const Icons = {
  Compass: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>,
  Calendar: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>,
  MessageSquare: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Search: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  Filter: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  X: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
  CheckCircle: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>,
  Activity: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Shield: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2-1 4-2 7-2 2.5 0 4.5 1 7 2a1 1 0 0 1 1 1v7Z"/></svg>,
  Send: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>,
  Video: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>,
  ExternalLink: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>,
  List: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  Grid: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  ArrowUpRight: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>,
  Zap: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Globe: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  Lock: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  FileKey: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><circle cx="10" cy="13" r="2"/><line x1="12" y1="13" x2="16" y2="13"/><line x1="16" y1="13" x2="16" y2="15"/><line x1="14" y1="13" x2="14" y2="15"/></svg>,
  DownloadCloud: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg>,
  Clock: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Phone: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  MoreVertical: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>,
  Paperclip: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
  TrendingDown: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>,
  PieChart: p => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
};

const cx = (...c) => c.filter(Boolean).join(' ');
const formatCurrency = v => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);
const fD = d => new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(d));
const fT = d => new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(d));
const gI = (str) => { let hash = 0; for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash); return `hsl(${Math.abs(hash) % 360}, 70%, 60%)`; };

const useToast = () => {
  const [t, setT] = useState([]);
  const add = useCallback((m, y = 'info', d = 5000) => { const i = Math.random().toString(36).slice(2,9); setT(p => [...p, {id:i,m,y}]); setTimeout(() => rem(i), d); }, []);
  const rem = useCallback(i => setT(p => p.filter(x => x.id !== i)), []);
  return { t, add, rem };
};

const Toasts = ({ t, rem }) => (
  <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
    {t.map(x => (
      <div key={x.id} className={cx('pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-xl border backdrop-blur-md shadow-2xl animate-in slide-in-from-bottom-5 duration-300', x.y === 'success' ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-100' : x.y === 'error' ? 'bg-rose-900/40 border-rose-500/50 text-rose-100' : 'bg-indigo-900/40 border-indigo-500/50 text-indigo-100')}>
        {x.y === 'success' ? <Icons.CheckCircle /> : x.y === 'error' ? <Icons.X width="20" height="20" stroke="#EF4444" /> : <Icons.Activity />}
        <p className="font-medium text-sm">{x.m}</p>
        <button onClick={() => rem(x.id)} className="ml-4 opacity-50 hover:opacity-100 transition-opacity"><Icons.X width="16" height="16" /></button>
      </div>
    ))}
  </div>
);

const Card = ({ children, c, title, icon: Icon, action }) => (
  <div className={cx("bg-[#0B0F19]/80 backdrop-blur-md border border-white/5 rounded-2xl shadow-xl overflow-hidden", c)}>
    {(title || Icon || action) && (
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-3">
          {Icon && <div className="text-gray-400"><Icon width="18" height="18" /></div>}
          {title && <h3 className="text-lg font-bold text-white tracking-wide">{title}</h3>}
        </div>
        {action && <div>{action}</div>}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const Button = ({ c, children, onClick, disabled, v = 'primary' }) => {
  const base = "px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  const vars = { primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] border border-indigo-500", secondary: "bg-gray-800 hover:bg-gray-700 text-white border border-gray-600", ghost: "bg-transparent hover:bg-white/5 text-gray-400 hover:text-white" };
  return <button onClick={onClick} disabled={disabled} className={cx(base, vars[v], c)}>{children}</button>;
};

const DataGrid = ({ cols, data, onRowClick }) => {
  const [sort, setSort] = useState({ key: cols[0].k, dir: 'asc' });
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  const sorted = useMemo(() => [...data].sort((a, b) => {
    let x = a[sort.key], y = b[sort.key];
    if (typeof x === 'string') return sort.dir === 'asc' ? x.localeCompare(y) : y.localeCompare(x);
    return sort.dir === 'asc' ? x - y : y - x;
  }), [data, sort]);
  const paged = sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  
  return (
    <div className="flex flex-col h-full bg-[#0B0F19]/50 rounded-2xl border border-white/5 overflow-hidden">
      <div className="overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-black/40 border-b border-white/5">
              {cols.map(c => (
                <th key={c.k} onClick={() => setSort({ key: c.k, dir: sort.key === c.k && sort.dir === 'asc' ? 'desc' : 'asc' })} className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-widest cursor-pointer hover:text-white transition-colors select-none">
                  <div className={cx("flex items-center gap-2", c.align === 'right' && "justify-end")}>{c.l} {sort.key === c.k && <Icons.Activity width="10" height="10" className="text-indigo-500"/>}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((r, i) => (
              <tr key={r.id || i} onClick={() => onRowClick && onRowClick(r)} className={cx("border-b border-white/5 hover:bg-white/5 transition-colors", onRowClick && "cursor-pointer")}>
                {cols.map(c => <td key={c.k} className={cx("py-4 px-6 text-sm", c.align === 'right' && "text-right")}>{c.render ? c.render(r) : r[c.k]}</td>)}
              </tr>
            ))}
            {paged.length === 0 && <tr><td colSpan={cols.length} className="py-12 text-center text-gray-500 font-mono text-xs">No records found matching query parameters.</td></tr>}
          </tbody>
        </table>
      </div>
      {data.length > rowsPerPage && (
        <div className="p-4 border-t border-white/5 bg-black/20 flex items-center justify-between text-xs text-gray-500 font-mono">
          <span>Showing {(page - 1) * rowsPerPage + 1}-{Math.min(page * rowsPerPage, data.length)} of {data.length}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 transition-colors"><Icons.ChevronLeft width="14" height="14"/></button>
            <button disabled={page >= Math.ceil(data.length / rowsPerPage)} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 transition-colors"><Icons.ChevronRight width="14" height="14"/></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function InvestorDashboard({ token }) {
  const { t: toasts, add: addToast, rem: removeToast } = useToast();
  const [tab, setTab] = useState('discovery');
  const [isLoading, setIsLoading] = useState(false);
  const [startups, setStartups] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [socket, setSocket] = useState(null);
  
  const [vdrStartup, setVdrStartup] = useState(null);
  const [vdrLoading, setVdrLoading] = useState(false);
  const [vdrData, setVdrData] = useState(null);
  const [slotId, setSlotId] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  
  const [chatUsers, setChatUsers] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState({});
  const [msgInput, setMsgInput] = useState('');
  const [typing, setTyping] = useState({});
  const msgEndRef = useRef(null);
  const typingTimer = useRef({});
  
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [view, setView] = useState('grid');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchMatrix = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get(`${SERVER_URL}/api/v1/startups`, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) setStartups(data.startups);
    } catch { addToast('Matrix sync failure. Retrying protocol.', 'error'); } 
    finally { setIsLoading(false); }
  }, [token, addToast]);

  const fetchSyncs = useCallback(async () => {
    try {
      const { data } = await axios.get(`${SERVER_URL}/api/v1/meetings/upcoming`, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) setMeetings(data.meetings);
    } catch (e) { console.error(e); }
  }, [token]);

  useEffect(() => {
    if (tab === 'discovery') fetchMatrix();
    if (tab === 'meetings') fetchSyncs();
  }, [tab, fetchMatrix, fetchSyncs]);

  useEffect(() => {
    if (token) {
      const sock = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
      sock.on('connect', () => console.log('WSS Authorized'));
      sock.on('receive_message', (d) => {
        setMessages(p => ({ ...p, [d.senderId]: [...(p[d.senderId] || []), d] }));
        setChatUsers(p => {
          const ex = p.find(c => c._id === d.senderId);
          if (!ex) return [{ _id: d.senderId, name: d.senderName || 'Founder Entity', lastMessage: d.content }, ...p];
          return p.map(c => c._id === d.senderId ? { ...c, lastMessage: d.content } : c);
        });
      });
      sock.on('typing', ({ senderId }) => setTyping(p => ({ ...p, [senderId]: true })));
      sock.on('stop_typing', ({ senderId }) => setTyping(p => ({ ...p, [senderId]: false })));
      setSocket(sock);
      return () => sock.disconnect();
    }
  }, [token]);

  useEffect(() => { if (activeChat && msgEndRef.current) msgEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [messages, activeChat]);

  const initVDR = async (id) => {
    setVdrStartup(id); setVdrLoading(true); setVdrData(null);
    try {
      const { data } = await axios.get(`${SERVER_URL}/api/v1/startups/${id}/pitch`, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) setVdrData(data.pitchData);
    } catch { addToast('Payload decryption failed.', 'error'); setVdrStartup(null); }
    finally { setVdrLoading(false); }
  };

  const execAtomicLock = async () => {
    if (!slotId || !vdrData) return;
    setIsBooking(true);
    try {
      const { data } = await axios.post(`${SERVER_URL}/api/v1/meetings/book`, { startupId: vdrData.startupId, slotId }, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) {
        addToast('Atomic lock confirmed. WebRTC payload injected to calendar.', 'success');
        setVdrData(p => ({ ...p, availabilitySlots: p.availabilitySlots.filter(s => s._id !== slotId) }));
        setSlotId(null); fetchSyncs(); setTab('meetings'); setVdrStartup(null);
      }
    } catch (e) { addToast(e.response?.data?.message || 'Collision detected. Aborting.', 'error'); }
    finally { setIsBooking(false); }
  };

  const openChannel = (id, name) => {
    const c = { _id: id, name: `${name} HQ` };
    setChatUsers(p => p.find(x => x._id === c._id) ? p : [c, ...p]);
    setActiveChat(c); setTab('chat'); setVdrStartup(null);
  };

  const sendPayload = (e) => {
    e.preventDefault();
    if (!msgInput.trim() || !activeChat || !socket) return;
    const msg = { receiverId: activeChat._id, content: msgInput, timestamp: new Date().toISOString() };
    socket.emit('send_message', msg);
    setMessages(p => ({ ...p, [activeChat._id]: [...(p[activeChat._id] || []), { ...msg, senderId: 'me' }] }));
    setMsgInput(''); socket.emit('stop_typing', { receiverId: activeChat._id });
  };

  const handleTyping = (e) => {
    setMsgInput(e.target.value);
    if (socket && activeChat) {
      socket.emit('typing', { receiverId: activeChat._id });
      clearTimeout(typingTimer.current[activeChat._id]);
      typingTimer.current[activeChat._id] = setTimeout(() => socket.emit('stop_typing', { receiverId: activeChat._id }), 2000);
    }
  };

  const rData = [ { l: 'Team', v: '8.5/10' }, { l: 'Market', v: '9.2/10' }, { l: 'Product', v: '7.8/10' }, { l: 'Traction', v: '6.5/10' }, { l: 'Moat', v: '8.0/10' } ];
  const discoveryData = startups.filter(s => s.companyName.toLowerCase().includes(search.toLowerCase()) && (stage ? s.investmentDetails?.fundingStage === stage : true));

  return (
    <div className="min-h-screen bg-[#030509] text-gray-200 font-sans flex overflow-hidden relative selection:bg-indigo-500/30">
      <Toasts t={toasts} rem={removeToast} />
      
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/10 blur-[150px]"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-purple-600/5 blur-[120px]"></div>
        <div className="absolute top-[40%] left-[30%] w-[20vw] h-[20vw] rounded-full bg-emerald-600/5 blur-[100px]"></div>
      </div>

      <aside className="w-[280px] bg-[#070A12]/90 backdrop-blur-2xl border-r border-white/5 flex flex-col z-20 shadow-2xl relative">
        <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-indigo-500/0 via-indigo-500/20 to-indigo-500/0"></div>
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.3)]"><Icons.Compass className="text-white" /></div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 tracking-tight">VenRoh</h1>
              <p className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase">Investor OS</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {[
            { id: 'discovery', i: <Icons.Search/>, l: 'Discovery Matrix' },
            { id: 'meetings', i: <Icons.Calendar/>, l: 'Sync Schedule' },
            { id: 'chat', i: <Icons.MessageSquare/>, l: 'Secure Comms' }
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cx("w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 relative group", tab === t.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : "text-gray-400 hover:bg-white/5 hover:text-gray-200")}>
              {tab === t.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full shadow-[0_0_10px_white]"></div>}
              <div className={cx("transition-transform duration-300", tab === t.id ? "scale-110" : "group-hover:scale-110")}>{t.i}</div>
              <span className="font-semibold text-sm tracking-wide">{t.l}</span>
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-white/5 bg-black/20">
          <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/20 rounded-xl p-4 flex items-center gap-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/20 blur-xl"></div>
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 shadow-inner"><Icons.Shield width="14" height="14"/></div>
            <div><p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest font-mono">Verified Node</p><p className="text-white font-bold text-sm">Syndicate Alpha</p></div>
          </div>
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto relative z-10 custom-scrollbar scroll-smooth">
        <div className="max-w-[1600px] mx-auto p-10 pb-24 space-y-10">
          
          <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 animate-in slide-in-from-top-4 fade-in duration-500">
            <div>
              <h2 className="text-4xl font-black text-white tracking-tight mb-3 flex items-center gap-4">
                <span className="p-2.5 bg-indigo-900/30 text-indigo-400 rounded-xl border border-indigo-500/20">
                  {tab === 'discovery' ? <Icons.Search width="28" height="28"/> : tab === 'meetings' ? <Icons.Calendar width="28" height="28"/> : <Icons.MessageSquare width="28" height="28"/>}
                </span>
                {tab === 'discovery' ? 'Discovery Matrix' : tab === 'meetings' ? 'Temporal Syncs' : 'Secure Pipeline'}
              </h2>
              <p className="text-gray-400 text-sm max-w-3xl leading-relaxed font-medium">
                {tab === 'discovery' ? 'Query verified startup nodes. Execute real-time due diligence and initiate atomic WebRTC syncs.' : tab === 'meetings' ? 'Manage synchronized WebRTC operations and secure peer-to-peer data transfers.' : 'End-to-end AES-256 encrypted protocol for verified entity communication.'}
              </p>
            </div>
            {tab === 'discovery' && (
              <div className="flex items-center gap-3 bg-[#0B0F19]/80 backdrop-blur-md p-2 rounded-2xl border border-white/5 shadow-xl">
                <div className="relative">
                  <Icons.Search width="16" height="16" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="text" placeholder="Query Node..." value={search} onChange={e => setSearch(e.target.value)} className="bg-black/50 border border-transparent rounded-xl py-2.5 pl-11 pr-4 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all w-64 shadow-inner placeholder-gray-600 font-medium" />
                </div>
                <div className="w-px h-8 bg-white/10 mx-1"></div>
                <div className="relative">
                  <Icons.Filter width="16" height="16" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <select value={stage} onChange={e => setStage(e.target.value)} className="bg-black/50 border border-transparent rounded-xl py-2.5 pl-11 pr-10 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all appearance-none cursor-pointer font-medium font-mono uppercase tracking-wider">
                    <option value="">All Stages</option><option value="Pre-Seed">Pre-Seed</option><option value="Seed">Seed</option><option value="Series A">Series A</option>
                  </select>
                </div>
                <div className="w-px h-8 bg-white/10 mx-1"></div>
                <div className="flex bg-black/50 rounded-xl p-1 border border-transparent">
                  <button onClick={() => setView('grid')} className={cx("p-2 rounded-lg transition-colors", view === 'grid' ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300")}><Icons.Grid width="16" height="16"/></button>
                  <button onClick={() => setView('list')} className={cx("p-2 rounded-lg transition-colors", view === 'list' ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300")}><Icons.List width="16" height="16"/></button>
                </div>
              </div>
            )}
          </header>

          {tab === 'discovery' && (
            <div className="animate-in fade-in duration-700">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-[50vh] text-indigo-500 space-y-6"><div className="relative w-24 h-24"><div className="absolute inset-0 border-4 border-indigo-900/30 rounded-full"></div><div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin"></div><Icons.Compass width="24" height="24" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50 animate-pulse"/></div><p className="font-mono text-sm uppercase tracking-widest font-bold">Querying Global Matrix...</p></div>
              ) : discoveryData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[50vh] border-2 border-dashed border-white/5 rounded-3xl text-gray-500 bg-white/[0.01]"><Icons.Search width="48" height="48" className="mb-6 opacity-20"/><p className="font-medium text-lg">Null Response.</p><p className="text-sm font-mono mt-2">Adjust query parameters.</p></div>
              ) : view === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 2xl:gap-8">
                  {discoveryData.map(s => (
                    <div key={s._id} className="bg-[#0B0F19]/80 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden hover:border-indigo-500/50 transition-all duration-500 shadow-xl hover:shadow-[0_0_30px_rgba(79,70,229,0.15)] group flex flex-col relative">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="p-8 border-b border-white/5 flex-1 relative z-10">
                        <div className="flex justify-between items-start mb-6">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-gray-800 to-gray-700 flex items-center justify-center text-white font-black text-2xl shadow-inner border border-gray-600 group-hover:scale-110 transition-transform duration-500" style={{background: `linear-gradient(135deg, #1f2937, ${gI(s.companyName)}40)`}}>{s.companyName.charAt(0)}</div>
                          <span className="bg-indigo-900/20 text-indigo-400 text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-lg border border-indigo-500/20 font-bold shadow-inner backdrop-blur-sm">{s.investmentDetails?.fundingStage || 'Undisclosed'}</span>
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2 truncate group-hover:text-indigo-300 transition-colors">{s.companyName}</h3>
                        <p className="text-[10px] text-gray-500 font-mono mb-5 uppercase tracking-widest font-semibold flex items-center gap-1.5"><Icons.FileKey width="12" height="12"/> CIN: {s.cin}</p>
                        <p className="text-sm text-gray-400 line-clamp-3 leading-relaxed font-medium">{s.pitch?.oneLinePitch || 'Entity narrative sequence not initialized.'}</p>
                      </div>
                      <div className="bg-black/30 p-6 flex items-center justify-between relative z-10 border-t border-white/5">
                        <div><p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Target Valuation</p><p className="text-xl font-black text-emerald-400 font-mono">{fC(s.valuationAsk)}</p></div>
                        <button onClick={() => initVDR(s._id)} className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 hover:scale-110 transition-all shadow-[0_0_15px_rgba(79,70,229,0.4)] group-hover:shadow-[0_0_25px_rgba(79,70,229,0.6)]"><Icons.ArrowUpRight width="20" height="20" className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"/></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <DataGrid cols={[
                  { k: 'n', l: 'Entity', render: r => <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center font-bold text-xs">{r.companyName.charAt(0)}</div><span className="font-bold text-white">{r.companyName}</span></div> },
                  { k: 's', l: 'Stage', render: r => <span className="text-xs font-mono uppercase text-indigo-400">{r.investmentDetails?.fundingStage || 'N/A'}</span> },
                  { k: 'c', l: 'CIN', render: r => <span className="text-xs font-mono text-gray-500">{r.cin}</span> },
                  { k: 'v', l: 'Valuation', align: 'right', render: r => <span className="font-bold text-emerald-400 font-mono">{fC(r.valuationAsk)}</span> },
                  { k: 'a', l: 'Action', align: 'right', render: r => <Button v="ghost" c="!px-3 !py-1.5 border border-white/10 text-xs" onClick={(e) => {e.stopPropagation(); initVDR(r._id);}}>Analyze <Icons.ArrowUpRight width="14" height="14"/></Button>}
                ]} data={discoveryData} onRowClick={r => initVDR(r._id)} />
              )}
            </div>
          )}

          {tab === 'meetings' && (
            <div className="animate-in fade-in duration-700 space-y-6">
              <Card title="Temporal Sync Roster" icon={Icons.Calendar} action={<Button v="secondary" c="!py-2 !px-4 text-xs"><Icons.DownloadCloud width="14" height="14"/> Export ICS</Button>}>
                {meetings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[40vh] text-gray-500 border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                    <Icons.Video width="48" height="48" className="mb-6 opacity-20"/>
                    <p className="text-lg font-bold">No active operations.</p>
                    <p className="text-sm font-mono mt-2 text-gray-600">Query discovery matrix to schedule syncs.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-800 text-xs uppercase tracking-widest text-gray-500">
                          <th className="py-4 font-semibold pl-4">Target Entity</th>
                          <th className="py-4 font-semibold">Temporal Coordinates</th>
                          <th className="py-4 font-semibold">Status</th>
                          <th className="py-4 font-semibold text-right pr-4">Pipeline</th>
                        </tr>
                      </thead>
                      <tbody>
                        {meetings.map((m) => {
                          const meetTime = new Date(m.scheduledAt);
                          const canJoin = currentTime >= new Date(meetTime.getTime() - 5 * 60000).getTime();
                          return (
                            <tr key={m._id} className="border-b border-gray-800/50 hover:bg-gray-900/30 transition-colors">
                              <td className="py-4 pl-4 font-bold text-white flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-900/30 text-indigo-400 flex items-center justify-center font-black border border-indigo-500/20">{m.startupId?.companyName?.charAt(0) || 'X'}</div>
                                {m.startupId?.companyName || 'Unknown'}
                              </td>
                              <td className="py-4 text-sm text-gray-300 font-mono">
                                <span className="text-indigo-400 mr-2">{fD(m.scheduledAt)}</span> 
                                {fT(m.scheduledAt)}
                              </td>
                              <td className="py-4">
                                <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded border bg-emerald-900/20 text-emerald-400 border-emerald-500/20"><Icons.CheckCircle width="10" height="10" className="inline mr-1 -mt-0.5"/>Confirmed</span>
                              </td>
                              <td className="py-4 pr-4 text-right">
                                {canJoin ? (
                                  <a href={`/meeting/${m.roomId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 hover:scale-105">
                                    <Icons.Video width="14" height="14"/> Join Meet
                                  </a>
                                ) : (
                                  <button disabled className="inline-flex items-center gap-2 bg-gray-800 text-gray-500 px-5 py-2.5 rounded-xl text-xs font-bold cursor-not-allowed border border-gray-700 transition-all">
                                    <Icons.Clock width="14" height="14"/> Unlocks at {fT(m.scheduledAt)}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {tab === 'chat' && (
            <div className="h-[75vh] bg-[#070A12]/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl flex overflow-hidden animate-in fade-in zoom-in-95 duration-500">
              <div className="w-80 border-r border-white/5 flex flex-col bg-black/40 relative z-10">
                <div className="p-6 border-b border-white/5">
                  <h3 className="font-black text-white tracking-wide flex items-center gap-3 text-lg"><Icons.Lock width="20" height="20" className="text-emerald-500"/> Secured Tunnels</h3>
                  <div className="mt-5 relative group">
                    <Icons.Search width="14" height="14" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input type="text" placeholder="Filter entities..." className="w-full bg-white/5 border border-transparent rounded-xl py-3 pl-10 pr-4 text-xs text-gray-200 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-medium" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                  {chatUsers.length === 0 ? (
                    <div className="text-center p-8 text-gray-500 text-sm flex flex-col items-center justify-center h-full gap-4">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center"><Icons.MessageSquare width="24" height="24" className="opacity-40"/></div>
                      <p className="font-mono">Pipeline dormant.</p>
                    </div>
                  ) : chatUsers.map(c => (
                    <button key={c._id} onClick={() => setActiveChat(c)} className={cx("w-full text-left p-4 rounded-2xl transition-all duration-300 border relative overflow-hidden group", activeChat?._id === c._id ? "bg-indigo-600/10 border-indigo-500/40 shadow-[0_0_20px_rgba(79,70,229,0.1)]" : "bg-transparent border-transparent hover:bg-white/5")}>
                      {activeChat?._id === c._id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,1)]"></div>}
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="relative">
                          <div className={cx("w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-inner border border-white/10", activeChat?._id === c._id ? "bg-gradient-to-tr from-indigo-600 to-purple-500" : "bg-gradient-to-tr from-gray-800 to-gray-700")}>{c.name.charAt(0)}</div>
                          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#070A12] rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1"><h4 className="text-sm font-bold text-gray-100 truncate pr-2">{c.name}</h4><span className="text-[9px] font-mono text-indigo-400 bg-indigo-900/30 px-1.5 py-0.5 rounded border border-indigo-500/20 uppercase">Lock</span></div>
                          <p className="text-xs text-gray-500 truncate font-medium">{typing[c._id] ? <span className="text-indigo-400 font-mono flex items-center gap-1"><Icons.Activity width="10" height="10" className="animate-spin"/> Transmitting...</span> : c.lastMessage || 'Tunnel Open'}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-transparent">
                {activeChat ? (
                  <>
                    <div className="p-6 border-b border-white/5 bg-black/20 backdrop-blur-md flex items-center justify-between z-10 shadow-lg">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-2xl shadow-[0_0_20px_rgba(79,70,229,0.2)]">{activeChat.name.charAt(0)}</div>
                        <div>
                          <h3 className="font-black text-white text-xl flex items-center gap-2">{activeChat.name}</h3>
                          <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 flex items-center gap-1.5 mt-1 bg-emerald-900/20 w-max px-2 py-0.5 rounded border border-emerald-500/20"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,1)]"></span> Validated Founder Node</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-all"><Icons.Phone width="20" height="20"/></button>
                        <button className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-all"><Icons.Video width="20" height="20"/></button>
                        <div className="w-px h-8 bg-white/10 mx-2"></div>
                        <button className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 transition-all"><Icons.MoreVertical width="20" height="20"/></button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                      <div className="text-center my-8"><span className="bg-emerald-900/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-mono uppercase tracking-widest px-4 py-2 rounded-full shadow-inner"><Icons.Lock width="12" height="12" className="inline mr-2 -mt-0.5"/>AES-256 E2E Encryption Active</span></div>
                      {(messages[activeChat._id] || []).map((msg, i) => {
                        const isMe = msg.senderId === 'me';
                        return (
                          <div key={i} className={cx("flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300", isMe ? 'items-end' : 'items-start')}>
                            <div className="flex items-end gap-3 max-w-[75%]">
                              {!isMe && <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 text-xs font-bold shrink-0 mb-6 border border-white/5">{activeChat.name.charAt(0)}</div>}
                              <div className={cx("relative group rounded-3xl px-6 py-4", isMe ? "bg-indigo-600 text-white rounded-br-sm shadow-[0_10px_30px_rgba(79,70,229,0.3)]" : "bg-[#131825] text-gray-200 rounded-bl-sm border border-white/5 shadow-xl")}>
                                <p className="text-sm leading-relaxed font-medium">{msg.content}</p>
                                <div className={cx("absolute -bottom-6 text-[10px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity", isMe ? "right-2 text-gray-500" : "left-2 text-gray-500")}>
                                  {fT(msg.timestamp)} {isMe && <Icons.CheckCircle width="12" height="12" className="inline ml-1 text-indigo-400"/>}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {typing[activeChat._id] && (
                        <div className="flex justify-start items-end gap-3 animate-in fade-in duration-200">
                          <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 text-xs font-bold shrink-0 border border-white/5">{activeChat.name.charAt(0)}</div>
                          <div className="bg-[#131825] rounded-3xl rounded-bl-sm px-6 py-5 border border-white/5 flex gap-2 shadow-xl">
                            {[0,150,300].map(d => <span key={d} className="w-2 h-2 bg-indigo-500/50 rounded-full animate-bounce" style={{animationDelay:`${d}ms`}}></span>)}
                          </div>
                        </div>
                      )}
                      <div ref={msgEndRef} className="h-4" />
                    </div>
                    <div className="p-6 bg-black/40 backdrop-blur-xl border-t border-white/5">
                      <form onSubmit={sendPayload} className="relative flex items-center gap-4">
                        <button type="button" className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 shadow-inner"><Icons.Paperclip width="22" height="22"/></button>
                        <div className="relative flex-1">
                          <input type="text" value={msgInput} onChange={handleTyping} placeholder="Construct encrypted payload..." className="w-full bg-white/5 border border-white/5 rounded-2xl pl-6 pr-16 py-5 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all shadow-inner font-medium placeholder-gray-500" />
                          <button type="submit" disabled={!msgInput.trim()} className="absolute right-2 top-2 bottom-2 aspect-square rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 flex items-center justify-center text-white transition-all shadow-lg shadow-indigo-500/20 group"><Icons.Send width="20" height="20" className={msgInput.trim() ? "group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" : ""}/></button>
                        </div>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMzMzMiLz48L3N2Zz4=')]">
                    <div className="relative mb-8">
                      <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-800 animate-[spin_15s_linear_infinite]"></div>
                      <div className="absolute inset-0 flex items-center justify-center"><div className="w-20 h-20 bg-gray-900/50 backdrop-blur-md rounded-full border border-gray-800 flex items-center justify-center shadow-2xl"><Icons.Shield width="32" height="32" className="text-gray-600"/></div></div>
                    </div>
                    <h3 className="font-black text-2xl text-white mb-3 tracking-tight">Terminal Standby</h3>
                    <p className="text-sm font-mono text-center max-w-sm leading-relaxed">Select an active entity channel from the left panel to initialize secure peer-to-peer transmission protocol.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {vdrStartup && (
        <div className="fixed inset-0 z-[60] bg-[#030509]/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-[#0B0F19] border border-white/10 rounded-[2rem] w-full max-w-7xl h-[90vh] flex flex-col shadow-[0_0_100px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-500 overflow-hidden relative">
            <button onClick={() => { setVdrStartup(null); setVdrData(null); }} className="absolute top-6 right-6 z-20 w-12 h-12 bg-black/50 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/50 transition-all"><Icons.X width="24" height="24"/></button>
            
            {vdrLoading || !vdrData ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-8 text-indigo-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMzMzMiLz48L3N2Zz4=')] opacity-20"></div>
                <div className="relative w-32 h-32">
                  <div className="absolute inset-0 border-4 border-indigo-900/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
                  <Icons.Shield width="32" height="32" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50 animate-pulse"/>
                </div>
                <h3 className="text-2xl font-black font-mono tracking-widest uppercase text-white">Decrypting VDR Payload</h3>
                <p className="text-gray-500 font-mono text-sm max-w-xs text-center">Establishing secure connection to decentralized storage nodes...</p>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row h-full">
                <div className="w-full lg:w-7/12 flex flex-col border-r border-white/5 bg-[#070A12] relative z-10">
                  <div className="p-10 border-b border-white/5 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-900/20 to-transparent">
                    <div className="flex items-start gap-6 mb-8">
                      <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-gray-800 to-gray-700 flex items-center justify-center text-white font-black text-4xl shadow-inner border border-white/10" style={{background: `linear-gradient(135deg, #1f2937, ${gI(vdrData.companyName)}60)`}}>{vdrData.companyName.charAt(0)}</div>
                      <div className="flex-1">
                        <h2 className="text-4xl font-black text-white tracking-tight mb-2">{vdrData.companyName}</h2>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="bg-indigo-900/30 text-indigo-400 text-xs font-mono uppercase tracking-widest px-3 py-1.5 rounded-lg border border-indigo-500/20 font-bold">{vdrData.investmentDetails?.fundingStage}</span>
                          <span className="bg-white/5 text-gray-400 text-xs font-mono px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2"><Icons.FileKey width="12" height="12"/> CIN: {vdrData.cin}</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-5 shadow-inner">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-1 flex items-center gap-2"><Icons.Activity width="12" height="12"/> Target Valuation</p>
                        <p className="text-3xl font-black text-emerald-400 font-mono">{fC(vdrData.valuationAsk)}</p>
                      </div>
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-5 shadow-inner">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-1 flex items-center gap-2"><Icons.DollarSign width="12" height="12"/> Capital Required</p>
                        <p className="text-3xl font-black text-white font-mono">{fC(vdrData.investmentDetails?.amountRequired)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                    <div>
                      <h4 className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2"><Icons.Compass width="16" height="16"/> Executive Summary</h4>
                      <p className="text-gray-300 text-base leading-relaxed font-medium bg-white/5 p-6 rounded-2xl border border-white/5 shadow-inner">{vdrData.pitch?.oneLinePitch || 'Entity has not provided an executive summary.'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-black/20 p-6 rounded-2xl border border-white/5"><h4 className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2"><Icons.TrendingDown width="14" height="14"/> Problem Vector</h4><p className="text-gray-300 text-sm leading-relaxed">{vdrData.pitch?.problem || 'N/A'}</p></div>
                      <div className="bg-black/20 p-6 rounded-2xl border border-white/5"><h4 className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2"><Icons.Zap width="14" height="14"/> Solution Architecture</h4><p className="text-gray-300 text-sm leading-relaxed">{vdrData.pitch?.solution || 'N/A'}</p></div>
                      <div className="bg-black/20 p-6 rounded-2xl border border-white/5"><h4 className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2"><Icons.Globe width="14" height="14"/> Market Topology</h4><p className="text-gray-300 text-sm leading-relaxed">{vdrData.pitch?.targetMarket || 'N/A'}</p></div>
                      <div className="bg-black/20 p-6 rounded-2xl border border-white/5"><h4 className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2"><Icons.PieChart width="14" height="14"/> Economic Engine</h4><p className="text-gray-300 text-sm leading-relaxed">{vdrData.pitch?.businessModel || 'N/A'}</p></div>
                    </div>
                    <div className="pt-4 border-t border-white/5">
                      <h4 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2"><Icons.Activity width="16" height="16"/> Algorithmic Scoring Matrix</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {rData.map((d, i) => (
                          <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-300 tracking-wide">{d.l}</span>
                            <span className="font-mono font-black text-indigo-400 bg-indigo-900/20 px-2 py-1 rounded border border-indigo-500/20">{d.v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="p-8 border-t border-white/5 bg-black/40 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
                    <button onClick={() => openChannel(vdrData.founder._id, vdrData.companyName)} className="w-full sm:w-auto flex items-center justify-center gap-2 text-white bg-white/5 hover:bg-white/10 transition-colors text-sm font-bold px-6 py-3.5 rounded-xl border border-white/5 shadow-inner"><Icons.MessageSquare width="18" height="18"/> Initialize Comms</button>
                    {vdrData.pitchDeckUrl ? (
                      <a href={vdrData.pitchDeckUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto flex items-center justify-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-bold bg-indigo-900/20 hover:bg-indigo-900/30 px-6 py-3.5 rounded-xl border border-indigo-500/20 shadow-inner"><Icons.ExternalLink width="18" height="18"/> Access VDR Payload</a>
                    ) : (
                      <span className="w-full sm:w-auto flex items-center justify-center gap-2 text-gray-500 text-sm font-bold px-6 py-3.5 rounded-xl border border-transparent"><Icons.Lock width="18" height="18"/> No VDR Payload Attached</span>
                    )}
                  </div>
                </div>

                <div className="w-full lg:w-5/12 bg-[#0A0D18] flex flex-col relative overflow-hidden z-0">
                  <div className="absolute top-[-10%] right-[-20%] w-[500px] h-[500px] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none"></div>
                  <div className="p-10 border-b border-white/5 bg-black/20">
                    <h3 className="text-2xl font-black text-white flex items-center gap-3"><Icons.Calendar width="28" height="28" className="text-indigo-500"/> WebRTC Sync Auth</h3>
                    <p className="text-sm text-gray-400 mt-3 leading-relaxed font-medium">Select an exposed temporal coordinate to execute an atomic DB lock. The system will automatically construct an AES-encrypted WebRTC room and dispatch calendar payloads.</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-10 custom-scrollbar relative z-10">
                    {vdrData.availabilitySlots && vdrData.availabilitySlots.length > 0 ? (
                      <div className="space-y-4">
                        {vdrData.availabilitySlots.map(s => {
                          const start = new Date(s.startTime); const end = new Date(s.endTime); const sel = slotId === s._id;
                          return (
                            <button key={s._id} onClick={() => setSlotId(s._id)} className={cx("w-full p-5 rounded-2xl text-left border transition-all duration-300 focus:outline-none flex items-center justify-between group", sel ? "bg-indigo-600/10 border-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.15)] transform scale-[1.02]" : "bg-black/40 border-white/5 hover:border-white/20 hover:bg-black/60")}>
                              <div className="flex flex-col gap-1">
                                <span className={cx("font-black text-lg transition-colors", sel ? "text-white" : "text-gray-300 group-hover:text-white")}>{fD(start)}</span>
                                <span className={cx("font-mono text-sm transition-colors", sel ? "text-indigo-400" : "text-gray-500")}>{fT(start)} - {fT(end)} UTC</span>
                              </div>
                              <div className={cx("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all", sel ? "border-indigo-500 bg-indigo-500" : "border-gray-600 group-hover:border-gray-400")}>
                                {sel && <Icons.CheckCircle width="14" height="14" className="text-white" stroke="#fff"/>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 bg-black/20 rounded-3xl border-2 border-dashed border-white/5 p-10">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6"><Icons.Clock width="32" height="32" className="opacity-40"/></div>
                        <p className="font-black text-xl text-white mb-2 tracking-tight">Target Unreachable</p>
                        <p className="text-sm max-w-[250px] leading-relaxed">Entity has not exposed any valid temporal coordinates to the scheduling matrix.</p>
                      </div>
                    )}
                  </div>
                  <div className="p-10 border-t border-white/5 bg-black/40 backdrop-blur-xl relative z-10">
                    <button onClick={execAtomicLock} disabled={!slotId || isBooking} className={cx("w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 tracking-wide", slotId ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_10px_40px_rgba(79,70,229,0.4)] hover:shadow-[0_15px_50px_rgba(79,70,229,0.6)] hover:-translate-y-1" : "bg-gray-900/50 text-gray-600 border border-white/5 cursor-not-allowed")}>
                      {isBooking ? <Icons.Activity className="animate-spin" width="24" height="24"/> : <Icons.Shield width="24" height="24"/>}
                      {isBooking ? 'Executing Atomic Lock...' : 'Authorize Temporal Sync'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 20px; border: 2px solid transparent; background-clip: padding-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(99,102,241,0.5); }
      `}} />
    </div>
  );
}