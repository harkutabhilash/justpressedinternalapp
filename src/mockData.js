// src/mockData.js
export const mockProducts = [
  { id: '1', name: 'Mock Product 1', price: 25, hsnSac: '1234', gstRate: 5, skuCode: 'MP1-1L' },
  { id: '2', name: 'Mock Product 2', price: 50, hsnSac: '5678', gstRate: 12, skuCode: 'MP2-2L' },
];

export const mockWarehouses = [
  { id: 'A', name: 'Mock Warehouse A', address: '1 Mock St', city: 'Mockville', state: 'Mockstate' },
  { id: 'B', name: 'Mock Warehouse B', address: '2 Mock Ave', city: 'Mocktown', state: 'Mockstate' },
];

export const mockInventoryLogs = [
  { id: 'log1', productId: '1', warehouseId: 'A', quantityChange: 10, changeType: 'increase', timestamp: new Date() },
  { id: 'log2', productId: '2', warehouseId: 'B', quantityChange: 5, changeType: 'decrease', timestamp: new Date() },
];
