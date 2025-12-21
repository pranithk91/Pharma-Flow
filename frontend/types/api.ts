// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

// Patient/OP Types
export interface Patient {
  UHId: string;
  PName: string;
  PhoneNo: string;
  Age: number;
  Gender: string;
  VisitType?: string;
  Date: string;
  PaymentMode?: string;
  AmountPaid?: number;
  ProcedureName?: string;
}

export interface PatientRegistration {
  PName: string;
  PhoneNo: string;
  UHId?: string;
  Age: number;
  Gender: string;
  Date: string;
  OPProc: 'op' | 'procedure';
  PaymentMode: string;
  AmountPaid: number;
  ProcedureName?: string;
}

// Medicine Types
export interface Medicine {
  MId: number;
  MName: string;
  MRP: number;
  PTR?: number;
  MCompany?: string;
  MType?: string;
  CurrentStock: number;
  BatchNo?: string;
}

// Pharmacy Types
export interface InvoiceItem {
  medicine: string;
  batch_no: string;
  quantity: number;
  price: number;
  duration?: string;
}

export interface PharmacyInvoice {
  patient_name: string;
  phone_no: string;
  uhid: string;
  age?: string;
  gender?: string;
  medicines: InvoiceItem[];
  discount: number;
  payment_mode: string;
  cash_amount: number;
  upi_amount: number;
}

export interface Invoice {
  InvoiceId: string;
  InvoiceDate: string;
  PatientName: string;
  PatientPhone: string;
  UHId: string;
  TotalAmount: number;
  Discount: number;
  FinalAmount: number;
  PaymentMode: string;
  CashAmount: number;
  UPIAmount: number;
  items: InvoiceItem[];
}

// Inventory Types
export interface BillItem {
  item_name: string;
  quantity: number;
  batch_no: string;
  expiry_date: string;
  price: number;
  difference: number;
}

export interface DeliveryBill {
  BillDate: string;
  BillNo: string;
  DeliveryDate: string;
  Agency: string;
  BillAmount: number;
  TaxAmount: number;
  DiscountInBill: 'Yes' | 'No';
  Disc_amount: number;
  BillTotal: number;
  items: BillItem[];
}

// Reports Types
export interface StockItem {
  MName: string;
  CurrentStock: number;
  MType: string;
  LastDeliveryDate: string;
  ClosestToExpiry: string;
  MCompany: string;
  DaysToExpiry: number | null;
}

export interface StockStatistics {
  total_medicines: number;
  low_stock_count: number;
  near_expiry_count: number;
}

export interface StockFilters {
  medicines: string[];
  types: string[];
  companies: string[];
}

// Payments Types
export interface PaymentBill {
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

// Auth Types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  username: string;
  message: string;
}

export interface AuthVerifyResponse {
  valid: boolean;
  username: string;
}

