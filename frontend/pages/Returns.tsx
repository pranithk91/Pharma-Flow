import React, { useState, useCallback } from 'react';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { 
  RotateCcw, Package, AlertCircle, CheckCircle,
  Trash2, Plus, FileText
} from 'lucide-react';

interface ReturnItem {
  id: number;
  medicineName: string;
  batchNo: string;
  quantity: number;
  reason: string;
  originalInvoice: string;
  returnDate: string;
  status: 'pending' | 'approved' | 'rejected';
}

const Returns: React.FC = () => {
  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; itemId: number | null }>({
    isOpen: false,
    itemId: null,
  });
  
  // Form state
  const [invoiceId, setInvoiceId] = useState('');
  const [medicineName, setMedicineName] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [returnType, setReturnType] = useState('');

  // Returns list
  const [returns, setReturns] = useState<ReturnItem[]>([
    {
      id: 1,
      medicineName: 'Paracetamol 500mg',
      batchNo: 'B2024-001',
      quantity: 5,
      reason: 'Expired',
      originalInvoice: 'PM2534701',
      returnDate: '2025-12-13',
      status: 'pending',
    },
    {
      id: 2,
      medicineName: 'Amoxicillin 250mg',
      batchNo: 'A2024-015',
      quantity: 10,
      reason: 'Damaged packaging',
      originalInvoice: 'PM2534702',
      returnDate: '2025-12-12',
      status: 'approved',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [itemCounter, setItemCounter] = useState(2);

  // Add return item
  const handleAddReturn = () => {
    if (!medicineName || !quantity || !reason) {
      setMessage({ type: 'error', text: 'Please fill all required fields' });
      return;
    }

    const newReturn: ReturnItem = {
      id: itemCounter + 1,
      medicineName,
      batchNo: batchNo || '-',
      quantity: parseInt(quantity),
      reason,
      originalInvoice: invoiceId || 'N/A',
      returnDate: new Date().toISOString().split('T')[0],
      status: 'pending',
    };

    setReturns([newReturn, ...returns]);
    setItemCounter(itemCounter + 1);
    
    // Clear form
    setInvoiceId('');
    setMedicineName('');
    setBatchNo('');
    setQuantity('');
    setReason('');
    setReturnType('');
    setMessage({ type: 'success', text: 'Return request added successfully' });
  };

  // Update return status
  const handleUpdateStatus = (id: number, status: 'approved' | 'rejected') => {
    setReturns(returns.map(r => r.id === id ? { ...r, status } : r));
  };

  // Request delete confirmation
  const requestDelete = useCallback((id: number) => {
    setDeleteConfirm({ isOpen: true, itemId: id });
  }, []);

  // Delete return after confirmation
  const handleDelete = useCallback(() => {
    if (deleteConfirm.itemId !== null) {
      setReturns(prev => prev.filter(r => r.id !== deleteConfirm.itemId));
      setMessage({ type: 'success', text: 'Return request deleted' });
    }
    setDeleteConfirm({ isOpen: false, itemId: null });
  }, [deleteConfirm.itemId]);

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  // Stats
  const pendingCount = returns.filter(r => r.status === 'pending').length;
  const approvedCount = returns.filter(r => r.status === 'approved').length;
  const totalReturnValue = returns.reduce((sum, r) => sum + r.quantity * 10, 0); // Placeholder calculation

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <RotateCcw className="mr-2 text-primary-600" size={24} />
            Returns Management
          </h2>
          <p className="text-sm text-slate-500">Process medicine returns and track refunds</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<FileText size={16} />}>
            Export Report
          </Button>
        </div>
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
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Returns</p>
              <p className="text-2xl font-bold text-slate-800">{returns.length}</p>
            </div>
            <div className="p-3 bg-slate-100 rounded-full">
              <RotateCcw size={20} className="text-slate-500" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-yellow-600 uppercase">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-full">
              <AlertCircle size={20} className="text-yellow-500" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-green-600 uppercase">Approved</p>
              <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <CheckCircle size={20} className="text-green-500" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-red-500 uppercase">Return Value</p>
              <p className="text-2xl font-bold text-red-600">₹{totalReturnValue}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-full">
              <Package size={20} className="text-red-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Add Return Form */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-orange-600 px-4 py-3">
              <h3 className="text-white font-medium flex items-center">
                <Plus className="mr-2" size={18} /> New Return Request
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <Input 
                label="Original Invoice ID"
                placeholder="PM2534701"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
              />
              
              <Select 
                label="Return Type"
                value={returnType}
                onChange={(e) => setReturnType(e.target.value)}
                options={[
                  { value: '', label: 'Select Type' },
                  { value: 'customer', label: 'Customer Return' },
                  { value: 'supplier', label: 'Return to Supplier' },
                  { value: 'expired', label: 'Expired Stock' },
                  { value: 'damaged', label: 'Damaged Goods' },
                ]}
              />

              <Input 
                label="Medicine Name *"
                placeholder="Enter medicine name"
                value={medicineName}
                onChange={(e) => setMedicineName(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input 
                  label="Batch No"
                  placeholder="Batch"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                />
                <Input 
                  label="Quantity *"
                  type="number"
                  placeholder="Qty"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min={1}
                />
              </div>

              <Select 
                label="Reason *"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                options={[
                  { value: '', label: 'Select Reason' },
                  { value: 'Expired', label: 'Expired' },
                  { value: 'Damaged packaging', label: 'Damaged Packaging' },
                  { value: 'Wrong medicine', label: 'Wrong Medicine Dispensed' },
                  { value: 'Quality issue', label: 'Quality Issue' },
                  { value: 'Customer changed mind', label: 'Customer Changed Mind' },
                  { value: 'Recall', label: 'Manufacturer Recall' },
                  { value: 'Other', label: 'Other' },
                ]}
              />

              <Button 
                className="w-full bg-orange-500 hover:bg-orange-600"
                icon={<Plus size={18} />}
                onClick={handleAddReturn}
              >
                Add Return Request
              </Button>
            </div>
          </div>
        </div>

        {/* Returns List */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700">Return Requests</h3>
              <span className="text-sm text-slate-500">{returns.length} items</span>
            </div>
            
            {returns.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <RotateCcw size={48} className="mx-auto mb-3 opacity-50" />
                <p className="font-medium">No return requests</p>
                <p className="text-sm">Add a new return using the form</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold text-xs uppercase sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Medicine</th>
                      <th className="px-4 py-3">Batch</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Invoice</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {returns.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{item.medicineName}</td>
                        <td className="px-4 py-3 text-slate-500">{item.batchNo}</td>
                        <td className="px-4 py-3 text-center font-medium">{item.quantity}</td>
                        <td className="px-4 py-3 text-slate-500">{item.reason}</td>
                        <td className="px-4 py-3 text-primary-600 font-medium">{item.originalInvoice}</td>
                        <td className="px-4 py-3 text-slate-500">{item.returnDate}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${getStatusBadge(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.status === 'pending' && (
                            <div className="flex items-center justify-center gap-1">
                              <button 
                                className="p-1.5 hover:bg-green-50 rounded text-green-500 hover:text-green-700"
                                title="Approve"
                                onClick={() => handleUpdateStatus(item.id, 'approved')}
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button 
                                className="p-1.5 hover:bg-red-50 rounded text-red-500 hover:text-red-700"
                                title="Reject"
                                onClick={() => handleUpdateStatus(item.id, 'rejected')}
                              >
                                <AlertCircle size={16} />
                              </button>
                            </div>
                          )}
                          <button 
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500"
                            title="Delete"
                            onClick={() => requestDelete(item.id)}
                          >
                            <Trash2 size={16} />
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
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, itemId: null })}
        onConfirm={handleDelete}
        title="Delete Return Request"
        message="Are you sure you want to delete this return request? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default Returns;

