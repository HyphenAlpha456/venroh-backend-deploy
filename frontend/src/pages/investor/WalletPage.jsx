import { useEffect, useMemo, useState } from 'react';

import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getMyPaymentTransactions
} from '../../services/paymentService';

import { loadRazorpayScript } from '../../utils/loadRazorpay';

const TRANSACTION_LIMIT = 5;

const emptyPagination = {
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

const normalizeTransactionsResponse = (res, requestedPage = 1) => {
  const data = res?.data && typeof res.data === 'object' ? res.data : res;

  const transactions =
    data?.transactions ||
    data?.paymentTransactions ||
    data?.docs ||
    data?.results ||
    [];

  const wallet = data?.wallet || res?.wallet || null;
  const paginationSource = data?.pagination || res?.pagination || {};

  const total = toPositiveNumber(
    paginationSource.total ??
      paginationSource.totalTransactions ??
      paginationSource.totalDocs ??
      data?.total ??
      res?.total ??
      transactions.length,
    transactions.length
  );

  const limit = toPositiveNumber(
    paginationSource.limit ?? paginationSource.perPage ?? TRANSACTION_LIMIT,
    TRANSACTION_LIMIT
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
        paginationSource.hasNextPage ??
        paginationSource.hasNext ??
        page < totalPages,
      hasPrevPage:
        paginationSource.hasPrevPage ??
        paginationSource.hasPrev ??
        page > 1
    }
  };
};

