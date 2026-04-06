// script.js

const appState = {
  view: 'overview',
  role: localStorage.getItem('role') || 'admin',
  transactions: window.db.getTransactions() || [],
  filters: { search: '', categories: [], month: 'all', type: 'all' },
  sort: { key: 'date', dir: 'desc' },
  pagination: { page: 1, limit: 10 },
  charts: {}, // Store chart instances to destroy them before re-render
  currentFilteredTransactions: [] // Tracks active filtered data context for exports
};

const UI = {
  content: document.getElementById('app-content'),
  pageTitle: document.getElementById('page-title'),
  toastContainer: document.getElementById('toast-container'),
  themeToggle: document.getElementById('theme-toggle'),
  themeIcon: document.getElementById('theme-icon'),
  roleSlider: document.getElementById('role-slider'),
  roleAdminBtn: document.getElementById('role-admin-btn'),
  roleViewerBtn: document.getElementById('role-viewer-btn'),
  roleBadge: document.getElementById('role-badge'),
  avatarInitials: document.getElementById('avatar-initials'),
  modal: document.getElementById('transaction-modal'),
  modalTitle: document.getElementById('modal-title'),
  form: document.getElementById('transaction-form'),
  closeModal: document.getElementById('close-modal'),
  cancelModal: document.getElementById('cancel-modal'),
  mobileMenuBtn: document.getElementById('mobile-menu-btn'),
  sidebar: document.getElementById('sidebar'),
  mobileOverlay: document.getElementById('mobile-overlay')
};

// --- INITIALIZATION ---
function init() {
  setupEventListeners();
  applyTheme();
  setRole(appState.role, true); // Initialize without toast trigger
  navigate('overview');
}

// --- MOBILE SIDEBAR ---
function toggleSidebar() {
  if (!UI.sidebar || !UI.mobileOverlay) return;
  const isClosed = UI.sidebar.classList.contains('-translate-x-full');
  if (isClosed) {
    UI.sidebar.classList.remove('-translate-x-full');
    UI.mobileOverlay.classList.remove('hidden');
    requestAnimationFrame(() => {
      UI.mobileOverlay.classList.remove('opacity-0');
      UI.mobileOverlay.classList.add('opacity-100');
    });
  } else {
    UI.sidebar.classList.add('-translate-x-full');
    UI.mobileOverlay.classList.remove('opacity-100');
    UI.mobileOverlay.classList.add('opacity-0');
    setTimeout(() => {
      UI.mobileOverlay.classList.add('hidden');
    }, 300);
  }
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
  UI.themeToggle.addEventListener('click', toggleTheme);
  
  if (UI.mobileMenuBtn) UI.mobileMenuBtn.addEventListener('click', toggleSidebar);
  if (UI.mobileOverlay) UI.mobileOverlay.addEventListener('click', toggleSidebar);

  UI.closeModal.addEventListener('click', closeModal);
  UI.cancelModal.addEventListener('click', closeModal);
  UI.form.addEventListener('submit', handleFormSubmit);

  // Close modal on outside click
  UI.modal.addEventListener('click', (e) => {
    if (e.target === UI.modal) closeModal();
  });
}

// --- THEMING ---
function applyTheme() {
  // We swapped the default logic. Dark is default, Light is triggered by .light
  const savedTheme = localStorage.getItem('theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  
  const useLight = savedTheme === 'light' || (!savedTheme && prefersLight);
  
  if (useLight) {
    document.body.classList.add('light');
    UI.themeIcon.classList.replace('fa-sun', 'fa-moon');
  } else {
    document.body.classList.remove('light');
    UI.themeIcon.classList.replace('fa-moon', 'fa-sun');
  }
}

// --- CONFIG - ROLE MANAGEMENT ---
function setRole(role, isInit = false) {
  appState.role = role;
  localStorage.setItem('role', role);

  // Update UI Elements
  if (role === 'admin') {
    if (UI.roleSlider) {
      UI.roleSlider.style.transform = 'translateX(0)';
      UI.roleSlider.className = 'absolute top-1 bottom-1 left-1 w-[72px] rounded-md transition-all duration-300 ease-in-out shadow-sm bg-brand-500 z-0';
    }
    UI.roleAdminBtn.className = 'relative z-10 px-0 py-1.5 w-[72px] text-xs font-semibold transition-colors duration-200 cursor-pointer text-center text-white active:scale-95';
    UI.roleViewerBtn.className = 'relative z-10 px-0 py-1.5 w-[72px] text-xs font-semibold transition-colors duration-200 cursor-pointer text-center text-text3 hover:text-text active:scale-95';
    UI.roleBadge.textContent = 'Admin';
    UI.roleBadge.className = 'hidden md:inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-brand-500/10 text-brand-500 border border-brand-500/20 transition-all duration-300';
    UI.avatarInitials.textContent = 'AD';
  } else {
    if (UI.roleSlider) {
      UI.roleSlider.style.transform = 'translateX(100%)';
      UI.roleSlider.className = 'absolute top-1 bottom-1 left-1 w-[72px] rounded-md transition-all duration-300 ease-in-out shadow-sm bg-green-500 z-0';
    }
    UI.roleAdminBtn.className = 'relative z-10 px-0 py-1.5 w-[72px] text-xs font-semibold transition-colors duration-200 cursor-pointer text-center text-text3 hover:text-text active:scale-95';
    UI.roleViewerBtn.className = 'relative z-10 px-0 py-1.5 w-[72px] text-xs font-semibold transition-colors duration-200 cursor-pointer text-center text-white active:scale-95';
    UI.roleBadge.textContent = 'Viewer';
    UI.roleBadge.className = 'hidden md:inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-green-500/10 text-green-500 border border-green-500/20 transition-all duration-300';
    UI.avatarInitials.textContent = 'VW';
  }

  if (!isInit) {
    showToast(`Switched to ${role} view`, 'success');
    renderCurrentView(); // Re-render to reflect auth UI additions
  }
}

function toggleTheme() {
  const isLight = document.body.classList.contains('light');
  
  if (isLight) {
    document.body.classList.remove('light'); // Switch to Dark
    localStorage.setItem('theme', 'dark');
    UI.themeIcon.classList.replace('fa-moon', 'fa-sun');
  } else {
    document.body.classList.add('light'); // Switch to Light
    localStorage.setItem('theme', 'light');
    UI.themeIcon.classList.replace('fa-sun', 'fa-moon');
  }
  
  // Force hard re-render of charts to fetch new CSS variable values
  if (appState.view === 'overview') {
    Object.values(appState.charts).forEach(c => c.destroy());
    appState.charts = {};
    initCharts();
  } else if (appState.view === 'insights') {
    // We must rebuild insights via full re-render because it depends on passing strict object bounds, 
    // simulating a fresh navigation hit covers all bounds cleanly.
    navigate('insights');
  }
}

// Helper to get raw colors for Chart JS dynamically
function getThemeColors() {
  const rs = getComputedStyle(document.body);
  return {
    text: rs.getPropertyValue('--text3').trim() || '#94a3b8',
    grid: rs.getPropertyValue('--border').trim() || '#334155',
    bg2:  rs.getPropertyValue('--bg2').trim() || '#1e293b'
  };
}

// --- NAVIGATION ---
function navigate(view) {
  // Close sidebar on mobile after navigating
  if (window.innerWidth < 768 && UI.sidebar && !UI.sidebar.classList.contains('-translate-x-full')) {
    toggleSidebar();
  }

  appState.view = view;
  
  // Update sidebar active states
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`nav-${view}`);
  if (activeBtn) activeBtn.classList.add('active');

  // Clear charts memory
  Object.values(appState.charts).forEach(c => c.destroy());
  appState.charts = {};

  // Render view
  renderCurrentView();
}

function renderCurrentView() {
  UI.pageTitle.textContent = appState.view.charAt(0).toUpperCase() + appState.view.slice(1);
  UI.content.innerHTML = '';
  
  // Reset pagination when switching views
  appState.pagination.page = 1;

  switch (appState.view) {
    case 'overview': renderOverview(); break;
    case 'transactions': renderTransactions(); break;
    case 'insights': renderInsights(); break;
  }
}

// --- UTILITIES ---
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const bgClass = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-brand-500';
  
  toast.className = `flex items-center gap-3 ${bgClass} text-white px-4 py-3 rounded-lg shadow-lg animate-slide-up transition-all duration-300 transform`;
  
  const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span class="font-medium inline-block pr-2">${message}</span>`;
  
  UI.toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function exportCSV() {
  const dataToExport = appState.currentFilteredTransactions || [];
  if (dataToExport.length === 0) {
    showToast('No data to export', 'error');
    return;
  }

  let csv = 'Date,Description,Category,Type,Amount\n';
  dataToExport.forEach(t => {
    csv += `"${t.date}","${t.description}","${t.category}","${t.type}","${t.amount}"\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  
  const dateStr = new Date().toISOString().split('T')[0];
  a.setAttribute('download', `transactions_export_${dateStr}.csv`);
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  showToast(`Exported ${dataToExport.length} transactions`, 'success');
}

