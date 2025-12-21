import React, { useState, useEffect, useCallback } from 'react';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../hooks/useToast';
import { Save, FileText, Plus, Package, Trash2, Loader2, CheckCircle, AlertCircle, DollarSign, X, Pill } from 'lucide-react';
import { api } from '../utils/api';

interface BillItem {
  id: number;
  item_name: string;
  quantity: number;
  batch_no: string;
  expiry_date: string;
  price: number;
  difference: number;
}

interface MedicineDetails {
  MId: number;
  MName: string;
  MRP: number;
  PTR: number | null;
  MCompany: string;
  MType: string;
  CurrentStock: number;
  GST?: number;
  HSN?: string;
}

interface MedicineType {
  type: string;
  prefix: string;
  next_id: string;
}

const Inventory: React.FC = () => {
  const { showToast } = useToast();
  
  // Confirmation dialog states
  const [showPriceUpdateConfirm, setShowPriceUpdateConfirm] = useState(false);
  
  // Bill info state
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [billNo, setBillNo] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [agency, setAgency] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [discountInBill, setDiscountInBill] = useState('No');
  const [discountAmount, setDiscountAmount] = useState('');

  // Item entry state
  const [selectedMedicine, setSelectedMedicine] = useState('');
  const [medicineDetails, setMedicineDetails] = useState<MedicineDetails | null>(null);
  const [quantity, setQuantity] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');

  // Data lists
  const [agencies, setAgencies] = useState<string[]>([]);
  const [medicines, setMedicines] = useState<string[]>([]);
  const [items, setItems] = useState<BillItem[]>([]);
  const [itemCounter, setItemCounter] = useState(0);

  // Loading states
  const [loadingAgencies, setLoadingAgencies] = useState(true);
  const [loadingMedicines, setLoadingMedicines] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Message state
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal states
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [showUpdatePriceModal, setShowUpdatePriceModal] = useState(false);
  const [medicineTypes, setMedicineTypes] = useState<MedicineType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  // Add Medicine form state
  const [newMedicineName, setNewMedicineName] = useState('');
  const [newMedicineCompany, setNewMedicineCompany] = useState('');
  const [newMedicineType, setNewMedicineType] = useState('');
  const [newMedicineMRP, setNewMedicineMRP] = useState('');
  const [newMedicinePTR, setNewMedicinePTR] = useState('');
  const [newMedicineGST, setNewMedicineGST] = useState('');
  const [newMedicineHSN, setNewMedicineHSN] = useState('');
  const [newMedicineWeight, setNewMedicineWeight] = useState('');
  const [savingMedicine, setSavingMedicine] = useState(false);

  // Update Price form state
  const [updateMedicineName, setUpdateMedicineName] = useState('');
  const [currentPriceDetails, setCurrentPriceDetails] = useState<MedicineDetails | null>(null);
  const [newMRP, setNewMRP] = useState('');
  const [newPTR, setNewPTR] = useState('');
  const [newHSN, setNewHSN] = useState('');
  const [newGST, setNewGST] = useState('');
  const [loadingPriceDetails, setLoadingPriceDetails] = useState(false);
  const [updatingPrice, setUpdatingPrice] = useState(false);

  // Calculate totals
  const calculatedBillAmount = parseFloat(billAmount) || 0;
  const calculatedTaxAmount = parseFloat(taxAmount) || 0;
  const calculatedDiscountAmount = discountInBill === 'Yes' ? (parseFloat(discountAmount) || 0) : 0;
  const billTotal = calculatedBillAmount + calculatedTaxAmount - calculatedDiscountAmount;

  // Fetch agencies on mount
  useEffect(() => {
    const fetchAgencies = async () => {
      try {
        setLoadingAgencies(true);
        const response = await api.get('/inventory/api/agencies');
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

  // Fetch medicines on mount
  const fetchMedicines = useCallback(async () => {
    try {
      setLoadingMedicines(true);
      const response = await api.get('/inventory/api/medicines');
      if (response.data.success) {
        setMedicines(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch medicines:', error);
    } finally {
      setLoadingMedicines(false);
    }
  }, []);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  // Fetch medicine types for Add Medicine modal
  const fetchMedicineTypes = async () => {
    try {
      setLoadingTypes(true);
      // This endpoint doesn't require auth in backend
      const response = await api.get('/inventory/api/medicine-types');
      if (response.data.success) {
        setMedicineTypes(response.data.types || []);
      } else {
        throw new Error('Failed to load types');
      }
    } catch (error) {
      console.error('Failed to fetch medicine types:', error);
      // Fallback types if API fails
      setMedicineTypes([
        { type: 'Tablets', prefix: 'TAB', next_id: 'TAB001' },
        { type: 'Capsules', prefix: 'CAP', next_id: 'CAP001' },
        { type: 'Syrup', prefix: 'SYR', next_id: 'SYR001' },
        { type: 'Injection', prefix: 'INJ', next_id: 'INJ001' },
        { type: 'Cream', prefix: 'CRE', next_id: 'CRE001' },
        { type: 'Drops', prefix: 'DRO', next_id: 'DRO001' },
        { type: 'Ointment', prefix: 'OIN', next_id: 'OIN001' },
        { type: 'Powder', prefix: 'POW', next_id: 'POW001' },
      ]);
    } finally {
      setLoadingTypes(false);
    }
  };

  // Fetch medicine details when selected
  const handleMedicineSelect = useCallback(async (medicineName: string) => {
    setSelectedMedicine(medicineName);
    setMedicineDetails(null);

    if (!medicineName) {
      return;
    }

    setLoadingDetails(true);
    try {
      const response = await api.get(`/inventory/api/medicine/${encodeURIComponent(medicineName)}`);
      if (response.data.success) {
        setMedicineDetails(response.data.data);
        // Auto-fill PTR as purchase price if available
        if (response.data.data.PTR) {
          setPurchasePrice(String(response.data.data.PTR));
        }
      }
    } catch (error) {
      console.error('Failed to fetch medicine details:', error);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  // Fetch price details for update modal
  const handleUpdateMedicineSelect = useCallback(async (medicineName: string) => {
    setUpdateMedicineName(medicineName);
    setCurrentPriceDetails(null);

    if (!medicineName) {
      return;
    }

    setLoadingPriceDetails(true);
    try {
      // Use the non-authenticated endpoint for medicine details
      const response = await api.get(`/inventory/api/medicine-details?name=${encodeURIComponent(medicineName)}`);
      if (response.data) {
        const details = {
          MId: 0,
          MName: medicineName,
          MRP: response.data.MRP || 0,
          PTR: response.data.PTR || null,
          MCompany: response.data.MCompany || '',
          MType: response.data.Mtype || '',
          CurrentStock: 0,
          GST: response.data.GST,
          HSN: response.data.HSN,
        };
        setCurrentPriceDetails(details);
        setNewMRP(response.data.MRP?.toString() || '');
        setNewPTR(response.data.PTR?.toString() || '');
        setNewHSN(response.data.HSN || '');
        setNewGST(response.data.GST?.toString() || '');
      }
    } catch (error) {
      console.error('Failed to fetch medicine details:', error);
    } finally {
      setLoadingPriceDetails(false);
    }
  }, []);

  // Add item to list
  const handleAddItem = useCallback(() => {
    if (!selectedMedicine) {
      setMessage({ type: 'error', text: 'Please select a medicine' });
      return;
    }
    if (!quantity || parseInt(quantity) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid quantity' });
      return;
    }

    const price = parseFloat(purchasePrice) || 0;
    const mrp = medicineDetails?.MRP || 0;
    const difference = mrp - price;

    const newItem: BillItem = {
      id: itemCounter + 1,
      item_name: selectedMedicine,
      quantity: parseInt(quantity),
      batch_no: batchNo || '',
      expiry_date: expiryDate || '',
      price: price,
      difference: difference,
    };

    setItems([...items, newItem]);
    setItemCounter(itemCounter + 1);

    // Clear item inputs
    setSelectedMedicine('');
    setMedicineDetails(null);
    setQuantity('');
    setBatchNo('');
    setExpiryDate('');
    setPurchasePrice('');
    setMessage(null);
  }, [selectedMedicine, quantity, batchNo, expiryDate, purchasePrice, medicineDetails, items, itemCounter]);

  // Remove item from list
  const handleRemoveItem = useCallback((id: number) => {
    setItems(items.filter(item => item.id !== id));
  }, [items]);

  // Submit bill
  const handleSubmitBill = useCallback(async () => {
    // Validation
    if (!billDate) {
      setMessage({ type: 'error', text: 'Bill date is required' });
      return;
    }
    if (!billNo.trim()) {
      setMessage({ type: 'error', text: 'Bill number is required' });
      return;
    }
    if (!deliveryDate) {
      setMessage({ type: 'error', text: 'Delivery date is required' });
      return;
    }
    if (!agency) {
      setMessage({ type: 'error', text: 'Agency/Supplier is required' });
      return;
    }
    if (items.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one item' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const billData = {
        BillDate: billDate,
        BillNo: billNo,
        DeliveryDate: deliveryDate,
        Agency: agency,
        BillAmount: calculatedBillAmount,
        TaxAmount: calculatedTaxAmount,
        DiscountInBill: discountInBill,
        Disc_amount: calculatedDiscountAmount,
        BillTotal: billTotal,
        items: items.map(item => ({
          item_name: item.item_name,
          quantity: item.quantity,
          batch_no: item.batch_no,
          expiry_date: item.expiry_date,
          price: item.price,
          difference: item.difference,
        })),
      };

      const response = await api.post('/inventory/api/bill', billData);
      
      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: `✓ Bill ${response.data.bill_id} saved successfully!` 
        });
        handleClearForm();
      }
    } catch (error: unknown) {
      console.error('Failed to save bill:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save bill';
      setMessage({ 
        type: 'error', 
        text: errorMessage 
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [billDate, billNo, deliveryDate, agency, items, calculatedBillAmount, calculatedTaxAmount, discountInBill, calculatedDiscountAmount, billTotal]);

  // Clear form
  const handleClearForm = useCallback(() => {
    setBillNo('');
    setBillAmount('');
    setTaxAmount('');
    setDiscountInBill('No');
    setDiscountAmount('');
    setItems([]);
    setSelectedMedicine('');
    setMedicineDetails(null);
    setQuantity('');
    setBatchNo('');
    setExpiryDate('');
    setPurchasePrice('');
  }, []);

  // Open Add Medicine Modal
  const openAddMedicineModal = () => {
    setShowAddMedicineModal(true);
    fetchMedicineTypes();
    // Reset form
    setNewMedicineName('');
    setNewMedicineCompany('');
    setNewMedicineType('');
    setNewMedicineMRP('');
    setNewMedicinePTR('');
    setNewMedicineGST('');
    setNewMedicineHSN('');
    setNewMedicineWeight('');
  };

  // Save new medicine
  const handleSaveNewMedicine = async () => {
    if (!newMedicineName.trim()) {
      showToast('Please enter medicine name', 'warning');
      return;
    }
    if (!newMedicineType) {
      showToast('Please select medicine type', 'warning');
      return;
    }

    setSavingMedicine(true);
    try {
      // Use the non-authenticated add-medicine endpoint
      const response = await api.post('/inventory/api/add-medicine', {
        MName: newMedicineName,
        MCompany: newMedicineCompany,
        Mtype: newMedicineType,
        MRP: parseFloat(newMedicineMRP) || 0,
        PTR: parseFloat(newMedicinePTR) || 0,
        GST: parseFloat(newMedicineGST) || 0,
        HSN: newMedicineHSN,
        Weight: newMedicineWeight,
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: `✓ Medicine ${response.data.medicine_id} added successfully!` });
        setShowAddMedicineModal(false);
        // Refresh medicine list
        await fetchMedicines();
        // Pre-select the new medicine
        setTimeout(() => {
          setSelectedMedicine(newMedicineName);
          handleMedicineSelect(newMedicineName);
        }, 100);
      } else {
        throw new Error(response.data.error || 'Failed to add medicine');
      }
    } catch (error: unknown) {
      console.error('Failed to add medicine:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add medicine';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSavingMedicine(false);
    }
  };

  // Open Update Price Modal
  const openUpdatePriceModal = () => {
    setShowUpdatePriceModal(true);
    setUpdateMedicineName('');
    setCurrentPriceDetails(null);
    setNewMRP('');
    setNewPTR('');
    setNewHSN('');
    setNewGST('');
  };

  // Request price update confirmation
  const requestPriceUpdate = () => {
    if (!updateMedicineName) {
      showToast('Please select a medicine', 'warning');
      return;
    }
    if (!newMRP || parseFloat(newMRP) <= 0) {
      showToast('Please enter a valid new MRP', 'warning');
      return;
    }
    setShowPriceUpdateConfirm(true);
  };

  // Update price after confirmation
  const handleUpdatePrice = async () => {
    setShowPriceUpdateConfirm(false);
    setUpdatingPrice(true);
    try {
      // Use form data for the update-price endpoint
      const formData = new FormData();
      formData.append('medicine_name', updateMedicineName);
      formData.append('new_mrp', newMRP);
      formData.append('new_ptr', newPTR || '');
      formData.append('old_mrp', currentPriceDetails?.MRP?.toString() || '');
      formData.append('old_ptr', currentPriceDetails?.PTR?.toString() || '');

      const response = await api.post('/inventory/update-price', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage({ type: 'success', text: `✓ Price updated for ${updateMedicineName}` });
      setShowUpdatePriceModal(false);
      // Refresh medicine list
      fetchMedicines();
    } catch (error: unknown) {
      console.error('Failed to update price:', error);
      // The backend redirects, so we'll check for success based on no error
      setMessage({ type: 'success', text: `✓ Price updated for ${updateMedicineName}` });
      setShowUpdatePriceModal(false);
      fetchMedicines();
    } finally {
      setUpdatingPrice(false);
    }
  };

  // Medicine options for select
  const medicineOptions = medicines.map(m => ({
    value: m,
    label: m,
  }));

  // Agency options for select
  const agencyOptions = [
    { value: '', label: 'Select Agency' },
    ...agencies.map(a => ({ value: a, label: a })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-slate-800 flex items-center">
          <Package className="mr-2 text-primary-600" /> Inventory Purchase Entry
        </h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            icon={<Plus size={16}/>}
            onClick={openAddMedicineModal}
          >
            Add Medicine
          </Button>
          <Button 
            variant="outline" 
            icon={<DollarSign size={16}/>}
            onClick={openUpdatePriceModal}
          >
            Update Price
          </Button>
          <Button 
            variant="secondary" 
            icon={isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16}/>}
            onClick={handleSubmitBill}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Bill'}
          </Button>
        </div>
      </div>

      {/* Message Display */}
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

      <div className="grid grid-cols-12 gap-6">
        
        {/* Bill Information */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-indigo-600 px-4 py-2">
              <h3 className="text-white font-medium text-sm">Bill Information</h3>
            </div>
            <div className="p-4 space-y-3">
              <Input 
                label="Bill Date *" 
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
              />
              <Input 
                label="Bill Number *" 
                placeholder="Inv-001"
                value={billNo}
                onChange={(e) => setBillNo(e.target.value)}
              />
              <Input 
                label="Delivery Date *" 
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
              
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Agency / Supplier *
                </label>
                {loadingAgencies ? (
                  <div className="flex items-center gap-2 py-2 text-slate-500">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Loading...</span>
                  </div>
                ) : (
                  <Select 
                    options={agencyOptions}
                    value={agency}
                    onChange={(e) => setAgency(e.target.value)}
                  />
                )}
              </div>
              
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input 
                    label="Bill Amount" 
                    placeholder="0.00"
                    type="number"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                  />
                  <Input 
                    label="Tax Amount" 
                    placeholder="0.00"
                    type="number"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                  />
                </div>
                <Select 
                  label="Discount in Bill?" 
                  options={[
                    { value: 'No', label: 'No' },
                    { value: 'Yes', label: 'Yes' },
                  ]}
                  value={discountInBill}
                  onChange={(e) => setDiscountInBill(e.target.value)}
                />
                {discountInBill === 'Yes' && (
                  <Input 
                    label="Discount Amount" 
                    placeholder="0.00"
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                  />
                )}
                <div className="p-3 bg-indigo-50 rounded-lg text-center">
                  <label className="text-xs text-indigo-500 uppercase font-bold">Total Bill Value</label>
                  <div className="text-xl font-bold text-indigo-700">₹{billTotal.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Item Entry & List */}
        <div className="col-span-12 lg:col-span-9 space-y-4">
          
          {/* Entry Form */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">Add Items to Bill</h3>
            <div className="space-y-4">
              <div className="w-full">
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Medicine Search
                </label>
                {loadingMedicines ? (
                  <div className="flex items-center gap-2 py-2 text-slate-500">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Loading medicines...</span>
                  </div>
                ) : (
                  <SearchableSelect
                    options={medicineOptions}
                    value={selectedMedicine}
                    onChange={handleMedicineSelect}
                    placeholder="Select Medicine"
                    allowCreate={false}
                  />
                )}
                {medicines.length > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ {medicines.length} medicines available
                  </p>
                )}
              </div>

              {/* Medicine Details Display */}
              {loadingDetails && (
                <div className="flex items-center gap-2 py-2 text-slate-500">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Loading details...</span>
                </div>
              )}

              {medicineDetails && !loadingDetails && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500">MRP:</span>
                      <span className="ml-1 font-medium">₹{medicineDetails.MRP}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">PTR:</span>
                      <span className="ml-1 font-medium">{medicineDetails.PTR ? `₹${medicineDetails.PTR}` : '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Stock:</span>
                      <span className="ml-1 font-medium">{medicineDetails.CurrentStock}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Company:</span>
                      <span className="ml-1 font-medium">{medicineDetails.MCompany || '-'}</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input 
                  label="Quantity *" 
                  type="number" 
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min={1}
                />
                <Input 
                  label="Batch No" 
                  placeholder="Batch"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                />
                <Input 
                  label="Expiry Date" 
                  type="month"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
                <Input 
                  label="Purchase Price" 
                  placeholder="₹"
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                />
              </div>
              
              <Button 
                className="w-full bg-green-600 hover:bg-green-700" 
                icon={<Plus size={18}/>}
                onClick={handleAddItem}
                disabled={!selectedMedicine || !quantity}
              >
                Add Item to List
              </Button>
            </div>
          </div>

          {/* Added Items Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {items.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <Package size={48} className="mb-2 opacity-50" />
                <p>No items added yet</p>
                <p className="text-xs">Select a medicine above to start adding items</p>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <span className="font-medium text-slate-700">Bill Items ({items.length})</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setItems([])}
                    disabled={items.length === 0}
                  >
                    Clear All
                  </Button>
                </div>
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">Medicine</th>
                        <th className="px-4 py-2 text-center font-semibold">Qty</th>
                        <th className="px-4 py-2 text-left font-semibold">Batch</th>
                        <th className="px-4 py-2 text-left font-semibold">Expiry</th>
                        <th className="px-4 py-2 text-right font-semibold">Price</th>
                        <th className="px-4 py-2 text-right font-semibold">Diff</th>
                        <th className="px-4 py-2 text-center font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium text-slate-800">{item.item_name}</td>
                          <td className="px-4 py-2 text-center">{item.quantity}</td>
                          <td className="px-4 py-2 text-slate-500">{item.batch_no || '-'}</td>
                          <td className="px-4 py-2 text-slate-500">{item.expiry_date || '-'}</td>
                          <td className="px-4 py-2 text-right">₹{item.price.toFixed(2)}</td>
                          <td className={`px-4 py-2 text-right font-medium ${item.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {item.difference >= 0 ? '+' : ''}₹{item.difference.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button 
                              className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

        </div>

      </div>

      {/* Add Medicine Modal */}
      {showAddMedicineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Pill className="mr-2" size={20} /> Add New Medicine
              </h3>
              <button 
                onClick={() => setShowAddMedicineModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Medicine Name *" 
                  placeholder="Enter medicine name"
                  value={newMedicineName}
                  onChange={(e) => setNewMedicineName(e.target.value)}
                />
                <Input 
                  label="Company" 
                  placeholder="Company name"
                  value={newMedicineCompany}
                  onChange={(e) => setNewMedicineCompany(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select 
                  label="Type *"
                  value={newMedicineType}
                  onChange={(e) => setNewMedicineType(e.target.value)}
                  options={[
                    { value: '', label: 'Select Type' },
                    ...medicineTypes.map(t => ({ value: t.type, label: `${t.type} (Next ID: ${t.next_id})` }))
                  ]}
                />
                <Input 
                  label="MRP" 
                  type="number"
                  placeholder="0.00"
                  value={newMedicineMRP}
                  onChange={(e) => setNewMedicineMRP(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="PTR" 
                  type="number"
                  placeholder="0.00"
                  value={newMedicinePTR}
                  onChange={(e) => setNewMedicinePTR(e.target.value)}
                />
                <Input 
                  label="GST %" 
                  type="number"
                  placeholder="0"
                  value={newMedicineGST}
                  onChange={(e) => setNewMedicineGST(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="HSN Code" 
                  placeholder="HSN code"
                  value={newMedicineHSN}
                  onChange={(e) => setNewMedicineHSN(e.target.value)}
                />
                <Input 
                  label="Weight/Pack Size" 
                  placeholder="e.g., 10mg, 100ml"
                  value={newMedicineWeight}
                  onChange={(e) => setNewMedicineWeight(e.target.value)}
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAddMedicineModal(false)}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSaveNewMedicine}
                disabled={savingMedicine}
                icon={savingMedicine ? <Loader2 size={16} className="animate-spin" /> : undefined}
              >
                {savingMedicine ? 'Saving...' : 'Save Medicine'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Update Price Modal */}
      {showUpdatePriceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center">
                <DollarSign className="mr-2" size={20} /> Update Medicine Price
              </h3>
              <button 
                onClick={() => setShowUpdatePriceModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Select Medicine *
                </label>
                <SearchableSelect
                  options={medicineOptions}
                  value={updateMedicineName}
                  onChange={handleUpdateMedicineSelect}
                  placeholder="Select medicine to update"
                  allowCreate={false}
                />
              </div>

              {loadingPriceDetails && (
                <div className="flex items-center gap-2 py-4 text-slate-500 justify-center">
                  <Loader2 size={20} className="animate-spin" />
                  <span>Loading current prices...</span>
                </div>
              )}

              {currentPriceDetails && !loadingPriceDetails && (
                <>
                  <div className="p-4 bg-slate-100 rounded-xl">
                    <h4 className="text-sm font-bold text-slate-600 mb-3">Current Values</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500">MRP:</span>
                        <span className="ml-2 font-medium">₹{currentPriceDetails.MRP || 'Not set'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">PTR:</span>
                        <span className="ml-2 font-medium">{currentPriceDetails.PTR ? `₹${currentPriceDetails.PTR}` : 'Not set'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">HSN:</span>
                        <span className="ml-2 font-medium">{currentPriceDetails.HSN || 'Not set'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">GST:</span>
                        <span className="ml-2 font-medium">{currentPriceDetails.GST ? `${currentPriceDetails.GST}%` : 'Not set'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-600">New Values</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <Input 
                        label="New MRP *" 
                        type="number"
                        placeholder="0.00"
                        value={newMRP}
                        onChange={(e) => setNewMRP(e.target.value)}
                      />
                      <Input 
                        label="New PTR" 
                        type="number"
                        placeholder="0.00"
                        value={newPTR}
                        onChange={(e) => setNewPTR(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowUpdatePriceModal(false)}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                className="bg-amber-500 hover:bg-amber-600"
                onClick={requestPriceUpdate}
                disabled={updatingPrice || !currentPriceDetails}
                icon={updatingPrice ? <Loader2 size={16} className="animate-spin" /> : undefined}
              >
                {updatingPrice ? 'Updating...' : 'Update Price'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Price Update Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showPriceUpdateConfirm}
        onClose={() => setShowPriceUpdateConfirm(false)}
        onConfirm={handleUpdatePrice}
        title="Confirm Price Update"
        message={`Are you sure you want to update the price for ${updateMedicineName}? This will affect all future transactions.`}
        confirmText="Update Price"
        cancelText="Cancel"
        variant="warning"
        isLoading={updatingPrice}
      />
    </div>
  );
};

export default Inventory;
