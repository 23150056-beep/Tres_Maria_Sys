import { useState, useEffect } from 'react';
import { ArrowPathIcon, ArrowDownIcon, ArrowUpIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

const transactionTypeColors = {
  receive: { bg: 'bg-green-500/20', text: 'text-green-400', icon: ArrowDownIcon },
  issue: { bg: 'bg-red-500/20', text: 'text-red-400', icon: ArrowUpIcon },
  adjust: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: ArrowsRightLeftIcon },
  transfer: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: ArrowsRightLeftIcon },
  return: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: ArrowDownIcon }
};

export default function InventoryTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, [page, typeFilter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 25);
      if (typeFilter) params.append('type', typeFilter);
      
      const response = await api.get(`/inventory/transactions?${params}`);
      setTransactions(response.data.transactions || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (error) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory Transactions</h1>
          <p className="text-white/60 mt-1">Track all stock movements</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-4">
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="form-input"
          >
            <option value="">All Types</option>
            <option value="receive">Receive</option>
            <option value="issue">Issue</option>
            <option value="adjust">Adjust</option>
            <option value="transfer">Transfer</option>
            <option value="return">Return</option>
          </select>
          <button onClick={fetchTransactions} className="p-2 text-white/60 hover:text-white">
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Warehouse</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Before</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">After</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">By</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => {
                    const typeStyle = transactionTypeColors[txn.transaction_type] || transactionTypeColors.adjust;
                    const Icon = typeStyle.icon;
                    return (
                      <tr key={txn.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {txn.reference_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${typeStyle.bg} ${typeStyle.text}`}>
                            <Icon className="h-3 w-3 mr-1" />
                            {txn.transaction_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-white">{txn.product_name}</p>
                            <p className="text-xs text-white/60">{txn.sku}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                          {txn.warehouse_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {txn.quantity > 0 ? `+${txn.quantity}` : txn.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                          {txn.quantity_before}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                          {txn.quantity_after}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                          {new Date(txn.created_at).toLocaleString('en-PH')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                          {txn.created_by_name || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
              <p className="text-sm text-white/60">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-white/10 rounded text-sm text-white/60 hover:text-white disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-white/10 rounded text-sm text-white/60 hover:text-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