function getUniqueMonths() {
  const months = new Set();
  appState.transactions.forEach(t => months.add(t.date.substring(0, 7)));
  return Array.from(months).sort().reverse();
}

function getUniqueCategories() {
  const cats = new Set();
  appState.transactions.forEach(t => cats.add(t.category));
  return Array.from(cats).sort();
}

function toggleCategoryFilter(cat) {
  const index = appState.filters.categories.indexOf(cat);
  if (index > -1) {
    appState.filters.categories.splice(index, 1);
  } else {
    appState.filters.categories.push(cat);
  }
  appState.pagination.page = 1;
  renderTransactions(); 
}

function removeFilter(type, value) {
  if (type === 'category') {
    appState.filters.categories = appState.filters.categories.filter(c => c !== value);
  } else {
    appState.filters[type] = type === 'search' ? '' : 'all';
  }
  appState.pagination.page = 1;
  renderTransactions();
}

function clearFilters() {
  appState.filters = { search: '', categories: [], month: 'all', type: 'all' };
  appState.pagination.page = 1;
  renderTransactions();
}

function renderActiveFiltersHtml() {
  let tags = [];
  
  if (appState.filters.search) {
    tags.push(`<div class="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-500/10 text-brand-600 border border-brand-500/20 rounded-lg text-sm font-medium animate-slide-up-fade">
      <span class="max-w-[120px] truncate">"${appState.filters.search}"</span>
      <button onclick="window.app.removeFilter('search')" class="text-brand-600 hover:text-brand-800 transition active:scale-90"><i class="fa-solid fa-xmark"></i></button>
    </div>`);
  }
  
  if (appState.filters.type !== 'all') {
    tags.push(`<div class="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-500/10 text-brand-600 border border-brand-500/20 rounded-lg text-sm font-medium animate-slide-up-fade capitalize">
      ${appState.filters.type}
      <button onclick="window.app.removeFilter('type')" class="text-brand-600 hover:text-brand-800 transition active:scale-90"><i class="fa-solid fa-xmark"></i></button>
    </div>`);
  }
  
  if (appState.filters.month !== 'all') {
    tags.push(`<div class="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-500/10 text-brand-600 border border-brand-500/20 rounded-lg text-sm font-medium animate-slide-up-fade">
      ${appState.filters.month}
      <button onclick="window.app.removeFilter('month')" class="text-brand-600 hover:text-brand-800 transition active:scale-90"><i class="fa-solid fa-xmark"></i></button>
    </div>`);
  }
  
  appState.filters.categories.forEach(cat => {
    tags.push(`<div class="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-500 text-white shadow-md shadow-brand-500/20 rounded-lg text-sm font-medium animate-slide-up-fade">
      ${cat}
      <button onclick="window.app.removeFilter('category', '${cat}')" class="text-white hover:text-red-200 transition active:scale-90"><i class="fa-solid fa-xmark"></i></button>
    </div>`);
  });

  if (tags.length === 0) return '';
  
  return `
    <div class="px-6 py-4 border-b border-border bg-bg/30 flex items-center gap-3 flex-wrap animate-slide-up-fade w-full mt-1">
      <span class="text-xs font-bold text-text3 uppercase tracking-wider hidden md:inline-block"><i class="fa-solid fa-filter mr-1"></i> Filtering By:</span>
      ${tags.join('')}
      <button onclick="window.app.clearFilters()" class="text-sm font-medium text-text3 hover:text-brand-500 transition-colors ml-auto active:scale-95"><i class="fa-solid fa-trash-can mr-1"></i> Clear</button>
    </div>
  `;
}

// --- COMPUTATIONS ---
function getSummaryStats() {
  let income = 0;
  let expense = 0;
  appState.transactions.forEach(t => {
    if (t.type === 'income') income += Number(t.amount);
    else if (t.type === 'expense') expense += Number(t.amount);
  });
  const balance = income - expense;
  const savingsRate = income > 0 ? ((income - expense) / income * 100).toFixed(1) : 0;
  
  return { balance, income, expense, savingsRate };
}

// --- RENDER OVERVIEW ---
function renderOverview() {
  const stats = getSummaryStats();
  
  const html = `
    <div class="animate-slide-up-fade space-y-6 max-w-7xl mx-auto">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="summary-card opacity-0 translate-y-[10px] glass bg-gradient-to-br from-white/5 to-transparent p-6 rounded-2xl transition-all duration-500 ease-out transform hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-500/10">
          <div class="flex justify-between items-start mb-4">
            <div>
              <p class="text-sm font-medium text-text3 mb-1">Total Balance</p>
              <h3 class="text-3xl font-bold text-text">${formatCurrency(stats.balance)}</h3>
            </div>
            <div class="w-10 h-10 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-lg shadow-lg shadow-brand-500/20">
              <i class="fa-solid fa-wallet"></i>
            </div>
          </div>
          <div class="flex items-center text-sm">
            <span class="text-green-500 font-medium flex items-center gap-1"><i class="fa-solid fa-arrow-up"></i> +2.5%</span>
            <span class="text-text3 ml-2">from last month</span>
          </div>
        </div>
        
        <div class="summary-card opacity-0 translate-y-[10px] glass bg-gradient-to-br from-white/5 to-transparent p-6 rounded-2xl transition-all duration-500 ease-out transform hover:-translate-y-1 hover:shadow-xl hover:shadow-green-500/10">
          <div class="flex justify-between items-start mb-4">
            <div>
              <p class="text-sm font-medium text-text3 mb-1">Total Income</p>
              <h3 class="text-3xl font-bold text-text">${formatCurrency(stats.income)}</h3>
            </div>
            <div class="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-lg shadow-lg shadow-green-500/20">
              <i class="fa-solid fa-arrow-down-long"></i>
            </div>
          </div>
           <div class="flex items-center text-sm">
            <span class="text-green-500 font-medium flex items-center gap-1"><i class="fa-solid fa-arrow-up"></i> +5.1%</span>
            <span class="text-text3 ml-2">from last month</span>
          </div>
        </div>

        <div class="summary-card opacity-0 translate-y-[10px] glass bg-gradient-to-br from-white/5 to-transparent p-6 rounded-2xl transition-all duration-500 ease-out transform hover:-translate-y-1 hover:shadow-xl hover:shadow-red-500/10">
          <div class="flex justify-between items-start mb-4">
            <div>
              <p class="text-sm font-medium text-text3 mb-1">Total Expenses</p>
              <h3 class="text-3xl font-bold text-text">${formatCurrency(stats.expense)}</h3>
            </div>
            <div class="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-lg shadow-lg shadow-red-500/20">
              <i class="fa-solid fa-arrow-up-long"></i>
            </div>
          </div>
           <div class="flex items-center text-sm">
            <span class="text-red-500 font-medium flex items-center gap-1"><i class="fa-solid fa-arrow-up"></i> -1.2%</span>
            <span class="text-text3 ml-2">from last month</span>
          </div>
        </div>

        <div class="summary-card opacity-0 translate-y-[10px] glass bg-gradient-to-br from-white/5 to-transparent p-6 rounded-2xl transition-all duration-500 ease-out transform hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10">
          <div class="flex justify-between items-start mb-4">
            <div>
              <p class="text-sm font-medium text-text3 mb-1">Savings Rate</p>
              <h3 class="text-3xl font-bold text-text">${stats.savingsRate}%</h3>
            </div>
            <div class="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-lg shadow-lg shadow-purple-500/20">
              <i class="fa-solid fa-piggy-bank"></i>
            </div>
          </div>
           <div class="w-full bg-border rounded-full h-2 mt-4 overflow-hidden">
            <div class="bg-gradient-to-r from-purple-500 to-brand-500 h-2 rounded-full transition-all duration-700" style="width: ${Math.min(stats.savingsRate, 100)}%"></div>
          </div>
        </div>
      </div>

      <!-- Charts Area -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div id="chartContainer1" class="opacity-0 translate-y-[10px] transition-all duration-500 ease-out lg:col-span-2 glass bg-gradient-to-br from-white/5 to-transparent p-4 sm:p-6 rounded-2xl h-[300px] sm:h-[400px] flex flex-col chart-card-glow">
          <h4 class="font-bold text-text mb-4">Cashflow Trend</h4>
          <div class="flex-1 relative w-full h-full">
            <canvas id="lineChart"></canvas>
          </div>
        </div>
        <div id="chartContainer2" class="opacity-0 translate-y-[10px] transition-all duration-500 ease-out glass bg-gradient-to-br from-white/5 to-transparent p-4 sm:p-6 rounded-2xl h-[300px] sm:h-[400px] flex flex-col chart-card-glow">
          <h4 class="font-bold text-text mb-4">Expenses by Category</h4>
          <div class="flex-1 relative w-full h-full">
            <canvas id="doughnutChart"></canvas>
          </div>
        </div>
      </div>
    </div>
  `;
  
  UI.content.innerHTML = html;
  
  // Staggered Progressive Reveal Effect
  requestAnimationFrame(() => {
    // 1. Reveal Cards sequentially
    document.querySelectorAll('.summary-card').forEach((card, idx) => {
      setTimeout(() => {
        card.classList.remove('opacity-0', 'translate-y-[10px]');
      }, idx * 100); 
    });

    // 2. Reveal Line Chart Container
    setTimeout(() => {
      const c1 = document.getElementById('chartContainer1');
      if (c1) c1.classList.remove('opacity-0', 'translate-y-[10px]');
    }, 400);

    // 3. Reveal Doughnut Container (delay: ~250ms after line chart)
    setTimeout(() => {
      const c2 = document.getElementById('chartContainer2');
      if (c2) c2.classList.remove('opacity-0', 'translate-y-[10px]');
    }, 650);

    initCharts();
  });
}

