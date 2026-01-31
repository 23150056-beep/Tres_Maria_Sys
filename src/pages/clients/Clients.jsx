import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, EyeIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { fetchClients(); }, [page]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/clients?page=${page}&limit=20`);
      setClients(response.data.clients || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (error) {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(c => 
    c.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value || 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-white/60 mt-1">Manage your customer base</p>
        </div>
        <Link to="/clients/new" className="btn-primary inline-flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />Add Client
        </Link>
      </div>
      <div className="glass-card p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <input type="text" placeholder="Search clients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input pl-10" />
        </div>
      </div>
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64"><div className="spinner h-12 w-12"></div></div>
        ) : (
          <>
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Business Name</th>
                  <th>Type</th>
                  <th>Tier</th>
                  <th className="text-right">Credit Limit</th>
                  <th className="text-center">Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id}>
                    <td className="font-medium text-white">{client.code}</td>
                    <td><p className="font-medium text-white">{client.business_name}</p><p className="text-xs text-white/50">{client.contact_person}</p></td>
                    <td>{client.client_type}</td>
                    <td>{client.pricing_tier_name || 'Standard'}</td>
                    <td className="text-right text-green-400">{formatCurrency(client.credit_limit)}</td>
                    <td className="text-center"><span className={`badge ${client.is_active ? 'badge-success' : 'bg-white/10 text-white/50'}`}>{client.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td className="text-right"><Link to={`/clients/${client.id}`} className="text-purple-400 hover:text-purple-300"><EyeIcon className="h-5 w-5 inline" /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t border-white/10 flex justify-between">
              <span className="text-sm text-white/50">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm disabled:opacity-50">Previous</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm disabled:opacity-50">Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
