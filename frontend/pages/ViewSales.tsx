import React, { useState, useEffect, useCallback } from 'react';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { 
  ShoppingCart, Search, Calendar, Loader2, Receipt, 
  TrendingUp, DollarSign, Package, Eye, Printer
} from 'lucide-react';
import { api } from '../utils/api';

interface SaleItem {
  InvoiceId: string;
  InvoiceDate: string;
  PatientName: string;
  PatientPhone: string;
  UHId: string;
  TotalAmount: number;
  Discount: number;
  FinalAmount: number;
  PaymentMode: string;
  ItemCount?: number;
}

interface SalesStats {
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  cashSales: number;
  upiSales: number;
}

const ViewSales: React.FC = () => {
  // Filter state
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  // Data state
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [stats, setStats] = useState<SalesStats>({
    totalSales: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    cashSales: 0,
    upiSales: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);

  // Fetch sales data
  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      // For now, we'll use the pharmacy last invoice endpoint or simulate data
      // In production, you'd have a dedicated sales API
      const response = await api.get('/pharmacy/api/last-invoice');
      
      // Simulate sales data based on the last invoice structure
      // In a real implementation, you'd have a /pharmacy/api/sales endpoint
      if (response.data.success && response.data.data) {
        const invoice = response.data.data;
        const sampleSales: SaleItem[] = [
          {
            InvoiceId: invoice.InvoiceId || 'PM25347001',
            InvoiceDate: invoice.InvoiceDate || new Date().toISOString().split('T')[0],
            PatientName: invoice.PatientName || 'Sample Patient',
            PatientPhone: invoice.PatientPhone || '9876543210',
            UHId: invoice.UHId || 'TEMP-001',
            TotalAmount: invoice.TotalAmount || 500,
            Discount: invoice.Discount || 0,
            FinalAmount: invoice.FinalAmount || 500,
            PaymentMode: invoice.PaymentMode || 'Cash',
            ItemCount: invoice.items?.length || 1,
          }
        ];
        setSales(sampleSales);
        
        // Calculate stats
        const totalRevenue = sampleSales.reduce((sum, s) => sum + s.FinalAmount, 0);
        const cashSales = sampleSales.filter(s => s.PaymentMode === 'Cash').reduce((sum, s) => sum + s.FinalAmount, 0);
        const upiSales = sampleSales.filter(s => s.PaymentMode === 'UPI').reduce((sum, s) => sum + s.FinalAmount, 0);
        
        setStats({
          totalSales: sampleSales.length,
          totalRevenue,
          averageOrderValue: sampleSales.length > 0 ? totalRevenue / sampleSales.length : 0,
          cashSales,
          upiSales,
        });
      }
    } catch (error) {
      console.error('Failed to fetch sales:', error);
      // Set empty data on error
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // Filter sales
  const filteredSales = sales.filter(sale => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (
        !sale.PatientName.toLowerCase().includes(term) &&
        !sale.InvoiceId.toLowerCase().includes(term) &&
        !sale.UHId.toLowerCase().includes(term)
      ) {
        return false;
      }
    }
    if (paymentFilter && sale.PaymentMode !== paymentFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <ShoppingCart className="mr-2 text-primary-600" size={24} />
            View Sales
          </h2>
          <p className="text-sm text-slate-500">Track and analyze pharmacy sales records</p>
        </div>
        <Button variant="outline" icon={<Printer size={16} />}>
          Export Report
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Sales</p>
              <p className="text-2xl font-bold text-slate-800">{stats.totalSales}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <Receipt size={20} className="text-blue-500" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">₹{stats.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <TrendingUp size={20} className="text-green-500" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Avg Order Value</p>
              <p className="text-2xl font-bold text-slate-800">₹{stats.averageOrderValue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full">
              <DollarSign size={20} className="text-purple-500" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Cash Sales</p>
              <p className="text-2xl font-bold text-orange-600">₹{stats.cashSales.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-full">
              <DollarSign size={20} className="text-orange-500" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">UPI Sales</p>
              <p className="text-2xl font-bold text-indigo-600">₹{stats.upiSales.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-full">
              <DollarSign size={20} className="text-indigo-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <Input 
            label="From Date" 
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <Input 
            label="To Date" 
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <Input 
            label="Search" 
            placeholder="Invoice, Patient, UHID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select 
            label="Payment Mode"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            options={[
              { value: '', label: 'All Modes' },
              { value: 'Cash', label: 'Cash' },
              { value: 'UPI', label: 'UPI' },
              { value: 'Both', label: 'Both' },
            ]}
          />
          <Button 
            variant="primary" 
            icon={<Search size={16} />}
            onClick={fetchSales}
            className="mb-3"
          >
            Search
          </Button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700">Sales Records</h3>
          <span className="text-sm text-slate-500">{filteredSales.length} records</span>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 size={32} className="animate-spin text-primary-500 mx-auto" />
            <p className="mt-2 text-slate-500">Loading sales data...</p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <ShoppingCart size={48} className="mx-auto mb-3 opacity-50" />
            <p className="font-medium">No sales records found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-semibold text-xs uppercase">
                <tr>
                  <th className="px-6 py-3">Invoice ID</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Patient</th>
                  <th className="px-6 py-3">UHID</th>
                  <th className="px-6 py-3 text-center">Items</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3 text-right">Discount</th>
                  <th className="px-6 py-3 text-right">Final</th>
                  <th className="px-6 py-3 text-center">Payment</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((sale, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-primary-600">{sale.InvoiceId}</td>
                    <td className="px-6 py-3 text-slate-500">{sale.InvoiceDate}</td>
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-medium text-slate-800">{sale.PatientName}</p>
                        <p className="text-xs text-slate-400">{sale.PatientPhone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-500">{sale.UHId}</td>
                    <td className="px-6 py-3 text-center">
                      <span className="px-2 py-1 bg-slate-100 rounded-full text-xs font-medium">
                        {sale.ItemCount || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">₹{sale.TotalAmount.toFixed(2)}</td>
                    <td className="px-6 py-3 text-right text-red-500">
                      {sale.Discount > 0 ? `-₹${sale.Discount.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-green-600">₹{sale.FinalAmount.toFixed(2)}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                        sale.PaymentMode === 'Cash' ? 'bg-orange-100 text-orange-700' :
                        sale.PaymentMode === 'UPI' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {sale.PaymentMode}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <button 
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-primary-600"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-primary-600 ml-1"
                        title="Print Invoice"
                      >
                        <Printer size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewSales;