function initCharts() {
  const colors = getThemeColors();
  const textColor = colors.text;
  const gridColor = colors.grid;

  // Process data for charts
  const categoryData = {};
  const monthlyData = {};
  
  appState.transactions.forEach(t => {
    // Doughnut (Expenses only)
    if (t.type === 'expense') {
      categoryData[t.category] = (categoryData[t.category] || 0) + Number(t.amount);
    }
    
    // Line (Income vs Expense over months)
    const month = t.date.substring(0, 7); // YYYY-MM
    if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };
    if (t.type === 'income') monthlyData[month].income += Number(t.amount);
    else monthlyData[month].expense += Number(t.amount);
  });

  const months = Object.keys(monthlyData).sort();
  const incomes = months.map(m => monthlyData[m].income);
  const expenses = months.map(m => monthlyData[m].expense);

  // Line Chart
  setTimeout(() => {
    const lineCtx = document.getElementById('lineChart');
    if (lineCtx) {
      if (appState.charts.line) {
        appState.charts.line.destroy();
      }

      const ctx = lineCtx.getContext('2d');
      const gradientIncome = ctx.createLinearGradient(0, 0, 0, 400);
      gradientIncome.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
      gradientIncome.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

      const gradientExpense = ctx.createLinearGradient(0, 0, 0, 400);
      gradientExpense.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
      gradientExpense.addColorStop(1, 'rgba(239, 68, 68, 0.0)');

      appState.charts.line = new Chart(lineCtx, {
        type: 'line',
        data: {
          labels: months,
          datasets: [
            {
              label: 'Income',
              data: incomes,
              borderColor: '#10b981',
              backgroundColor: gradientIncome,
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#10b981',
              pointHoverRadius: 6
            },
            {
              label: 'Expenses',
              data: expenses,
              borderColor: '#ef4444',
              backgroundColor: gradientExpense,
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#ef4444',
              pointHoverRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 1200,
            easing: 'easeOutQuart'
          },
          plugins: { 
            legend: { 
              display: true, 
              labels: { color: textColor, usePointStyle: true, padding: 20 } 
            } 
          },
          scales: {
            x: { grid: { display: false, color: gridColor }, ticks: { color: textColor } },
            y: { 
              beginAtZero: true, 
              grid: { color: gridColor, borderDash: [5, 5] }, 
              ticks: { color: textColor } 
            }
          },
          interaction: { mode: 'index', intersect: false }
        }
      });
    }
  }, 100);

  // Doughnut Chart
  setTimeout(() => {
    const categories = Object.keys(categoryData);
    const catAmounts = Object.values(categoryData);
    const doughnutCtx = document.getElementById('doughnutChart');
    if (doughnutCtx) {
      if (appState.charts.doughnut) {
        appState.charts.doughnut.destroy();
      }

      appState.charts.doughnut = new Chart(doughnutCtx, {
        type: 'doughnut',
        data: {
          labels: categories,
          datasets: [{
            data: catAmounts,
            backgroundColor: [
              'rgba(99, 102, 241, 0.85)',   // Indigo
              'rgba(139, 92, 246, 0.85)',   // Violet
              'rgba(236, 72, 153, 0.85)',   // Pink
              'rgba(245, 158, 11, 0.85)',   // Amber
              'rgba(20, 184, 166, 0.85)',   // Teal
              'rgba(59, 130, 246, 0.85)',   // Blue
              'rgba(244, 63, 94, 0.85)',    // Rose
              'rgba(107, 114, 128, 0.85)'   // Gray
            ],
            borderWidth: 0,
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            animateRotate: true,
            animateScale: true,
            duration: 1200,
            easing: 'easeOutCubic'
          },
          plugins: {
            legend: { position: 'bottom', labels: { color: textColor, padding: 20, usePointStyle: true } }
          },
          cutout: '70%'
        }
      });
    }
  }, 400);
}

// --- RENDER TRANSACTIONS ---
function renderTransactions() {
  const html = `
    <div class="animate-slide-up-fade max-w-7xl mx-auto flex flex-col h-full bg-bg2 rounded-2xl shadow-lg shadow-black/20 border border-border overflow-hidden transition-colors">
      
      <!-- Toolbar -->
      <div class="px-5 py-4 sm:px-6 sm:py-5 border-b border-border bg-gradient-to-b from-white/5 to-transparent">
        
        <!-- Filters Container -->
        <div class="flex flex-col gap-4">
          
          <!-- Row 1: Search + Filters + Actions -->
          <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            
            <!-- Search Bar -->
            <div class="relative flex-1 min-w-0">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <i class="fa-solid fa-magnifying-glass text-text3/60 text-sm"></i>
              </div>
              <input 
                type="text" 
                id="search-input" 
                value="${appState.filters.search}" 
                placeholder="Search transactions..." 
                class="w-full pl-11 pr-4 py-2.5 bg-slate-800/60 backdrop-blur-md border border-white/10 rounded-xl text-text text-sm placeholder:text-text3/60 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/60 transition-all duration-200"
              >
            </div>
            
            <!-- Filter Dropdowns -->
            <div class="flex gap-2 items-center flex-shrink-0">
              <!-- Type Filter -->
              <div class="relative">
                <select id="filter-type" class="appearance-none w-full pl-3.5 pr-9 py-2.5 bg-slate-800/60 backdrop-blur-md border border-white/10 rounded-xl text-text text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/60 hover:border-brand-500/40 hover:bg-slate-800/80 transition-all duration-200">
                  <option value="all" class="bg-slate-800 text-text">All Types</option>
                  <option value="income" class="bg-slate-800 text-text">Income</option>
                  <option value="expense" class="bg-slate-800 text-text">Expense</option>
                </select>
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <i class="fa-solid fa-chevron-down text-text3/60 text-xs"></i>
                </div>
              </div>

              <!-- Month Filter -->
              <div class="relative">
                <select id="filter-month" class="appearance-none w-full pl-3.5 pr-9 py-2.5 bg-slate-800/60 backdrop-blur-md border border-white/10 rounded-xl text-text text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/60 hover:border-brand-500/40 hover:bg-slate-800/80 transition-all duration-200">
                  <option value="all" class="bg-slate-800 text-text">All Months</option>
                  ${getUniqueMonths().map(m => `<option value="${m}" class="bg-slate-800 text-text">${m}</option>`).join('')}
                </select>
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <i class="fa-solid fa-chevron-down text-text3/60 text-xs"></i>
                </div>
              </div>

              <!-- Reset Button -->
              <button 
                onclick="window.app.clearFilters()" 
                class="btn-premium p-2.5 text-text3 hover:text-brand-400 hover:bg-brand-500/10 rounded-xl transition-all duration-200 cursor-pointer" 
                title="Clear all filters"
              >
                <i class="fa-solid fa-rotate-right text-sm"></i>
              </button>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-2 items-center flex-shrink-0 sm:ml-auto">
              <!-- Export Button -->
              <button 
                id="export-csv-btn" 
                onclick="window.app.exportCSV()" 
                class="btn-premium px-4 py-2.5 bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-brand-500/40 text-text text-sm font-medium rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <i class="fa-solid fa-arrow-down-to-line text-xs"></i> 
                <span class="hidden sm:inline">Export</span>
              </button>
              
              ${appState.role === 'admin' ? `
                <button 
                  onclick="window.app.openModal()" 
                  class="btn-premium px-4 py-2.5 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white text-sm font-medium rounded-xl shadow-lg shadow-brand-500/25 transition-all duration-200 flex items-center gap-2 cursor-pointer"
                >
                  <i class="fa-solid fa-plus text-xs"></i> 
                  <span class="hidden sm:inline">Add</span>
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Row 2: Category Chips -->
          <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
            ${getUniqueCategories().map(c => {
              const isActive = appState.filters.categories.includes(c);
              return `
                <button 
                  onclick="window.app.toggleCategoryFilter('${c}')" 
                  class="chip-interactive flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? 'bg-gradient-to-r from-brand-500 to-purple-500 border-transparent text-white shadow-md shadow-brand-500/30' 
                      : 'bg-white/5 border-white/10 text-text3 hover:border-brand-500/50 hover:text-brand-400 hover:bg-brand-500/10'
                  }"
                >
                  ${c}
                </button>
              `;
            }).join('')}
          </div>
        </div>
      </div>
      
      ${renderActiveFiltersHtml()}

      <!-- Table Area -->
      <div class="overflow-x-auto flex-1">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-bg/50 text-xs uppercase tracking-wider text-text3 border-b border-border">
              <th class="px-6 py-4 cursor-pointer hover:text-text hover:bg-white/5 transition-all duration-200" onclick="window.app.toggleSort('date')">Date <i class="fa-solid fa-sort ml-1 opacity-50"></i></th>
              <th class="px-6 py-4">Description</th>
              <th class="px-6 py-4">Category</th>
              <th class="px-6 py-4 text-right cursor-pointer hover:text-text hover:bg-white/5 transition-all duration-200" onclick="window.app.toggleSort('amount')">Amount <i class="fa-solid fa-sort ml-1 opacity-50"></i></th>
              ${appState.role === 'admin' ? '<th class="px-6 py-4 text-right">Actions</th>' : ''}
            </tr>
          </thead>
          <tbody id="table-body" class="divide-y divide-border text-sm">
            <!-- Rows injected by JS -->
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div id="pagination-container" class="p-4 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-sm bg-gradient-to-t from-white/5 to-transparent transition-all duration-300">
        <!-- Injected by renderPagination -->
      </div>
    </div>
  `;
  
  UI.content.innerHTML = html;
  
  // Set explicit default selection for the generated DOM selects 
  document.getElementById('filter-type').value = appState.filters.type;
  document.getElementById('filter-month').value = appState.filters.month;

  // Attach Input & Change Listeners
  document.getElementById('search-input').addEventListener('input', (e) => {
    appState.filters.search = e.target.value.toLowerCase();
    appState.pagination.page = 1;
    updateTable();
  });
  
  document.getElementById('filter-type').addEventListener('change', (e) => {
    appState.filters.type = e.target.value;
    appState.pagination.page = 1;
    updateTable();
  });

  document.getElementById('filter-month').addEventListener('change', (e) => {
    appState.filters.month = e.target.value;
    appState.pagination.page = 1;
    updateTable();
  });

  updateTable();
}

function updateTable() {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;

  // Multi-layer filter processing pipeline
  let filtered = appState.transactions.filter(t => {
    // Stage 1: Broad search query (Description / Category fallback)
    const matchSearch = t.description.toLowerCase().includes(appState.filters.search) || t.category.toLowerCase().includes(appState.filters.search);
    // Stage 2: Bounds
    const matchType = appState.filters.type === 'all' || t.type === appState.filters.type;
    const matchMonth = appState.filters.month === 'all' || t.date.startsWith(appState.filters.month);
    // Stage 3: Category
    const matchCategory = appState.filters.categories.length === 0 || appState.filters.categories.includes(t.category);
    
    return matchSearch && matchType && matchMonth && matchCategory;
  });

  // Sort
  filtered.sort((a, b) => {
    let valA = a[appState.sort.key];
    let valB = b[appState.sort.key];
    
    if (appState.sort.key === 'amount') {
      valA = Number(valA);
      valB = Number(valB);
    }
    
    if (valA < valB) return appState.sort.dir === 'asc' ? -1 : 1;
    if (valA > valB) return appState.sort.dir === 'asc' ? 1 : -1;
    return 0;
  });

  // Save to context for potential CSV export
  appState.currentFilteredTransactions = filtered;

  // Toggle Contextual Export Button Status
  const exportBtn = document.getElementById('export-csv-btn');
  if (exportBtn) {
    if (filtered.length === 0) {
      exportBtn.disabled = true;
      exportBtn.classList.add('opacity-50', 'pointer-events-none');
    } else {
      exportBtn.disabled = false;
      exportBtn.classList.remove('opacity-50', 'pointer-events-none');
    }
  }

  // Pagination
  const totalItems = filtered.length;
  const maxPage = Math.ceil(totalItems / appState.pagination.limit) || 1;
  if(appState.pagination.page > maxPage) appState.pagination.page = maxPage;
  
  const startIdx = (appState.pagination.page - 1) * appState.pagination.limit;
  const paginated = filtered.slice(startIdx, startIdx + appState.pagination.limit);

  // Render rows
  if (paginated.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${appState.role === 'admin' ? 5 : 4}" class="px-6 py-12 text-center text-text3">
      <i class="fa-solid fa-folder-open text-4xl mb-3 opacity-50 block"></i>
      No transactions found matching your criteria.
    </td></tr>`;
  } else {
    tbody.innerHTML = paginated.map(t => `
      <tr class="table-row-premium group">
        <td class="px-6 py-4 whitespace-nowrap text-text2 font-medium">${t.date}</td>
        <td class="px-6 py-4 text-text font-medium">${t.description}</td>
        <td class="px-6 py-4">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-bg/50 backdrop-blur-sm border border-border text-text2">
            ${t.category}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right font-bold ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}">
          ${t.type === 'income' ? '<i class="fa-solid fa-arrow-up text-xs mr-1 opacity-70"></i>+' : '<i class="fa-solid fa-arrow-down text-xs mr-1 opacity-70"></i>-'}${formatCurrency(t.amount)}
        </td>
        ${appState.role === 'admin' ? `
          <td class="px-6 py-4 text-right whitespace-nowrap opacity-100 lg:opacity-50 group-hover:opacity-100 transition-all duration-200">
            <button title="Edit" onclick="window.app.editTransaction('${t.id}')" class="text-brand-500 hover:text-brand-400 hover:bg-brand-500/10 p-2 rounded-full transition-all duration-200 hover:scale-110 cursor-pointer">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button title="Delete" onclick="window.app.deleteTransaction('${t.id}')" class="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-full transition-all duration-200 hover:scale-110 ml-2 cursor-pointer">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        ` : ''}
      </tr>
    `).join('');
  }

  renderPagination(totalItems, maxPage, appState.pagination.page);
}

