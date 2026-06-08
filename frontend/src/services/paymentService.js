import api from './api';

const DEFAULT_TRANSACTION_PAGE = 1;
const DEFAULT_TRANSACTION_LIMIT = 5;

const toPositiveNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

const normalizePaymentTransactionResponse = ({ payload, page, limit }) => {
  const data = payload?.data && typeof payload.data === 'object' ? payload.data : payload;

  const transactions =
    data?.transactions ||
    data?.paymentTransactions ||
    data?.docs ||
    data?.results ||
    [];

  const wallet = data?.wallet || payload?.wallet || null;

  const paginationSource = data?.pagination || payload?.pagination || {};

  const total = toPositiveNumber(
    paginationSource.total ??
      paginationSource.totalTransactions ??
      paginationSource.totalDocs ??
      data?.total ??
      payload?.total ??
      transactions.length,
    transactions.length
  );

  const normalizedLimit = toPositiveNumber(
    paginationSource.limit ?? paginationSource.perPage ?? paginationSource.pageSize ?? limit,
    limit
  );

  const totalPages = Math.max(
    1,
    toPositiveNumber(
      paginationSource.totalPages ?? Math.ceil(total / normalizedLimit),
      Math.ceil(total / normalizedLimit) || 1
    )
  );

  const normalizedPage = Math.min(
    Math.max(
      1,
      toPositiveNumber(
        paginationSource.page ?? paginationSource.currentPage ?? page,
        page
      )
    ),
    totalPages
  );

  const pagination = {
    page: normalizedPage,
    limit: normalizedLimit,
    total,
    totalPages,
    hasNextPage:
      paginationSource.hasNextPage ??
      paginationSource.hasNext ??
      normalizedPage < totalPages,
    hasPrevPage:
      paginationSource.hasPrevPage ??
      paginationSource.hasPrev ??
      normalizedPage > 1
  };

  return {
    ...payload,
    data,
    transactions,
    wallet,
    pagination
  };
};

export const createRazorpayOrder = async ({ amount }) => {
  const response = await api.post('/v1/payments/create-order', { amount });
  return response.data;
};

export const verifyRazorpayPayment = async ({ paymentData }) => {
  const response = await api.post('/v1/payments/verify', paymentData);
  return response.data;
};

export const getMyPaymentTransactions = async ({
  page = DEFAULT_TRANSACTION_PAGE,
  limit = DEFAULT_TRANSACTION_LIMIT
} = {}) => {
  const safePage = toPositiveNumber(page, DEFAULT_TRANSACTION_PAGE);
  const safeLimit = toPositiveNumber(limit, DEFAULT_TRANSACTION_LIMIT);

  const response = await api.get('/v1/payments/my-transactions', {
    params: {
      page: safePage,
      limit: safeLimit
    }
  });

  return normalizePaymentTransactionResponse({
    payload: response.data || {},
    page: safePage,
    limit: safeLimit
  });
};
