import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  Calendar,
  MessageSquare,
  FileText,
  X,
  Send,
  Paperclip,
  CreditCard,
  Video,
  BrainCircuit,
  ChevronRight,
  Clock,
  Search,
  Building2,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const TRANSACTION_LIMIT = 5;

const emptyTransactionPagination = {
  page: 1,
  limit: TRANSACTION_LIMIT,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false
};

const toPositiveNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

const normalizePaymentTransactions = ({ data, requestedPage, requestedLimit }) => {
  const payload = data?.data && typeof data.data === 'object' ? data.data : data;

  const transactions =
    payload?.transactions ||
    payload?.paymentTransactions ||
    payload?.docs ||
    payload?.results ||
    [];

  const wallet = payload?.wallet || data?.wallet || null;
  const paginationSource = payload?.pagination || data?.pagination || {};

  const total = toPositiveNumber(
    paginationSource.total ??
      paginationSource.totalTransactions ??
      paginationSource.totalDocs ??
      payload?.total ??
      data?.total ??
      transactions.length,
    transactions.length
  );

  const limit = toPositiveNumber(
    paginationSource.limit ?? paginationSource.perPage ?? requestedLimit,
    requestedLimit
  );

  const totalPages = Math.max(
    1,
    toPositiveNumber(
      paginationSource.totalPages ?? Math.ceil(total / limit),
      Math.ceil(total / limit) || 1
    )
  );

  const page = Math.min(
    Math.max(
      1,
      toPositiveNumber(
        paginationSource.page ?? paginationSource.currentPage ?? requestedPage,
        requestedPage
      )
    ),
    totalPages
  );

  return {
    transactions,
    wallet,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage:
        paginationSource.hasNextPage ?? paginationSource.hasNext ?? page < totalPages,
      hasPrevPage:
        paginationSource.hasPrevPage ?? paginationSource.hasPrev ?? page > 1
    }
  };
};

let socket;

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existingScript) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
};

const getLoggedInUserId = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1])).id;
  } catch {
    return null;
  }
};