function WalletPage() {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  const [walletBalance, setWalletBalance] = useState(0);

  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionPagination, setTransactionPagination] =
    useState(emptyPagination);

  const pageNumbers = useMemo(() => {
    const totalPages = transactionPagination.totalPages || 1;
    const currentPage = transactionPagination.page || transactionPage || 1;
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [transactionPagination, transactionPage]);

  const fetchTransactions = async (page = 1) => {
    try {
      const safePage = Math.max(1, Number(page) || 1);

      setTransactionsLoading(true);

      const res = await getMyPaymentTransactions({
        page: safePage,
        limit: TRANSACTION_LIMIT
      });

      console.log('TRANSACTION API RESPONSE:', res);

      const normalized = normalizeTransactionsResponse(res, safePage);

      setTransactions(normalized.transactions);
      setWalletBalance(Number(normalized.wallet?.balance || 0));
      setTransactionPagination(normalized.pagination);
      setTransactionPage(normalized.pagination.page);
    } catch (error) {
      console.error('Fetch transactions error:', error);

      alert(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to load transactions'
      );
    } finally {
      setTransactionsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(1);
  }, []);

  const handlePayment = async () => {
    try {
      const paymentAmount = Number(amount);

      if (!paymentAmount || paymentAmount < 1) {
        alert('Please enter a valid amount');
        return;
      }

      setLoading(true);

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        alert('Razorpay SDK failed to load. Check your internet connection.');
        setLoading(false);
        return;
      }

      const orderRes = await createRazorpayOrder({
        amount: paymentAmount
      });

      const order = orderRes.data || orderRes;

      console.log('CREATE ORDER RESPONSE:', order);

      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: 'Venroh',
        description: 'Wallet Deposit',
        order_id: order.orderId,

        handler: async function (response) {
          try {
            setLoading(true);

            const paymentData = {
              transactionId: order.transactionId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            };

            console.log('VERIFY PAYMENT BODY:', paymentData);

            const verifyRes = await verifyRazorpayPayment({
              paymentData
            });

            const verifyData = verifyRes.data || verifyRes;

            alert(verifyRes.message || verifyData.message || 'Payment successful');

            setAmount('');
            setWalletBalance(Number(verifyData.wallet?.balance || 0));

            fetchTransactions(1);
          } catch (error) {
            console.error('Payment verification error:', error);

            alert(
              error?.response?.data?.message ||
                error?.message ||
                'Payment verification failed'
            );
          } finally {
            setLoading(false);
          }
        },

        theme: {
          color: '#2563eb'
        }
      };

      const razorpayInstance = new window.Razorpay(options);

      razorpayInstance.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error);
        alert(response.error.description || 'Payment failed');
      });

      razorpayInstance.open();
    } catch (error) {
      console.error('Payment error:', error);

      alert(
        error?.response?.data?.message ||
          error?.message ||
          'Something went wrong while starting payment'
      );
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (page) => {
    if (transactionsLoading) return;

    const totalPages = transactionPagination.totalPages || 1;
    const nextPage = Math.min(Math.max(1, Number(page) || 1), totalPages);

    if (nextPage === transactionPage) return;
    fetchTransactions(nextPage);
  };

  const goToPreviousPage = () => {
    if (!transactionPagination.hasPrevPage) return;
    goToPage(transactionPage - 1);
  };

  const goToNextPage = () => {
    if (!transactionPagination.hasNextPage) return;
    goToPage(transactionPage + 1);
  };

  return (
    <div style={{ padding: '30px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '10px' }}>Wallet Payment</h1>

      <div
        style={{
          marginTop: '20px',
          padding: '20px',
          border: '1px solid #ddd',
          borderRadius: '12px',
          background: '#ffffff'
        }}
      >
        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
          Available Wallet Balance
        </p>

        <h2 style={{ marginTop: '8px', marginBottom: '20px' }}>
          ₹{Number(walletBalance || 0).toLocaleString()}
        </h2>

        <h3>Add Money to Wallet</h3>

        <input
          type="number"
          min="1"
          placeholder="Enter amount in ₹"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            marginTop: '12px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxSizing: 'border-box'
          }}
        />

        <button
          onClick={handlePayment}
          disabled={loading}
          style={{
            marginTop: '15px',
            padding: '12px 20px',
            background: loading ? '#93c5fd' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '600'
          }}
        >
          {loading ? 'Processing...' : 'Pay with Razorpay'}
        </button>
      </div>

      <div
        style={{
          marginTop: '30px',
          padding: '20px',
          border: '1px solid #ddd',
          borderRadius: '12px',
          background: '#ffffff'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '15px'
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>My Transactions</h2>

            <p style={{ marginTop: '6px', color: '#666', fontSize: '14px' }}>
              {transactionPagination.total || 0} total transactions
            </p>
          </div>

          <button
            onClick={() => fetchTransactions(transactionPage)}
            disabled={transactionsLoading}
            style={{
              padding: '10px 14px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              background: '#f9fafb',
              cursor: transactionsLoading ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
          >
            {transactionsLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {transactionsLoading ? (
          <p style={{ marginTop: '20px' }}>Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p style={{ marginTop: '20px' }}>No transactions found.</p>
        ) : (
          <div style={{ marginTop: '20px' }}>
            {transactions.map((transaction) => (
              <div
                key={transaction._id || transaction.id}
                style={{
                  padding: '15px',
                  marginTop: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '10px',
                  background: '#fafafa'
                }}
              >
                <p>
                  <strong>Amount:</strong> ₹
                  {Number(transaction.amount || 0).toLocaleString()}
                </p>

                <p>
                  <strong>Status:</strong>{' '}
                  <span
                    style={{
                      color:
                        transaction.status === 'completed'
                          ? '#059669'
                          : transaction.status === 'failed'
                          ? '#dc2626'
                          : '#ca8a04',
                      fontWeight: '700'
                    }}
                  >
                    {transaction.status}
                  </span>
                </p>

                <p>
                  <strong>Type:</strong> {transaction.type}
                </p>

                <p>
                  <strong>Order ID:</strong>{' '}
                  {transaction.razorpayOrderId || 'Not available'}
                </p>

                {transaction.razorpayPaymentId && (
                  <p>
                    <strong>Payment ID:</strong>{' '}
                    {transaction.razorpayPaymentId}
                  </p>
                )}

                <p>
                  <strong>Date:</strong>{' '}
                  {transaction.timestamp
                    ? new Date(transaction.timestamp).toLocaleString()
                    : transaction.createdAt
                    ? new Date(transaction.createdAt).toLocaleString()
                    : 'Not available'}
                </p>
              </div>
            ))}
          </div>
        )}

        {transactionPagination.totalPages > 1 && (
          <div
            style={{
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '15px',
              flexWrap: 'wrap'
            }}
          >
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              Page {transactionPagination.page} of{' '}
              {transactionPagination.totalPages} ·{' '}
              {transactionPagination.total} total transactions
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                disabled={!transactionPagination.hasPrevPage || transactionsLoading}
                onClick={goToPreviousPage}
                style={{
                  padding: '10px 14px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  background:
                    transactionPagination.hasPrevPage && !transactionsLoading
                      ? '#ffffff'
                      : '#f3f4f6',
                  cursor:
                    transactionPagination.hasPrevPage && !transactionsLoading
                      ? 'pointer'
                      : 'not-allowed',
                  opacity:
                    transactionPagination.hasPrevPage && !transactionsLoading
                      ? 1
                      : 0.5,
                  fontWeight: '600'
                }}
              >
                Previous
              </button>

              {pageNumbers.map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  disabled={transactionsLoading || page === transactionPagination.page}
                  style={{
                    padding: '10px 14px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    background:
                      page === transactionPagination.page ? '#2563eb' : '#ffffff',
                    color: page === transactionPagination.page ? '#ffffff' : '#111827',
                    cursor:
                      transactionsLoading || page === transactionPagination.page
                        ? 'not-allowed'
                        : 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {page}
                </button>
              ))}

              <button
                disabled={!transactionPagination.hasNextPage || transactionsLoading}
                onClick={goToNextPage}
                style={{
                  padding: '10px 14px',
                  border: '1px solid #111827',
                  borderRadius: '8px',
                  background:
                    transactionPagination.hasNextPage && !transactionsLoading
                      ? '#111827'
                      : '#f3f4f6',
                  color:
                    transactionPagination.hasNextPage && !transactionsLoading
                      ? '#ffffff'
                      : '#666',
                  cursor:
                    transactionPagination.hasNextPage && !transactionsLoading
                      ? 'pointer'
                      : 'not-allowed',
                  opacity:
                    transactionPagination.hasNextPage && !transactionsLoading
                      ? 1
                      : 0.5,
                  fontWeight: '600'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WalletPage;
