import { useState, useEffect, useCallback } from 'react';
import { useTruck } from '../context/TruckContext';
import { financialAPI } from '../services/api';
import { DollarSign, Plus, TrendingUp, TrendingDown, X, Edit2, Trash2, Download, FileDown, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import RowDetailModal from '../components/RowDetailModal';

const expenseCategories = ['FOOD_SUPPLIES', 'FUEL', 'MAINTENANCE', 'PERMITS', 'INSURANCE', 'MARKETING', 'EQUIPMENT', 'LABOR', 'UTILITIES', 'RENT', 'OTHER'];
const COLORS = ['#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1', '#84cc16', '#a855f7'];
const ITEMS_PER_PAGE = 10;

const saleDetailFields = [
  { key: 'date', label: 'Date', render: (v) => v ? format(new Date(v), 'MMM d, yyyy') : '-' },
  { key: 'cashSales', label: 'Cash Sales', render: (v) => `$${(v || 0).toFixed(2)}` },
  { key: 'cardSales', label: 'Card Sales', render: (v) => `$${(v || 0).toFixed(2)}` },
  { key: 'mobileSales', label: 'Mobile Sales', render: (v) => `$${(v || 0).toFixed(2)}` },
  { key: 'totalSales', label: 'Total Sales', render: (v) => `$${(v || 0).toFixed(2)}` },
  { key: 'transactionCount', label: 'Transactions' },
  { key: 'notes', label: 'Notes' }
];

const expenseDetailFields = [
  { key: 'date', label: 'Date', render: (v) => v ? format(new Date(v), 'MMM d, yyyy') : '-' },
  { key: 'category', label: 'Category', render: (v) => v?.replace(/_/g, ' ') },
  { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount', render: (v) => `$${(v || 0).toFixed(2)}` },
  { key: 'vendor', label: 'Vendor' },
  { key: 'isRecurring', label: 'Recurring', render: (v) => v ? 'Yes' : 'No' },
  { key: 'notes', label: 'Notes' }
];

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function Financial() {
  const { selectedTruck } = useTruck();

  // Existing state
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [profitByLocation, setProfitByLocation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [salesForm, setSalesForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), cashSales: '', cardSales: '', mobileSales: '', transactionCount: '', notes: '' });
  const [expenseForm, setExpenseForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), category: 'FOOD_SUPPLIES', description: '', amount: '', vendor: '', isRecurring: false, notes: '' });

  // Sales tab state
  const [salesSearch, setSalesSearch] = useState('');
  const [salesPage, setSalesPage] = useState(1);
  const [salesTotalPages, setSalesTotalPages] = useState(1);
  const [salesTotal, setSalesTotal] = useState(0);
  const [selectedSaleIds, setSelectedSaleIds] = useState([]);

  // Expenses tab state
  const [expensesSearch, setExpensesSearch] = useState('');
  const [expensesPage, setExpensesPage] = useState(1);
  const [expensesTotalPages, setExpensesTotalPages] = useState(1);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState([]);

  // Detail modal state
  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [detailType, setDetailType] = useState(null);

  // Confirm dialog state
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Load overview data (summary, profit by location)
  const loadOverviewData = useCallback(async () => {
    if (!selectedTruck) return;
    try {
      const [summaryRes, profitRes] = await Promise.all([
        financialAPI.getSummary(selectedTruck.id),
        financialAPI.getProfitByLocation(selectedTruck.id)
      ]);
      setSummary(summaryRes.data);
      setProfitByLocation(profitRes.data);
    } catch (error) {
      console.error('Failed to load overview data:', error);
    }
  }, [selectedTruck]);

  // Load sales with pagination and search
  const loadSales = useCallback(async () => {
    if (!selectedTruck) return;
    try {
      const res = await financialAPI.getSales(selectedTruck.id, {
        page: salesPage,
        limit: ITEMS_PER_PAGE,
        search: salesSearch || undefined
      });
      setSales(res.data.data || res.data);
      if (res.data.pagination) {
        setSalesTotalPages(res.data.pagination.totalPages || 1);
        setSalesTotal(res.data.pagination.total || 0);
      }
    } catch (error) {
      console.error('Failed to load sales:', error);
    }
  }, [selectedTruck, salesPage, salesSearch]);

  // Load expenses with pagination and search
  const loadExpenses = useCallback(async () => {
    if (!selectedTruck) return;
    try {
      const res = await financialAPI.getExpenses(selectedTruck.id, {
        page: expensesPage,
        limit: ITEMS_PER_PAGE,
        search: expensesSearch || undefined
      });
      setExpenses(res.data.data || res.data);
      if (res.data.pagination) {
        setExpensesTotalPages(res.data.pagination.totalPages || 1);
        setExpensesTotal(res.data.pagination.total || 0);
      }
    } catch (error) {
      console.error('Failed to load expenses:', error);
    }
  }, [selectedTruck, expensesPage, expensesSearch]);

  // Initial load
  useEffect(() => {
    if (selectedTruck) {
      setLoading(true);
      Promise.all([loadOverviewData(), loadSales(), loadExpenses()]).finally(() => setLoading(false));
    }
  }, [selectedTruck]);

  // Reload sales when search/page changes
  useEffect(() => {
    if (selectedTruck && !loading) {
      loadSales();
    }
  }, [salesPage, salesSearch]);

  // Reload expenses when search/page changes
  useEffect(() => {
    if (selectedTruck && !loading) {
      loadExpenses();
    }
  }, [expensesPage, expensesSearch]);

  // Reset page to 1 when search changes
  const handleSalesSearchChange = (val) => {
    setSalesSearch(val);
    setSalesPage(1);
    setSelectedSaleIds([]);
  };

  const handleExpensesSearchChange = (val) => {
    setExpensesSearch(val);
    setExpensesPage(1);
    setSelectedExpenseIds([]);
  };

  // Reload all data helper
  const reloadAll = async () => {
    await Promise.all([loadOverviewData(), loadSales(), loadExpenses()]);
  };

  const handleSaveSales = async (e) => {
    e.preventDefault();
    try {
      await financialAPI.recordSales({ ...salesForm, truckId: selectedTruck.id });
      toast.success('Sales recorded');
      setShowSalesModal(false);
      reloadAll();
    } catch (error) {
      toast.error('Failed to record sales');
    }
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        await financialAPI.updateExpense(editingExpense.id, expenseForm);
        toast.success('Expense updated');
      } else {
        await financialAPI.createExpense({ ...expenseForm, truckId: selectedTruck.id });
        toast.success('Expense added');
      }
      setShowExpenseModal(false);
      setEditingExpense(null);
      reloadAll();
    } catch (error) {
      toast.error('Failed to save expense');
    }
  };

  const handleDeleteExpense = (id) => {
    setConfirmAction(() => async () => {
      try {
        await financialAPI.deleteExpense(id);
        toast.success('Expense deleted');
        setShowDetail(false);
        reloadAll();
      } catch (error) {
        toast.error('Failed to delete expense');
      }
    });
    setShowConfirm(true);
  };

  const openEditExpense = (expense) => {
    setShowDetail(false);
    setEditingExpense(expense);
    setExpenseForm({
      date: format(new Date(expense.date), 'yyyy-MM-dd'),
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      vendor: expense.vendor || '',
      isRecurring: expense.isRecurring,
      notes: expense.notes || ''
    });
    setShowExpenseModal(true);
  };

  // Bulk delete sales
  const handleBulkDeleteSales = () => {
    if (selectedSaleIds.length === 0) return;
    setConfirmAction(() => async () => {
      try {
        await financialAPI.bulkDeleteSales(selectedSaleIds);
        toast.success(`${selectedSaleIds.length} sale(s) deleted`);
        setSelectedSaleIds([]);
        reloadAll();
      } catch (error) {
        toast.error('Failed to delete sales');
      }
    });
    setShowConfirm(true);
  };

  // Bulk delete expenses
  const handleBulkDeleteExpenses = () => {
    if (selectedExpenseIds.length === 0) return;
    setConfirmAction(() => async () => {
      try {
        await financialAPI.bulkDeleteExpenses(selectedExpenseIds);
        toast.success(`${selectedExpenseIds.length} expense(s) deleted`);
        setSelectedExpenseIds([]);
        reloadAll();
      } catch (error) {
        toast.error('Failed to delete expenses');
      }
    });
    setShowConfirm(true);
  };

  // Selection toggles for sales
  const toggleSaleSelection = (id) => {
    setSelectedSaleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAllSales = () => {
    if (selectedSaleIds.length === sales.length) {
      setSelectedSaleIds([]);
    } else {
      setSelectedSaleIds(sales.map((s) => s.id));
    }
  };

  // Selection toggles for expenses
  const toggleExpenseSelection = (id) => {
    setSelectedExpenseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAllExpenses = () => {
    if (selectedExpenseIds.length === expenses.length) {
      setSelectedExpenseIds([]);
    } else {
      setSelectedExpenseIds(expenses.map((e) => e.id));
    }
  };

  // Export handlers
  const handleExportSalesCSV = async () => {
    try {
      const res = await financialAPI.exportSalesCSV(selectedTruck.id);
      downloadBlob(res.data, `sales-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      toast.success('Sales CSV exported');
    } catch (error) {
      toast.error('Failed to export sales CSV');
    }
  };

  const handleExportSalesPDF = async () => {
    try {
      const res = await financialAPI.exportSalesPDF(selectedTruck.id);
      downloadBlob(res.data, `sales-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Sales PDF exported');
    } catch (error) {
      toast.error('Failed to export sales PDF');
    }
  };

  const handleExportExpensesCSV = async () => {
    try {
      const res = await financialAPI.exportExpensesCSV(selectedTruck.id);
      downloadBlob(res.data, `expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      toast.success('Expenses CSV exported');
    } catch (error) {
      toast.error('Failed to export expenses CSV');
    }
  };

  const handleExportExpensesPDF = async () => {
    try {
      const res = await financialAPI.exportExpensesPDF(selectedTruck.id);
      downloadBlob(res.data, `expenses-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Expenses PDF exported');
    } catch (error) {
      toast.error('Failed to export expenses PDF');
    }
  };

  // Row click handlers
  const handleSaleRowClick = (sale) => {
    setDetailItem(sale);
    setDetailType('sale');
    setShowDetail(true);
  };

  const handleExpenseRowClick = (expense) => {
    setDetailItem(expense);
    setDetailType('expense');
    setShowDetail(true);
  };

  // Confirm dialog handlers
  const handleConfirm = async () => {
    setShowConfirm(false);
    if (confirmAction) {
      await confirmAction();
      setConfirmAction(null);
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
    setConfirmAction(null);
  };

  // Chart data (uses all loaded sales for overview charts)
  const chartData = sales.slice(0, 30).reverse().map(s => ({
    date: format(new Date(s.date), 'MMM d'),
    sales: s.totalSales
  }));

  const expensesByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  const pieData = Object.entries(expensesByCategory).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Financial</h1>
        <div className="flex gap-2">
          <button onClick={() => { setSalesForm({ date: format(new Date(), 'yyyy-MM-dd'), cashSales: '', cardSales: '', mobileSales: '', transactionCount: '', notes: '' }); setShowSalesModal(true); }} className="btn btn-secondary"><Plus className="h-4 w-4 mr-2" />Record Sales</button>
          <button onClick={() => { setEditingExpense(null); setExpenseForm({ date: format(new Date(), 'yyyy-MM-dd'), category: 'FOOD_SUPPLIES', description: '', amount: '', vendor: '', isRecurring: false, notes: '' }); setShowExpenseModal(true); }} className="btn btn-primary"><Plus className="h-4 w-4 mr-2" />Add Expense</button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-green-500" /><span className="text-sm text-gray-500">Total Revenue</span></div>
            <p className="text-2xl font-bold text-green-600">${summary.totalRevenue.toFixed(2)}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-red-500" /><span className="text-sm text-gray-500">Total Expenses</span></div>
            <p className="text-2xl font-bold text-red-600">${summary.totalExpenses.toFixed(2)}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary-500" /><span className="text-sm text-gray-500">Net Profit</span></div>
            <p className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>${summary.netProfit.toFixed(2)}</p>
          </div>
          <div className="card p-4">
            <span className="text-sm text-gray-500">Profit Margin</span>
            <p className={`text-2xl font-bold ${summary.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{summary.profitMargin.toFixed(1)}%</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {['overview', 'sales', 'expenses', 'locations'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 font-medium capitalize ${activeTab === tab ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>{tab}</button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="font-semibold mb-4">Sales Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Sales']} />
                <Line type="monotone" dataKey="sales" stroke="#f97316" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-6">
            <h3 className="font-semibold mb-4">Expenses by Category</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">No expenses recorded</div>
            )}
          </div>
        </div>
      )}

      {/* Sales */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <SearchBar value={salesSearch} onChange={handleSalesSearchChange} placeholder="Search sales..." />
            </div>
          </div>

          {/* Sales Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            {selectedSaleIds.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <CheckSquare className="h-4 w-4" />
                  {selectedSaleIds.length} selected
                </span>
                <button onClick={handleBulkDeleteSales} className="btn bg-red-600 text-white hover:bg-red-700 text-sm px-3 py-1.5 flex items-center gap-1.5">
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </button>
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={handleExportSalesCSV} className="btn btn-secondary text-sm px-3 py-1.5 flex items-center gap-1.5">
                <Download className="h-4 w-4" />
                CSV
              </button>
              <button onClick={handleExportSalesPDF} className="btn btn-secondary text-sm px-3 py-1.5 flex items-center gap-1.5">
                <FileDown className="h-4 w-4" />
                PDF
              </button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={sales.length > 0 && selectedSaleIds.length === sales.length}
                      onChange={toggleAllSales}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Cash</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Card</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Mobile</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Total</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Transactions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sales.map(sale => (
                  <tr key={sale.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleSaleRowClick(sale)}>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedSaleIds.includes(sale.id)}
                        onChange={() => toggleSaleSelection(sale.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{format(new Date(sale.date), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3">${sale.cashSales.toFixed(2)}</td>
                    <td className="px-4 py-3">${sale.cardSales.toFixed(2)}</td>
                    <td className="px-4 py-3">${sale.mobileSales.toFixed(2)}</td>
                    <td className="px-4 py-3 font-bold text-green-600">${sale.totalSales.toFixed(2)}</td>
                    <td className="px-4 py-3">{sale.transactionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sales.length === 0 && <div className="p-8 text-center text-gray-500">No sales recorded</div>}
          </div>

          <Pagination
            page={salesPage}
            totalPages={salesTotalPages}
            total={salesTotal}
            onPageChange={setSalesPage}
          />
        </div>
      )}

      {/* Expenses */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <SearchBar value={expensesSearch} onChange={handleExpensesSearchChange} placeholder="Search expenses..." />
            </div>
          </div>

          {/* Expenses Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            {selectedExpenseIds.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <CheckSquare className="h-4 w-4" />
                  {selectedExpenseIds.length} selected
                </span>
                <button onClick={handleBulkDeleteExpenses} className="btn bg-red-600 text-white hover:bg-red-700 text-sm px-3 py-1.5 flex items-center gap-1.5">
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </button>
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={handleExportExpensesCSV} className="btn btn-secondary text-sm px-3 py-1.5 flex items-center gap-1.5">
                <Download className="h-4 w-4" />
                CSV
              </button>
              <button onClick={handleExportExpensesPDF} className="btn btn-secondary text-sm px-3 py-1.5 flex items-center gap-1.5">
                <FileDown className="h-4 w-4" />
                PDF
              </button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={expenses.length > 0 && selectedExpenseIds.length === expenses.length}
                      onChange={toggleAllExpenses}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Vendor</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Amount</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {expenses.map(expense => (
                  <tr key={expense.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleExpenseRowClick(expense)}>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedExpenseIds.includes(expense.id)}
                        onChange={() => toggleExpenseSelection(expense.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">{format(new Date(expense.date), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 text-xs bg-gray-100 rounded-full">{expense.category.replace(/_/g, ' ')}</span></td>
                    <td className="px-4 py-3 font-medium">{expense.description}</td>
                    <td className="px-4 py-3 text-gray-500">{expense.vendor || '-'}</td>
                    <td className="px-4 py-3 font-bold text-red-600">${expense.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEditExpense(expense)} className="p-1.5 hover:bg-gray-100 rounded"><Edit2 className="h-4 w-4 text-gray-500" /></button>
                      <button onClick={() => handleDeleteExpense(expense.id)} className="p-1.5 hover:bg-gray-100 rounded"><Trash2 className="h-4 w-4 text-red-500" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expenses.length === 0 && <div className="p-8 text-center text-gray-500">No expenses recorded</div>}
          </div>

          <Pagination
            page={expensesPage}
            totalPages={expensesTotalPages}
            total={expensesTotal}
            onPageChange={setExpensesPage}
          />
        </div>
      )}

      {/* Locations */}
      {activeTab === 'locations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profitByLocation.map((loc, idx) => (
            <div key={idx} className="card p-4">
              <h3 className="font-semibold mb-3">{loc.location?.name}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Visits</span><p className="font-bold">{loc.visits}</p></div>
                <div><span className="text-gray-500">Total Revenue</span><p className="font-bold text-green-600">${loc.totalRevenue.toFixed(2)}</p></div>
                <div><span className="text-gray-500">Avg Revenue</span><p className="font-bold">${loc.averageRevenue.toFixed(2)}</p></div>
                <div><span className="text-gray-500">Avg Customers</span><p className="font-bold">{Math.round(loc.averageCustomers)}</p></div>
              </div>
            </div>
          ))}
          {profitByLocation.length === 0 && <div className="col-span-full text-center py-12 text-gray-500">No location data available</div>}
        </div>
      )}

      {/* Sales Modal */}
      {showSalesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-4 border-b flex justify-between items-center"><h2 className="text-lg font-semibold">Record Daily Sales</h2><button onClick={() => setShowSalesModal(false)}><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleSaveSales} className="p-4 space-y-4">
              <div><label className="label">Date</label><input type="date" value={salesForm.date} onChange={e => setSalesForm({ ...salesForm, date: e.target.value })} className="input" required /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="label">Cash Sales ($)</label><input type="number" step="0.01" value={salesForm.cashSales} onChange={e => setSalesForm({ ...salesForm, cashSales: e.target.value })} className="input" /></div>
                <div><label className="label">Card Sales ($)</label><input type="number" step="0.01" value={salesForm.cardSales} onChange={e => setSalesForm({ ...salesForm, cardSales: e.target.value })} className="input" /></div>
                <div><label className="label">Mobile Sales ($)</label><input type="number" step="0.01" value={salesForm.mobileSales} onChange={e => setSalesForm({ ...salesForm, mobileSales: e.target.value })} className="input" /></div>
              </div>
              <div><label className="label">Transaction Count</label><input type="number" value={salesForm.transactionCount} onChange={e => setSalesForm({ ...salesForm, transactionCount: e.target.value })} className="input" required /></div>
              <div className="flex gap-3"><button type="button" onClick={() => setShowSalesModal(false)} className="btn btn-secondary flex-1">Cancel</button><button type="submit" className="btn btn-primary flex-1">Save</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-4 border-b flex justify-between items-center"><h2 className="text-lg font-semibold">{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2><button onClick={() => setShowExpenseModal(false)}><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleSaveExpense} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Date</label><input type="date" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} className="input" required /></div>
                <div><label className="label">Category</label><select value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })} className="input">{expenseCategories.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}</select></div>
              </div>
              <div><label className="label">Description</label><input type="text" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} className="input" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Amount ($)</label><input type="number" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="input" required /></div>
                <div><label className="label">Vendor</label><input type="text" value={expenseForm.vendor} onChange={e => setExpenseForm({ ...expenseForm, vendor: e.target.value })} className="input" /></div>
              </div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={expenseForm.isRecurring} onChange={e => setExpenseForm({ ...expenseForm, isRecurring: e.target.checked })} className="rounded" />Recurring expense</label>
              <div className="flex gap-3"><button type="button" onClick={() => setShowExpenseModal(false)} className="btn btn-secondary flex-1">Cancel</button><button type="submit" className="btn btn-primary flex-1">{editingExpense ? 'Update' : 'Add'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Row Detail Modal */}
      <RowDetailModal
        isOpen={showDetail}
        title={detailType === 'sale' ? 'Sale Details' : 'Expense Details'}
        data={detailItem}
        fields={detailType === 'sale' ? saleDetailFields : expenseDetailFields}
        onClose={() => { setShowDetail(false); setDetailItem(null); setDetailType(null); }}
        onEdit={detailType === 'expense' ? (item) => openEditExpense(item) : undefined}
        onDelete={detailType === 'expense' ? (item) => handleDeleteExpense(item.id) : undefined}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        title="Confirm Delete"
        message="Are you sure you want to delete the selected item(s)? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
      />
    </div>
  );
}
