// data.js

const MOCK_TRANSACTIONS = [
  { id: 'tx-1', date: '2023-10-01', description: 'TechCorp Salary', category: 'Salary', type: 'income', amount: 6500 },
  { id: 'tx-2', date: '2023-10-03', description: 'Whole Foods Market', category: 'Food', type: 'expense', amount: 145.20 },
  { id: 'tx-3', date: '2023-10-05', description: 'Uber Rides', category: 'Transportation', type: 'expense', amount: 32.50 },
  { id: 'tx-4', date: '2023-10-06', description: 'Apartment Rent', category: 'Housing', type: 'expense', amount: 1800 },
  { id: 'tx-5', date: '2023-10-10', description: 'Netflix Subscription', category: 'Entertainment', type: 'expense', amount: 15.99 },
  { id: 'tx-6', date: '2023-10-12', description: 'Vanguard ETF', category: 'Investments', type: 'expense', amount: 500 },
  { id: 'tx-7', date: '2023-10-15', description: 'Freelance Project', category: 'Salary', type: 'income', amount: 1200 },
  { id: 'tx-8', date: '2023-10-18', description: 'Amazon Shopping', category: 'Shopping', type: 'expense', amount: 89.90 },
  { id: 'tx-9', date: '2023-10-22', description: 'Shell Gas Station', category: 'Transportation', type: 'expense', amount: 45.00 },
  { id: 'tx-10', date: '2023-10-25', description: 'Dinner at Mario\'s', category: 'Food', type: 'expense', amount: 85.00 },
  { id: 'tx-11', date: '2023-11-01', description: 'TechCorp Salary', category: 'Salary', type: 'income', amount: 6500 },
  { id: 'tx-12', date: '2023-11-04', description: 'Trader Joe\'s', category: 'Food', type: 'expense', amount: 110.50 },
  { id: 'tx-13', date: '2023-11-06', description: 'Apartment Rent', category: 'Housing', type: 'expense', amount: 1800 },
  { id: 'tx-14', date: '2023-11-12', description: 'Spotify Subscription', category: 'Entertainment', type: 'expense', amount: 10.99 },
  { id: 'tx-15', date: '2023-11-15', description: 'Fidelity Transfer', category: 'Investments', type: 'expense', amount: 600 },
  { id: 'tx-16', date: '2023-11-20', description: 'BestBuy Electronics', category: 'Shopping', type: 'expense', amount: 350.00 },
  { id: 'tx-17', date: '2023-11-28', description: 'Uber Rides', category: 'Transportation', type: 'expense', amount: 42.00 },
  { id: 'tx-18', date: '2023-12-05', description: 'Holiday Gifts', category: 'Shopping', type: 'expense', amount: 450.00 },
  { id: 'tx-19', date: '2023-12-15', description: 'TechCorp Bonus', category: 'Salary', type: 'income', amount: 2000.00 },
  { id: 'tx-20', date: '2023-12-24', description: 'Groceries', category: 'Food', type: 'expense', amount: 210.00 },
  { id: 'tx-21', date: '2024-01-02', description: 'Gym Membership', category: 'Other', type: 'expense', amount: 55.00 },
];

const LOCAL_STORAGE_KEY = 'finance_dashboard_transactions';

function initializeData() {
  const existingData = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!existingData) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(MOCK_TRANSACTIONS));
  }
}

function getTransactions() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error parsing transactions from local storage", error);
    return [];
  }
}

function saveTransactions(transactions) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(transactions));
}

// Ensure data is initialized on load
initializeData();

window.db = {
  getTransactions,
  saveTransactions
};
