import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      setSuppliers(response.data.suppliers || []);
    } catch (error) {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.code?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-white">Suppliers</h1><p className="text-white/60 mt-1">Manage your suppliers</p></div>
        <Link to="/suppliers/new" className="btn-primary inline-flex items-center"><PlusIcon className="h-5 w-5 mr-2" />Add Supplier</Link>
      </div>
      <div className="glass-card p-4">
        <div className="relative"><MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" /><input type="text" placeholder="Search suppliers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input w-full pl-10" /></div>
      </div>
      <div className="glass-card overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-64"><div className="spinner h-12 w-12"></div></div> : (
          <table className="glass-table">
            <thead><tr><th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Code</th><th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Contact</th><th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase">Phone</th><th className="px-6 py-3 text-center text-xs font-medium text-white/60 uppercase">Status</th><th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase">Actions</th></tr></thead>
            <tbody className="divide-y divide-white/10">
              {filteredSuppliers.map(supplier => (
                <tr key={supplier.id}>
                  <td className="px-6 py-4 text-sm font-medium text-white">{supplier.code}</td>
                  <td className="px-6 py-4 text-sm text-white">{supplier.name}</td>
                  <td className="px-6 py-4 text-sm text-white/60">{supplier.contact_person}</td>
                  <td className="px-6 py-4 text-sm text-white/60">{supplier.phone}</td>
                  <td className="px-6 py-4 text-center"><span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${supplier.is_active ? 'badge-success' : 'bg-white/10 text-white/60'}`}>{supplier.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-6 py-4 text-right"><Link to={`/suppliers/${supplier.id}/edit`} className="text-purple-400 hover:text-purple-300"><PencilIcon className="h-5 w-5 inline" /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