export default function InvestorDashboard() {
  const [activeView, setActiveView] = useState('discovery');

  const [startups, setStartups] = useState([]);
  const [conversations, setConversations] = useState([]);
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

  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionLimit] = useState(TRANSACTION_LIMIT);
  const [transactionPagination, setTransactionPagination] = useState(
    emptyTransactionPagination
  );
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [walletAmount, setWalletAmount] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('');

  const token = localStorage.getItem('token');
  const loggedInUserId = getLoggedInUserId(token);

  useEffect(() => {
    if (!token) return;

    socket = io(SERVER_URL, {
      auth: { token },
      transports: ['websocket']
    });

    socket.on('new_message', (msg) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m._id === msg._id);
        if (exists) return prev;
        return [...prev, msg];
      });
      scrollToBottom();
    });

    socket.on('matrix_update', (data) => {
      if (data.type === 'METRIC_SYNC') {
        setStartups((prevStartups) =>
          prevStartups.map((startup) =>
            startup._id === data.startupId
              ? {
                  ...startup,
                  valuationAsk: data.valuationAsk,
                  investmentDetails: {
                    ...startup.investmentDetails,
                    ...data.financials
                  }
                }
              : startup
          )
        );

        setSelectedStartup((prevSelected) => {
          if (prevSelected && prevSelected._id === data.startupId) {
            return {
              ...prevSelected,
              valuationAsk: data.valuationAsk,
              investmentDetails: {
                ...prevSelected.investmentDetails,
                ...data.financials
              }
            };
          }
          return prevSelected;
        });
      }
    });

    fetchStartups();
    fetchMeetings();
    fetchConversations();
    fetchPaymentTransactions();

    return () => socket.disconnect();
  }, [token]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const fetchStartups = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${SERVER_URL}/api/startups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setStartups(data.startups);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetings = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/v1/meetings/upcoming`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setUpcomingMeetings(data.meetings);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/v1/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setConversations(data.conversations);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPaymentTransactions = async (page = 1) => {
    const safePage = Math.max(1, Number(page) || 1);

    try {
      setTransactionsLoading(true);

      const params = new URLSearchParams({
        page: String(safePage),
        limit: String(transactionLimit)
      });

      const res = await fetch(
        `${SERVER_URL}/api/v1/payments/my-transactions?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.message || 'Failed to fetch payment transactions.');
      }

      const normalized = normalizePaymentTransactions({
        data,
        requestedPage: safePage,
        requestedLimit: transactionLimit
      });

      setTransactions(normalized.transactions);
      setWalletBalance(Number(normalized.wallet?.balance || 0));
      setTransactionPagination(normalized.pagination);
      setTransactionPage(normalized.pagination.page);
    } catch (err) {
      console.error('Fetch payment transactions error:', err);
      setTransactions([]);
      setTransactionPagination(emptyTransactionPagination);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const goToPaymentPage = (page) => {
    if (transactionsLoading) return;

    const totalPages = transactionPagination.totalPages || 1;
    const nextPage = Math.min(Math.max(1, Number(page) || 1), totalPages);

    if (nextPage === transactionPage) return;
    fetchPaymentTransactions(nextPage);
  };

  const goToPreviousPaymentPage = () => {
    if (!transactionPagination.hasPrevPage) return;
    goToPaymentPage(transactionPage - 1);
  };

  const goToNextPaymentPage = () => {
    if (!transactionPagination.hasNextPage) return;
    goToPaymentPage(transactionPage + 1);
  };

  const handleWalletDeposit = async () => {
    try {
      const amount = Number(walletAmount);

      if (!amount || amount < 1) {
        alert('Please enter a valid amount.');
        return;
      }

      setPaymentLoading(true);
      setPaymentStatus('');

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        alert('Razorpay checkout failed to load. Please check your internet connection.');
        setPaymentLoading(false);
        return;
      }

      const orderRes = await fetch(`${SERVER_URL}/api/v1/payments/create-order`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          notes: {
            purpose: 'wallet_deposit'
          }
        })
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.message || 'Failed to create Razorpay order.');
      }

      const order = orderData.data;
      console.log('CREATE ORDER RESPONSE:', order);

      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: 'VenRoh Hub',
        description: 'Wallet Deposit',
        order_id: order.orderId,

        handler: async function (response) {
          try {
            setPaymentLoading(true);

            const verifyBody = {
  transactionId: order.transactionId,
  razorpay_order_id: response.razorpay_order_id,
  razorpay_payment_id: response.razorpay_payment_id,
  razorpay_signature: response.razorpay_signature
};

console.log('VERIFY PAYMENT BODY:', verifyBody);

const verifyRes = await fetch(`${SERVER_URL}/api/v1/payments/verify`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(verifyBody)
});

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.message || 'Payment verification failed.');
            }

            const verifiedPayload =
              verifyData?.data && typeof verifyData.data === 'object'
                ? verifyData.data
                : verifyData;

            setWalletAmount('');
            setPaymentStatus('Payment verified successfully. Wallet credited.');
            setWalletBalance(
              Number(verifiedPayload.wallet?.balance ?? walletBalance + amount)
            );
            fetchPaymentTransactions(1);

            alert('Payment successful. Wallet credited.');
          } catch (error) {
            console.error('Payment verification error:', error);
            setPaymentStatus(error.message || 'Payment verification failed.');
            alert(error.message || 'Payment verification failed.');
          } finally {
            setPaymentLoading(false);
          }
        },

        theme: {
          color: '#0B0F19'
        }
      };

      const razorpayInstance = new window.Razorpay(options);

      razorpayInstance.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error);
        setPaymentStatus(response.error.description || 'Payment failed.');
        alert(response.error.description || 'Payment failed.');
      });

      razorpayInstance.open();
    } catch (error) {
      console.error('Wallet deposit error:', error);
      setPaymentStatus(error.message || 'Something went wrong while starting payment.');
      alert(error.message || 'Something went wrong while starting payment.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSummarizePitch = async () => {
    if (!selectedStartup || !selectedStartup.pitchDeckUrl) {
      alert('This startup has not uploaded a pitch deck yet.');
      return;
    }

    setIsSummarizing(true);
    setSummary('');

    try {
      const res = await fetch(`${SERVER_URL}/api/startups/${selectedStartup._id}/summarize`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (data.success) {
        setSummary(data.summary);
      } else {
        alert(data.message || 'Failed to generate summary.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while summarizing pitch deck.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const openChatWithFounder = async (startupId) => {
    try {
      const res = await fetch(`${SERVER_URL}/api/v1/chat/startups/${startupId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (data.success) {
        setActiveConversation(data.conversation);
        socket?.emit('join_conversation', { conversationId: data.conversation._id });

        const msgRes = await fetch(
          `${SERVER_URL}/api/v1/chat/conversations/${data.conversation._id}/messages`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        const msgData = await msgRes.json();

        if (msgData.success) {
          setMessages(msgData.messages);
          scrollToBottom();
        }

        setChatOpen(true);
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
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
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startupId: selectedStartup._id,
          slotId
        })
      });

      const data = await res.json();

      if (data.success) {
        alert('Meeting Booked Successfully! Check your calendar.');
        fetchMeetings();

        setSelectedStartup((prev) => ({
          ...prev,
          availabilitySlots: prev.availabilitySlots.filter((s) => s._id !== slotId)
        }));
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const submitCustomTimeRequest = async () => {
    if (!customDateTime) return;

    try {
      const res = await fetch(`${SERVER_URL}/api/v1/meetings/request`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startupId: selectedStartup._id,
          scheduledAt: new Date(customDateTime)
        })
      });

      const data = await res.json();

      if (data.success) {
        alert('Meeting request sent to founder!');
        setCustomTimeModalOpen(false);
        setCustomDateTime('');
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getHeaderTitle = () => {
    if (activeView === 'discovery') return 'Live Opportunities';
    if (activeView === 'chats') return 'Messages';
    return 'Wallet & Payments';
  };

  const getHeaderSubtitle = () => {
    if (activeView === 'discovery') return 'Discover, evaluate, and connect with verified startups.';
    if (activeView === 'chats') return 'Manage your founder-investor conversations in one secure inbox.';
    return 'Add money to your wallet using Razorpay test mode and track your payment history.';
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex">
      <aside className="w-64 bg-white border-r border-gray-200 p-6 flex-col hidden md:flex">
        <h1 className="text-2xl font-bold text-[#0B0F19] mb-6">
          VenRoh Hub
        </h1>

        <div className="bg-[#0B0F19] text-white rounded-2xl p-5 mb-6 shadow-lg">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
            Wallet Balance
          </p>

          <h2 className="text-2xl font-extrabold mt-2">
            ₹{Number(walletBalance || 0).toLocaleString()}
          </h2>

          <button
            onClick={() => {
              setActiveView('wallet');
              fetchPaymentTransactions(1);
            }}
            className="mt-4 w-full bg-white text-[#0B0F19] py-2 rounded-xl text-sm font-bold hover:bg-gray-100 transition flex items-center justify-center gap-2"
          >
            <CreditCard size={16} />
            Add Money
          </button>
        </div>

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
              upcomingMeetings.map((meet) => (
                <div
                  key={meet._id}
                  className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition"
                >
                  <p className="text-sm font-bold text-gray-900">
                    {meet.startupId?.companyName || 'Founder Meeting'}
                  </p>

                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1 font-medium">
                    <Clock size={12} />
                    {new Date(meet.scheduledAt).toLocaleDateString()}
                  </p>

                  <a
                    href={meet.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 flex justify-center items-center gap-2 text-xs font-semibold bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition"
                  >
                    <Video size={14} /> Join Room
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
              {activeView === 'wallet' ? (
                <CreditCard size={24} className="text-white" />
              ) : (
                <MessageSquare size={24} className="text-white" />
              )}
            </div>

            <h2 className="text-3xl font-bold">{getHeaderTitle()}</h2>

            <p className="text-gray-400 mt-2 text-sm">
              {getHeaderSubtitle()}
            </p>
          </div>

          <div className="flex bg-white/10 p-1 rounded-xl">
            <button
              onClick={() => {
                setActiveView('discovery');
                fetchStartups();
              }}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeView === 'discovery'
                  ? 'bg-white text-[#0B0F19] shadow-md'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Discovery Board
            </button>

            <button
              onClick={() => {
                setActiveView('chats');
                fetchConversations();
              }}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
                activeView === 'chats'
                  ? 'bg-white text-[#0B0F19] shadow-md'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              My Chats
            </button>

            <button
              onClick={() => {
                setActiveView('wallet');
                fetchPaymentTransactions(1);
              }}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                activeView === 'wallet'
                  ? 'bg-white text-[#0B0F19] shadow-md'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <CreditCard size={16} />
              Wallet
            </button>
          </div>
        </div>

        {activeView === 'wallet' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <div className="bg-[#0B0F19] text-white rounded-2xl p-6 mb-6">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                  Available Wallet Balance
                </p>

                <h2 className="text-4xl font-extrabold mt-3">
                  ₹{Number(walletBalance || 0).toLocaleString()}
                </h2>

                <p className="text-xs text-gray-400 mt-3">
                  This balance is credited after successful Razorpay verification.
                </p>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Add Money to Wallet
              </h3>

              <p className="text-sm text-gray-500 mb-5">
                Enter test amount and pay through Razorpay checkout.
              </p>

              <label className="block text-sm font-bold text-gray-700 mb-2">
                Amount in ₹
              </label>

              <input
                type="number"
                min="1"
                value={walletAmount}
                onChange={(e) => setWalletAmount(e.target.value)}
                placeholder="Example: 100"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />

              <button
                onClick={handleWalletDeposit}
                disabled={paymentLoading}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-blue-600/20 transition"
              >
                <CreditCard size={20} />
                {paymentLoading ? 'Processing...' : 'Pay with Razorpay'}
              </button>

              {paymentStatus && (
                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4 flex gap-3">
                  {paymentStatus.toLowerCase().includes('success') ? (
                    <CheckCircle2 size={18} className="text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle size={18} className="text-red-500 mt-0.5" />
                  )}

                  <p className="text-sm text-gray-700 font-medium">
                    {paymentStatus}
                  </p>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Payment Transactions
                  </h3>

                  <p className="text-sm text-gray-500">
                    {transactionPagination.total || 0} total transactions · Page{' '}
                    {transactionPagination.page || 1} of{' '}
                    {transactionPagination.totalPages || 1}
                  </p>
                </div>

                <button
                  onClick={() => fetchPaymentTransactions(transactionPage)}
                  disabled={transactionsLoading}
                  className="bg-gray-50 hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition"
                >
                  <RefreshCw
                    size={15}
                    className={transactionsLoading ? 'animate-spin' : ''}
                  />
                  {transactionsLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              <div className="divide-y divide-gray-100">
                {transactionsLoading ? (
                  <div className="p-10 text-center">
                    <RefreshCw
                      size={34}
                      className="mx-auto text-gray-300 mb-3 animate-spin"
                    />
                    <p className="text-sm text-gray-500 font-medium">
                      Loading payment transactions...
                    </p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="p-10 text-center">
                    <CreditCard size={36} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500 font-medium">
                      No payment transactions yet.
                    </p>
                  </div>
                ) : (
                  transactions.map((transaction) => (
                    <div
                      key={transaction._id}
                      className="p-5 flex justify-between items-center hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                            transaction.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-600'
                              : transaction.status === 'failed'
                              ? 'bg-red-50 text-red-500'
                              : 'bg-yellow-50 text-yellow-600'
                          }`}
                        >
                          <CreditCard size={20} />
                        </div>

                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            ₹{Number(transaction.amount || 0).toLocaleString()} Wallet Deposit
                          </p>

                          <p className="text-xs text-gray-500 mt-1">
                            Order ID: {transaction.razorpayOrderId || 'Not available'}
                          </p>

                          <p className="text-xs text-gray-400 mt-1">
                            {transaction.timestamp
                              ? new Date(transaction.timestamp).toLocaleString()
                              : transaction.createdAt
                              ? new Date(transaction.createdAt).toLocaleString()
                              : 'Date not available'}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          transaction.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : transaction.status === 'failed'
                            ? 'bg-red-50 text-red-500 border-red-200'
                            : 'bg-yellow-50 text-yellow-600 border-yellow-200'
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {transactionPagination.totalPages > 1 && (
                <div className="p-5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <p className="text-sm text-gray-500 font-medium">
                    Showing page {transactionPagination.page || 1} of{' '}
                    {transactionPagination.totalPages || 1} ·{' '}
                    {transactionPagination.total || 0} total transactions
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={goToPreviousPaymentPage}
                      disabled={
                        !transactionPagination.hasPrevPage || transactionsLoading
                      }
                      className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Previous
                    </button>

                    <span className="px-4 py-2 rounded-xl bg-[#0B0F19] text-white text-sm font-bold">
                      {transactionPagination.page || 1}
                    </span>

                    <button
                      onClick={goToNextPaymentPage}
                      disabled={
                        !transactionPagination.hasNextPage || transactionsLoading
                      }
                      className="px-4 py-2 rounded-xl border border-gray-900 bg-[#0B0F19] text-sm font-bold text-white hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:opacity-70 disabled:cursor-not-allowed transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'chats' && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Conversation Inbox
                </h3>

                <p className="text-sm text-gray-500">
                  {conversations.length} conversations
                </p>
              </div>

              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
                  placeholder="Search startup or user..."
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-64"
                />
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {conversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No active conversations yet.
                </div>
              ) : (
                conversations.map((chat) => {
                  const founder = chat.participants.find((p) => p.role === 'founder');

                  return (
                    <div
                      key={chat._id}
                      onClick={() => openChatWithFounder(chat.startupId?._id)}
                      className="p-6 hover:bg-gray-50 cursor-pointer transition flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#0B0F19] rounded-xl flex items-center justify-center shadow-md">
                          <Building2 size={20} className="text-white" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition">
                              {chat.startupId?.companyName || 'Unknown Startup'}
                            </h4>

                            {chat.startupId?.isLive && (
                              <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                                Live
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-gray-500 mt-0.5">
                            With:{' '}
                            <span className="font-medium text-gray-700">
                              {founder?.name || 'Founder'}
                            </span>
                          </p>

                          <p className="text-xs text-gray-400 mt-1.5 truncate max-w-sm">
                            {chat.lastMessageText || 'No messages yet. Open conversation to start.'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Last Updated
                        </p>

                        <p className="text-xs text-gray-600 font-medium mt-1">
                          {new Date(chat.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeView === 'discovery' &&
          (loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {startups.map((startup) => (
                <div
                  key={startup._id}
                  onClick={() => {
                    setSelectedStartup(startup);
                    setSummary('');
                  }}
                  className="bg-white border border-gray-200 rounded-2xl p-6 cursor-pointer hover:border-blue-400 hover:shadow-xl hover:-translate-y-1 transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition">
                        {startup.companyName}
                      </h3>

                      <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mt-1">
                        {startup.investmentDetails?.fundingStage || 'Early Stage'}
                      </p>
                    </div>

                    {startup.mcaStatus === 'Verified' && (
                      <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                        MCA Verified
                      </span>
                    )}
                  </div>

                  <p className="text-gray-600 text-sm line-clamp-3 mb-6 leading-relaxed">
                    {startup.pitch?.oneLinePitch ||
                      'A revolutionary idea disrupting the market. Click to view full pitch details.'}
                  </p>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Asking</p>

                      <p className="text-sm font-bold text-gray-900">
                        ₹{(startup.investmentDetails?.amountRequired || 0).toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 font-medium">Valuation</p>

                      <p className="text-sm font-bold text-gray-900">
                        ₹{(startup.valuationAsk || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 p-2 rounded-full group-hover:bg-blue-600 group-hover:border-blue-600 transition">
                      <ChevronRight size={16} className="text-gray-400 group-hover:text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
      </main>

      {selectedStartup && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex justify-end">
          <div className="w-full max-w-3xl bg-white h-full border-l border-gray-200 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 bg-white/95 backdrop-blur z-10 border-b border-gray-100 p-6 flex justify-between items-center shadow-sm">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedStartup.companyName}
                </h2>

                <p className="text-sm text-gray-500 font-medium mt-1">
                  CIN: {selectedStartup.cin}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => openChatWithFounder(selectedStartup._id)}
                  className="bg-[#0B0F19] hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold transition shadow-md"
                >
                  <MessageSquare size={16} /> Chat Founder
                </button>

                <button
                  onClick={() => setSelectedStartup(null)}
                  className="p-2.5 bg-gray-100 rounded-xl hover:bg-red-50 hover:text-red-500 text-gray-600 transition"
                >
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
                    <p className="text-gray-500 font-medium">
                      No pitch deck uploaded yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-10">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Calendar className="text-gray-400" /> Schedule a Pitch Meeting
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {selectedStartup.availabilitySlots?.filter((s) => s.status === 'available').length > 0 ? (
                    selectedStartup.availabilitySlots
                      .filter((s) => s.status === 'available')
                      .map((slot) => (
                        <button
                          key={slot._id}
                          onClick={() => bookSlot(slot._id)}
                          className="bg-white border border-gray-200 p-5 rounded-xl hover:border-blue-500 hover:shadow-md transition text-left group"
                        >
                          <p className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition">
                            Available Slot
                          </p>

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
                  <h3 className="text-xl font-extrabold text-emerald-700 mb-2">
                    Interested in this Startup?
                  </h3>

                  <p className="text-sm text-emerald-600/80 font-medium mb-6">
                    Add money to your wallet first. Direct investment and escrow logic can be added after wallet deposit is working.
                  </p>

                  <button
                    onClick={() => {
                      setSelectedStartup(null);
                      setActiveView('wallet');
                      fetchPaymentTransactions(1);
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
                  >
                    <CreditCard size={20} /> Add Money to Wallet
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
              <h3 className="text-xl font-bold text-gray-900">
                Request Custom Time
              </h3>

              <button
                onClick={() => setCustomTimeModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Select Date and Time
              </label>

              <input
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />

              <p className="text-xs text-gray-500 font-medium mt-3">
                The founder will be notified of your requested time.
              </p>
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
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Online
              </p>
            </div>

            <button
              onClick={() => setChatOpen(false)}
              className="text-gray-400 hover:text-white bg-white/10 p-1.5 rounded-lg transition"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 h-96 overflow-y-auto p-5 space-y-4 bg-gray-50">
            {messages.map((msg, idx) => {
              const isMine = msg.senderId?._id === loggedInUserId;

              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm ${
                      isMine
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                    }`}
                  >
                    {msg.text}

                    {msg.attachments?.length > 0 && (
                      <a
                        href={msg.attachments[0].url}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex items-center gap-2 mt-2 text-xs p-2 rounded-lg transition ${
                          isMine
                            ? 'bg-black/20 hover:bg-black/30 text-white'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <FileText size={14} /> View Attachment
                      </a>
                    )}
                  </div>

                  <span className="text-[10px] font-medium text-gray-400 mt-1.5">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              );
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
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
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