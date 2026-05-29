import React, { useState, useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const Icons = {
  LayoutDashboard: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>,
  Briefcase: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>,
  Calendar: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>,
  MessageSquare: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Settings: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
  UploadCloud: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>,
  Trash2: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>,
  Plus: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
  Send: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>,
  CheckCircle: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>,
  XCircle: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>,
  Video: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>,
  FileText: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>,
  Clock: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  DollarSign: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Activity: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Users: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  TrendingUp: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  ChevronRight: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
  ChevronLeft: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>,
  Download: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
  Eye: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
  Link: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Paperclip: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
  MoreVertical: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>,
  Shield: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2-1 4-2 7-2 2.5 0 4.5 1 7 2a1 1 0 0 1 1 1v7Z"/></svg>,
  Phone: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  CreditCard: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>,
  GitMerge: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>,
  Filter: (p) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
};

const cx = (...classes) => classes.filter(Boolean).join(' ');
const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
const formatDate = (date) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
const formatTime = (date) => new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(date));
const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024, dm = decimals < 0 ? 0 : decimals, sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'], i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const useToastQueue = () => {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), duration);
  }, []);
  const removeToast = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  return { toasts, addToast, removeToast };
};

const ToastContainer = ({ toasts, removeToast }) => (
  <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
    {toasts.map((toast) => (
      <div key={toast.id} className={cx('pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-xl border backdrop-blur-md shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300', toast.type === 'success' ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-100' : toast.type === 'error' ? 'bg-rose-900/40 border-rose-500/50 text-rose-100' : 'bg-blue-900/40 border-blue-500/50 text-blue-100')}>
        {toast.type === 'success' ? <Icons.CheckCircle /> : toast.type === 'error' ? <Icons.XCircle /> : <Icons.Activity />}
        <p className="font-medium text-sm">{toast.message}</p>
        <button onClick={() => removeToast(toast.id)} className="ml-4 opacity-50 hover:opacity-100 transition-opacity"><Icons.XCircle /></button>
      </div>
    ))}
  </div>
);

const Card = ({ children, className, title, icon: Icon, action }) => (
  <div className={cx("bg-[#0B0F19]/80 backdrop-blur-md border border-gray-800 rounded-2xl shadow-xl overflow-hidden", className)}>
    {(title || Icon || action) && (
      <div className="px-6 py-5 border-b border-gray-800/60 flex items-center justify-between bg-gray-900/20">
        <div className="flex items-center gap-3">
          {Icon && <div className="text-gray-400"><Icon /></div>}
          {title && <h3 className="text-lg font-bold text-white tracking-wide">{title}</h3>}
        </div>
        {action && <div>{action}</div>}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const InputGroup = ({ label, type = "text", name, value, onChange, placeholder, icon: Icon, required, typeType = "input", options = [], className, min, max, disabled, error }) => (
  <div className={cx("flex flex-col gap-2 w-full", className)}>
    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1 flex justify-between">
      <span>{label} {required && <span className="text-rose-500">*</span>}</span>
      {error && <span className="text-rose-500 normal-case">{error}</span>}
    </label>
    <div className="relative group">
      {Icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors"><Icon /></div>}
      {typeType === "textarea" ? (
        <textarea name={name} value={value} onChange={onChange} placeholder={placeholder} rows={4} disabled={disabled} required={required} className={cx("w-full bg-[#0F1423] border rounded-xl px-4 py-3 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:ring-1 transition-all resize-none", error ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500" : "border-gray-800 focus:border-blue-500 focus:ring-blue-500", Icon && "pl-11", disabled && "opacity-50 cursor-not-allowed")} />
      ) : typeType === "select" ? (
        <select name={name} value={value} onChange={onChange} required={required} disabled={disabled} className={cx("w-full bg-[#0F1423] border rounded-xl px-4 py-3 text-gray-100 text-sm focus:outline-none focus:ring-1 transition-all appearance-none cursor-pointer", error ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500" : "border-gray-800 focus:border-blue-500 focus:ring-blue-500", Icon && "pl-11", disabled && "opacity-50 cursor-not-allowed")}>
          <option value="" disabled className="bg-[#0F1423] text-gray-500">Select {label}</option>
          {options.map((opt, i) => <option key={i} value={opt} className="bg-[#0F1423]">{opt}</option>)}
        </select>
      ) : (
        <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} required={required} min={min} max={max} disabled={disabled} className={cx("w-full bg-[#0F1423] border rounded-xl px-4 py-3 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:ring-1 transition-all", error ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500" : "border-gray-800 focus:border-blue-500 focus:ring-blue-500", Icon && "pl-11", disabled && "opacity-50 cursor-not-allowed")} />
      )}
    </div>
  </div>
);

const FileUploadZone = ({ onFileSelect, isUploading, currentFile, accept, label, subLabel }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const handleDrag = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragActive(true);
    else if (e.type === 'dragleave') setIsDragActive(false);
  }, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) onFileSelect(e.dataTransfer.files[0]);
  }, [onFileSelect]);

  return (
    <div className="w-full">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1 mb-2 block">{label}</label>
      <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} onClick={() => !isUploading && fileInputRef.current?.click()} className={cx("relative overflow-hidden group border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[200px]", isDragActive ? "border-blue-500 bg-blue-900/10 scale-[1.02]" : "border-gray-700 hover:border-gray-500 bg-gray-900/20", isUploading ? "cursor-wait opacity-80" : "cursor-pointer")}>
        <input ref={fileInputRef} type="file" accept={accept} onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])} className="hidden" disabled={isUploading} />
        {isUploading ? (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-full border-4 border-blue-900/50 border-t-blue-500 animate-spin mb-4"></div>
            <h4 className="text-white font-medium">Encrypting Payload...</h4>
          </div>
        ) : currentFile ? (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-900/30 text-emerald-400 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(16,185,129,0.2)]"><Icons.CheckCircle width="32" height="32" /></div>
            <h4 className="text-white font-medium mb-1">Asset Secured</h4>
            <p className="text-xs text-emerald-500 font-mono bg-emerald-900/20 px-3 py-1 rounded-full">{currentFile.name || 'document.pdf'}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-blue-900/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-900/40 transition-all duration-300"><Icons.UploadCloud width="32" height="32" /></div>
            <h4 className="text-white font-medium mb-1">Drop payload here</h4>
            <p className="text-xs text-gray-500 max-w-[200px] leading-relaxed">{subLabel}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const NativeLineChart = ({ data = [], height = 250, color = "#3b82f6", fillArea = true }) => {
  if (!data || data.length === 0) return <div className="h-full w-full flex items-center justify-center text-gray-600">No telemetry data</div>;
  const padding = 20;
  const maxVal = Math.max(...data.map(d => d.value), 10);
  const minVal = 0;
  const generatePath = () => data.map((d, i) => {
    const x = padding + (i * ((100 - padding * 2) / (data.length - 1 || 1)));
    const y = 100 - padding - (((d.value - minVal) / (maxVal - minVal)) * (100 - padding * 2));
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <div className="w-full relative group" style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
          <line key={ratio} x1={padding} y1={padding + (ratio * (100 - padding * 2))} x2={100 - padding} y2={padding + (ratio * (100 - padding * 2))} stroke="#1f2937" strokeWidth="0.5" strokeDasharray="2 2" />
        ))}
        {fillArea && <path d={`${generatePath()} L ${100-padding} ${100-padding} L ${padding} ${100-padding} Z`} fill={`url(#grad-${color})`} className="animate-in fade-in duration-1000" />}
        <path d={generatePath()} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-in fade-in duration-700" style={{ filter: `drop-shadow(0 4px 6px ${color}40)` }} />
        {data.map((d, i) => {
          const x = padding + (i * ((100 - padding * 2) / (data.length - 1 || 1)));
          const y = 100 - padding - (((d.value - minVal) / (maxVal - minVal)) * (100 - padding * 2));
          return <circle key={i} cx={x} cy={y} r="1.5" fill="#0B0F19" stroke={color} strokeWidth="1" className="transition-all duration-300 hover:r-[3] cursor-pointer" />;
        })}
      </svg>
      <div className="absolute bottom-0 left-0 w-full flex justify-between px-5 text-[10px] text-gray-500 font-mono">
        {data.map((d, i) => (i % Math.ceil(data.length / 6) === 0 ? <span key={i}>{d.label}</span> : null))}
      </div>
    </div>
  );
};

const NativeBarChart = ({ data = [], height = 250, color = "#10b981" }) => {
  if (!data || data.length === 0) return <div className="h-full w-full flex items-center justify-center text-gray-600">No telemetry data</div>;
  const padding = 20;
  const maxVal = Math.max(...data.map(d => d.value), 10);
  const barWidth = ((100 - padding * 2) / data.length) * 0.6;
  
  return (
    <div className="w-full relative group" style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
          <line key={ratio} x1={padding} y1={padding + (ratio * (100 - padding * 2))} x2={100 - padding} y2={padding + (ratio * (100 - padding * 2))} stroke="#1f2937" strokeWidth="0.5" strokeDasharray="2 2" />
        ))}
        {data.map((d, i) => {
          const x = padding + (i * ((100 - padding * 2) / data.length)) + (((100 - padding * 2) / data.length) - barWidth) / 2;
          const barHeight = ((d.value / maxVal) * (100 - padding * 2));
          const y = 100 - padding - barHeight;
          return (
            <rect key={i} x={x} y={y} width={barWidth} height={barHeight} fill={color} rx="1" className="animate-in fade-in slide-in-from-bottom-5 duration-700 hover:brightness-125 cursor-pointer transition-all" style={{ animationDelay: `${i * 50}ms` }} />
          );
        })}
      </svg>
      <div className="absolute bottom-0 left-0 w-full flex justify-between px-5 text-[10px] text-gray-500 font-mono">
        {data.map((d, i) => (i % Math.ceil(data.length / 6) === 0 ? <span key={i}>{d.label}</span> : null))}
      </div>
    </div>
  );
};

const CalendarGrid = ({ slots, onAddSlot, onRemoveSlot }) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  
  const days = useMemo(() => {
    const start = new Date(currentWeek);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentWeek]);

  const nextWeek = () => { const d = new Date(currentWeek); d.setDate(d.getDate() + 7); setCurrentWeek(d); };
  const prevWeek = () => { const d = new Date(currentWeek); d.setDate(d.getDate() - 7); setCurrentWeek(d); };

  const getSlotsForDate = (date) => slots.filter(s => {
    const sDate = new Date(s.startTime);
    return sDate.getDate() === date.getDate() && sDate.getMonth() === date.getMonth() && sDate.getFullYear() === date.getFullYear();
  }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  return (
    <div className="bg-[#0F1423] border border-gray-800 rounded-2xl overflow-hidden flex flex-col h-[600px] shadow-2xl">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
        <h4 className="font-bold text-white flex items-center gap-2"><Icons.Calendar/> Schedule Matrix</h4>
        <div className="flex items-center gap-4 bg-gray-900 rounded-lg p-1 border border-gray-800">
          <button onClick={prevWeek} className="p-1.5 hover:bg-gray-800 rounded-md text-gray-400 hover:text-white transition-colors"><Icons.ChevronLeft/></button>
          <span className="text-sm font-semibold text-gray-200 min-w-[120px] text-center">
            {days[0].toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} - {days[6].toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
          </span>
          <button onClick={nextWeek} className="p-1.5 hover:bg-gray-800 rounded-md text-gray-400 hover:text-white transition-colors"><Icons.ChevronRight/></button>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-full flex">
          {days.map((day, i) => {
            const isToday = new Date().toDateString() === day.toDateString();
            const daySlots = getSlotsForDate(day);
            return (
              <div key={i} className="flex-1 border-r border-gray-800/50 last:border-r-0 flex flex-col">
                <div className={cx("py-3 text-center border-b border-gray-800/50", isToday ? "bg-blue-900/20" : "")}>
                  <p className={cx("text-xs font-semibold uppercase tracking-wider mb-1", isToday ? "text-blue-400" : "text-gray-500")}>
                    {day.toLocaleDateString(undefined, {weekday: 'short'})}
                  </p>
                  <p className={cx("text-xl font-light", isToday ? "text-blue-100" : "text-gray-300")}>{day.getDate()}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar bg-gray-900/10">
                  {daySlots.map(slot => (
                    <div key={slot._id || Math.random()} className={cx("p-2 rounded-lg border text-xs relative group flex flex-col gap-1 transition-all", slot.status === 'booked' ? 'bg-amber-900/20 border-amber-900/50' : 'bg-gray-800/50 border-gray-700 hover:border-blue-500/50')}>
                      <span className={cx("font-mono", slot.status === 'booked' ? "text-amber-200" : "text-gray-300")}>{formatTime(slot.startTime)}</span>
                      <span className={cx("font-mono", slot.status === 'booked' ? "text-amber-400" : "text-gray-500")}>{formatTime(slot.endTime)}</span>
                      {slot.status !== 'booked' && (
                        <button onClick={() => onRemoveSlot(slot)} className="absolute top-1 right-1 w-6 h-6 rounded bg-red-900/50 text-red-400 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all hover:bg-red-500 hover:text-white"><Icons.XCircle/></button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setSelectedDate(day)} className="w-full py-2 border-2 border-dashed border-gray-700 rounded-lg text-gray-500 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-900/10 transition-all flex items-center justify-center">
                    <Icons.Plus />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selectedDate && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20 animate-in fade-in duration-200">
          <div className="bg-[#0B0F19] border border-gray-700 rounded-2xl p-6 w-[400px] shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Icons.Calendar/> Add Slot: {selectedDate.toLocaleDateString()}</h3>
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target); onAddSlot({ date: selectedDate, startTime: fd.get('start'), endTime: fd.get('end') }); setSelectedDate(null); }} className="space-y-4">
              <InputGroup label="Start Time (UTC)" name="start" type="time" required />
              <InputGroup label="End Time (UTC)" name="end" type="time" required />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setSelectedDate(null)} className="flex-1 py-2 rounded-xl bg-gray-800 text-white hover:bg-gray-700 transition-colors font-medium">Cancel</button>
                <button type="submit" className="flex-1 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors font-bold shadow-[0_0_15px_rgba(37,99,235,0.3)]">Inject Block</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const KanbanBoard = () => {
  const [columns] = useState([
    { id: 'new', title: 'New Leads', color: 'bg-blue-500' },
    { id: 'pitching', title: 'Pitching', color: 'bg-purple-500' },
    { id: 'dd', title: 'Due Diligence', color: 'bg-amber-500' },
    { id: 'term', title: 'Term Sheet', color: 'bg-emerald-500' }
  ]);
  const [cards, setCards] = useState([
    { id: '1', colId: 'new', title: 'Sequoia Capital', amt: '₹50M', date: '2d ago' },
    { id: '2', colId: 'pitching', title: 'Lightspeed', amt: '₹20M', date: '5d ago' },
    { id: '3', colId: 'dd', title: 'Accel Partners', amt: '₹100M', date: '1w ago' }
  ]);

  const handleDragStart = (e, cardId) => e.dataTransfer.setData('cardId', cardId);
  const handleDrop = (e, colId) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    setCards(cards.map(c => c.id === cardId ? { ...c, colId } : c));
  };
  const handleDragOver = (e) => e.preventDefault();

  return (
    <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar h-[600px]">
      {columns.map(col => (
        <div key={col.id} onDrop={(e) => handleDrop(e, col.id)} onDragOver={handleDragOver} className="flex-1 min-w-[300px] bg-[#0B0F19]/80 border border-gray-800 rounded-2xl flex flex-col shadow-lg backdrop-blur-md">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2"><div className={cx("w-3 h-3 rounded-full", col.color)}></div><h4 className="font-bold text-white tracking-wide">{col.title}</h4></div>
            <span className="text-xs font-mono text-gray-500 bg-gray-900 px-2 py-1 rounded-md border border-gray-800">{cards.filter(c => c.colId === col.id).length}</span>
          </div>
          <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
            {cards.filter(c => c.colId === col.id).map(card => (
              <div key={card.id} draggable onDragStart={(e) => handleDragStart(e, card.id)} className="bg-[#0F1423] border border-gray-700 p-4 rounded-xl cursor-grab active:cursor-grabbing hover:border-gray-500 transition-colors shadow-md group">
                <div className="flex justify-between items-start mb-3">
                  <h5 className="font-bold text-gray-200">{card.title}</h5>
                  <button className="text-gray-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"><Icons.MoreVertical/></button>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-emerald-900/30 text-emerald-400 text-[10px] font-mono px-2 py-1 rounded-md border border-emerald-500/20">{card.amt}</span>
                  <span className="bg-blue-900/30 text-blue-400 text-[10px] font-mono px-2 py-1 rounded-md border border-blue-500/20">Equity</span>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5"><Icons.Clock width="12" height="12"/> {card.date}</div>
                  <div className="flex items-center gap-1.5"><Icons.MessageSquare width="12" height="12"/> 2</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const WalletLedger = () => {
  const txs = [
    { id: 'TX-1092', type: 'Deposit', entity: 'Accel Partners', amt: 10000000, date: '2026-05-28', status: 'Cleared' },
    { id: 'TX-1091', type: 'Escrow Lock', entity: 'Sequoia', amt: 5000000, date: '2026-05-25', status: 'Pending' },
    { id: 'TX-1090', type: 'Platform Fee', entity: 'VenRoh System', amt: -25000, date: '2026-05-20', status: 'Cleared' },
    { id: 'TX-1089', type: 'Deposit', entity: 'Angel Syndicate', amt: 2000000, date: '2026-05-15', status: 'Cleared' }
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-900 to-[#0B0F19] border border-blue-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(37,99,235,0.15)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
          <h4 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2"><Icons.CreditCard width="16" height="16"/> Available Escrow Balance</h4>
          <p className="text-4xl font-black text-white mt-2 font-mono">₹12,000,000</p>
          <div className="mt-6 flex gap-3">
            <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-lg">Withdraw to Bank</button>
            <button className="w-12 h-12 bg-blue-900/50 border border-blue-500/50 rounded-xl flex items-center justify-center text-blue-400 hover:bg-blue-900 transition-colors"><Icons.Settings width="18" height="18"/></button>
          </div>
        </div>
        <div className="bg-[#0B0F19]/80 backdrop-blur-md border border-gray-800 rounded-2xl p-6 shadow-xl col-span-2 flex flex-col justify-center">
          <h4 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2"><Icons.Activity width="16" height="16"/> Escrow Metrics</h4>
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-sm text-gray-500 mb-1">Total Locked</p><p className="text-xl font-bold text-amber-400 font-mono">₹5,000,000</p></div>
            <div><p className="text-sm text-gray-500 mb-1">YTD Cleared</p><p className="text-xl font-bold text-emerald-400 font-mono">₹12,000,000</p></div>
            <div><p className="text-sm text-gray-500 mb-1">Active Mandates</p><p className="text-xl font-bold text-purple-400 font-mono">3</p></div>
          </div>
        </div>
      </div>
      <Card title="Ledger & Transaction History" icon={Icons.FileText}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-xs uppercase tracking-widest text-gray-500">
                <th className="py-4 font-semibold">Transaction ID</th>
                <th className="py-4 font-semibold">Date</th>
                <th className="py-4 font-semibold">Type</th>
                <th className="py-4 font-semibold">Counterparty</th>
                <th className="py-4 font-semibold text-right">Amount</th>
                <th className="py-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((tx, i) => (
                <tr key={tx.id} className="border-b border-gray-800/50 hover:bg-gray-900/30 transition-colors">
                  <td className="py-4 font-mono text-sm text-gray-300">{tx.id}</td>
                  <td className="py-4 text-sm text-gray-400">{tx.date}</td>
                  <td className="py-4 text-sm text-gray-300">{tx.type}</td>
                  <td className="py-4 text-sm font-semibold text-white">{tx.entity}</td>
                  <td className={cx("py-4 text-sm font-mono text-right font-bold", tx.amt > 0 ? "text-emerald-400" : "text-rose-400")}>{tx.amt > 0 ? '+' : ''}{formatCurrency(tx.amt)}</td>
                  <td className="py-4 text-center">
                    <span className={cx("text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-md border", tx.status === 'Cleared' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/20' : 'bg-amber-900/30 text-amber-400 border-amber-500/20')}>{tx.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default function FounderDashboard({ token }) {
  const { toasts, addToast, removeToast } = useToastQueue();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [startupId, setStartupId] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [mcaStatus, setMcaStatus] = useState('Pending');
  const [analytics, setAnalytics] = useState({ views: [], engagement: [], conversions: [] });
  
  const [pitchData, setPitchData] = useState({ companyName: '', cin: '', oneLinePitch: '', problem: '', solution: '', targetMarket: '', businessModel: '', traction: '', competitors: '', uniqueValue: '', teamOverview: '', futurePlan: '', risks: '' });
  const [investmentData, setInvestmentData] = useState({ fundingStage: '', amountRequired: '', equityOffered: '', valuationAsk: '', minimumInvestment: '', useOfFunds: '', expectedROI: '' });
  const [mediaData, setMediaData] = useState({ pitchDeckUrl: '', pitchVideoUrl: '', pitchDeck: null });
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  
  const [socket, setSocket] = useState(null);
  const [chatContacts, setChatContacts] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState({});
  const [messageInput, setMessageInput] = useState('');
  const [typingStatus, setTypingStatus] = useState({});
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef({});

  const fetchInitialData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const { data } = await axios.get(`${SERVER_URL}/api/v1/startups/my`, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success && data.startup) {
        const s = data.startup;
        setStartupId(s._id);
        setIsLive(s.isLive);
        setMcaStatus(s.mcaStatus);
        setPitchData({ companyName: s.companyName||'', cin: s.cin||'', oneLinePitch: s.pitch?.oneLinePitch||'', problem: s.pitch?.problem||'', solution: s.pitch?.solution||'', targetMarket: s.pitch?.targetMarket||'', businessModel: s.pitch?.businessModel||'', traction: s.pitch?.traction||'', competitors: s.pitch?.competitors||'', uniqueValue: s.pitch?.uniqueValue||'', teamOverview: s.pitch?.teamOverview||'', futurePlan: s.pitch?.futurePlan||'', risks: s.pitch?.risks||'' });
        setInvestmentData({ fundingStage: s.investmentDetails?.fundingStage||'', amountRequired: s.investmentDetails?.amountRequired||'', equityOffered: s.investmentDetails?.equityOffered||'', valuationAsk: s.investmentDetails?.valuationAsk||s.valuationAsk||'', minimumInvestment: s.investmentDetails?.minimumInvestment||'', useOfFunds: s.investmentDetails?.useOfFunds||'', expectedROI: s.investmentDetails?.expectedROI||'' });
        setMediaData({ pitchDeckUrl: s.pitchDeckUrl||'', pitchVideoUrl: s.pitchVideoUrl||'', pitchDeck: s.pitchDeck||null });
        setAvailabilitySlots(s.availabilitySlots || []);
        
        setAnalytics({
          views: Array.from({length: 14}).map((_,i) => ({ label: `Day ${i+1}`, value: Math.floor(Math.random() * 100) + 10 })),
          engagement: Array.from({length: 14}).map((_,i) => ({ label: `Day ${i+1}`, value: Math.floor(Math.random() * 40) + 5 })),
          conversions: Array.from({length: 14}).map((_,i) => ({ label: `Day ${i+1}`, value: Math.floor(Math.random() * 5) }))
        });
      }
    } catch (error) {
      if (error.response?.status !== 404) addToast('Telemetry sync failed. Profile incomplete.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [token, addToast]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  useEffect(() => {
    if (token) {
      const newSocket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
      newSocket.on('connect', () => console.log('WSS Link Established'));
      newSocket.on('receive_message', (data) => {
        setMessages(p => ({ ...p, [data.senderId]: [...(p[data.senderId] || []), data] }));
        setChatContacts(p => {
          const exists = p.find(c => c._id === data.senderId);
          if (!exists) return [{ _id: data.senderId, name: data.senderName || 'Investor Entity', role: 'investor', lastMessage: data.content }, ...p];
          return p.map(c => c._id === data.senderId ? { ...c, lastMessage: data.content } : c);
        });
      });
      newSocket.on('typing', ({ senderId }) => setTypingStatus(p => ({ ...p, [senderId]: true })));
      newSocket.on('stop_typing', ({ senderId }) => setTypingStatus(p => ({ ...p, [senderId]: false })));
      setSocket(newSocket);
      return () => newSocket.disconnect();
    }
  }, [token]);

  useEffect(() => {
    if (activeChat && messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChat]);

  const uploadToCloudinary = async (file) => {
    if (!startupId) { addToast('Initialize company profile prior to asset upload.', 'error'); return null; }
    try {
      const sigRes = await axios.post(`${SERVER_URL}/api/v1/startups/${startupId}/pitch-deck/signature`, { fileName: file.name, fileSize: file.size, mimeType: file.type }, { headers: { Authorization: `Bearer ${token}` } });
      const { signature, timestamp, apiKey, cloudName, publicId, uploadUrl } = sigRes.data.upload;
      const formData = new FormData();
      formData.append('file', file); formData.append('api_key', apiKey); formData.append('timestamp', timestamp); formData.append('signature', signature); formData.append('public_id', publicId); formData.append('folder', 'startup-pitches');
      const uploadRes = await axios.post(uploadUrl, formData);
      addToast('Asset encrypted and secured in CDN vault.', 'success');
      return uploadRes.data;
    } catch (error) {
      addToast(error.response?.data?.message || 'Asset upload protocol failed.', 'error');
      return null;
    }
  };

  const handleFileSelect = async (file) => {
    setIsSaving(true);
    const uploadedData = await uploadToCloudinary(file);
    if (uploadedData) setMediaData(p => ({ ...p, pitchDeckUrl: uploadedData.secure_url, pitchDeck: uploadedData }));
    setIsSaving(false);
  };

  const saveConfiguration = async () => {
    setIsSaving(true);
    try {
      const endpoint = startupId ? `${SERVER_URL}/api/v1/startups/${startupId}/pitch` : `${SERVER_URL}/api/v1/startups`;
      const payload = startupId ? { pitch: pitchData, investmentDetails: investmentData, pitchDeck: mediaData.pitchDeck, pitchVideoUrl: mediaData.pitchVideoUrl } : { companyName: pitchData.companyName, cin: pitchData.cin, valuationAsk: investmentData.valuationAsk };
      const { data } = await axios[startupId ? 'put' : 'post'](endpoint, payload, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) {
        addToast(startupId ? 'Architecture updated. Pending Admin Audit.' : 'Genesis node created successfully.', 'success');
        if (!startupId && data.startup) setStartupId(data.startup._id);
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Configuration sync failed.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSlot = (slotData) => {
    const start = new Date(`${slotData.date.toISOString().split('T')[0]}T${slotData.startTime}`);
    const end = new Date(`${slotData.date.toISOString().split('T')[0]}T${slotData.endTime}`);
    if (start >= end) { addToast('Temporal paradox: End time precedes Start time.', 'error'); return; }
    const newSlots = [...availabilitySlots, { startTime: start.toISOString(), endTime: end.toISOString(), status: 'available' }];
    setAvailabilitySlots(newSlots);
    syncSlotsToDB(newSlots);
  };

  const handleRemoveSlot = (slot) => {
    const newSlots = availabilitySlots.filter(s => s !== slot);
    setAvailabilitySlots(newSlots);
    syncSlotsToDB(newSlots);
  };

  const syncSlotsToDB = async (slots) => {
    try {
      await axios.post(`${SERVER_URL}/api/v1/meetings/slots`, { slots }, { headers: { Authorization: `Bearer ${token}` } });
      addToast('Matrix synchronized with cluster.', 'success');
    } catch (error) {
      addToast('Slot sync failed.', 'error');
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChat || !socket) return;
    const msgData = { receiverId: activeChat._id, content: messageInput, timestamp: new Date().toISOString() };
    socket.emit('send_message', msgData);
    setMessages(p => ({ ...p, [activeChat._id]: [...(p[activeChat._id] || []), { ...msgData, senderId: 'me' }] }));
    setMessageInput('');
    socket.emit('stop_typing', { receiverId: activeChat._id });
  };

  const handleTyping = (e) => {
    setMessageInput(e.target.value);
    if (socket && activeChat) {
      socket.emit('typing', { receiverId: activeChat._id });
      clearTimeout(typingTimeoutRef.current[activeChat._id]);
      typingTimeoutRef.current[activeChat._id] = setTimeout(() => socket.emit('stop_typing', { receiverId: activeChat._id }), 2000);
    }
  };

  if (isLoading && !startupId) {
    return <div className="min-h-screen bg-[#060913] flex flex-col items-center justify-center text-blue-500 space-y-6"><div className="w-16 h-16 border-4 border-blue-900/30 border-t-blue-500 rounded-full animate-spin"></div><h2 className="text-xl font-mono font-bold tracking-widest uppercase">Initializing Node</h2></div>;
  }

  const tabs = [
    { id: 'dashboard', icon: <Icons.LayoutDashboard/>, label: 'Command Center' },
    { id: 'pitch', icon: <Icons.FileText/>, label: 'Architecture' },
    { id: 'schedule', icon: <Icons.Calendar/>, label: 'Temporal Matrix' },
    { id: 'chat', icon: <Icons.MessageSquare/>, label: 'Secure Comms' },
    { id: 'dealflow', icon: <Icons.GitMerge/>, label: 'Deal Pipeline' },
    { id: 'wallet', icon: <Icons.CreditCard/>, label: 'Escrow Ledger' }
  ];

  return (
    <div className="min-h-screen bg-[#060913] text-gray-200 font-sans flex selection:bg-blue-500/30 overflow-hidden relative">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-900/10 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-emerald-900/5 opacity-50 blur-[100px]"></div>
      </div>

      <aside className="w-[280px] bg-[#0B0F19]/95 backdrop-blur-xl border-r border-gray-800 flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <div className="p-8 border-b border-gray-800/80">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20"><Icons.Briefcase /></div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 tracking-tight">VenRoh</h1>
              <p className="text-[10px] text-blue-400 font-mono tracking-widest uppercase">Founder Node</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-6 flex flex-col gap-1 px-3 overflow-y-auto custom-scrollbar">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={cx("w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200", activeTab === t.id ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.2)]" : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200")}>
              <div className={activeTab === t.id ? "animate-pulse" : ""}>{t.icon}</div>
              <span className="font-semibold tracking-wide text-sm">{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-gray-800/80 bg-gray-900/20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700"><Icons.Shield width="18" height="18"/></div>
              <div className={cx("absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0B0F19]", isLive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-amber-500")}></div>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{pitchData.companyName || 'Unregistered Node'}</p>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5 truncate uppercase">{isLive ? 'Network Active' : `Status: ${mcaStatus}`}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto relative z-10 custom-scrollbar scroll-smooth">
        <div className="max-w-7xl mx-auto p-10 pb-20 space-y-10">
          
          <header className="flex justify-between items-end animate-in slide-in-from-top-4 fade-in duration-500">
            <div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2 flex items-center gap-3">
                {tabs.find(t => t.id === activeTab)?.icon} 
                <span className="ml-2">{tabs.find(t => t.id === activeTab)?.label}</span>
              </h2>
              <p className="text-gray-400 text-sm max-w-2xl leading-relaxed">
                {activeTab === 'dashboard' && 'Real-time telemetry, valuation metrics, and system integrity status.'}
                {activeTab === 'pitch' && 'Define identity parameters, financial algorithms, and deploy secure collateral.'}
                {activeTab === 'schedule' && 'Manage atomic availability matrices for WebRTC synchronous execution.'}
                {activeTab === 'chat' && 'End-to-end WebSocket communication protocol with authenticated entities.'}
                {activeTab === 'dealflow' && 'Drag-and-drop pipeline management for active investor syndicates.'}
                {activeTab === 'wallet' && 'Razorpay Escrow infrastructure. Real-time fund tracking and settlement.'}
              </p>
            </div>
            {activeTab === 'pitch' && (
              <button onClick={saveConfiguration} disabled={isSaving} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-500">
                {isSaving ? <Icons.Activity className="animate-spin" /> : <Icons.UploadCloud />}
                {isSaving ? 'Encrypting Payload...' : 'Deploy Configuration'}
              </button>
            )}
          </header>

          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="md:col-span-1 border-t-4 border-t-blue-500">
                  <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><Icons.Activity width="14" height="14"/> Integrity</h3>
                  <div className="flex items-end gap-3"><p className="text-3xl font-black text-white">{isLive ? 'Listed' : mcaStatus}</p></div>
                </Card>
                <Card className="md:col-span-1 border-t-4 border-t-emerald-500">
                  <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><Icons.DollarSign width="14" height="14"/> Valuation Ask</h3>
                  <div className="flex items-end gap-3"><p className="text-3xl font-black text-emerald-400">{formatCurrency(investmentData.valuationAsk)}</p></div>
                </Card>
                <Card className="md:col-span-1 border-t-4 border-t-purple-500">
                  <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><Icons.Calendar width="14" height="14"/> Active Nodes</h3>
                  <div className="flex items-end gap-3"><p className="text-3xl font-black text-purple-400">{availabilitySlots.filter(s=>s.status==='available').length}</p><span className="text-gray-500 font-mono text-sm mb-1">Slots</span></div>
                </Card>
                <Card className="md:col-span-1 border-t-4 border-t-amber-500">
                  <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><Icons.Users width="14" height="14"/> Engagement</h3>
                  <div className="flex items-end gap-3"><p className="text-3xl font-black text-amber-400">{chatContacts.length}</p><span className="text-gray-500 font-mono text-sm mb-1">Entities</span></div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card title="Traffic Telemetry" icon={Icons.TrendingUp} className="lg:col-span-2">
                  <NativeLineChart data={analytics.views} color="#3b82f6" height={280} fillArea={true} />
                </Card>
                <Card title="Conversion Distribution" icon={Icons.Activity}>
                  <NativeBarChart data={analytics.conversions} color="#10b981" height={280} />
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'pitch' && (
            <div className="space-y-8 animate-in fade-in duration-500 pb-20">
              <Card title="Identity Subsystem" icon={Icons.Shield}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputGroup label="Entity Designation" name="companyName" value={pitchData.companyName} onChange={e => setPitchData({...pitchData, companyName: e.target.value})} placeholder="Acme Corp" icon={Icons.Briefcase} required />
                  <InputGroup label="Corporate Index (CIN)" name="cin" value={pitchData.cin} onChange={e => setPitchData({...pitchData, cin: e.target.value})} placeholder="L123..." icon={Icons.FileText} required />
                  <InputGroup label="Core Directive (Elevator Pitch)" name="oneLinePitch" value={pitchData.oneLinePitch} onChange={e => setPitchData({...pitchData, oneLinePitch: e.target.value})} typeType="textarea" className="md:col-span-2" />
                </div>
              </Card>

              <Card title="Narrative Matrices" icon={Icons.MessageSquare}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputGroup label="Problem Vector" name="problem" value={pitchData.problem} onChange={e => setPitchData({...pitchData, problem: e.target.value})} typeType="textarea" />
                  <InputGroup label="Solution Architecture" name="solution" value={pitchData.solution} onChange={e => setPitchData({...pitchData, solution: e.target.value})} typeType="textarea" />
                  <InputGroup label="Market Topology (TAM)" name="targetMarket" value={pitchData.targetMarket} onChange={e => setPitchData({...pitchData, targetMarket: e.target.value})} typeType="textarea" />
                  <InputGroup label="Economic Engine" name="businessModel" value={pitchData.businessModel} onChange={e => setPitchData({...pitchData, businessModel: e.target.value})} typeType="textarea" />
                  <InputGroup label="Current Velocity" name="traction" value={pitchData.traction} onChange={e => setPitchData({...pitchData, traction: e.target.value})} typeType="textarea" />
                  <InputGroup label="Defensive Moat" name="uniqueValue" value={pitchData.uniqueValue} onChange={e => setPitchData({...pitchData, uniqueValue: e.target.value})} typeType="textarea" />
                </div>
              </Card>

              <Card title="Capital Allocation Logic" icon={Icons.DollarSign}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <InputGroup label="Funding Protocol" name="fundingStage" value={investmentData.fundingStage} onChange={e => setInvestmentData({...investmentData, fundingStage: e.target.value})} typeType="select" options={['Idea', 'Pre-Seed', 'Seed', 'Series A', 'Growth']} />
                  <InputGroup label="Capital Influx (₹)" name="amountRequired" type="number" value={investmentData.amountRequired} onChange={e => setInvestmentData({...investmentData, amountRequired: e.target.value})} icon={Icons.DollarSign} />
                  <InputGroup label="Valuation Index (₹)" name="valuationAsk" type="number" value={investmentData.valuationAsk} onChange={e => setInvestmentData({...investmentData, valuationAsk: e.target.value})} icon={Icons.Activity} required />
                  <InputGroup label="Equity Distribution (%)" name="equityOffered" type="number" value={investmentData.equityOffered} onChange={e => setInvestmentData({...investmentData, equityOffered: e.target.value})} />
                  <InputGroup label="Base Ticket (₹)" name="minimumInvestment" type="number" value={investmentData.minimumInvestment} onChange={e => setInvestmentData({...investmentData, minimumInvestment: e.target.value})} />
                  <InputGroup label="Deployment Strategy" name="useOfFunds" value={investmentData.useOfFunds} onChange={e => setInvestmentData({...investmentData, useOfFunds: e.target.value})} typeType="textarea" className="md:col-span-3" />
                </div>
              </Card>

              <Card title="Asset Vault" icon={Icons.UploadCloud}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                  <FileUploadZone onFileSelect={handleFileSelect} isUploading={isSaving} currentFile={mediaData.pitchDeck} accept=".pdf,.ppt,.pptx" label="Primary Collateral (Deck)" subLabel="PDF/PPTX limit 50MB. AES-256 Cloudinary Secure." />
                  <div className="space-y-6">
                    <InputGroup label="External Stream Link" name="pitchVideoUrl" value={mediaData.pitchVideoUrl} onChange={e => setMediaData({...mediaData, pitchVideoUrl: e.target.value})} placeholder="https://youtube.com/..." icon={Icons.Video} />
                    {mediaData.pitchDeckUrl && (
                      <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-900/20 text-emerald-500 rounded-lg"><Icons.FileText /></div>
                          <div><p className="text-sm font-semibold text-white">Active Deck Configured</p><p className="text-xs text-gray-500">{formatBytes(mediaData.pitchDeck?.bytes || 0)}</p></div>
                        </div>
                        <a href={mediaData.pitchDeckUrl} target="_blank" rel="noreferrer" className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"><Icons.Link/></a>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="animate-in fade-in duration-500">
              <CalendarGrid slots={availabilitySlots} onAddSlot={handleAddSlot} onRemoveSlot={handleRemoveSlot} />
            </div>
          )}

          {activeTab === 'dealflow' && (
            <div className="animate-in fade-in duration-500">
              <KanbanBoard />
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="animate-in fade-in duration-500">
              <WalletLedger />
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="h-[75vh] bg-[#0B0F19]/90 backdrop-blur-2xl border border-gray-800 rounded-3xl shadow-2xl flex overflow-hidden animate-in fade-in zoom-in-95 duration-500">
              <div className="w-80 border-r border-gray-800/80 flex flex-col bg-gray-950/40">
                <div className="p-6 border-b border-gray-800/80">
                  <h3 className="font-extrabold text-white tracking-wide flex items-center gap-2"><Icons.Activity width="18" height="18" className="text-blue-500"/> Active Channels</h3>
                  <div className="mt-4 relative">
                    <Icons.LayoutDashboard width="14" height="14" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" placeholder="Filter entities..." className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2 pl-9 pr-3 text-xs text-gray-200 focus:outline-none focus:border-blue-500 transition-colors" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                  {chatContacts.length === 0 ? (
                    <div className="text-center p-8 text-gray-600 text-sm flex flex-col items-center gap-3">
                      <Icons.MessageSquare width="32" height="32" className="opacity-20"/>
                      <p>Pipeline dormant.</p>
                    </div>
                  ) : chatContacts.map(contact => (
                    <button key={contact._id} onClick={() => setActiveChat(contact)} className={cx("w-full text-left p-4 rounded-2xl transition-all duration-300 border relative group", activeChat?._id === contact._id ? "bg-blue-900/10 border-blue-500/30 shadow-[0_0_20px_rgba(37,99,235,0.05)]" : "bg-transparent border-transparent hover:bg-gray-900/50")}>
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="relative">
                          <div className={cx("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner", activeChat?._id === contact._id ? "bg-gradient-to-tr from-blue-600 to-indigo-500" : "bg-gradient-to-tr from-gray-700 to-gray-600")}>{contact.name.charAt(0)}</div>
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0B0F19] rounded-full"></div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex justify-between items-center mb-1">
                            <h4 className="text-sm font-bold text-gray-200 truncate">{contact.name}</h4>
                            <span className="text-[9px] font-mono text-gray-500 uppercase">Live</span>
                          </div>
                          <p className="text-xs text-gray-500 truncate">{typingStatus[contact._id] ? <span className="text-blue-400 animate-pulse font-mono">Transmitting...</span> : contact.lastMessage || 'Channel established'}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 flex flex-col relative bg-[#060913]/40">
                {activeChat ? (
                  <>
                    <div className="p-5 border-b border-gray-800/80 bg-[#0B0F19]/90 backdrop-blur-md flex items-center justify-between z-10 shadow-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-900/20 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xl">{activeChat.name.charAt(0)}</div>
                        <div>
                          <h3 className="font-bold text-white text-lg flex items-center gap-2">{activeChat.name} <Icons.Shield width="14" height="14" className="text-blue-500"/></h3>
                          <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span> Verified Investor Entity</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 hover:bg-gray-800 hover:border-gray-700 flex items-center justify-center text-gray-400 transition-all"><Icons.Phone width="18" height="18"/></button>
                        <button className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 hover:bg-gray-800 hover:border-gray-700 flex items-center justify-center text-gray-400 transition-all"><Icons.Video width="18" height="18"/></button>
                        <div className="w-px h-6 bg-gray-800 mx-1"></div>
                        <button className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 hover:bg-gray-800 hover:border-gray-700 flex items-center justify-center text-gray-400 transition-all"><Icons.MoreVertical width="18" height="18"/></button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                      <div className="text-center my-6"><span className="bg-gray-900/60 border border-gray-800 text-gray-500 text-[10px] font-mono uppercase tracking-widest px-4 py-1.5 rounded-full">E2E Encryption Initiated</span></div>
                      {(messages[activeChat._id] || []).map((msg, i) => {
                        const isMe = msg.senderId === 'me';
                        return (
                          <div key={i} className={cx("flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300", isMe ? 'items-end' : 'items-start')}>
                            <div className="flex items-end gap-2 max-w-[75%]">
                              {!isMe && <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 text-xs font-bold shrink-0 mb-5">{activeChat.name.charAt(0)}</div>}
                              <div className={cx("relative group rounded-2xl px-5 py-3.5", isMe ? "bg-blue-600 text-white rounded-br-sm shadow-[0_8px_25px_rgba(37,99,235,0.25)]" : "bg-gray-800 text-gray-200 rounded-bl-sm border border-gray-700 shadow-lg")}>
                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                <div className={cx("absolute -bottom-5 text-[9px] font-mono whitespace-nowrap", isMe ? "right-1 text-gray-500" : "left-1 text-gray-500")}>
                                  {formatTime(msg.timestamp)} {isMe && <Icons.CheckCircle width="10" height="10" className="inline ml-1 text-blue-400"/>}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {typingStatus[activeChat._id] && (
                        <div className="flex justify-start items-end gap-2 animate-in fade-in duration-200">
                          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 text-xs font-bold shrink-0">{activeChat.name.charAt(0)}</div>
                          <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-5 py-4 border border-gray-700 flex gap-1.5 shadow-lg">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}></span>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} className="h-4" />
                    </div>
                    <div className="p-6 bg-[#0B0F19]/95 backdrop-blur-xl border-t border-gray-800/80">
                      <form onSubmit={handleSendMessage} className="relative flex items-center gap-3">
                        <button type="button" className="w-12 h-12 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors shrink-0"><Icons.Paperclip width="20" height="20"/></button>
                        <div className="relative flex-1">
                          <input type="text" value={messageInput} onChange={handleTyping} placeholder="Transmit encrypted payload..." className="w-full bg-[#060913] border border-gray-700 rounded-full pl-6 pr-14 py-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner" />
                          <button type="submit" disabled={!messageInput.trim()} className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square rounded-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 flex items-center justify-center text-white transition-all shadow-lg shadow-blue-500/20"><Icons.Send width="18" height="18" className={messageInput.trim() ? "translate-x-0.5 -translate-y-0.5" : ""}/></button>
                        </div>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                    <div className="relative mb-8">
                      <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-700 animate-[spin_10s_linear_infinite]"></div>
                      <div className="absolute inset-0 flex items-center justify-center"><Icons.Shield width="32" height="32" className="text-gray-700"/></div>
                    </div>
                    <h3 className="font-bold text-xl text-white mb-2">Encrypted Terminal Ready</h3>
                    <p className="text-sm opacity-60 font-mono text-center max-w-sm">Select an active entity channel to initiate secure peer-to-peer websocket transmission.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
      `}} />
    </div>
  );
}