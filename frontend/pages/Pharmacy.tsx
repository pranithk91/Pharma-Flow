import React, { useState, useEffect, useCallback } from 'react';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../hooks/useToast';
import { 
  Plus, Trash2, Printer, CreditCard, User, Box, AlertCircle, 
  Loader2, CheckCircle, Package
} from 'lucide-react';
import { api } from '../utils/api';

// Types
interface Patient {
  PName: string;
  Phone: string;
  UHId: string;
}

interface Medicine {
  MId: number;
  MName: string;
  MRP: number;
  MCompany: string;
  CurrentStock: number;
  MType: string;
  BatchNo?: string;
}

interface BillItem {
  id: number;
  name: string;
  batch: string;
  qty: number;
  price: number;
  duration: string;
  total: number;
  mid: number;
}

interface MedicineDetails {
  MRP: number | null;
  MType: string | null;
  BatchNo: string | null;
}

const Pharmacy: React.FC = () => {
  const { showToast } = useToast();
  
  // Confirmation dialog state
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Patient state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [patientName, setPatientName] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [uhid, setUhid] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [generatingUhid, setGeneratingUhid] = useState(false);

  // Medicine state
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<string>('');
  const [medicineDetails, setMedicineDetails] = useState<MedicineDetails | null>(null);
  const [quantity, setQuantity] = useState('');
  const [duration, setDuration] = useState('');
  const [batchNo, setBatchNo] = useState('-');
  const [loadingMedicines, setLoadingMedicines] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [currentStock, setCurrentStock] = useState<number | null>(null);

  // Bill items
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [itemCounter, setItemCounter] = useState(0);

  // Payment state
  const [discount, setDiscount] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [paymentComments, setPaymentComments] = useState('');

  // Form state
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Calculations
  const grandTotal = billItems.reduce((sum, item) => sum + item.total, 0);
  const discountValue = parseFloat(discount) || 0;
  // Negative discount adds to total, positive subtracts
  const finalAmount = Math.max(grandTotal - discountValue, 0);

  // Fetch today's patients on mount
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoadingPatients(true);
        const response = await api.get('/pharmacy/api/today-patients');
        if (response.data.success) {
          setPatients(response.data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch patients:', error);
        setPatients([]);
      } finally {
        setLoadingPatients(false);
      }
    };
    fetchPatients();
  }, []);

  // Fetch medicines on mount
  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        setLoadingMedicines(true);
        const response = await api.get('/pharmacy/api/medicines');
        if (response.data.success) {
          setMedicines(response.data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch medicines:', error);
        setMedicines([]);
      } finally {
        setLoadingMedicines(false);
      }
    };
    fetchMedicines();
  }, []);

  // Generate UHID for new patient - similar to OP.tsx logic
  const generateUHId = useCallback(async (name: string) => {
    if (!name.trim()) {
      setUhid('');
      return;
    }

    setGeneratingUhid(true);
    try {
      // Use the same endpoint as OP page for consistency
      const response = await api.get(`/patient/api/generate-uhid?name=${encodeURIComponent(name)}`);
      if (response.data.success && response.data.uhid) {
        setUhid(response.data.uhid);
      }
    } catch (error) {
      console.error('Failed to generate UHId:', error);
      // Fallback to pharmacy endpoint
      try {
        const fallbackResponse = await api.get(`/pharmacy/api/next-uhid?name=${encodeURIComponent(name)}`);
        if (fallbackResponse.data.success && fallbackResponse.data.uhid) {
          setUhid(fallbackResponse.data.uhid);
        }
      } catch (fallbackError) {
        console.error('Fallback UHId generation also failed:', fallbackError);
      }
    } finally {
      setGeneratingUhid(false);
    }
  }, []);

  // Handle patient selection
  const handlePatientSelect = useCallback(async (value: string) => {
    setSelectedPatient(value);
    
    // Check if this is an existing patient or new
    const existingPatient = patients.find(p => p.PName === value);
    
    if (existingPatient) {
      // Existing patient - auto-fill details
      setPatientName(existingPatient.PName);
      setPhoneNo(existingPatient.Phone || '');
      setUhid(existingPatient.UHId || '');
      setIsNewPatient(false);
      setAge('');
      setGender('');
    } else if (value.trim()) {
      // New patient - show additional fields and generate UHID
      setPatientName(value);
      setPhoneNo('');
      setIsNewPatient(true);
      setAge('');
      setGender('');
      
      // Generate UHID for the new patient
      await generateUHId(value);
    } else {
      // Cleared selection
      setPatientName('');
      setPhoneNo('');
      setUhid('');
      setIsNewPatient(false);
      setAge('');
      setGender('');
    }
  }, [patients, generateUHId]);

  // Handle manual patient name input change (for new patients)
  const handlePatientNameChange = useCallback((value: string) => {
    setPatientName(value);
    setSelectedPatient(value);
    
    if (value.trim()) {
      const existingPatient = patients.find(p => p.PName.toLowerCase() === value.toLowerCase());
      if (existingPatient) {
        setPhoneNo(existingPatient.Phone || '');
        setUhid(existingPatient.UHId || '');
        setIsNewPatient(false);
      } else {
        setIsNewPatient(true);
        // Debounce UHId generation
        const timeoutId = setTimeout(() => {
          generateUHId(value);
        }, 500);
        return () => clearTimeout(timeoutId);
      }
    } else {
      setPhoneNo('');
      setUhid('');
      setIsNewPatient(false);
    }
  }, [patients, generateUHId]);

  // Handle medicine selection
  const handleMedicineSelect = useCallback(async (value: string) => {
    setSelectedMedicine(value);
    
    if (!value) {
      setMedicineDetails(null);
      setBatchNo('-');
      setCurrentStock(null);
      return;
    }
    
    // Find the medicine in our list
    const medicine = medicines.find(m => m.MName === value);
    if (medicine) {
      setCurrentStock(medicine.CurrentStock);
    }
    
    // Fetch medicine details
    setLoadingDetails(true);
    try {
      const response = await api.get(`/pharmacy/api/medicine-details?name=${encodeURIComponent(value)}`);
      if (response.data.success && response.data.data) {
        const details = response.data.data;
        setMedicineDetails(details);
        setBatchNo(details.BatchNo || '-');
      }
    } catch (error) {
      console.error('Failed to fetch medicine details:', error);
      setMedicineDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  }, [medicines]);

  // Add medicine to bill
  const handleAddMedicine = useCallback(() => {
    if (!selectedMedicine || !quantity) {
      showToast('Please select medicine and enter quantity', 'warning');
      return;
    }

    const medicine = medicines.find(m => m.MName === selectedMedicine);
    if (!medicine) {
      showToast('Medicine not found', 'error');
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      showToast('Please enter a valid quantity', 'warning');
      return;
    }

    // Validate stock
    if (qty > medicine.CurrentStock) {
      showToast(`Insufficient stock! Available: ${medicine.CurrentStock}, Requested: ${qty}`, 'error');
      return;
    }

    const newItem: BillItem = {
      id: itemCounter + 1,
      name: medicine.MName,
      batch: batchNo || '-',
      qty: qty,
      price: medicine.MRP,
      duration: duration || '-',
      total: medicine.MRP * qty,
      mid: medicine.MId,
    };

    setBillItems([...billItems, newItem]);
    setItemCounter(itemCounter + 1);
    
    // Clear inputs
    setSelectedMedicine('');
    setQuantity('');
    setDuration('');
    setBatchNo('-');
    setMedicineDetails(null);
    setCurrentStock(null);
  }, [selectedMedicine, quantity, duration, batchNo, medicines, billItems, itemCounter]);

  // Remove medicine from bill
  const handleRemoveMedicine = useCallback((id: number) => {
    setBillItems(billItems.filter(item => item.id !== id));
  }, [billItems]);

  // Clear all items
  const handleClearAll = useCallback(() => {
    if (billItems.length === 0) return;
    setShowClearConfirm(true);
  }, [billItems]);

  const confirmClearAll = useCallback(() => {
    setBillItems([]);
    setShowClearConfirm(false);
    showToast('All items cleared', 'info');
  }, [showToast]);

  // Handle payment mode change
  useEffect(() => {
    // Reset amounts when payment mode changes
    if (paymentMode === 'Cash') {
      setCashAmount(finalAmount.toFixed(2));
      setUpiAmount('0.00');
    } else if (paymentMode === 'UPI') {
      setUpiAmount(finalAmount.toFixed(2));
      setCashAmount('0.00');
    } else if (paymentMode === 'Both') {
      setCashAmount('');
      setUpiAmount('');
    }
  }, [paymentMode, finalAmount]);

  // Submit prescription
  const handleSubmit = useCallback(async () => {
    // Validation
    if (!patientName.trim()) {
      showToast('Please enter patient name', 'warning');
      return;
    }

    if (billItems.length === 0) {
      showToast('Please add at least one medicine to the prescription', 'warning');
      return;
    }

    if (!paymentMode) {
      showToast('Please select a payment mode', 'warning');
      return;
    }

    // Validate phone for new patient
    if (isNewPatient && phoneNo && (!/^\d{10}$/.test(phoneNo))) {
      showToast('Please enter a valid 10-digit phone number or leave it blank', 'warning');
      return;
    }

    // Validate split payment
    if (paymentMode === 'Both') {
      const cash = parseFloat(cashAmount) || 0;
      const upi = parseFloat(upiAmount) || 0;
      if (Math.abs(cash + upi - finalAmount) > 0.01) {
        showToast(`Cash + UPI (₹${(cash + upi).toFixed(2)}) must equal total ₹${finalAmount.toFixed(2)}`, 'error');
        return;
      }
    }

    setSubmitting(true);
    setSubmitMessage(null);

    try {
      const invoiceData = {
        patient_name: patientName,
        phone_no: phoneNo,
        uhid: uhid,
        age: age,
        gender: gender,
        medicines: billItems.map(item => ({
          medicine: item.name,
          batch_no: item.batch,
          quantity: item.qty,
          price: item.price,
          duration: item.duration,
        })),
        discount: discountValue,
        payment_mode: paymentMode,
        cash_amount: paymentMode === 'Cash' ? finalAmount : (paymentMode === 'Both' ? parseFloat(cashAmount) || 0 : 0),
        upi_amount: paymentMode === 'UPI' ? finalAmount : (paymentMode === 'Both' ? parseFloat(upiAmount) || 0 : 0),
        comments: paymentComments,
      };

      const response = await api.post('/pharmacy/api/invoice', invoiceData);
      
      if (response.data.success) {
        setSubmitMessage({
          type: 'success',
          text: `✓ Invoice ${response.data.invoice_id} created successfully! Total: ₹${response.data.final_amount?.toFixed(2)}`,
        });
        
        // Clear form
        handleClearForm();
        
        // Refresh patients list to include new patient
        try {
          const patientsResponse = await api.get('/pharmacy/api/today-patients');
          if (patientsResponse.data.success) {
            setPatients(patientsResponse.data.data || []);
          }
        } catch (e) {
          console.error('Failed to refresh patients:', e);
        }
      } else {
        throw new Error(response.data.error || 'Failed to create invoice');
      }
    } catch (error: unknown) {
      console.error('Failed to submit invoice:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create invoice';
      setSubmitMessage({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      setSubmitting(false);
    }
  }, [patientName, phoneNo, uhid, age, gender, billItems, discountValue, paymentMode, cashAmount, upiAmount, paymentComments, finalAmount, isNewPatient]);

  // Clear form
  const handleClearForm = useCallback(() => {
    setSelectedPatient('');
    setPatientName('');
    setPhoneNo('');
    setUhid('');
    setAge('');
    setGender('');
    setIsNewPatient(false);
    setBillItems([]);
    setDiscount('');
    setPaymentMode('');
    setCashAmount('');
    setUpiAmount('');
    setPaymentComments('');
    setSelectedMedicine('');
    setQuantity('');
    setDuration('');
    setBatchNo('-');
    setMedicineDetails(null);
    setCurrentStock(null);
  }, []);

  // Patient options for select
  const patientOptions = patients.map(p => ({
    value: p.PName,
    label: `${p.PName} - ${p.UHId}`,
    meta: p.Phone || '',
  }));

  // Medicine options for select
  const medicineOptions = medicines.map(m => ({
    value: m.MName,
    label: `${m.MName} - ₹${m.MRP} (Stock: ${m.CurrentStock})`,
    meta: m.MType || '',
  }));

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-6rem)]">
      {/* Clear Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={confirmClearAll}
        title="Clear All Items"
        message="Are you sure you want to remove all items from the bill? This action cannot be undone."
        confirmText="Clear All"
        cancelText="Cancel"
        variant="danger"
      />
      
      {/* LEFT COLUMN: Input Forms */}
      <div className="col-span-12 lg:col-span-4 space-y-4 overflow-y-auto custom-scrollbar pr-2">
        
        {/* Success/Error Messages */}
        {submitMessage && (
          <div className={`p-4 rounded-xl border ${
            submitMessage.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-700' 
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <div className="flex items-center gap-2">
              {submitMessage.type === 'success' ? (
                <CheckCircle size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
              <span className="font-medium">{submitMessage.text}</span>
            </div>
          </div>
        )}

        {/* Patient Details Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-orange-600 px-4 py-2 flex justify-between items-center">
            <h3 className="text-white font-medium text-sm flex items-center">
              <User className="mr-2" size={16} /> Patient Details
            </h3>
            <span className="text-orange-100 text-xs bg-orange-700 px-2 py-0.5 rounded">Required *</span>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Patient Name *
              </label>
              {loadingPatients ? (
                <div className="flex items-center gap-2 py-2 text-slate-500">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Loading patients...</span>
                </div>
              ) : (
                <SearchableSelect
                  options={patientOptions}
                  value={selectedPatient}
                  onChange={handlePatientSelect}
                  placeholder="Select or type patient name"
                  allowCreate={true}
                  createLabel="Add new patient"
                />
              )}
              {patients.length > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Loaded {patients.length} today's patients
                </p>
              )}
            </div>
            
            <Input 
              label="Phone Number" 
              placeholder="Enter 10-digit number"
              value={phoneNo}
              onChange={(e) => setPhoneNo(e.target.value.replace(/\D/g, '').slice(0, 10))}
              maxLength={10}
              pattern="[0-9]{10}"
            />
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  UHID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={generatingUhid ? "Generating..." : "Patient UHID"}
                    value={uhid}
                    disabled
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 disabled:cursor-not-allowed"
                  />
                  {generatingUhid && (
                    <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary-600" />
                  )}
                </div>
              </div>
              {isNewPatient && (
                <Input 
                  label="Age" 
                  type="number"
                  placeholder="Age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min={0}
                  max={150}
                />
              )}
            </div>

            {isNewPatient && (
              <Select
                label="Gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                options={[
                  { value: '', label: 'Select Gender' },
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                  { value: 'Other', label: 'Other' },
                ]}
              />
            )}
            
            {isNewPatient && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-2">
                <AlertCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  🆕 New patient will be added with UHID: <strong>{uhid || 'generating...'}</strong>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Medicine Input Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-primary-700 px-4 py-2">
            <h3 className="text-white font-medium text-sm flex items-center">
              <Box className="mr-2" size={16} /> Add Medicines
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Medicine Name
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
                  ✓ Loaded {medicines.length} medicines
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Input 
                label="Batch No" 
                placeholder="-" 
                value={batchNo}
                disabled 
              />
              <Input 
                label="Quantity" 
                type="number" 
                placeholder="Qty"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min={1}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input 
                label="Duration" 
                placeholder="e.g. 5 days"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              <Input 
                label="Price (Unit)" 
                placeholder="₹" 
                value={medicineDetails?.MRP ? `₹${medicineDetails.MRP}` : ''}
                disabled 
              />
            </div>

            {/* Medicine Details Section */}
            {loadingDetails && (
              <div className="flex items-center gap-2 py-2 text-slate-500">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Loading medicine details...</span>
              </div>
            )}

            {medicineDetails && !loadingDetails && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Medicine Details</h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-slate-500">MRP:</span>
                    <span className="ml-1 font-medium">
                      {medicineDetails.MRP ? `₹${medicineDetails.MRP}` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Type:</span>
                    <span className="ml-1 font-medium">{medicineDetails.MType || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Batch:</span>
                    <span className="ml-1 font-medium">{medicineDetails.BatchNo || '-'}</span>
                  </div>
                </div>
              </div>
            )}

            <Button 
              className="w-full mt-2 bg-orange-500 hover:bg-orange-600 text-white" 
              icon={<Plus size={18}/>}
              onClick={handleAddMedicine}
              disabled={!selectedMedicine || !quantity}
            >
              Add to Bill
            </Button>

            {currentStock !== null && (
              <div className={`text-xs font-medium flex items-center justify-center mt-2 ${
                currentStock > 10 ? 'text-green-600' : currentStock > 0 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                <Package size={14} className="mr-1" />
                Stock Available: {currentStock} units
              </div>
            )}
          </div>
        </div>

        {/* Payment Summary Input */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-800 px-4 py-2">
            <h3 className="text-white font-medium text-sm flex items-center">
              <CreditCard className="mr-2" size={16} /> Payment
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input 
                label="Discount" 
                placeholder="0.00 (use negative to add)"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                type="number"
                step="0.01"
              />
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 ml-1">
                  Final Amount
                </label>
                <div className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-lg font-bold text-green-600">
                  ₹{finalAmount.toFixed(2)}
                </div>
              </div>
            </div>

            <Select 
              label="Payment Mode *" 
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              options={[
                { value: '', label: 'Select payment mode' },
                { value: 'Cash', label: 'Cash' },
                { value: 'UPI', label: 'UPI' },
                { value: 'Both', label: 'Both (Cash + UPI)' },
              ]} 
            />

            {paymentMode === 'Both' && (
              <div className="grid grid-cols-2 gap-3">
                <Input 
                  label="Cash Amount" 
                  placeholder="Cash part"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  type="number"
                  step="0.01"
                  min={0}
                />
                <Input 
                  label="UPI Amount" 
                  placeholder="UPI part"
                  value={upiAmount}
                  onChange={(e) => setUpiAmount(e.target.value)}
                  type="number"
                  step="0.01"
                  min={0}
                />
              </div>
            )}

            <Input 
              label="Notes" 
              placeholder="Reason for discount or payment notes..."
              value={paymentComments}
              onChange={(e) => setPaymentComments(e.target.value)}
            />
            
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button 
                variant="outline"
                onClick={handleClearForm}
              >
                Clear Form
              </Button>
              <Button 
                variant="primary" 
                className="bg-green-600 hover:bg-green-700"
                onClick={handleSubmit}
                disabled={submitting || billItems.length === 0}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  'Submit Prescription'
                )}
              </Button>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Bill Table */}
      <div className="col-span-12 lg:col-span-8 flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-700">Current Bill Items</h3>
          <div className="text-right">
            {discountValue !== 0 && (
              <div className="flex items-center justify-end gap-3 mb-1">
                <div>
                  <p className="text-xs text-slate-400 uppercase">Subtotal</p>
                  <p className="text-sm text-slate-500 line-through">₹{grandTotal.toFixed(2)}</p>
                </div>
                <div className={`text-xs px-2 py-0.5 rounded ${discountValue > 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {discountValue > 0 ? `-₹${discountValue.toFixed(2)}` : `+₹${Math.abs(discountValue).toFixed(2)}`}
                </div>
              </div>
            )}
            <p className="text-xs text-slate-500 uppercase tracking-wider">Total to Pay</p>
            <p className="text-2xl font-bold text-green-600">₹{finalAmount.toFixed(2)}</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto custom-scrollbar">
          {billItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Package size={48} className="mb-3 opacity-50" />
              <p className="text-lg font-medium">No medicines added</p>
              <p className="text-sm">Add medicines from the left panel</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-semibold">Medicine Name</th>
                  <th className="px-4 py-3 font-semibold">Batch</th>
                  <th className="px-4 py-3 font-semibold text-center">Qty</th>
                  <th className="px-4 py-3 font-semibold text-right">Price</th>
                  <th className="px-4 py-3 font-semibold">Duration</th>
                  <th className="px-4 py-3 font-semibold text-right">Total</th>
                  <th className="px-4 py-3 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {billItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                    <td className="px-4 py-3 text-slate-500">{item.batch}</td>
                    <td className="px-4 py-3 text-center">{item.qty}</td>
                    <td className="px-4 py-3 text-right">₹{item.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-500">{item.duration}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">₹{item.total.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                        onClick={() => handleRemoveMedicine(item.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-right font-bold text-slate-700">
                    Subtotal:
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-lg text-slate-700">
                    ₹{grandTotal.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
                {discountValue !== 0 && (
                  <tr className="border-t border-slate-200">
                    <td colSpan={5} className="px-4 py-2 text-right text-slate-600">
                      {discountValue > 0 ? 'Discount:' : 'Additional Charge:'}
                    </td>
                    <td className={`px-4 py-2 text-right font-medium ${discountValue > 0 ? 'text-red-500' : 'text-orange-500'}`}>
                      {discountValue > 0 ? `-₹${discountValue.toFixed(2)}` : `+₹${Math.abs(discountValue).toFixed(2)}`}
                    </td>
                    <td></td>
                  </tr>
                )}
                <tr className="border-t-2 border-slate-300">
                  <td colSpan={5} className="px-4 py-3 text-right font-bold text-slate-800 text-lg">
                    Total to Pay:
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-xl text-green-600">
                    ₹{finalAmount.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
          <div className="text-sm text-slate-500">
            {billItems.length} item{billItems.length !== 1 ? 's' : ''} in bill
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" icon={<Printer size={18}/>}>
              Print Last Bill
            </Button>
            <Button 
              variant="danger" 
              icon={<Trash2 size={18}/>}
              onClick={handleClearAll}
              disabled={billItems.length === 0}
            >
              Clear All
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Pharmacy;
