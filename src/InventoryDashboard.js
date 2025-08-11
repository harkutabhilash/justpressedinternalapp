import React, { useState } from 'react';

function InventoryDashboard({ products, warehouses }) {
  const [selectedWarehouseForInventory, setSelectedWarehouseForInventory] = useState('');

  return (
    <div className="content-panel">

      <div className="mb-6">
        <div className="w-full md:w-1/2">
          <label htmlFor="select-warehouse" className="form-label mb-1">View Inventory for:</label>
          <select
            id="select-warehouse"
            value={selectedWarehouseForInventory}
            onChange={(e) => setSelectedWarehouseForInventory(e.target.value)}
            className="form-select"
          >
            <option value="">All Warehouses</option>
            {(warehouses || []).map(wh => (
              <option key={wh.id} value={wh.id}>{wh.name}</option>
            ))}
          </select>
        </div>
      </div>

      
      {(products || []).length === 0 ? (
        <p className="text-gray-600">No products added yet. Go to "Products" to add some.</p>
      ) : (warehouses || []).length === 0 ? (
        <p className="text-gray-600">No warehouses added yet. Go to "Warehouses" to add some.</p>
      ) : (
        <div className="table-container">
          <table className="table-auto-width divide-y divide-gray-200">
            <thead className="table-header-bg">
              <tr>
                <th scope="col" className="table-header-text">
                  Name
                </th>
                <th scope="col" className="table-header-text">
                  SKU Code
                </th>
                {selectedWarehouseForInventory ? (
                  <th scope="col" className="table-header-text">
                    Quantity ({(warehouses || []).find(wh => wh.id === selectedWarehouseForInventory)?.name})
                  </th>
                ) : (
                  (warehouses || []).map(wh => (
                    <th key={wh.id} scope="col" className="table-header-text">
                      Quantity ({wh.name})
                    </th>
                  ))
                )}
                {!selectedWarehouseForInventory && (
                  <th scope="col" className="table-header-text">
                    Total Stock
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="table-body-bg">
              {(products || []).map((product) => {
                const inventory = product.inventory || {};
                const totalStock = Object.values(inventory).reduce((sum, qty) => sum + qty, 0);
                if (selectedWarehouseForInventory && (inventory[selectedWarehouseForInventory] === undefined || inventory[selectedWarehouseForInventory] === 0)) {
                  return null;
                }
                return (
                  <tr key={product.id} className="table-row-border">
                    <td className="table-cell-text table-cell-font-medium">
                      {product.name}
                    </td>
                    <td className="table-cell-text table-cell-subtext">
                      {product.skuCode}
                    </td>
                    {selectedWarehouseForInventory ? (
                      <td className="table-cell-text table-cell-subtext">
                        {inventory[selectedWarehouseForInventory] || 0}
                      </td>
                    ) : (
                      (warehouses || []).map(wh => (
                        <td key={wh.id} className="table-cell-text table-cell-subtext">
                          {inventory[wh.id] || 0}
                        </td>
                      ))
                    )}
                    {!selectedWarehouseForInventory && (
                      <td className="table-cell-text table-cell-font-bold">
                        {totalStock}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default InventoryDashboard;