function renderPagination(totalItems, maxPage, currentPage) {
  const container = document.getElementById('pagination-container');
  if (!container) return;

  const startVis = totalItems === 0 ? 0 : ((currentPage - 1) * appState.pagination.limit) + 1;
  const endVis = Math.min(currentPage * appState.pagination.limit, totalItems);
  
  let html = `<span class="text-text3 whitespace-nowrap">Showing <span class="font-medium text-text">${startVis}–${endVis}</span> of <span class="font-medium text-text">${totalItems}</span> entries</span>`;
  
  if (totalItems > 0) {
    html += `<div class="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none w-full md:w-auto justify-center md:justify-end">`;
    
    // Prev
    html += `<button onclick="window.app.changePage(-1)" ${currentPage === 1 ? 'disabled class="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-bg/50 text-text3 opacity-50 cursor-not-allowed"' : 'class="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-bg text-text hover:bg-border hover:text-brand-500 transition-all cursor-pointer shadow-sm"'}><i class="fa-solid fa-chevron-left text-xs"></i></button>`;
    
    // Core Ellipsis & Page Numbers Loop
    const delta = 1; 
    const range = [];
    
    for (let i = 1; i <= maxPage; i++) {
        if (i === 1 || i === maxPage || (i >= currentPage - delta && i <= currentPage + delta)) {
            range.push(i);
        }
    }

    let l;
    range.forEach(i => {
        if (l) {
            if (i - l === 2) {
                const p = l + 1;
                html += `<button onclick="window.app.setPage(${p})" class="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-transparent text-text hover:bg-border transition-all cursor-pointer shadow-sm text-sm font-medium">${p}</button>`;
            } else if (i - l !== 1) {
                html += `<span class="px-1 text-text3/50 text-sm">...</span>`;
            }
        }
        
        if (i === currentPage) {
             html += `<button class="w-8 h-8 flex items-center justify-center rounded-lg bg-brand-500 border border-brand-500 text-white font-bold shadow-md cursor-default text-sm transition-transform scale-105">${i}</button>`;
        } else {
             html += `<button onclick="window.app.setPage(${i})" class="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-transparent text-text hover:bg-border hover:text-brand-500 transition-all cursor-pointer shadow-sm text-sm font-medium">${i}</button>`;
        }
        l = i;
    });

    // Next
    html += `<button onclick="window.app.changePage(1)" ${currentPage === maxPage ? 'disabled class="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-bg/50 text-text3 opacity-50 cursor-not-allowed"' : 'class="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-bg text-text hover:bg-border hover:text-brand-500 transition-all cursor-pointer shadow-sm"'}><i class="fa-solid fa-chevron-right text-xs"></i></button>`;
    
    html += `</div>`;
  }
  
  container.innerHTML = html;
}

function setPage(p) {
  appState.pagination.page = p;
  updateTable();}

function toggleSort(key) {
  if (appState.sort.key === key) {
    appState.sort.dir = appState.sort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    appState.sort.key = key;
    appState.sort.dir = 'desc';
  }
  updateTable();
}

function changePage(delta) {
  appState.pagination.page += delta;
  updateTable();
}

