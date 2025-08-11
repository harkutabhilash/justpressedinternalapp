import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Sparkles, Lightbulb, Pencil, Trash2 } from 'lucide-react';

// Dropdown options (now managed within this component or could be fetched from a global context/settings)
const categories = ['Cold Pressed oil', 'Ghee', 'Butter', 'Other'];
const types = ['Groundnut', 'Coconut', 'Mustard', 'Cow Ghee', 'Buffalo Ghee', 'Other'];
const volumes = ['1Ltr', '2Ltr', '5Ltr', '500ml', '450ml', 'Custom'];
const gstRates = [5, 12, 18, 28];

function ProductManagement({ db, userId, setMessage, products, warehouses, appId }) {
  const [newProduct, setNewProduct] = useState({ name: '', price: '', hsnSac: '', gstRate: '', description: '', category: '', type: '', volume: '', skuCode: '', inventory: {} });
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductFormModal, setShowProductFormModal] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isSuggestingSku, setIsSuggestingSku] = useState(false);

  // Ref for the modal content to handle clicks outside
  const modalRef = useRef();

  // Handle product form input changes
  const handleProductChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === 'price') {
      if (newValue !== '' && !/^\d*\.?\d*$/.test(newValue)) {
        setMessage("Price must be a non-negative number.");
        return;
      }
      if (parseFloat(newValue) < 0) {
        setMessage("Price cannot be negative.");
        return;
      }
    }

    if (editingProduct) {
      setEditingProduct({ ...editingProduct, [name]: newValue });
    } else {
      setNewProduct({ ...newProduct, [name]: newValue });
    }
  };

  // Add or update a product
  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (!db || !userId) {
      setMessage("Database not ready. Please wait.");
      return;
    }

    const productToSave = editingProduct || newProduct;

    if (productToSave.price === '' || isNaN(parseFloat(productToSave.price)) || parseFloat(productToSave.price) < 0) {
      setMessage("Please enter a valid non-negative price.");
      return;
    }

    const isSkuDuplicate = (products || []).some(
      (p) => p.skuCode === productToSave.skuCode && p.id !== productToSave.id
    );

    if (isSkuDuplicate) {
      setMessage("SKU Code must be unique. This SKU already exists.");
      return;
    }

    try {
      if (editingProduct) {
        const productRef = doc(db, `artifacts/${appId}/users/${userId}/products`, editingProduct.id);
        await updateDoc(productRef, {
          name: editingProduct.name,
          price: parseFloat(editingProduct.price),
          hsnSac: editingProduct.hsnSac,
          gstRate: parseFloat(editingProduct.gstRate),
          description: editingProduct.description || '',
          category: editingProduct.category || '',
          type: editingProduct.type || '',
          volume: editingProduct.volume || '',
          skuCode: editingProduct.skuCode || '',
          inventory: editingProduct.inventory || {},
        });
        setMessage("Product updated successfully!");
        setEditingProduct(null);
      } else {
        const initialInventory = {};
        (warehouses || []).forEach(wh => {
          initialInventory[wh.id] = 0;
        });

        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/products`), {
          name: newProduct.name,
          price: parseFloat(newProduct.price),
          hsnSac: newProduct.hsnSac,
          gstRate: parseFloat(newProduct.gstRate),
          description: newProduct.description || '',
          category: newProduct.category || '',
          type: newProduct.type || '',
          volume: newProduct.volume || '',
          skuCode: newProduct.skuCode || '',
          inventory: initialInventory,
          createdAt: new Date(),
        });
        setMessage("Product added successfully!");
        setNewProduct({ name: '', price: '', hsnSac: '', gstRate: '', description: '', category: '', type: '', volume: '', skuCode: '', inventory: {} });
      }
      setShowProductFormModal(false);
    } catch (error) {
      console.error("Error saving product:", error);
      setMessage(`Error saving product: ${error.message}`);
    }
  };

  // Set product for editing and open modal
  const handleEditProduct = (product) => {
    setEditingProduct({ ...product });
    setShowProductFormModal(true);
  };

  // Delete a product
  const handleDeleteProduct = async (productId) => {
    if (!db || !userId) {
      setMessage("Database not ready. Please wait.");
      return;
    }
    try {
      const productRef = doc(db, `artifacts/${appId}/users/${userId}/products`, productId);
      await deleteDoc(productRef);
      setMessage("Product deleted successfully!");
    } catch (error) {
      console.error("Error deleting product:", error);
      setMessage(`Error deleting product: ${error.message}`);
    }
  };

  // Function to generate product description using Gemini API
  const generateProductDescription = async () => {
    setIsGeneratingDescription(true);
    setMessage('Generating description...');
    const currentProduct = editingProduct || newProduct;
    const productName = currentProduct.name;
    const productHsnSac = currentProduct.hsnSac;
    const productGstRate = currentProduct.gstRate;

    if (!productName) {
      setMessage('Please enter a product name to generate a description.');
      setIsGeneratingDescription(false);
      return;
    }

    const prompt = `Generate a concise and professional product description for a product named "${productName}".
                    It has HSN/SAC code ${productHsnSac} and a GST rate of ${productGstRate}%.
                    Focus on key features and benefits. Keep it under 100 words.`;

    try {
      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });
      const payload = { contents: chatHistory };
      const apiKey = "";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        if (editingProduct) {
          setEditingProduct({ ...editingProduct, description: text });
        } else {
          setNewProduct({ ...newProduct, description: text });
        }
        setMessage('Description generated successfully!');
      } else {
        setMessage('Failed to generate description. Please try again.');
        console.error('Gemini API response structure unexpected:', result);
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      setMessage(`Error generating description: ${error.message}`);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // Function to suggest SKU Code
  const suggestSkuCode = () => {
    setIsSuggestingSku(true);
    const currentProduct = editingProduct || newProduct;
    const baseName = (currentProduct.name || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const baseVolume = (currentProduct.volume || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    if (!baseName || !baseVolume) {
      setMessage('Please enter Product Name and select Volume to suggest SKU.');
      setIsSuggestingSku(false);
      return;
    }

    let suggestedSku = `${baseName}-${baseVolume}`;
    let counter = 1;

    while ((products || []).some(p => p.skuCode === suggestedSku && p.id !== currentProduct.id)) {
      suggestedSku = `${baseName}-${baseVolume}-${String(counter).padStart(2, '0')}`;
      counter++;
    }

    if (editingProduct) {
      setEditingProduct({ ...editingProduct, skuCode: suggestedSku });
    } else {
      setNewProduct({ ...newProduct, skuCode: suggestedSku });
    }
    setMessage('SKU Code suggested!');
    setIsSuggestingSku(false);
  };

  // Close modal when clicking outside or on escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowProductFormModal(false);
        setEditingProduct(null);
        setNewProduct({ name: '', price: '', hsnSac: '', gstRate: '', description: '', category: '', type: '', volume: '', skuCode: '', inventory: {} });
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setShowProductFormModal(false);
        setEditingProduct(null);
        setNewProduct({ name: '', price: '', hsnSac: '', gstRate: '', description: '', category: '', type: '', volume: '', skuCode: '', inventory: {} });
      }
    };

    if (showProductFormModal) {
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
  }, [showProductFormModal]);


  return (
    <div className="content-panel">

      <div className="flex justify-end mb-6">
        <button
          onClick={() => {
            setEditingProduct(null);
            setNewProduct({ name: '', price: '', hsnSac: '', gstRate: '', description: '', category: '', type: '', volume: '', skuCode: '', inventory: {} });
            setShowProductFormModal(true);
          }}
          className="btn-primary"
        >
          Add New Product
        </button>
      </div>

      {/* Product List */}
      
      {(products || []).length === 0 ? (
        <p className="text-gray-600">No products added yet. Click "Add New Product" to get started!</p>
      ) : (
        <div className="table-container">
          <table className="table-auto-width divide-y divide-gray-200">
            <thead className="table-header-bg">
              <tr>
                <th scope="col" className="table-header-text">
                  Name
                </th>
                <th scope="col" className="table-header-text">
                  Price (INR)
                </th>
                <th scope="col" className="table-header-text">
                  HSN/SAC
                </th>
                <th scope="col" className="table-header-text">
                  GST Rate (%)
                </th>
                <th scope="col" className="table-header-text">
                  Category
                </th>
                <th scope="col" className="table-header-text">
                  Type
                </th>
                <th scope="col" className="table-header-text">
                  Volume
                </th>
                <th scope="col" className="table-header-text">
                  SKU Code
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
              {(products || []).map((product) => (
                <tr key={product.id} className="table-row-border">
                  <td className="table-cell-text table-cell-font-medium">
                    {product.name}
                  </td>
                  <td className="table-cell-text table-cell-subtext">
                    ₹{product.price.toFixed(2)}
                  </td>
                  <td className="table-cell-text table-cell-subtext">
                    {product.hsnSac}
                  </td>
                  <td className="table-cell-text table-cell-subtext">
                    {product.gstRate}%
                  </td>
                  <td className="table-cell-text table-cell-subtext">
                    {product.category || 'N/A'}
                  </td>
                  <td className="table-cell-text table-cell-subtext">
                    {product.type || 'N/A'}
                  </td>
                  <td className="table-cell-text table-cell-subtext">
                    {product.volume || 'N/A'}
                  </td>
                  <td className="table-cell-text table-cell-mono">
                    {product.skuCode || 'N/A'}
                  </td>
                  <td className="table-cell-text table-cell-subtext table-cell-truncate" title={product.description}>
                    {product.description || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="btn-edit"
                      title="Edit Product"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="btn-delete"
                      title="Delete Product"
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

      {/* Product Form Side Panel/Modal */}
      {showProductFormModal && (
        <div className="modal-overlay">
          <div ref={modalRef} className="modal-panel md:w-1/2 lg:w-1/3">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <button
                  onClick={() => {
                    setShowProductFormModal(false);
                    setEditingProduct(null);
                    setNewProduct({ name: '', price: '', hsnSac: '', gstRate: '', description: '', category: '', type: '', volume: '', skuCode: '', inventory: {} });
                  }}
                  className="modal-close-btn"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmitProduct} className="form-space-y-4">
                <div>
                  <label htmlFor="modal-name" className="form-label">
                    Product Name <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="text"
                    id="modal-name"
                    name="name"
                    value={editingProduct ? editingProduct.name : newProduct.name}
                    onChange={handleProductChange}
                    className="form-input"
                    placeholder="e.g., Laptop"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="modal-price" className="form-label">
                    Price (INR) <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="text"
                    id="modal-price"
                    name="price"
                    value={editingProduct ? editingProduct.price : newProduct.price}
                    onChange={handleProductChange}
                    className="form-input no-spinners"
                    placeholder="e.g., 50000.00"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="modal-hsnSac" className="form-label">
                    HSN/SAC Code <span className="required-asterisk">*</span>
                  </label>
                  <input
                    type="text"
                    id="modal-hsnSac"
                    name="hsnSac"
                    value={editingProduct ? editingProduct.hsnSac : newProduct.hsnSac}
                    onChange={handleProductChange}
                    className="form-input"
                    placeholder="e.g., 8528"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="modal-gstRate" className="form-label">
                    GST Rate (%) <span className="required-asterisk">*</span>
                  </label>
                  <select
                    id="modal-gstRate"
                    name="gstRate"
                    value={editingProduct ? editingProduct.gstRate : newProduct.gstRate}
                    onChange={handleProductChange}
                    className="form-select"
                    required
                  >
                    <option value="">Select GST Rate</option>
                    {gstRates.map(rate => (
                      <option key={rate} value={rate}>{rate}%</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="modal-category" className="form-label">
                    Category <span className="required-asterisk">*</span>
                  </label>
                  <select
                    id="modal-category"
                    name="category"
                    value={editingProduct ? editingProduct.category : newProduct.category}
                    onChange={handleProductChange}
                    className="form-select"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="modal-type" className="form-label">
                    Type <span className="required-asterisk">*</span>
                  </label>
                  <select
                    id="modal-type"
                    name="type"
                    value={editingProduct ? editingProduct.type : newProduct.type}
                    onChange={handleProductChange}
                    className="form-select"
                    required
                  >
                    <option value="">Select a type</option>
                    {types.map(typeOption => (
                      <option key={typeOption} value={typeOption}>{typeOption}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="modal-volume" className="form-label">
                    Volume <span className="required-asterisk">*</span>
                  </label>
                  <select
                    id="modal-volume"
                    name="volume"
                    value={editingProduct ? editingProduct.volume : newProduct.volume}
                    onChange={handleProductChange}
                    className="form-select"
                    required
                  >
                    <option value="">Select a volume</option>
                    {volumes.map(vol => (
                      <option key={vol} value={vol}>{vol}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="modal-skuCode" className="form-label">
                    SKU Code <span className="required-asterisk">*</span>
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      id="modal-skuCode"
                      name="skuCode"
                      value={editingProduct ? editingProduct.skuCode : newProduct.skuCode}
                      onChange={handleProductChange}
                      className="form-input rounded-r-none"
                      placeholder="e.g., LAPTOP-MEDIUM"
                      required
                    />
                    <button
                      type="button"
                      onClick={suggestSkuCode}
                      disabled={isSuggestingSku || !(editingProduct ? editingProduct.name && editingProduct.volume : newProduct.name && newProduct.volume)}
                      className="btn-suggest"
                      title="Suggest SKU Code based on Product Name and Volume"
                    >
                      {isSuggestingSku ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <Lightbulb size={16} />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="modal-description" className="form-label">Product Description</label>
                  <textarea
                    id="modal-description"
                    name="description"
                    value={editingProduct ? editingProduct.description : newProduct.description}
                    onChange={handleProductChange}
                    rows="4"
                    className="form-textarea"
                    placeholder="A brief description of the product..."
                  ></textarea>
                  <button
                    type="button"
                    onClick={generateProductDescription}
                    disabled={isGeneratingDescription}
                    className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-200 shadow-md flex items-center justify-center"
                  >
                    {isGeneratingDescription ? (
                      <svg className="animate-spin h-5 w-5 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <Sparkles size={16} className="mr-2" />
                    )}
                    {isGeneratingDescription ? 'Generating...' : 'Generate Description'}
                  </button>
                </div>
                <div className="flex-justify-end mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProductFormModal(false);
                      setEditingProduct(null);
                      setNewProduct({ name: '', price: '', hsnSac: '', gstRate: '', description: '', category: '', type: '', volume: '', skuCode: '', inventory: {} });
                    }}
                    className="btn-secondary mr-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    {editingProduct ? 'Update Product' : 'Add Product'}
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

export default ProductManagement;
