import React, { useState, useEffect, useCallback } from 'react';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Search, UserPlus, Save, RotateCcw, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../utils/api';

interface PatientEntry {
  UHId: string;
  PName: string;
  PhoneNo: string;
  Age: number;
  Gender: string;
  VisitType?: string;
  Time?: string;
  AmountPaid?: number;
}

const OP: React.FC = () => {
  // Form state
  const [uhid, setUhid] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [opProc, setOpProc] = useState('');
  const [procedureName, setProcedureName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [amountPaid, setAmountPaid] = useState('');

  // Search state
  const [searchField, setSearchField] = useState('phone');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<PatientEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Today's entries
  const [todayEntries, setTodayEntries] = useState<PatientEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);

  // Form submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch today's entries on mount
  const fetchTodayEntries = useCallback(async () => {
    try {
      setLoadingEntries(true);
      const response = await api.get('/patient/api/today');
      if (response.data.success) {
        setTodayEntries(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch today entries:', error);
    } finally {
      setLoadingEntries(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayEntries();
  }, [fetchTodayEntries]);

  // Generate UHId when patient name changes
  const generateUHId = useCallback(async (name: string) => {
    if (!name.trim()) {
      setUhid('');
      return;
    }

    try {
      const response = await api.get(`/patient/api/generate-uhid?name=${encodeURIComponent(name)}`);
      if (response.data.success && response.data.uhid) {
        setUhid(response.data.uhid);
      }
    } catch (error) {
      console.error('Failed to generate UHId:', error);
    }
  }, []);

  // Handle patient name change
  const handlePatientNameChange = (value: string) => {
    setPatientName(value);
    // Debounce UHId generation
    const timeoutId = setTimeout(() => {
      generateUHId(value);
    }, 500);
    return () => clearTimeout(timeoutId);
  };

  // Search patients
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setMessage({ type: 'error', text: 'Please enter a search term' });
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    
    try {
      const response = await api.get(`/patient/api/search?field=${searchField}&term=${encodeURIComponent(searchTerm)}`);
      if (response.data.success) {
        setSearchResults(response.data.data || []);
        if (response.data.count === 0) {
          setMessage({ type: 'error', text: 'No patients found matching your search' });
        } else {
          setMessage({ type: 'success', text: `Found ${response.data.count} patient(s)` });
        }
      }
    } catch (error: unknown) {
      console.error('Search failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Search failed';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSearching(false);
    }
  };

  // Fill form from search result
  const fillFromSearchResult = (patient: PatientEntry) => {
    setPatientName(patient.PName);
    setPhoneNo(patient.PhoneNo);
    setAge(String(patient.Age || ''));
    setGender(patient.Gender || '');
    setUhid(patient.UHId);
    setSearchResults([]);
    setMessage({ type: 'success', text: 'Patient details loaded' });
  };

  // Submit registration
  const handleSubmit = async () => {
    // Validation
    if (!patientName.trim()) {
      setMessage({ type: 'error', text: 'Patient name is required' });
      return;
    }
    if (!phoneNo.trim()) {
      setMessage({ type: 'error', text: 'Phone number is required' });
      return;
    }
    if (!age) {
      setMessage({ type: 'error', text: 'Age is required' });
      return;
    }
    if (!gender) {
      setMessage({ type: 'error', text: 'Gender is required' });
      return;
    }
    if (!opProc) {
      setMessage({ type: 'error', text: 'Please select OP or Procedure' });
      return;
    }
    if (opProc === 'procedure' && !procedureName.trim()) {
      setMessage({ type: 'error', text: 'Procedure name is required' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const registrationData = {
        PName: patientName,
        PhoneNo: phoneNo,
        UHId: uhid,
        Age: parseInt(age),
        Gender: gender,
        Date: date,
        OPProc: opProc,
        PaymentMode: paymentMode,
        AmountPaid: parseFloat(amountPaid) || 0,
        ProcedureName: opProc === 'procedure' ? procedureName : '',
      };

      const response = await api.post('/patient/api/register', registrationData);
      
      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: `✓ Patient registered successfully! UHId: ${response.data.uhid}` 
        });
        handleClear();
        fetchTodayEntries(); // Refresh the table
      }
    } catch (error: unknown) {
      console.error('Registration failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setMessage({ 
        type: 'error', 
        text: errorMessage 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear form
  const handleClear = () => {
    setUhid('');
    setPatientName('');
    setPhoneNo('');
    setAge('');
    setGender('');
    setOpProc('');
    setProcedureName('');
    setPaymentMode('');
    setAmountPaid('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Patient Registration (OP)</h2>
          <p className="text-sm text-slate-500">Register new out-patients or update existing records.</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-primary-700 bg-primary-50 px-3 py-1 rounded-full">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
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

      {/* Main Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-3">
          <h3 className="text-white font-medium flex items-center">
            <UserPlus className="mr-2" size={18} /> Patient Details
          </h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Input 
              label="UHID" 
              placeholder="Auto-generated" 
              value={uhid}
              disabled 
            />
            <Input 
              label="Date" 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            
            <Select 
              label="OP / Procedure" 
              value={opProc}
              onChange={(e) => setOpProc(e.target.value)}
              options={[
                { value: '', label: '-- Select --' },
                { value: 'op', label: 'General OP' },
                { value: 'procedure', label: 'Procedure' },
              ]} 
            />

            {opProc === 'procedure' && (
              <Input 
                label="Procedure Name" 
                placeholder="Enter procedure name"
                value={procedureName}
                onChange={(e) => setProcedureName(e.target.value)}
              />
            )}
            
            <Input 
              label="Patient Name *" 
              placeholder="Enter full name"
              value={patientName}
              onChange={(e) => handlePatientNameChange(e.target.value)}
            />
            <Input 
              label="Phone Number *" 
              placeholder="10-digit mobile number"
              value={phoneNo}
              onChange={(e) => setPhoneNo(e.target.value.replace(/\D/g, '').slice(0, 10))}
              maxLength={10}
            />
            
            <div className="grid grid-cols-2 gap-2">
              <Input 
                label="Age *" 
                type="number" 
                placeholder="0"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min={0}
                max={150}
              />
              <Select 
                label="Gender *" 
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                options={[
                  { value: '', label: '--' },
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                  { value: 'Other', label: 'Other' }
                ]} 
              />
            </div>

            <Select 
              label="Payment Mode" 
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              options={[
                { value: '', label: '-- Select --' },
                { value: 'Cash', label: 'Cash' },
                { value: 'UPI', label: 'UPI' },
                { value: 'Card', label: 'Card' }
              ]} 
            />

            <Input 
              label="Amount Paid" 
              type="number" 
              placeholder="₹ 0.00"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
            />
            
            <div className="col-span-1 md:col-span-3 lg:col-span-4 mt-2 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button 
                variant="outline" 
                icon={<RotateCcw size={16}/>}
                onClick={handleClear}
              >
                Clear Entries
              </Button>
              <Button 
                variant="primary" 
                icon={isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16}/>}
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Registration'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">Search Patients</h3>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <Select 
              label="Search By" 
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              options={[
                { value: 'phone', label: 'Phone Number' },
                { value: 'uhid', label: 'UHID' },
                { value: 'name', label: 'Name' },
              ]} 
            />
          </div>
          <div className="flex-[2]">
            <Input 
              label="Value" 
              placeholder="Type here to search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="mb-3">
            <Button 
              variant="secondary" 
              className="w-full md:w-auto" 
              icon={isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              onClick={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? 'Searching...' : 'Search Records'}
            </Button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
              <span className="text-sm font-medium text-slate-600">Search Results ({searchResults.length})</span>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {searchResults.map((patient, idx) => (
                <div 
                  key={idx}
                  className="px-4 py-3 hover:bg-primary-50 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center"
                  onClick={() => fillFromSearchResult(patient)}
                >
                  <div>
                    <span className="font-medium text-slate-800">{patient.PName}</span>
                    <span className="text-slate-500 text-sm ml-2">({patient.UHId})</span>
                  </div>
                  <div className="text-sm text-slate-500">
                    {patient.PhoneNo} • {patient.Age}/{patient.Gender?.charAt(0)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Today's Entries Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-700">Today's Entries ({date})</h3>
          <span className="text-xs text-slate-500">{todayEntries.length} entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-xs">
              <tr>
                <th className="px-6 py-3">UHID</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Age/Gender</th>
                <th className="px-6 py-3">Visit Type</th>
                <th className="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingEntries ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <Loader2 size={24} className="animate-spin mx-auto text-primary-500" />
                    <p className="mt-2 text-slate-500">Loading entries...</p>
                  </td>
                </tr>
              ) : todayEntries.length === 0 ? (
                <tr className="bg-slate-50/50">
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">
                    No entries for today yet.
                  </td>
                </tr>
              ) : (
                todayEntries.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-primary-600">{entry.UHId}</td>
                    <td className="px-6 py-3">{entry.PName}</td>
                    <td className="px-6 py-3">{entry.PhoneNo}</td>
                    <td className="px-6 py-3">{entry.Age} / {entry.Gender?.charAt(0)}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        entry.VisitType === 'Procedure' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {entry.VisitType || 'OP'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-medium">₹{entry.AmountPaid || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OP;
