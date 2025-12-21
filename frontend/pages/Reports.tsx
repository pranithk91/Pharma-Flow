import React, { useState, useEffect } from 'react';
import { Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Filter, Download, Printer, AlertTriangle, TrendingDown, PackageCheck, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { api } from '../utils/api';

interface StockItem {
  MName: string;
  CurrentStock: number;
  MType: string;
  LastDeliveryDate: string;
  ClosestToExpiry: string;
  MCompany: string;
  DaysToExpiry: number | null;
}

interface FilterOptions {
  medicines: string[];
  types: string[];
  companies: string[];
}

interface Statistics {
  total_medicines: number;
  low_stock_count: number;
  near_expiry_count: number;
}

const CHART_COLORS = ['#0d9488', '#f59e0b', '#ef4444', '#64748b', '#8b5cf6', '#ec4899', '#10b981', '#3b82f6'];

const Reports: React.FC = () => {
  // Data state
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ medicines: [], types: [], companies: [] });
  const [statistics, setStatistics] = useState<Statistics>({ total_medicines: 0, low_stock_count: 0, near_expiry_count: 0 });

  // Filter state
  const [medicineFilter, setMedicineFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');

  // Loading states
  const [loadingStock, setLoadingStock] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Error state
  const [error, setError] = useState<string | null>(null);

  // Fetch filter options on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        setLoadingFilters(true);
        const response = await api.get('/reports/api/filters');
        if (response.data.success) {
          const data = response.data.data;
          // Filter out empty/null values and ensure uniqueness
          setFilterOptions({
            medicines: [...new Set((data.medicines || []).filter((m: string) => m && m.trim()))],
            types: [...new Set((data.types || []).filter((t: string) => t && t.trim()))],
            companies: [...new Set((data.companies || []).filter((c: string) => c && c.trim()))],
          });
        }
      } catch (error: unknown) {
        console.error('Failed to fetch filters:', error);
        // Try without token for filter options if it fails
      } finally {
        setLoadingFilters(false);
      }
    };
    fetchFilters();
  }, []);


  // Initial data fetch - only run once on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingStock(true);
        setLoadingStats(true);
        setError(null);
        
        // Fetch stock data
        const stockResponse = await api.get('/reports/api/stock');
        console.log('Stock data response:', stockResponse.data);
        
        if (stockResponse.data.success) {
          const data = stockResponse.data.data || [];
          console.log('Stock data count:', data.length);
          setStockData(data);
        } else {
          setError(stockResponse.data.error || 'Failed to fetch stock data');
          setStockData([]);
        }
        
        // Fetch statistics
        const statsResponse = await api.get('/reports/api/statistics');
        if (statsResponse.data.success) {
          setStatistics(statsResponse.data.data);
        }
      } catch (err: unknown) {
        console.error('Failed to load initial data:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stock data';
        setError(errorMessage);
        setStockData([]);
      } finally {
        setLoadingStock(false);
        setLoadingStats(false);
      }
    };
    
    loadInitialData();
  }, []); // Empty dependency array - only run once on mount

  // Apply filters
  const handleApplyFilters = async () => {
    try {
      setLoadingStock(true);
      setLoadingStats(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (medicineFilter) params.append('medicine_filter', medicineFilter);
      if (typeFilter) params.append('type_filter', typeFilter);
      if (companyFilter) params.append('company_filter', companyFilter);
      
      const queryString = params.toString();
      const stockUrl = queryString ? `/reports/api/stock?${queryString}` : '/reports/api/stock';
      const statsUrl = queryString ? `/reports/api/statistics?${queryString}` : '/reports/api/statistics';
      
      const [stockResponse, statsResponse] = await Promise.all([
        api.get(stockUrl),
        api.get(statsUrl)
      ]);
      
      if (stockResponse.data.success) {
        setStockData(stockResponse.data.data || []);
      }
      
      if (statsResponse.data.success) {
        setStatistics(statsResponse.data.data);
      }
    } catch (err: unknown) {
      console.error('Failed to apply filters:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
    } finally {
      setLoadingStock(false);
      setLoadingStats(false);
    }
  };

  // Clear filters
  const handleClearFilters = () => {
    setMedicineFilter('');
    setTypeFilter('');
    setCompanyFilter('');
  };

  // Determine stock status
  const getStockStatus = (item: StockItem): { label: string; color: string } => {
    if (item.CurrentStock <= 0) {
      return { label: 'Out of Stock', color: 'bg-red-100 text-red-700' };
    }
    if (item.CurrentStock < 10) {
      return { label: 'Low Stock', color: 'bg-orange-100 text-orange-700' };
    }
    if (item.DaysToExpiry !== null && item.DaysToExpiry <= 90) {
      return { label: 'Near Expiry', color: 'bg-yellow-100 text-yellow-700' };
    }
    return { label: 'In Stock', color: 'bg-green-100 text-green-700' };
  };

  // Calculate chart data from actual stock
  const typeDistribution = React.useMemo(() => {
    const typeCounts: Record<string, number> = {};
    stockData.forEach(item => {
      const type = item.MType || 'Unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    return Object.entries(typeCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [stockData]);

  // Stock level distribution for bar chart
  const stockLevelData = React.useMemo(() => {
    let outOfStock = 0;
    let lowStock = 0;
    let nearExpiry = 0;
    let healthy = 0;

    stockData.forEach(item => {
      if (item.CurrentStock <= 0) {
        outOfStock++;
      } else if (item.CurrentStock < 10) {
        lowStock++;
      } else if (item.DaysToExpiry !== null && item.DaysToExpiry <= 90) {
        nearExpiry++;
      } else {
        healthy++;
      }
    });

    return [
      { name: 'Out of Stock', count: outOfStock, fill: '#ef4444' },
      { name: 'Low Stock', count: lowStock, fill: '#f59e0b' },
      { name: 'Near Expiry', count: nearExpiry, fill: '#eab308' },
      { name: 'Healthy', count: healthy, fill: '#22c55e' },
    ];
  }, [stockData]);

  // Export to CSV
  const handleExportCSV = () => {
    if (stockData.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Medicine Name', 'Current Stock', 'Medicine Type', 'Last Delivery Date', 'Expiry Date', 'Company', 'Days to Expiry', 'Status'];
    const rows = stockData.map(item => {
      const status = getStockStatus(item);
      return [
        item.MName,
        item.CurrentStock,
        item.MType || 'N/A',
        item.LastDeliveryDate || 'No delivery',
        item.ClosestToExpiry || 'N/A',
        item.MCompany || 'N/A',
        item.DaysToExpiry !== null ? item.DaysToExpiry : 'N/A',
        status.label
      ];
    });

    const csvContent = [headers, ...rows].map(row => 
      row.map(cell => {
        const str = String(cell);
        if (str.includes(',') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl border bg-red-50 border-red-200 text-red-700 flex items-center gap-2">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
          <Button variant="ghost" size="sm" onClick={handleApplyFilters} className="ml-auto">
            Retry
          </Button>
        </div>
      )}
      
      {/* Filters Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-700 flex items-center">
            <Filter size={18} className="mr-2"/> Filter Reports
          </h3>
          <Button 
            variant="ghost" 
            size="sm" 
            icon={<RefreshCw size={14} />}
            onClick={handleApplyFilters}
          >
            Refresh
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <Select 
            label="Medicine Type" 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: '', label: 'All Types' },
              ...filterOptions.types.map(t => ({ value: t, label: t }))
            ]} 
          />
          <Select 
            label="Company" 
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            options={[
              { value: '', label: 'All Companies' },
              ...filterOptions.companies.map(c => ({ value: c, label: c }))
            ]} 
          />
          <Select 
            label="Medicine" 
            value={medicineFilter}
            onChange={(e) => setMedicineFilter(e.target.value)}
            options={[
              { value: '', label: 'All Medicines' },
              ...filterOptions.medicines.slice(0, 100).map(m => ({ value: m, label: m }))
            ]} 
          />
          <div className="flex gap-2 mb-3">
            <Button 
              className="flex-1" 
              variant="primary"
              onClick={handleApplyFilters}
            >
              Apply
            </Button>
            <Button 
              className="flex-1" 
              variant="outline"
              onClick={handleClearFilters}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-slate-500 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Total Medicines</p>
            {loadingStats ? (
              <Loader2 size={24} className="animate-spin text-slate-400 mt-2" />
            ) : (
              <h4 className="text-3xl font-bold text-slate-800">{statistics.total_medicines}</h4>
            )}
          </div>
          <div className="p-3 bg-slate-100 rounded-full text-slate-600">
            <PackageCheck size={24}/>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-red-500 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-red-500 uppercase">Low Stock Items</p>
            {loadingStats ? (
              <Loader2 size={24} className="animate-spin text-red-400 mt-2" />
            ) : (
              <h4 className="text-3xl font-bold text-slate-800">{statistics.low_stock_count}</h4>
            )}
          </div>
          <div className="p-3 bg-red-50 rounded-full text-red-500">
            <TrendingDown size={24}/>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-orange-500 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-orange-500 uppercase">Near Expiry</p>
            {loadingStats ? (
              <Loader2 size={24} className="animate-spin text-orange-400 mt-2" />
            ) : (
              <h4 className="text-3xl font-bold text-slate-800">{statistics.near_expiry_count}</h4>
            )}
          </div>
          <div className="p-3 bg-orange-50 rounded-full text-orange-500">
            <AlertTriangle size={24}/>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h4 className="font-bold text-slate-700 mb-4 text-sm">Inventory by Type</h4>
          <div className="h-64">
            {loadingStock ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-slate-400" />
              </div>
            ) : typeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                <PieChart>
                  <Pie 
                    data={typeDistribution} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={60} 
                    outerRadius={80} 
                    paddingAngle={5} 
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {typeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                No data available
              </div>
            )}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h4 className="font-bold text-slate-700 mb-4 text-sm">Stock Status Overview</h4>
          <div className="h-64">
            {loadingStock ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-slate-400" />
              </div>
            ) : stockLevelData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                <BarChart data={stockLevelData} layout="vertical">
                  <XAxis type="number" axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={80} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-800 text-white">
          <h3 className="font-bold">Current Stock Report ({stockData.length} items)</h3>
          <div className="flex gap-2">
            <button 
              className="p-1 hover:bg-slate-700 rounded" 
              title="Download CSV"
              onClick={handleExportCSV}
            >
              <Download size={18}/>
            </button>
            <button 
              className="p-1 hover:bg-slate-700 rounded" 
              title="Print"
              onClick={() => window.print()}
            >
              <Printer size={18}/>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96">
          {loadingStock ? (
            <div className="p-8 text-center">
              <Loader2 size={32} className="animate-spin text-slate-400 mx-auto" />
              <p className="mt-2 text-slate-500">Loading stock data...</p>
            </div>
          ) : stockData.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <PackageCheck size={48} className="mx-auto mb-3 opacity-50" />
              <p className="font-medium">No stock data found</p>
              <p className="text-sm mt-1">Try adjusting your filters or check if the database has data</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs sticky top-0">
                <tr>
                  <th className="px-6 py-3">Medicine Name</th>
                  <th className="px-6 py-3 text-center">Stock</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Last Delivery</th>
                  <th className="px-6 py-3">Expiry</th>
                  <th className="px-6 py-3">Company</th>
                  <th className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockData.map((row, idx) => {
                  const status = getStockStatus(row);
                  return (
                    <tr key={idx} className={`hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="px-6 py-3 font-medium text-slate-700">{row.MName}</td>
                      <td className={`px-6 py-3 text-center font-bold ${row.CurrentStock <= 0 ? 'text-red-500' : row.CurrentStock < 10 ? 'text-orange-500' : 'text-slate-700'}`}>
                        {row.CurrentStock}
                      </td>
                      <td className="px-6 py-3 text-slate-500">{row.MType || '-'}</td>
                      <td className="px-6 py-3 text-slate-500">{row.LastDeliveryDate || '-'}</td>
                      <td className="px-6 py-3 text-slate-500">
                        {row.ClosestToExpiry || '-'}
                        {row.DaysToExpiry !== null && row.DaysToExpiry <= 90 && (
                          <span className="ml-1 text-xs text-orange-500">({row.DaysToExpiry}d)</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-slate-500">{row.MCompany || '-'}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
