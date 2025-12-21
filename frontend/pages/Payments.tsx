import React, { useState, useEffect, useCallback } from 'react';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { 
  CreditCard, Search, Calendar, Loader2, CheckCircle, AlertCircle,
  DollarSign, Clock, FileText, Filter, RefreshCw
} from 'lucide-react';
import { api } from '../utils/api';

interface Bill {
  BillId: string;
  BillNo: string;
  BillDate: string;
  MAgency: string;
  BillAmount: number;
  TaxAmount: number;
  BillTotal: number;
  DiscountInBill: number;
  DiscountAmount: number;
  DiscountPercent: number;
  BillPaymentStatus: string;
  PaymentDate: string | null;
  PaymentMode: string | null;
  AmountPaid: number;
  TransactionDetails: string;
}

interface PaymentModal {
  isOpen: boolean;
  bill: Bill | null;
}

const Payments: React.FC = () => {
  // Filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('unpaid');

  // Data state
  const [bills, setBills] = useState<Bill[]>([]);
  const [agencies, setAgencies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAgencies, setLoadingAgencies] = useState(true);

  // Payment modal state
  const [paymentModal, setPaymentModal] = useState<PaymentModal>({ isOpen: false, bill: null });
  const [paymentMode, setPaymentMode] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [transactionDetails, setTransactionDetails] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Message state
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Stats
  const totalUnpaid = bills.filter(b => b.BillPaymentStatus === 'unpaid').reduce((sum, b) => sum + b.BillTotal, 0);
  const totalPaid = bills.filter(b => b.BillPaymentStatus === 'paid').reduce((sum, b) => sum + b.AmountPaid, 0);
  const pendingCount = bills.filter(b => b.BillPaymentStatus === 'unpaid').length;

  // Fetch agencies
  useEffect(() => {
    const fetchAgencies = async () => {
      try {
        setLoadingAgencies(true);
        const response = await api.get('/payments/api/agencies');
        if (response.data.success) {
          setAgencies(response.data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch agencies:', error);
      } finally {
        setLoadingAgencies(false);
      }
    };
    fetchAgencies();
  }, []);

  // Fetch bills
  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (agencyFilter) params.append('agency', agencyFilter);
      if (statusFilter) params.append('payment_status', statusFilter);

      const response = await api.get(`/payments/api/bills?${params.toString()}`);
      if (response.data.success) {
        setBills(response.data.data || []);
      }
    } catch (error: unknown) {
      console.error('Failed to fetch bills:', error);
      // Check for 403 status through axios error structure
      const isAccessDenied = error && typeof error === 'object' && 'response' in error && 
        (error as { response?: { status?: number } }).response?.status === 403;
      if (isAccessDenied) {
        setMessage({ type: 'error', text: 'Access denied. You do not have permission to view payments.' });
      }
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, agencyFilter, statusFilter]);

  useEffect(() => {
    fetchBills();
  }, []);

  // Open payment modal
  const openPaymentModal = (bill: Bill) => {
    setPaymentModal({ isOpen: true, bill });
    setAmountPaid(String(bill.BillTotal));
    setPaymentMode('');
    setTransactionDetails('');
  };

  // Close payment modal
  const closePaymentModal = () => {
    setPaymentModal({ isOpen: false, bill: null });
    setPaymentMode('');
    setAmountPaid('');
    setTransactionDetails('');
  };

  // Process payment
  const handlePayment = async () => {
    if (!paymentModal.bill) return;
    
    if (!paymentMode) {
      setMessage({ type: 'error', text: 'Please select a payment mode' });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await api.post(`/payments/api/mark-paid/${paymentModal.bill.BillId}`, {
        payment_mode: paymentMode,
        amount_paid: parseFloat(amountPaid) || paymentModal.bill.BillTotal,
        transaction_details: transactionDetails,
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: `✓ Bill ${paymentModal.bill.BillNo} marked as paid!` });
        closePaymentModal();
        fetchBills(); // Refresh the list
      }
    } catch (error: unknown) {
      console.error('Payment failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process payment';
      setMessage({ 
        type: 'error', 
        text: errorMessage 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <CreditCard className="mr-2 text-primary-600" size={24} />
            Supplier Payments
          </h2>
          <p className="text-sm text-slate-500">Manage and track supplier bill payments</p>
        </div>
        <Button variant="outline" icon={<RefreshCw size={16} />} onClick={fetchBills}>
          Refresh
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-xl border flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium">{message.text}</span>
          <button 
            className="ml-auto text-slate-400 hover:text-slate-600"
            onClick={() => setMessage(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Bills</p>
              <p className="text-2xl font-bold text-slate-800">{bills.length}</p>
            </div>
            <div className="p-3 bg-slate-100 rounded-full">
              <FileText size={20} className="text-slate-500" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-orange-500 uppercase">Pending</p>
              <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-full">
              <Clock size={20} className="text-orange-500" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-red-500 uppercase">Total Unpaid</p>
              <p className="text-2xl font-bold text-red-600">₹{totalUnpaid.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-full">
              <DollarSign size={20} className="text-red-500" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-green-500 uppercase">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">₹{totalPaid.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <CheckCircle size={20} className="text-green-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-slate-500" />
          <h3 className="font-semibold text-slate-700">Filters</h3>
        </div>
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
          <Select 
            label="Agency"
            value={agencyFilter}
            onChange={(e) => setAgencyFilter(e.target.value)}
            options={[
              { value: '', label: 'All Agencies' },
              ...agencies.map(a => ({ value: a, label: a }))
            ]}
          />
          <Select 
            label="Payment Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'unpaid', label: 'Unpaid' },
              { value: 'paid', label: 'Paid' },
            ]}
          />
          <Button 
            variant="primary" 
            icon={<Search size={16} />}
            onClick={fetchBills}
            className="mb-3"
          >
            Search
          </Button>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-800 text-white flex justify-between items-center">
          <h3 className="font-bold">Supplier Bills</h3>
          <span className="text-sm text-slate-300">{bills.length} records</span>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 size={32} className="animate-spin text-primary-500 mx-auto" />
            <p className="mt-2 text-slate-500">Loading bills...</p>
          </div>
        ) : bills.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <CreditCard size={48} className="mx-auto mb-3 opacity-50" />
            <p className="font-medium">No bills found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-semibold text-xs uppercase sticky top-0">
                <tr>
                  <th className="px-4 py-3">Bill No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Agency</th>
                  <th className="px-4 py-3 text-right">Bill Amount</th>
                  <th className="px-4 py-3 text-right">Tax</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Payment Date</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bills.map((bill, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-primary-600">{bill.BillNo}</td>
                    <td className="px-4 py-3 text-slate-500">{bill.BillDate}</td>
                    <td className="px-4 py-3">{bill.MAgency}</td>
                    <td className="px-4 py-3 text-right">₹{bill.BillAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">₹{bill.TaxAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-bold">₹{bill.BillTotal.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                        bill.BillPaymentStatus === 'paid' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {bill.BillPaymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {bill.PaymentDate || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {bill.BillPaymentStatus !== 'paid' && (
                        <Button 
                          size="sm" 
                          variant="primary"
                          onClick={() => openPaymentModal(bill)}
                        >
                          Pay
                        </Button>
                      )}
                      {bill.BillPaymentStatus === 'paid' && (
                        <span className="text-green-600 text-xs">
                          {bill.PaymentMode}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {paymentModal.isOpen && paymentModal.bill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-primary-600 px-6 py-4">
              <h3 className="text-white font-bold text-lg">Process Payment</h3>
              <p className="text-primary-100 text-sm">Bill #{paymentModal.bill.BillNo}</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-500">Agency:</span>
                  <span className="font-medium">{paymentModal.bill.MAgency}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-500">Bill Date:</span>
                  <span className="font-medium">{paymentModal.bill.BillDate}</span>
                </div>
                <div className="flex justify-between items-center text-lg">
                  <span className="text-slate-700 font-medium">Total Amount:</span>
                  <span className="font-bold text-green-600">₹{paymentModal.bill.BillTotal.toFixed(2)}</span>
                </div>
              </div>

              <Select 
                label="Payment Mode *"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                options={[
                  { value: '', label: 'Select Payment Mode' },
                  { value: 'Cash', label: 'Cash' },
                  { value: 'Bank Transfer', label: 'Bank Transfer' },
                  { value: 'Cheque', label: 'Cheque' },
                  { value: 'UPI', label: 'UPI' },
                ]}
              />

              <Input 
                label="Amount Paid"
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
              />

              <Input 
                label="Transaction Details"
                placeholder="Reference number, cheque no, etc."
                value={transactionDetails}
                onChange={(e) => setTransactionDetails(e.target.value)}
              />

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={closePaymentModal}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handlePayment}
                  disabled={isProcessing}
                  icon={isProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                >
                  {isProcessing ? 'Processing...' : 'Confirm Payment'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;