// --- ADVANCED DATA PROCESSING FUNCTIONS ---

function getTopCategories(transactions, limit = 3) {
  const expenses = transactions.filter(t => t.type === 'expense');
  const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
  
  const categoryTotals = expenses.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
    return acc;
  }, {});
  
  return Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : 0
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

function getMonthlyChange(transactions) {
  const sortedTxns = [...transactions].sort((a,b) => b.date.localeCompare(a.date));
  if (!sortedTxns.length) return {};
  
  const currentMonthStr = sortedTxns[0].date.substring(0,7);
  const [yr, mo] = currentMonthStr.split('-');
  let d = new Date(parseInt(yr), parseInt(mo) - 1, 1);
  d.setMonth(d.getMonth() - 1);
  const prevMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  
  const currentMonthData = {};
  const prevMonthData = {};
  
  transactions.forEach(t => {
    const m = t.date.substring(0,7);
    const amt = Number(t.amount);
    if (t.type === 'expense') {
      if (m === currentMonthStr) {
        currentMonthData[t.category] = (currentMonthData[t.category] || 0) + amt;
      } else if (m === prevMonthStr) {
        prevMonthData[t.category] = (prevMonthData[t.category] || 0) + amt;
      }
    }
  });
  
  const allCategories = [...new Set([...Object.keys(currentMonthData), ...Object.keys(prevMonthData)])];
  
  return allCategories.map(cat => {
    const current = currentMonthData[cat] || 0;
    const previous = prevMonthData[cat] || 0;
    const change = previous > 0 ? ((current - previous) / previous * 100) : (current > 0 ? 100 : 0);
    return {
      category: cat,
      current,
      previous,
      change,
      isIncrease: change > 0,
      isDecrease: change < 0
    };
  });
}

function generateSmartRecommendations(transactions) {
  const recommendations = [];
  const stats = getSummaryStats();
  const topCategories = getTopCategories(transactions, 5);
  const monthlyChanges = getMonthlyChange(transactions);
  
  // Check for high housing costs
  const housingCat = topCategories.find(c => c.category === 'Housing');
  if (housingCat && parseFloat(housingCat.percentage) > 30) {
    recommendations.push({
      icon: 'fa-house',
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      text: `You're spending ${housingCat.percentage}% on Housing. Consider optimizing rent or exploring cheaper alternatives.`
    });
  }
  
  // Check for increasing food expenses
  const foodChange = monthlyChanges.find(c => c.category === 'Food');
  if (foodChange && foodChange.isIncrease && foodChange.change > 15) {
    recommendations.push({
      icon: 'fa-utensils',
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      text: `Your food expenses increased by ${foodChange.change.toFixed(0)}% this month. Try meal planning to reduce costs.`
    });
  }
  
  // Praise good savings behavior
  if (parseFloat(stats.savingsRate) > 20) {
    recommendations.push({
      icon: 'fa-piggy-bank',
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      text: `Excellent! Your savings rate is ${stats.savingsRate}% — you're building strong financial habits!`
    });
  }
  
  // Check for high entertainment spending
  const entertainmentCat = topCategories.find(c => c.category === 'Entertainment');
  if (entertainmentCat && parseFloat(entertainmentCat.percentage) > 15) {
    recommendations.push({
      icon: 'fa-film',
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      text: `Entertainment is ${entertainmentCat.percentage}% of your spending. Look for free alternatives or subscription bundles.`
    });
  }
  
  // Check for increasing shopping expenses
  const shoppingChange = monthlyChanges.find(c => c.category === 'Shopping');
  if (shoppingChange && shoppingChange.isIncrease && shoppingChange.change > 20) {
    recommendations.push({
      icon: 'fa-cart-shopping',
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      text: `Shopping expenses jumped ${shoppingChange.change.toFixed(0)}% this month. Consider a 48-hour waiting rule before purchases.`
    });
  }
  
  // Default recommendation if nothing specific
  if (recommendations.length === 0) {
    recommendations.push({
      icon: 'fa-chart-line',
      color: 'text-brand-500',
      bg: 'bg-brand-500/10',
      text: 'Your spending patterns look stable. Keep tracking your expenses to maintain financial awareness.'
    });
  }
  
  return recommendations;
}

function getDailySpendingPattern(transactions) {
  const expenses = transactions.filter(t => t.type === 'expense');
  const dayOfWeekTotals = {
    'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0
  };
  const dayOfWeekCount = {
    'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0
  };
  
  expenses.forEach(t => {
    const date = new Date(t.date);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    dayOfWeekTotals[dayName] += Number(t.amount);
    dayOfWeekCount[dayName]++;
  });
  
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const totals = days.map(day => dayOfWeekTotals[day]);
  const maxDay = days[totals.indexOf(Math.max(...totals))];
  
  const isWeekendHigher = (dayOfWeekTotals['Sat'] + dayOfWeekTotals['Sun']) > 
                          (dayOfWeekTotals['Mon'] + dayOfWeekTotals['Tue'] + dayOfWeekTotals['Wed']);
  
  return {
    days,
    totals,
    maxDay,
    insight: isWeekendHigher ? 'You tend to spend more on weekends' : 'Your spending is relatively consistent throughout the week'
  };
}

function getSavingsHealth(transactions) {
  const stats = getSummaryStats();
  const ratio = parseFloat(stats.savingsRate);
  
  let status = 'Excellent';
  let color = 'text-green-500';
  let bgColor = 'bg-green-500';
  let message = 'Outstanding savings behavior!';
  
  if (ratio < 10) {
    status = 'Critical';
    color = 'text-red-500';
    bgColor = 'bg-red-500';
    message = 'Your savings rate is very low. Consider reducing expenses.';
  } else if (ratio < 20) {
    status = 'Fair';
    color = 'text-yellow-500';
    bgColor = 'bg-yellow-500';
    message = 'Room for improvement. Try to save at least 20%.';
  } else if (ratio < 30) {
    status = 'Good';
    color = 'text-blue-500';
    bgColor = 'bg-blue-500';
    message = 'Solid savings rate. Keep it up!';
  }
  
  return {
    ratio,
    status,
    color,
    bgColor,
    message,
    income: stats.income,
    expense: stats.expense,
    savings: stats.income - stats.expense
  };
}

