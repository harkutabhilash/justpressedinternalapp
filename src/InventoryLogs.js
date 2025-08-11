import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

// Utility function for date formatting
const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const options = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  return date.toLocaleString('en-GB', options).replace(',', '');
};

// Dropdown options for adjustments
const transactionTypes = ['Adjustment', 'Sale', 'Transfer', 'Return'];

function InventoryLogs({ db, userId, setMessage, inventoryLogs, products, warehouses, appId }) {
  const [inventoryAdjustments, setInventoryAdjustments] = useState({ skuCode: '', warehouseId: '', quantity: '', type: 'increase', transactionType: 'Adjustment', reason: '' });
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  const adjustmentModalRef = useRef();

  // Close modal when clicking outside or on escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (adjustmentModalRef.current && !adjustmentModalRef.current.contains(event.target)) {
        setShowAdjustmentModal(false);
        setInventoryAdjustments({ skuCode: '', warehouseId: '', quantity: '', type: 'increase', transactionType: 'Adjustment', reason: '' });
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setShowAdjustmentModal(false);
        setInventoryAdjustments({ skuCode: '', warehouseId: '', quantity: '', type: 'increase', transactionType: 'Adjustment', reason: '' });
      }
    };

    if (showAdjustmentModal) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showAdjustmentModal]);

  const handleAdjustmentChange = (e) => {
    const { name, value } = e.target;
    let updatedAdjustments = { ...inventoryAdjustments, [name]: value };

    // Conditional logic for Entry Type based on Transaction Type
    if (name === 'transactionType') {
      if (value === 'Sale') {
        updatedAdjustments.type = 'decrease';
      } else if (value === 'Return') {
        updatedAdjustments.type = 'increase';
      }
      // If Transfer or Adjustment, 'type' remains as user selected or default
    }
    setInventoryAdjustments(updatedAdjustments);
  };

  const handleAdjustInventory = async (e) => {
    e.preventDefault();
    if (!db || !userId) {
      setMessage("Database not ready. Please wait.");
      return;
    }

    const { skuCode, warehouseId, quantity, type, transactionType, reason } = inventoryAdjustments;

    if (!skuCode || !warehouseId || !quantity || quantity <= 0) {
      setMessage("Please select a product, warehouse, and a positive quantity for adjustment.");
      return;
    }

    const productToAdjust = (products || []).find(p => p.skuCode === skuCode);
    if (!productToAdjust) {
      setMessage("Product not found with the given SKU Code.");
      return;
    }

    const warehouseObj = (warehouses || []).find(wh => wh.id === warehouseId);
    if (!warehouseObj) {
      setMessage("Selected warehouse not found.");
      return;
    }
    const warehouseName = warehouseObj.name;

    const productRef = doc(db, `artifacts/${appId}/users/${userId}/products`, productToAdjust.id);
    let currentQuantity = productToAdjust.inventory[warehouseId] || 0;
    const adjustmentAmount = parseInt(quantity, 10);

    let newQuantity = currentQuantity;
    if (type === 'increase') {
      newQuantity += adjustmentAmount;
    } else if (type === 'decrease') {
      if (currentQuantity < adjustmentAmount) {
        setMessage("Cannot decrease stock below zero. Available: " + currentQuantity);
        return;
      }
      newQuantity -= adjustmentAmount;
    }

    try {
      // Update product inventory
      await updateDoc(productRef, {
        [`inventory.${warehouseId}`]: newQuantity
      });

      // Log the adjustment
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/inventory_logs`), {
        productId: productToAdjust.id,
        skuCode: productToAdjust.skuCode,
        productName: productToAdjust.name,
        warehouseId: warehouseObj.id,
        warehouseName: warehouseObj.name,
        quantityChange: adjustmentAmount,
        changeType: type, // 'increase' or 'decrease'
        oldQuantity: currentQuantity,
        newQuantity: newQuantity,
        transactionType: transactionType, // 'Adjustment', 'Sale', 'Transfer', 'Return'
        reason: reason || '',
        userId: userId,
        timestamp: serverTimestamp(), // Firestore server timestamp
      });

      setMessage(`Inventory for ${productToAdjust.name} in ${warehouseName} adjusted successfully to ${newQuantity}!`);
      setShowAdjustmentModal(false);
      setInventoryAdjustments({ skuCode: '', warehouseId: '', quantity: '', type: 'increase', transactionType: 'Adjustment', reason: '' });
    } catch (error) {
      console.error("Error adjusting inventory:", error);
      setMessage(`Error adjusting inventory: ${error.message}`);
    }
  };

  return (
    <div className="content-panel">
      <div className="flex justify-between items-center mb-6">
        <h2 className="content-header mb-0">Inventory Logs</h2>
        <button
          onClick={() => setShowAdjustmentModal(true)}
          className="btn-primary"
        >
          Log New Entry
        </button>
      </div>

      {(inventoryLogs || []).length === 0 ? (
        <p className="text-gray-600">No inventory entries logged yet.</p>
      ) : (
        <div className="table-container">
          <table className="table-auto-width divide-y divide-gray-200">
            <thead className="table-header-bg">
              <tr>
                <th scope="col" className="table-header-text">
                  Timestamp
                </th>
                <th scope="col" className="table-header-text">
                  Product (SKU)
                </th>
                <th scope="col" className="table-header-text">
                  Warehouse
                </th>
                <th scope="col" className="table-header-text">
                  Type
                </th>
                <th scope="col" className="table-header-text">
                  Qty Change
                </th>
                <th scope="col" className="table-header-text">
                  Old Qty
                </th>
                <th scope="col" className="table-header-text">
                  New Qty
                </th>
                <th scope="col" className="table-header-text">
                  Transaction Type
                </th>
                <th scope="col" className="table-header-text">
                  Reason
                </th>
                <th scope="col" className="table-header-text">
                  Logged By
                </th>
              </tr>
            </thead>
            <tbody className="table-body-bg">
              {(inventoryLogs || []).map((log) => (
                <tr key={log.id} className="table-row-border">
                  <td className="table-cell-text table-cell-subtext">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="table-cell-text table-cell-font-medium">
                    {log.productName} ({log.skuCode})
                  </td>
                  <td className="table-cell-text table-cell-subtext">
                    {log.warehouseName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${log.changeType === 'increase' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {log.changeType}
                    </span>
                  </td>
                  <td className="table-cell-text table-cell-subtext">
                    {log.quantityChange}
                  </td>
                  <td className="table-cell-text table-cell-subtext">
                    {log.oldQuantity}
                  </td>
                  <td className="table-cell-text table-cell-subtext">
                    {log.newQuantity}
                  </td>
                  <td className="table-cell-text table-cell-subtext">
                    {log.transactionType}
                  </td>
                  <td className="table-cell-text table-cell-subtext table-cell-truncate" title={log.reason}>
                    {log.reason || 'N/A'}
                  </td>
                  <td className="table-cell-text table-cell-subtext table-cell-mono" title={log.userId}>
                    {log.userId ? `${log.userId.substring(0, 8)}...` : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inventory Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="modal-overlay">
          <div ref={adjustmentModalRef} className="modal-panel md:w-1/2 lg:w-1/3">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title">Log New Inventory Entry</h2>
                <button
                  onClick={() => setShowAdjustmentModal(false)}
                  className="modal-close-btn"
                >
                  &times;
                </button>
              </div>
              <form onSubmit={handleAdjustInventory} className="form-space-y-4">
                  <div>
                    <label htmlFor="modal-product" className="form-label">Product (SKU) <span className="required-asterisk">*</span></label>
                    <select
                      id="modal-product"
                      name="skuCode"
                      value={inventoryAdjustments.skuCode}
                      onChange={handleAdjustmentChange}
                      className="form-select"
                      required
                    >
                      <option value="">Select a product</option>
                      {(products || []).map(p => (
                        <option key={p.id} value={p.skuCode}>{p.name} ({p.skuCode})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="modal-warehouse" className="form-label">Warehouse <span className="required-asterisk">*</span></label>
                    <select
                      id="modal-warehouse"
                      name="warehouseId"
                      value={inventoryAdjustments.warehouseId}
                      onChange={handleAdjustmentChange}
                      className="form-select"
                      required
                    >
                      <option value="">Select a warehouse</option>
                      {(warehouses || []).map(wh => (
                        <option key={wh.id} value={wh.id}>{wh.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="modal-transactionType" className="form-label">Transaction Type <span className="required-asterisk">*</span></label>
                    <select
                      id="modal-transactionType"
                      name="transactionType"
                      value={inventoryAdjustments.transactionType}
                      onChange={handleAdjustmentChange}
                      className="form-select"
                      required
                    >
                      {transactionTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Entry Type <span className="required-asterisk">*</span></label>
                    <div className="mt-2 flex items-center space-x-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="type"
                          value="increase"
                          checked={inventoryAdjustments.type === 'increase'}
                          onChange={handleAdjustmentChange}
                          className="form-radio"
                          disabled={inventoryAdjustments.transactionType === 'Sale'}
                        />
                        <span className="ml-2">Increase Stock</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="type"
                          value="decrease"
                          checked={inventoryAdjustments.type === 'decrease'}
                          onChange={handleAdjustmentChange}
                          className="form-radio"
                          disabled={inventoryAdjustments.transactionType === 'Return'}
                        />
                        <span className="ml-2">Decrease Stock</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="modal-quantity" className="form-label">Quantity <span className="required-asterisk">*</span></label>
                    <input
                      type="number"
                      id="modal-quantity"
                      name="quantity"
                      value={inventoryAdjustments.quantity}
                      onChange={handleAdjustmentChange}
                      className="form-input no-spinners"
                      placeholder="e.g., 10"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-reason" className="form-label">Reason / Note</label>
                    <textarea
                      id="modal-reason"
                      name="reason"
                      value={inventoryAdjustments.reason}
                      onChange={handleAdjustmentChange}
                      rows="3"
                      className="form-textarea"
                      placeholder="e.g., Stock correction, new shipment, etc."
                    ></textarea>
                  </div>
                <div className="flex-justify-end mt-6">
                  <button type="button" onClick={() => setShowAdjustmentModal(false)} className="btn-secondary mr-2">Cancel</button>
                  <button type="submit" className="btn-primary">Log Entry</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryLogs;
