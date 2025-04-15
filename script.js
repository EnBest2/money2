document.addEventListener('DOMContentLoaded', function() {
  // Globális változók
  let currentDate = new Date();
  let currentMonth = currentDate.getMonth(); // 0-index
  let currentYear = currentDate.getFullYear();
  const transactionsList = document.getElementById('transactions');
  const totalIncomeSpan = document.getElementById('total-income');
  const totalExpenseSpan = document.getElementById('total-expense');
  const totalSavingSpan = document.getElementById('total-saving');
  const balanceSpan = document.getElementById('balance');
  const currentMonthSpan = document.getElementById('current-month');

  const transactionForm = document.getElementById('transaction-form');
  const categorySelect = document.getElementById('transaction-category');

  const budgetForm = document.getElementById('budget-form');
  const monthlyBudgetInput = document.getElementById('monthly-budget');
  const savedBudgetSpan = document.getElementById('saved-budget');
  const budgetAdherenceSpan = document.getElementById('budget-adherence');

  const prevMonthBtn = document.getElementById('prev-month');
  const nextMonthBtn = document.getElementById('next-month');

  const exportCSVBtn = document.getElementById('export-csv');

  // Modal elemek az új kategória hozzáadásához
  const categoryModal = document.getElementById('category-modal');
  const addCategoryBtn = document.getElementById('add-category-btn');
  const closeModalSpan = document.querySelector('.close');
  const categoryForm = document.getElementById('category-form');

  // Chart.js változó
  let pieChart;
  const pieChartCtx = document.getElementById('pieChart').getContext('2d');

  // Segéd függvények a localStorage kulcsokhoz
  function getTransactionKey(year, month) {
    return 'transactions_' + year + '-' + (month + 1).toString().padStart(2, '0');
  }
  function getBudgetKey(year, month) {
    return 'budget_' + year + '-' + (month + 1).toString().padStart(2, '0');
  }

  // Kategóriák betöltése (ha nincs, inicializáljuk alapértelmezett kategóriákkal)
  function loadCategories() {
    let categories = JSON.parse(localStorage.getItem('categories'));
    if (!categories) {
      categories = [
        { id: 'default1', name: 'Étel', icon: '🍔', color: '#ff6384' },
        { id: 'default2', name: 'Utazás', icon: '✈️', color: '#36a2eb' },
        { id: 'default3', name: 'Szórakozás', icon: '🎬', color: '#ffce56' }
      ];
      localStorage.setItem('categories', JSON.stringify(categories));
    }
    return categories;
  }

  function saveCategories(categories) {
    localStorage.setItem('categories', JSON.stringify(categories));
  }

  // Kategória dropdown feltöltése
  function populateCategoryDropdown() {
    const categories = loadCategories();
    categorySelect.innerHTML = '';
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.icon + ' ' + category.name;
      option.style.color = category.color;
      categorySelect.appendChild(option);
    });
  }

  // Segéd függvény a hónap és év megjelenítésére
  function formatMonthYear(year, month) {
    const date = new Date(year, month);
    return date.toLocaleString('hu-HU', { month: 'long', year: 'numeric' });
  }

  // Segéd függvény a tranzakció típusának megjelenítéséhez
  function getTransactionTypeDisplay(type) {
    if (type === 'income') return 'Bevétel';
    else if (type === 'expense') return 'Kiadás';
    else if (type === 'saving-deposit') return 'Megtakarítás betét';
    else if (type === 'saving-withdrawal') return 'Megtakarítás kivét';
    return '';
  }

  // Tételek kirenderelése
  function renderTransactions() {
    const key = getTransactionKey(currentYear, currentMonth);
    let transactions = JSON.parse(localStorage.getItem(key)) || [];
    transactionsList.innerHTML = '';
    let totalIncome = 0, totalExpense = 0, totalSaving = 0;
    transactions.forEach(tx => {
      const li = document.createElement('li');
      const details = document.createElement('div');
      details.classList.add('transaction-item');
      details.innerHTML = `<span>${tx.date}</span>
                           <span>${getTransactionTypeDisplay(tx.type)}</span>
                           <span>${tx.amount} Ft</span>
                           <span>${getCategoryIcon(tx.category)}</span>`;
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Törlés';
      deleteBtn.addEventListener('click', () => {
        transactions = transactions.filter(item => item.id !== tx.id);
        localStorage.setItem(key, JSON.stringify(transactions));
        renderTransactions();
      });
      li.appendChild(details);
      li.appendChild(deleteBtn);
      transactionsList.appendChild(li);

      // Összegek számolása a típus szerint
      if (tx.type === 'income') {
        totalIncome += Number(tx.amount);
      } else if (tx.type === 'expense') {
        totalExpense += Number(tx.amount);
      } else if (tx.type === 'saving-deposit') {
        totalSaving += Number(tx.amount);
      } else if (tx.type === 'saving-withdrawal') {
        totalSaving -= Number(tx.amount);
      }
    });
    totalIncomeSpan.textContent = totalIncome;
    totalExpenseSpan.textContent = totalExpense;
    totalSavingSpan.textContent = totalSaving;
    balanceSpan.textContent = totalIncome - totalExpense;

    updateBudgetPlanner(totalExpense);
    updateChart(transactions);
  }

  // Visszaadja a kategória ikonját a kategória azonosítója alapján
  function getCategoryIcon(categoryId) {
    const categories = loadCategories();
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.icon : '';
  }

  // Új tranzakció hozzáadása
  transactionForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const type = document.getElementById('transaction-type').value;
    const date = document.getElementById('transaction-date').value;
    const amount = parseFloat(document.getElementById('transaction-amount').value);
    const category = document.getElementById('transaction-category').value;
    if (!date || isNaN(amount) || amount <= 0) return;
    const key = getTransactionKey(currentYear, currentMonth);
    let transactions = JSON.parse(localStorage.getItem(key)) || [];
    const newTx = {
      id: Date.now().toString(),
      type,
      date,
      amount,
      category
    };
    transactions.push(newTx);
    localStorage.setItem(key, JSON.stringify(transactions));
    transactionForm.reset();
    renderTransactions();
  });

  // Költségvetési űrlap kezelése
  budgetForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const budget = parseFloat(monthlyBudgetInput.value);
    if (isNaN(budget) || budget <= 0) return;
    localStorage.setItem(getBudgetKey(currentYear, currentMonth), budget);
    savedBudgetSpan.textContent = budget;
    renderTransactions();
  });

  function updateBudgetPlanner(expenseTotal) {
    const budget = parseFloat(localStorage.getItem(getBudgetKey(currentYear, currentMonth))) || 0;
    savedBudgetSpan.textContent = budget;
    if (budget > 0) {
      let adherence = ((expenseTotal / budget) * 100).toFixed(2);
      budgetAdherenceSpan.textContent = adherence + '%';
    } else {
      budgetAdherenceSpan.textContent = '0%';
    }
  }

  // Hónapok közti navigáció
  prevMonthBtn.addEventListener('click', function() {
    if (currentMonth === 0) {
      currentMonth = 11;
      currentYear--;
    } else {
      currentMonth--;
    }
    updateMonthDisplay();
    renderTransactions();
  });

  nextMonthBtn.addEventListener('click', function() {
    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear++;
    } else {
      currentMonth++;
    }
    updateMonthDisplay();
    renderTransactions();
  });

  function updateMonthDisplay() {
    currentMonthSpan.textContent = formatMonthYear(currentYear, currentMonth);
    const budget = localStorage.getItem(getBudgetKey(currentYear, currentMonth)) || 0;
    savedBudgetSpan.textContent = budget;
  }

  // CSV letöltés funkció
  exportCSVBtn.addEventListener('click', function() {
    const key = getTransactionKey(currentYear, currentMonth);
    const transactions = JSON.parse(localStorage.getItem(key)) || [];
    let csvContent = "Dátum;Típus;Kategória;Összeg (Ft)\n";
    transactions.forEach(tx => {
      const line = `${tx.date};${getTransactionTypeDisplay(tx.type)};${getCategoryIcon(tx.category)} ${getCategoryName(tx.category)};${tx.amount}`;
      csvContent += line + "\n";
    });
    // Összesítés hozzáadása a CSV fájlhoz
    let totalIncome = transactions.filter(t => t.type === 'income')
                                 .reduce((a, b) => a + Number(b.amount), 0);
    let totalExpense = transactions.filter(t => t.type === 'expense')
                                  .reduce((a, b) => a + Number(b.amount), 0);
    let totalSavingDeposit = transactions.filter(t => t.type === 'saving-deposit')
                                 .reduce((a, b) => a + Number(b.amount), 0);
    let totalSavingWithdrawal = transactions.filter(t => t.type === 'saving-withdrawal')
                                  .reduce((a, b) => a + Number(b.amount), 0);
    let totalSaving = totalSavingDeposit - totalSavingWithdrawal;
    csvContent += "\n--- Összesítés ---\n";
    csvContent += `Bevétel:;${totalIncome}\n`;
    csvContent += `Kiadás:;${totalExpense}\n`;
    csvContent += `Megtakarítás:;${totalSaving}\n`;
    const budget = localStorage.getItem(getBudgetKey(currentYear, currentMonth)) || 0;
    csvContent += `Költségvetés:;${budget}\n`;
    const adherence = (budget > 0 ? ((totalExpense / budget) * 100).toFixed(2) : 0);
    csvContent += `Költségvetés teljesülés (%):;${adherence}%\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `MoneyMonky-${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // Segéd: kategória név lekérése
  function getCategoryName(categoryId) {
    const categories = loadCategories();
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : '';
  }

  // Diagram frissítése (csak a kiadások alapján, kategóriák szerint)
  function updateChart(transactions) {
    const categories = loadCategories();
    let categoryTotals = {};
    categories.forEach(cat => {
      categoryTotals[cat.id] = 0;
    });
    transactions.forEach(tx => {
      if (tx.type === 'expense' && categoryTotals.hasOwnProperty(tx.category)) {
        categoryTotals[tx.category] += Number(tx.amount);
      }
    });
    const labels = [];
    const data = [];
    const backgroundColors = [];
    for (let cat of categories) {
      if (categoryTotals[cat.id] > 0) {
        labels.push(cat.name);
        data.push(categoryTotals[cat.id]);
        backgroundColors.push(cat.color);
      }
    }
    if (pieChart) pieChart.destroy();
    pieChart = new Chart(pieChartCtx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors
        }]
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.label || '';
                let value = context.parsed;
                let sum = data.reduce((a, b) => a + b, 0);
                let percent = ((value / sum) * 100).toFixed(2);
                return label + ': ' + percent + '%';
              }
            }
          }
        }
      }
    });
  }

  // Modal kezelése az új kategória felviteléhez
  addCategoryBtn.addEventListener('click', function() {
    categoryModal.style.display = 'block';
  });
  closeModalSpan.addEventListener('click', function() {
    categoryModal.style.display = 'none';
  });
  window.addEventListener('click', function(e) {
    if (e.target == categoryModal) {
      categoryModal.style.display = 'none';
    }
  });
  categoryForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('category-name').value;
    const icon = document.getElementById('category-icon').value;
    const color = document.getElementById('category-color').value;
    let categories = loadCategories();
    const newCategory = {
      id: 'cat_' + Date.now(),
      name,
      icon,
      color
    };
    categories.push(newCategory);
    saveCategories(categories);
    populateCategoryDropdown();
    categoryForm.reset();
    categoryModal.style.display = 'none';
  });

  // Inicializálás
  updateMonthDisplay();
  populateCategoryDropdown();
  renderTransactions();
});
