import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, writeBatch, getDocs } from 'firebase/firestore';
import {Pencil, Trash2 } from 'lucide-react';

function WarehouseManagement({ db, userId, setMessage, warehouses, products, appId }) {
  const [newWarehouse, setNewWarehouse] = useState({ name: '', address: '', city: '', state: '', pincode: '', latitude: '', longitude: '', googleMapsCode: '', description: '' });
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [showWarehouseFormModal, setShowWarehouseFormModal] = useState(false);

  const warehouseModalRef = useRef();

  const handleWarehouseChange = (e) => {
    const { name, value } = e.target;
    // Handle specific number inputs for latitude/longitude/pincode
    if (['pincode', 'latitude', 'longitude'].includes(name)) {
        if (value !== '' && isNaN(Number(value))) {
            setMessage(`${name} must be a number.`);
            return;
        }
    }

    if (editingWarehouse) {
      setEditingWarehouse({ ...editingWarehouse, [name]: value });
    } else {
      setNewWarehouse({ ...newWarehouse, [name]: value });
    }
  };

  const handleSubmitWarehouse = async (e) => {
    e.preventDefault();
    if (!db || !userId) {
      setMessage("Database not ready. Please wait.");
      return;
    }

    const warehouseToSave = editingWarehouse || newWarehouse;

    // Validate mandatory fields for warehouse (only name is mandatory now)
    if (!warehouseToSave.name) {
        setMessage("Please fill the mandatory warehouse name field.");
        return;
    }
    // Optional fields validation
    if (warehouseToSave.pincode !== '' && isNaN(Number(warehouseToSave.pincode))) {
        setMessage("Pincode must be a number.");
        return;
    }
    if (warehouseToSave.latitude !== '' && isNaN(Number(warehouseToSave.latitude))) {
        setMessage("Latitude must be a number.");
        return;
    }
    if (warehouseToSave.longitude !== '' && isNaN(Number(warehouseToSave.longitude))) {
        setMessage("Longitude must be a number.");
        return;
    }


    const isNameDuplicate = (warehouses || []).some(
      (wh) => wh.name.toLowerCase() === warehouseToSave.name.toLowerCase() && wh.id !== warehouseToSave.id
    );

    if (isNameDuplicate) {
      setMessage("Warehouse Name must be unique. This name already exists.");
      return;
    }

    try {
      if (editingWarehouse) {
        const warehouseRef = doc(db, `artifacts/${appId}/users/${userId}/warehouses`, editingWarehouse.id);
        await updateDoc(warehouseRef, {
          name: editingWarehouse.name,
          address: editingWarehouse.address || '',
          city: editingWarehouse.city || '',
          state: editingWarehouse.state || '',
          pincode: editingWarehouse.pincode || '',
          latitude: editingWarehouse.latitude !== '' ? parseFloat(editingWarehouse.latitude) : '',
          longitude: editingWarehouse.longitude !== '' ? parseFloat(editingWarehouse.longitude) : '',
          googleMapsCode: editingWarehouse.googleMapsCode || '',
          description: editingWarehouse.description || '',
        });
        setMessage("Warehouse updated successfully!");
        setEditingWarehouse(null);
      } else {
        const newWarehouseRef = await addDoc(collection(db, `artifacts/${appId}/users/${userId}/warehouses`), {
          name: newWarehouse.name,
          address: newWarehouse.address || '',
          city: newWarehouse.city || '',
          state: newWarehouse.state || '',
          pincode: newWarehouse.pincode || '',
          latitude: newWarehouse.latitude !== '' ? parseFloat(newWarehouse.latitude) : '',
          longitude: newWarehouse.longitude !== '' ? parseFloat(newWarehouse.longitude) : '',
          googleMapsCode: newWarehouse.googleMapsCode || '',
          description: newWarehouse.description || '',
          createdAt: new Date(),
        });
        setMessage("Warehouse added successfully!");
        setNewWarehouse({ name: '', address: '', city: '', state: '', pincode: '', latitude: '', longitude: '', googleMapsCode: '', description: '' });

        const productsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/products`);
        const productSnapshot = await getDocs(productsCollectionRef);
        const batch = writeBatch(db);

        (products || []).forEach(productDoc => {
          const productRef = doc(db, `artifacts/${appId}/users/${userId}/products`, productDoc.id);
          const currentInventory = productDoc.inventory || {};
          if (currentInventory[newWarehouseRef.id] === undefined) {
             currentInventory[newWarehouseRef.id] = 0;
          }
          batch.update(productRef, { inventory: currentInventory });
        });
        await batch.commit();
        setMessage("Warehouse added and products inventory initialized!");
      }
      setShowWarehouseFormModal(false);
    } catch (error) {
      console.error("Error saving warehouse:", error);
      setMessage(`Error saving warehouse: ${error.message}`);
    }
  };

  const handleEditWarehouse = (warehouse) => {
    setEditingWarehouse({ ...warehouse });
    setShowWarehouseFormModal(true);
  };

  const handleDeleteWarehouse = async (warehouseId) => {
    if (!db || !userId) {
      setMessage("Database not ready. Please wait.");
      return;
    }
    try {
      const warehouseRef = doc(db, `artifacts/${appId}/users/${userId}/warehouses`, warehouseId);
      await deleteDoc(warehouseRef);
      setMessage("Warehouse deleted successfully!");

      const productsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/products`);
      const productSnapshot = await getDocs(productsCollectionRef);
      const batch = writeBatch(db);

      (products || []).forEach(productDoc => {
        const productRef = doc(db, `artifacts/${appId}/users/${userId}/products`, productDoc.id);
        const currentInventory = { ...productDoc.inventory || {} };
        delete currentInventory[warehouseId];
        batch.update(productRef, { inventory: currentInventory });
      });
      await batch.commit();
      setMessage("Warehouse deleted and product inventories updated!");

    } catch (error) {
      console.error("Error deleting warehouse:", error);
      setMessage(`Error deleting warehouse: ${error.message}`);
    }
  };

  // Close modal when clicking outside or on escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (warehouseModalRef.current && !warehouseModalRef.current.contains(event.target)) {
        setShowWarehouseFormModal(false);
        setEditingWarehouse(null);
        setNewWarehouse({ name: '', address: '', city: '', state: '', pincode: '', latitude: '', longitude: '', googleMapsCode: '', description: '' });
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setShowWarehouseFormModal(false);
        setEditingWarehouse(null);
        setNewWarehouse({ name: '', address: '', city: '', state: '', pincode: '', latitude: '', longitude: '', googleMapsCode: '', description: '' });
      }
    };

    if (showWarehouseFormModal) {
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
  }, [showWarehouseFormModal]);

  return (
    <div className="content-panel">

       <div className="flex justify-end mb-6">
        <button
          onClick={() => {
            setEditingWarehouse(null);
            setNewWarehouse({ name: '', address: '', city: '', state: '', pincode: '', latitude: '', longitude: '', googleMapsCode: '', description: '' });
            setShowWarehouseFormModal(true);
          }}
          className="btn-primary"
        >
          Add New Warehouse
        </button>
      </div>

      {(warehouses || []).length === 0 ? (
        <p className="text-gray-600">No warehouses added yet. Click "Add New Warehouse" to get started!</p>
      ) : (
        <div className="table-container">
          <table className="table-auto-width divide-y divide-gray-200">
            <thead className="table-header-bg">
              <tr>
                <th scope="col" className="table-header-text">
                  Name
                </th>
                <th scope="col" className="table-header-text">
                  Address
                </th>
                <th scope="col" className="table-header-text">
                  City
                </th>
                <th scope="col" className="table-header-text">
                  State
                </th>
                <th scope="col" className="table-header-text">
                  Pincode
                </th>
                <th scope="col" className="table-header-text">
                  Latitude
                </th>
                <th scope="col" className="table-header-text">
                  Longitude
                </th>
                <th scope="col" className="table-header-text">
                  Google Maps Code
                </th>
                <th scope="col" className="table-header-text">
                  Description
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="table-body-bg">
              {(warehouses || []).map((warehouse) => (
                <tr key={warehouse.id} className="table-row-border">
                  <td className="table-cell-text table-cell-font-medium">
                    {warehouse.name}
                  </td>
                  <td className="table-cell-text table-cell-subtext">
                    {warehouse.address || 'N/A'}
                  </td>
                  <td className="table-cell-text table-cell-subtext">
                    {warehouse.city || 'N/A'}
                  </td>
                  <td className="table-cell-text table-cell-subtext">
                    {warehouse.state || 'N/A'}
                  </td>
                  <td className="table-cell-text table-cell-subtext">
                    {warehouse.pincode || 'N/A'}
                  </td>
                  <td className="table-cell-text table-cell-subtext">
                    {warehouse.latitude || 'N/A'}
                  </td>
                  <td className="table-cell-text table-cell-subtext">
                    {warehouse.longitude || 'N/A'}
                  </td>
                  <td className="table-cell-text table-cell-subtext table-cell-truncate" title={warehouse.googleMapsCode}>
                    {warehouse.googleMapsCode || 'N/A'}
                  </td>
                  <td className="table-cell-text table-cell-subtext table-cell-truncate" title={warehouse.description}>
                    {warehouse.description || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditWarehouse(warehouse)}
                      className="btn-edit"
                      title="Edit Warehouse"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteWarehouse(warehouse.id)}
                      className="btn-delete"
                      title="Delete Warehouse"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Warehouse Form Side Panel/Modal */}
      {showWarehouseFormModal && (
        <div className="modal-overlay">
          <div ref={warehouseModalRef} className="modal-panel md:w-1/2 lg:w-1/3">
            <div className="modal-content">
              <div className="flex justify-between items-center mb-6">
                <h2 className="modal-title">
                  {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
                </h2>
                <button
                  onClick={() => {
                    setShowWarehouseFormModal(false);
                    setEditingWarehouse(null);
                    setNewWarehouse({ name: '', address: '', city: '', state: '', pincode: '', latitude: '', longitude: '', googleMapsCode: '', description: '' });
                  }}
                  className="modal-close-btn"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmitWarehouse} className="form-space-y-4">
                <div>
                  <label htmlFor="modal-wh-name" className="form-label">
                    Warehouse Name <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="text"
                    id="modal-wh-name"
                    name="name"
                    value={editingWarehouse ? editingWarehouse.name : newWarehouse.name}
                    onChange={handleWarehouseChange}
                    className="form-input"
                    placeholder="e.g., Main Warehouse"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="modal-wh-address" className="form-label">
                    Address
                  </label>
                  <input
                    type="text"
                    id="modal-wh-address"
                    name="address"
                    value={editingWarehouse ? editingWarehouse.address : newWarehouse.address}
                    onChange={handleWarehouseChange}
                    className="form-input"
                    placeholder="e.g., 123 Main St"
                  />
                </div>
                <div>
                  <label htmlFor="modal-wh-city" className="form-label">
                    City
                  </label>
                  <input
                    type="text"
                    id="modal-wh-city"
                    name="city"
                    value={editingWarehouse ? editingWarehouse.city : newWarehouse.city}
                    onChange={handleWarehouseChange}
                    className="form-input"
                    placeholder="e.g., Hyderabad"
                  />
                </div>
                <div>
                  <label htmlFor="modal-wh-state" className="form-label">
                    State
                  </label>
                  <input
                    type="text"
                    id="modal-wh-state"
                    name="state"
                    value={editingWarehouse ? editingWarehouse.state : newWarehouse.state}
                    onChange={handleWarehouseChange}
                    className="form-input"
                    placeholder="e.g., Telangana"
                  />
                </div>
                <div>
                  <label htmlFor="modal-wh-pincode" className="form-label">
                    Pincode
                  </label>
                  <input
                    type="text"
                    id="modal-wh-pincode"
                    name="pincode"
                    value={editingWarehouse ? editingWarehouse.pincode : newWarehouse.pincode}
                    onChange={handleWarehouseChange}
                    className="form-input"
                    placeholder="e.g., 500001"
                  />
                </div>
                <div>
                  <label htmlFor="modal-wh-latitude" className="form-label">Latitude</label>
                  <input
                    type="text"
                    id="modal-wh-latitude"
                    name="latitude"
                    value={editingWarehouse ? editingWarehouse.latitude : newWarehouse.latitude}
                    onChange={handleWarehouseChange}
                    className="form-input"
                    placeholder="e.g., 17.3850"
                  />
                </div>
                <div>
                  <label htmlFor="modal-wh-longitude" className="form-label">Longitude</label>
                  <input
                    type="text"
                    id="modal-wh-longitude"
                    name="longitude"
                    value={editingWarehouse ? editingWarehouse.longitude : newWarehouse.longitude}
                    onChange={handleWarehouseChange}
                    className="form-input"
                    placeholder="e.g., 78.4867"
                  />
                </div>
                <div>
                  <label htmlFor="modal-wh-googleMapsCode" className="form-label">Google Maps Code</label>
                  <input
                    id="modal-wh-googleMapsCode"
                    name="googleMapsCode"
                    value={editingWarehouse ? editingWarehouse.googleMapsCode : newWarehouse.googleMapsCode}
                    onChange={handleWarehouseChange}
                    rows="3"
                    className="form-input"
                    placeholder="ABCD+DEF"
                  />
                </div>
                <div>
                  <label htmlFor="modal-wh-description" className="form-label">Description</label>
                  <textarea
                    id="modal-wh-description"
                    name="description"
                    value={editingWarehouse ? editingWarehouse.description : newWarehouse.description}
                    onChange={handleWarehouseChange}
                    rows="3"
                    className="form-textarea"
                    placeholder="Brief description of the warehouse..."
                  ></textarea>
                </div>
                <div className="flex-justify-end mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowWarehouseFormModal(false);
                      setEditingWarehouse(null);
                      setNewWarehouse({ name: '', address: '', city: '', state: '', pincode: '', latitude: '', longitude: '', googleMapsCode: '', description: '' });
                    }}
                    className="btn-secondary mr-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    {editingWarehouse ? 'Update Warehouse' : 'Add Warehouse'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WarehouseManagement;
