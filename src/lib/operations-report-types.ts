export type InventoryReport = {
  generatedAt: string;
  monthStart: string;
  summary: {
    totalItems: number;
    activeItems: number;
    lowStockItems: number;
    stockValue: number;
    totalSales: number;
    salesAmount: number;
    salesThisMonth: number;
  };
  items: Array<{
    id: number;
    name: string;
    category: string;
    unit: string;
    unitPrice: number;
    quantityOnHand: number;
    lowStockThreshold: number;
    notes: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  sales: Array<{
    id: number;
    itemId: number;
    itemName: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    buyerType: string;
    buyerName: string | null;
    buyerRefId: string | null;
    paymentMethod: string;
    note: string | null;
    recordedById: string;
    recordedByName: string;
    soldAt: string;
    createdAt: string;
  }>;
};

export type FinanceReport = {
  generatedAt: string;
  monthStart: string;
  summary: {
    totalEntries: number;
    incomeEntries: number;
    expenseEntries: number;
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    incomeThisMonth: number;
    expensesThisMonth: number;
    netThisMonth: number;
  };
  entries: Array<{
    id: number;
    type: string;
    category: string;
    amount: number;
    description: string;
    paymentMethod: string;
    entryDate: string;
    recordedById: string;
    recordedByName: string;
    createdAt: string;
    updatedAt: string;
  }>;
};
