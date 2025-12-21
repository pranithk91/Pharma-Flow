export type NavigationItem = 'OP' | 'Pharmacy' | 'View Sales' | 'Returns' | 'Reports' | 'Inventory' | 'Payments';

export interface Medicine {
  id: string;
  name: string;
  batchNo: string;
  expiry: string;
  stock: number;
  type: string;
  company: string;
  price: number;
}

export interface Patient {
  id: string;
  uhid: string;
  name: string;
  phone: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
}

export interface CartItem extends Medicine {
  quantity: number;
  duration?: string;
  total: number;
}