function detectAnomalies(transactions) {
  const expenses = transactions.filter(t => t.type === 'expense');
  if (expenses.length === 0) return [];
  
  const amounts = expenses.map(t => Number(t.amount));
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const stdDev = Math.sqrt(amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / amounts.length);
  const threshold = mean + (2 * stdDev);
  
  const anomalies = expenses
    .filter(t => Number(t.amount) > threshold)
    .map(t => ({
      ...t,
      amount: Number(t.amount),
      deviation: ((Number(t.amount) - mean) / stdDev).toFixed(1)
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
  
  return anomalies;
}

function getTrendSummary(transactions) {
  const sortedTxns = [...transactions].sort((a,b) => b.date.localeCompare(a.date));
  if (sortedTxns.length < 2) return null;
  
  const currentMonthStr = sortedTxns[0].date.substring(0,7);
  const [yr, mo] = currentMonthStr.split('-');
  let d = new Date(parseInt(yr), parseInt(mo) - 1, 1);
  d.setMonth(d.getMonth() - 1);
  const prevMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  
  let currentIncome = 0, currentExpense = 0;
  let prevIncome = 0, prevExpense = 0;
  
  transactions.forEach(t => {
    const m = t.date.substring(0,7);
    const amt = Number(t.amount);
    if (m === currentMonthStr) {
      if (t.type === 'income') currentIncome += amt;
      else currentExpense += amt;
    } else if (m === prevMonthStr) {
      if (t.type === 'income') prevIncome += amt;
      else prevExpense += amt;
    }
  });
  
  const incomeChange = prevIncome > 0 ? ((currentIncome - prevIncome) / prevIncome * 100) : 0;
  const expenseChange = prevExpense > 0 ? ((currentExpense - prevExpense) / prevExpense * 100) : 0;
  
  return {
    income: {
      current: currentIncome,
      previous: prevIncome,
      change: incomeChange,
      trend: incomeChange >= 0 ? 'up' : 'down'
    },
    expense: {
      current: currentExpense,
      previous: prevExpense,
      change: expenseChange,
      trend: expenseChange >= 0 ? 'up' : 'down'
    }
  };
}

function getBudgetTracking(transactions) {
  // Mock budget limits per category
  const budgets = {
    'Housing': 2000,
    'Food': 400,
    'Transportation': 150,
    'Entertainment': 100,
    'Shopping': 300,
    'Investments': 1000,
    'Other': 200
  };
  
  const sortedTxns = [...transactions].sort((a,b) => b.date.localeCompare(a.date));
  if (!sortedTxns.length) return [];
  
  const currentMonthStr = sortedTxns[0].date.substring(0,7);
  
  const currentSpending = {};
  transactions.forEach(t => {
    if (t.type === 'expense' && t.date.startsWith(currentMonthStr)) {
      currentSpending[t.category] = (currentSpending[t.category] || 0) + Number(t.amount);
    }
  });
  
  return Object.entries(budgets).map(([category, budget]) => {
    const spent = currentSpending[category] || 0;
    const percentage = (spent / budget * 100).toFixed(1);
    const remaining = budget - spent;
    const status = percentage > 100 ? 'over' : percentage > 80 ? 'warning' : 'good';
    
    return {
      category,
      budget,
      spent,
      percentage: parseFloat(percentage),
      remaining,
      status
    };
  }).filter(b => b.spent > 0);
}

function generateInsightBanner(transactions) {
  const trends = getTrendSummary(transactions);
  if (!trends) return null;
  
  const expenseChange = trends.expense.change;
  const incomeChange = trends.income.change;
  
  if (expenseChange < -10) {
    return {
      icon: 'fa-arrow-trend-down',
      color: 'text-green-500',
      bg: 'from-green-500/10 to-emerald-500/5',
      border: 'border-green-500/20',
      text: `🎉 You reduced expenses by ${Math.abs(expenseChange).toFixed(0)}% this month — keep it up!`
    };
  } else if (incomeChange > 15) {
    return {
      icon: 'fa-arrow-trend-up',
      color: 'text-green-500',
      bg: 'from-green-500/10 to-emerald-500/5',
      border: 'border-green-500/20',
      text: `💰 Your income increased by ${incomeChange.toFixed(0)}% this month — excellent!`
    };
  } else if (expenseChange > 20) {
    return {
      icon: 'fa-triangle-exclamation',
      color: 'text-orange-500',
      bg: 'from-orange-500/10 to-red-500/5',
      border: 'border-orange-500/20',
      text: `⚠️ Your expenses increased by ${expenseChange.toFixed(0)}% this month — review your spending.`
    };
  }
  
  return {
    icon: 'fa-chart-line',
    color: 'text-brand-500',
    bg: 'from-brand-500/10 to-purple-500/5',
    border: 'border-brand-500/20',
    text: `📊 Your financial patterns are stable. Continue monitoring your progress!`
  };
}

// --- RENDER INSIGHTS ---
function renderInsights() {
  if (!appState.transactions.length) {
    UI.content.innerHTML = `<div class="p-8 text-center text-text3">No transaction data available for insights.</div>`;
    return;
  }

  // Generate all data
  const topCategories = getTopCategories(appState.transactions, 3);
  const monthlyChanges = getMonthlyChange(appState.transactions);
  const recommendations = generateSmartRecommendations(appState.transactions);
  const dailyPattern = getDailySpendingPattern(appState.transactions);
  const savingsHealth = getSavingsHealth(appState.transactions);
  const anomalies = detectAnomalies(appState.transactions);
  const trendSummary = getTrendSummary(appState.transactions);
  const budgetTracking = getBudgetTracking(appState.transactions);
  const insightBanner = generateInsightBanner(appState.transactions);

  // Chart data
  const sortedTxns = [...appState.transactions].sort((a,b) => b.date.localeCompare(a.date));
  const currentMonthStr = sortedTxns[0].date.substring(0,7);
  
  let catTotals = {};
  appState.transactions.forEach(t => {
    if (t.type === 'expense') {
      catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount);
    }
  });

  const monthlyData = {};
  appState.transactions.forEach(t => {
      const amt = Number(t.amount);
      const m = t.date.substring(0, 7);
      if (!monthlyData[m]) monthlyData[m] = { income: 0, expense: 0 };
      if (t.type === 'income') monthlyData[m].income += amt;
      else monthlyData[m].expense += amt;
  });
  
  const lineMonths = Object.keys(monthlyData).sort();
  const lineIncomes = lineMonths.map(m => monthlyData[m].income);
  const lineExpenses = lineMonths.map(m => monthlyData[m].expense);

  const html = `
    <div class="animate-slide-up-fade max-w-7xl mx-auto space-y-6 pb-12">
      
      <!-- Insight Banner -->
      ${insightBanner ? `
        <div class="glass rounded-2xl p-6 bg-gradient-to-r ${insightBanner.bg} border ${insightBanner.border} relative overflow-hidden transition-all duration-300 hover:shadow-lg card-elevated">
          <div class="absolute inset-0 bg-gradient-to-r from-brand-500/5 to-purple-500/5"></div>
          <div class="flex items-center gap-4 relative z-10">
            <div class="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm ${insightBanner.color} flex items-center justify-center text-xl shadow-lg">
              <i class="fa-solid ${insightBanner.icon}"></i>
            </div>
            <div class="flex-1">
              <p class="text-lg font-semibold text-text">${insightBanner.text}</p>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Trend Summary Cards -->
      ${trendSummary ? `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="glass bg-gradient-to-br from-white/5 to-transparent p-5 rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-green-500/10 card-elevated">
            <div class="flex items-center justify-between mb-3">
              <p class="text-sm font-medium text-text3">Income Trend</p>
              <div class="w-8 h-8 rounded-full ${trendSummary.income.trend === 'up' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'} flex items-center justify-center shadow-md">
                <i class="fa-solid fa-arrow-trend-${trendSummary.income.trend}"></i>
              </div>
            </div>
            <p class="text-2xl font-bold text-text mb-1">${formatCurrency(trendSummary.income.current)}</p>
            <p class="text-sm ${trendSummary.income.change >= 0 ? 'text-green-500' : 'text-red-500'}">
              <i class="fa-solid fa-arrow-${trendSummary.income.trend}"></i> ${Math.abs(trendSummary.income.change).toFixed(1)}% vs last month
            </p>
          </div>

          <div class="glass bg-gradient-to-br from-white/5 to-transparent p-5 rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-red-500/10 card-elevated">
            <div class="flex items-center justify-between mb-3">
              <p class="text-sm font-medium text-text3">Expense Trend</p>
              <div class="w-8 h-8 rounded-full ${trendSummary.expense.trend === 'up' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'} flex items-center justify-center shadow-md">
                <i class="fa-solid fa-arrow-trend-${trendSummary.expense.trend}"></i>
              </div>
            </div>
            <p class="text-2xl font-bold text-text mb-1">${formatCurrency(trendSummary.expense.current)}</p>
            <p class="text-sm ${trendSummary.expense.change <= 0 ? 'text-green-500' : 'text-red-500'}">
              <i class="fa-solid fa-arrow-${trendSummary.expense.trend === 'up' ? 'right' : 'left'}"></i> ${Math.abs(trendSummary.expense.change).toFixed(1)}% vs last month
            </p>
          </div>

          <div class="glass bg-gradient-to-br from-white/5 to-transparent p-5 rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-500/10 card-elevated">
            <div class="flex items-center justify-between mb-3">
              <p class="text-sm font-medium text-text3">Savings Health</p>
              <div class="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center shadow-md">
                <i class="fa-solid fa-heart-pulse"></i>
              </div>
            </div>
            <p class="text-2xl font-bold ${savingsHealth.color} mb-1">${savingsHealth.ratio}%</p>
            <p class="text-sm text-text3">${savingsHealth.status} — ${savingsHealth.message}</p>
          </div>
        </div>
      ` : ''}

      <!-- Main Charts Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Top 3 Categories -->
        <div class="glass bg-gradient-to-br from-white/5 to-transparent p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-500/10 card-elevated">
          <h4 class="font-bold text-text mb-4 flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center shadow-md">
              <i class="fa-solid fa-ranking-star text-sm"></i>
            </div>
            Top 3 Spending Categories
          </h4>
          <div class="space-y-4">
            ${topCategories.map((cat, idx) => `
              <div class="group cursor-pointer">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full ${idx === 0 ? 'bg-yellow-500/20 text-yellow-400' : idx === 1 ? 'bg-gray-400/20 text-gray-300' : 'bg-orange-500/20 text-orange-400'} flex items-center justify-center text-xs font-bold shadow-sm">
                      ${idx + 1}
                    </span>
                    <span class="font-medium text-text group-hover:text-brand-400 transition-colors">${cat.category}</span>
                  </div>
                  <div class="text-right">
                    <p class="font-bold text-text">${formatCurrency(cat.amount)}</p>
                    <p class="text-xs text-text3">${cat.percentage}%</p>
                  </div>
                </div>
                <div class="w-full bg-border rounded-full h-2 overflow-hidden">
                  <div class="bg-gradient-to-r from-brand-500 to-purple-500 h-2 rounded-full transition-all duration-700 group-hover:from-brand-400 group-hover:to-purple-400" style="width: ${cat.percentage}%"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Spending Change Analysis -->
        <div class="glass bg-gradient-to-br from-white/5 to-transparent p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10 card-elevated">
          <h4 class="font-bold text-text mb-4 flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shadow-md">
              <i class="fa-solid fa-chart-column text-sm"></i>
            </div>
            Monthly Change Analysis
          </h4>
          <div class="space-y-3 max-h-[280px] overflow-y-auto pr-2">
            ${monthlyChanges.map(change => `
              <div class="flex items-center justify-between p-3 rounded-lg bg-bg/30 backdrop-blur-sm border border-border hover:border-purple-500/30 hover:bg-purple-500/5 transition-all duration-200 cursor-pointer group">
                <div class="flex-1">
                  <p class="font-medium text-text text-sm group-hover:text-purple-400 transition-colors">${change.category}</p>
                  <p class="text-xs text-text3">
                    ${formatCurrency(change.previous)} → ${formatCurrency(change.current)}
                  </p>
                </div>
                <div class="flex items-center gap-1 ${change.isIncrease ? 'text-red-400' : change.isDecrease ? 'text-green-400' : 'text-text3'}">
                  <i class="fa-solid fa-arrow-${change.isIncrease ? 'up' : change.isDecrease ? 'down' : 'right'} text-xs"></i>
                  <span class="font-bold text-sm">${Math.abs(change.change).toFixed(0)}%</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Daily Spending Pattern -->
        <div class="glass bg-gradient-to-br from-white/5 to-transparent p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-green-500/10 card-elevated chart-card-glow">
          <h4 class="font-bold text-text mb-2 flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center shadow-md">
              <i class="fa-solid fa-calendar-week text-sm"></i>
            </div>
            Daily Spending Pattern
          </h4>
          <p class="text-xs text-text3 mb-4 italic">${dailyPattern.insight}</p>
          <div class="h-[200px] relative">
            <canvas id="dailySpendingChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Savings Health & Smart Recommendations -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Savings Health Indicator -->
        <div class="glass bg-gradient-to-br from-white/5 to-transparent p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-500/10 card-elevated">
          <h4 class="font-bold text-text mb-4 flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center shadow-md">
              <i class="fa-solid fa-piggy-bank text-sm"></i>
            </div>
            Savings Health
          </h4>
          <div class="flex items-center gap-6">
            <div class="relative w-32 h-32 flex-shrink-0 group cursor-pointer">
              <canvas id="savingsRadialChart"></canvas>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <p class="text-2xl font-bold ${savingsHealth.color} group-hover:scale-110 transition-transform">${savingsHealth.ratio}%</p>
                <p class="text-xs text-text3">saved</p>
              </div>
            </div>
            <div class="flex-1 space-y-3">
              <div>
                <p class="text-sm text-text3 mb-1">Status</p>
                <p class="font-bold text-lg ${savingsHealth.color}">${savingsHealth.status}</p>
              </div>
              <div>
                <p class="text-sm text-text3 mb-1">Income vs Expenses</p>
                <div class="flex items-center gap-2 text-sm">
                  <span class="text-green-400"><i class="fa-solid fa-arrow-up"></i> ${formatCurrency(savingsHealth.income)}</span>
                  <span class="text-text3">/</span>
                  <span class="text-red-400"><i class="fa-solid fa-arrow-down"></i> ${formatCurrency(savingsHealth.expense)}</span>
                </div>
              </div>
              <div class="p-3 rounded-lg bg-bg/50 backdrop-blur-sm border border-border hover:border-brand-500/30 transition-all duration-200">
                <p class="text-xs text-text2">${savingsHealth.message}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Smart Recommendations -->
        <div class="glass bg-gradient-to-br from-white/5 to-transparent p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-yellow-500/10 card-elevated">
          <h4 class="font-bold text-text mb-4 flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center shadow-md">
              <i class="fa-solid fa-lightbulb text-sm"></i>
            </div>
            Smart Recommendations
          </h4>
          <div class="space-y-3 max-h-[280px] overflow-y-auto pr-2">
            ${recommendations.map((rec, idx) => `
              <div class="p-4 rounded-lg ${rec.bg} backdrop-blur-sm border border-border hover:shadow-md hover:border-current transition-all duration-200 animate-slide-up-fade cursor-pointer group" style="animation-delay: ${idx * 100}ms">
                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-full bg-white/10 ${rec.color} flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                    <i class="fa-solid ${rec.icon} text-sm"></i>
                  </div>
                  <p class="text-sm text-text2 leading-relaxed group-hover:text-text transition-colors">${rec.text}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Anomaly Detection & Budget Tracking -->
      ${anomalies.length > 0 || budgetTracking.length > 0 ? `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <!-- Anomaly Detection -->
          ${anomalies.length > 0 ? `
            <div class="glass p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-red-500/10">
              <h4 class="font-bold text-text mb-4 flex items-center gap-2">
                <i class="fa-solid fa-triangle-exclamation text-red-500"></i>
                Anomaly Detection
              </h4>
              <div class="space-y-3">
                ${anomalies.map(anomaly => `
                  <div class="p-4 rounded-lg bg-red-500/5 border border-red-500/20 hover:border-red-500/40 transition-all duration-200">
                    <div class="flex items-center justify-between mb-2">
                      <p class="font-medium text-text">${anomaly.description}</p>
                      <span class="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">${anomaly.category}</span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                      <p class="text-text3">${anomaly.date}</p>
                      <p class="font-bold text-red-500">${formatCurrency(anomaly.amount)}</p>
                    </div>
                    <p class="text-xs text-text3 mt-2">
                      <i class="fa-solid fa-circle-exclamation mr-1"></i>
                      ${anomaly.deviation}σ above average — unusually high
                    </p>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Budget Tracking -->
          ${budgetTracking.length > 0 ? `
            <div class="glass p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10">
              <h4 class="font-bold text-text mb-4 flex items-center gap-2">
                <i class="fa-solid fa-bullseye text-blue-500"></i>
                Budget Tracking
              </h4>
              <div class="space-y-4 max-h-[280px] overflow-y-auto pr-2">
                ${budgetTracking.map(budget => `
                  <div class="group">
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-medium text-text">${budget.category}</span>
                        <span class="text-xs px-2 py-0.5 rounded-full ${
                          budget.status === 'over' ? 'bg-red-500/10 text-red-500' :
                          budget.status === 'warning' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-green-500/10 text-green-500'
                        }">
                          ${budget.status === 'over' ? 'Over Budget' : budget.status === 'warning' ? 'Near Limit' : 'On Track'}
                        </span>
                      </div>
                      <p class="text-sm text-text3">
                        <span class="font-medium text-text">${formatCurrency(budget.spent)}</span> / ${formatCurrency(budget.budget)}
                      </p>
                    </div>
                    <div class="w-full bg-border rounded-full h-2 overflow-hidden">
                      <div class="h-2 rounded-full transition-all duration-500 ${
                        budget.status === 'over' ? 'bg-red-500' :
                        budget.status === 'warning' ? 'bg-yellow-500' :
                        'bg-gradient-to-r from-green-500 to-emerald-500'
                      }" style="width: ${Math.min(budget.percentage, 100)}%"></div>
                    </div>
                    <p class="text-xs text-text3 mt-1">
                      ${budget.remaining >= 0 ? `${formatCurrency(budget.remaining)} remaining` : `${formatCurrency(Math.abs(budget.remaining))} over budget`}
                    </p>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Existing Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-1 glass p-6 rounded-2xl flex flex-col relative overflow-hidden transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-500/10 h-[360px]">
          <h4 class="font-bold text-text mb-2 uppercase text-sm tracking-wider">Top Categories</h4>
          <div class="flex-1 relative w-full h-full">
            <canvas id="insightsDoughnutChart"></canvas>
          </div>
        </div>

        <div class="lg:col-span-2 glass p-6 rounded-2xl flex flex-col relative overflow-hidden transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10 h-[360px]">
          <h4 class="font-bold text-text mb-2 uppercase text-sm tracking-wider">MoM Comparison</h4>
          <div class="flex-1 relative w-full h-full">
            <canvas id="insightsBarChart"></canvas>
          </div>
        </div>
      </div>

      <div class="glass p-6 rounded-2xl flex flex-col relative overflow-hidden transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-green-500/10 h-[360px]">
        <h4 class="font-bold text-text mb-2 uppercase text-sm tracking-wider">Income vs Expense Trend</h4>
        <div class="flex-1 relative w-full h-full">
          <canvas id="insightsLineChart"></canvas>
        </div>
      </div>

    </div>
  `;
  
  const chartDataObj = {
    doughnut: { 
      labels: Object.keys(catTotals), 
      data: Object.values(catTotals)
    },
    bar: { 
      prevInc: trendSummary?.income.previous || 0, 
      currInc: trendSummary?.income.current || 0, 
      prevExp: trendSummary?.expense.previous || 0, 
      currExp: trendSummary?.expense.current || 0 
    },
    line: { labels: lineMonths, incomes: lineIncomes, expenses: lineExpenses },
    daily: dailyPattern,
    savings: savingsHealth
  };

  UI.content.innerHTML = html;
  requestAnimationFrame(() => initInsightsCharts(chartDataObj));
}

// --- CRUD OPERATIONS ---
function openModal(id = null) {
  if (appState.role !== 'admin') {
    showToast('Only administrators can perform this action', 'error');
    return;
  }
  
  if (id) {
    const t = appState.transactions.find(x => x.id === id);
    if(t) {
      UI.modalTitle.textContent = 'Edit Transaction';
      document.getElementById('txn-id').value = id;
      document.getElementById('txn-desc').value = t.description;
      document.getElementById('txn-amount').value = t.amount;
      document.getElementById('txn-date').value = t.date;
      document.getElementById('txn-type').value = t.type;
      document.getElementById('txn-category').value = t.category;
    }
  } else {
    UI.modalTitle.textContent = 'Add Transaction';
    UI.form.reset();
    document.getElementById('txn-id').value = '';
    document.getElementById('txn-date').value = new Date().toISOString().split('T')[0];
  }

  UI.modal.classList.remove('hidden');
  setTimeout(() => {
    const content = document.getElementById('modal-content');
    content.classList.remove('scale-95', 'opacity-0', 'translate-y-4');
    content.classList.add('scale-100', 'opacity-100', 'translate-y-0');
  }, 10);
}

function closeModal() {
  const content = document.getElementById('modal-content');
  content.classList.remove('scale-100', 'opacity-100', 'translate-y-0');
  content.classList.add('scale-95', 'opacity-0', 'translate-y-4');
  
  setTimeout(() => {
    UI.modal.classList.add('hidden');
  }, 200);
}

function handleFormSubmit(e) {
  e.preventDefault();
  
  const idValue = document.getElementById('txn-id').value;
  const newTxn = {
    id: idValue || 'tx-' + Math.random().toString(36).substr(2, 9),
    description: document.getElementById('txn-desc').value,
    amount: parseFloat(document.getElementById('txn-amount').value).toFixed(2),
    date: document.getElementById('txn-date').value,
    type: document.getElementById('txn-type').value,
    category: document.getElementById('txn-category').value,
  };

  if (idValue) {
    const idx = appState.transactions.findIndex(t => t.id === idValue);
    if(idx !== -1) appState.transactions[idx] = newTxn;
    showToast('Transaction updated', 'success');
  } else {
    appState.transactions.unshift(newTxn);
    showToast('Transaction added', 'success');
  }

  window.db.saveTransactions(appState.transactions);
  closeModal();
  if (appState.view === 'transactions') updateTable();
}

function deleteTransaction(id) {
  if (appState.role !== 'admin') return;
  if (confirm('Are you sure you want to delete this transaction?')) {
    appState.transactions = appState.transactions.filter(t => t.id !== id);
    window.db.saveTransactions(appState.transactions);
    showToast('Transaction deleted', 'info');
    if (appState.view === 'transactions') updateTable();
  }
}

// Expose app functions
window.app = {
  navigate,
  exportCSV,
  toggleSort,
  changePage,
  setPage,
  openModal,
  editTransaction: openModal,
  deleteTransaction,
  clearFilters,
  removeFilter,
  toggleCategoryFilter,
  setRole
};

// Start
document.addEventListener('DOMContentLoaded', init);

// --- INIT INSIGHTS CHARTS ---
function initInsightsCharts(data) {
  const colors = getThemeColors();
  const textColor = colors.text;
  const gridColor = colors.grid;

  if (!data) return;

  // 1. Daily Spending Pattern Chart
  const dailyCtx = document.getElementById('dailySpendingChart');
  if (dailyCtx && data.daily) {
    appState.charts.dailySpending = new Chart(dailyCtx, {
      type: 'bar',
      data: {
        labels: data.daily.days,
        datasets: [{
          label: 'Spending',
          data: data.daily.totals,
          backgroundColor: data.daily.totals.map((_, i) => {
            const maxVal = Math.max(...data.daily.totals);
            return data.daily.totals[i] === maxVal ? 'rgba(99, 102, 241, 0.8)' : 'rgba(99, 102, 241, 0.4)';
          }),
          borderRadius: 6,
          hoverBackgroundColor: 'rgba(99, 102, 241, 0.9)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return 'Spent: ' + formatCurrency(context.parsed.y);
              }
            }
          }
        },
        scales: {
          x: { 
            grid: { display: false }, 
            ticks: { color: textColor, font: { size: 10 } } 
          },
          y: { 
            beginAtZero: true,
            grid: { color: gridColor, borderDash: [3, 3] }, 
            ticks: { 
              color: textColor,
              font: { size: 10 },
              callback: function(value) {
                return '$' + value;
              }
            } 
          }
        }
      }
    });
  }

  // 2. Savings Radial Chart
  const savingsCtx = document.getElementById('savingsRadialChart');
  if (savingsCtx && data.savings) {
    const ratio = Math.min(Math.max(data.savings.ratio, 0), 100);
    appState.charts.savingsRadial = new Chart(savingsCtx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [ratio, 100 - ratio],
          backgroundColor: [
            data.savings.ratio >= 30 ? '#10b981' : data.savings.ratio >= 20 ? '#3b82f6' : data.savings.ratio >= 10 ? '#f59e0b' : '#ef4444',
            'rgba(148, 163, 184, 0.1)'
          ],
          borderWidth: 0,
          circumference: 360,
          rotation: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    });
  }

  // 3. Doughnut Chart (Category Spending)
  const pieCtx = document.getElementById('insightsDoughnutChart');
  if (pieCtx) {
    if (appState.charts.insightsDoughnut) {
      appState.charts.insightsDoughnut.destroy();
    }

    appState.charts.insightsDoughnut = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: data.doughnut.labels,
        datasets: [{
          data: data.doughnut.data,
          backgroundColor: [
            'rgba(99, 102, 241, 0.85)',   // Indigo
            'rgba(139, 92, 246, 0.85)',   // Violet
            'rgba(236, 72, 153, 0.85)',   // Pink
            'rgba(245, 158, 11, 0.85)',   // Amber
            'rgba(20, 184, 166, 0.85)',   // Teal
            'rgba(59, 130, 246, 0.85)'    // Blue
          ],
          borderWidth: 2,
          borderColor: gridColor,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          animateScale: true,
          animateRotate: true,
          duration: 800
        },
        plugins: {
          legend: { 
            position: 'bottom', 
            labels: { color: textColor, boxWidth: 10, usePointStyle: true, padding: 15, font: { size: 11 } } 
          },
          tooltip: {
            callbacks: {
               label: function(context) {
                  var label = context.label || '';
                  var value = context.parsed;
                  var total = context.dataset.data.reduce((a, b) => a + b, 0);
                  var percentage = ((value / total) * 100).toFixed(1);
                  return label + ': ' + formatCurrency(value) + ' (' + percentage + '%)';
               }
            }
          }
        },
        cutout: '70%'
      }
    });
  }

  // 4. Bar Chart (Month Over Month)
  const barCtx = document.getElementById('insightsBarChart');
  if (barCtx) {
    if (appState.charts.insightsBar) {
      appState.charts.insightsBar.destroy();
    }

    appState.charts.insightsBar = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: ['Previous Month', 'Current Month'],
            datasets: [
                {
                    label: 'Income',
                    data: [data.bar.prevInc, data.bar.currInc],
                    backgroundColor: '#10b981',
                    borderRadius: 4
                },
                {
                    label: 'Expense',
                    data: [data.bar.prevExp, data.bar.currExp],
                    backgroundColor: '#ef4444',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: textColor } },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                    }
                  }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: textColor } },
                y: { 
                  grid: { color: gridColor, borderDash: [5, 5] }, 
                  ticks: { 
                    color: textColor,
                    callback: function(value) {
                      return '$' + value;
                    }
                  } 
                }
            }
        }
    });
  }

  // 5. Line Chart (Historical Trend)
  const lineCtx = document.getElementById('insightsLineChart');
  if (lineCtx) {
      if (appState.charts.insightsLine) {
        appState.charts.insightsLine.destroy();
      }

      appState.charts.insightsLine = new Chart(lineCtx, {
          type: 'line',
          data: {
              labels: data.line.labels,
              datasets: [
                  {
                      label: 'Income Trend',
                      data: data.line.incomes,
                      borderColor: '#10b981',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      borderWidth: 2,
                      tension: 0.4,
                      fill: true,
                      pointBackgroundColor: '#10b981',
                      pointHoverRadius: 6
                  },
                  {
                      label: 'Expense Trend',
                      data: data.line.expenses,
                      borderColor: '#ef4444',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      borderWidth: 2,
                      tension: 0.4,
                      fill: true,
                      pointBackgroundColor: '#ef4444',
                      pointHoverRadius: 6
                  }
              ]
          },
          options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: {
                duration: 1000,
                easing: 'easeOutQuart'
              },
              interaction: { mode: 'index', intersect: false },
              plugins: { 
                legend: { labels: { color: textColor, usePointStyle: true, padding: 20 } },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                    }
                  }
                }
              },
              scales: {
                  x: { grid: { display: false, color: gridColor }, ticks: { color: textColor } },
                  y: { 
                    grid: { color: gridColor, borderDash: [5, 5] }, 
                    ticks: { 
                      color: textColor,
                      callback: function(value) {
                        return '$' + value;
                      }
                    } 
                  }
              }
          }
      });
  }
}
