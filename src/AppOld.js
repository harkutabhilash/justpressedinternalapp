import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Menu, Package, Users, FileText, ClipboardList, Sparkles, User, Lightbulb, Building, Box, History } from 'lucide-react';

// Import mock data
import { mockProducts, mockWarehouses, mockInventoryLogs } from './mockData';

// Global variables provided by the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Dropdown options
const categories = ['Cold Pressed oil', 'Ghee', 'Butter', 'Other'];
const types = ['Groundnut', 'Coconut', 'Mustard', 'Cow Ghee', 'Buffalo Ghee', 'Other'];
const volumes = ['1Ltr', '2Ltr', '5Ltr', '500ml', '450ml', 'Custom'];
const gstRates = [5, 12, 18, 28];
const transactionTypes = ['Adjustment', 'Sale', 'Transfer', 'Return'];

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

function App() {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentPage, setCurrentPage] = useState('products');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [showUserIdPopover, setShowUserIdPopover] = useState(false);

  // Global data states
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [inventoryLogs, setInventoryLogs] = useState([]);

  // Product Management states
  const [newProduct, setNewProduct] = useState({ name: '', price: '', hsnSac: '', gstRate: '', description: '', category: '', type: '', volume: '', skuCode: '', inventory: {} });
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductFormModal, setShowProductFormModal] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isSuggestingSku, setIsSuggestingSku] = useState(false);

  // Warehouse Management states
  const [newWarehouse, setNewWarehouse] = useState({ name: '', address: '', city: '', state: '', pincode: '', latitude: '', longitude: '', googleMapsCode: '', description: '' });
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [showWarehouseFormModal, setShowWarehouseFormModal] = useState(false);

  // Inventory Adjustment states
  const [selectedWarehouseForInventory, setSelectedWarehouseForInventory] = useState('');
  const [inventoryAdjustments, setInventoryAdjustments] = useState({ skuCode: '', warehouseId: '', quantity: '', type: 'increase', transactionType: 'Adjustment', reason: '' });
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  // Refs for modals/popovers to handle clicks outside
  const userIdPopoverRef = useRef();
  const productModalRef = useRef();
  const warehouseModalRef = useRef();
  const adjustmentModalRef = useRef();

  // Initialize Firebase and handle authentication
  useEffect(() => {
    try {
      if (process.env.NODE_ENV === 'development') {
        // Don't initialize Firebase in development mode
        console.log('Running in development mode - Firebase not initialized');
        setUserId('mock-user-123');
        setIsAuthReady(true);
        setLoading(false);
        setProducts(mockProducts);
        setWarehouses(mockWarehouses);
        setInventoryLogs(mockInventoryLogs);
        return;
      }

      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestore);
      setAuth(firebaseAuth);

      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          try {
            if (initialAuthToken) {
              await signInWithCustomToken(firebaseAuth, initialAuthToken);
            } else {
              await signInAnonymously(firebaseAuth);
            }
          } catch (error) {
            console.error("Firebase authentication failed:", error);
            setMessage(`Authentication failed: ${error.message}`);
          }
        }
        setIsAuthReady(true);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      setMessage(`Error initializing app: ${error.message}`);
      setLoading(false);
    }
  }, []);

  // Fetch global data (products, warehouses, logs) when auth is ready
  useEffect(() => {
    if (isAuthReady && db && userId) {
      // Fetch Products
      const productsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/products`);
      const unsubscribeProducts = onSnapshot(productsCollectionRef, (snapshot) => {
        const productsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(productsData);
      }, (error) => {
        console.error("Error fetching products:", error);
        setMessage(`Error fetching products: ${error.message}`);
      });

      // Fetch Warehouses
      const warehousesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/warehouses`);
      const unsubscribeWarehouses = onSnapshot(warehousesCollectionRef, (snapshot) => {
        const warehousesData = snapshot.docs.map(doc => ({
          id: doc.id,
          address: '', city: '', state: '', pincode: '', latitude: '', longitude: '', googleMapsCode: '',
          ...doc.data()
        }));
        setWarehouses(warehousesData);
      }, (error) => {
        console.error("Error fetching warehouses:", error);
        setMessage(`Error fetching warehouses: ${error.message}`);
      });

      // Fetch Inventory Logs
      const logsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/inventory_logs`);
      const qLogs = query(logsCollectionRef);
      const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
        const logsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setInventoryLogs(logsData.sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0)));
      }, (error) => {
        console.error("Error fetching inventory logs:", error);
        setMessage(`Error fetching inventory logs: ${error.message}`);
      });


      return () => {
        unsubscribeProducts();
        unsubscribeWarehouses();
        unsubscribeLogs();
      };
    }
  }, [db, userId, isAuthReady]);

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

  const handleEditProduct = (product) => {
    setEditingProduct({ ...product });
    setShowProductFormModal(true);
  };

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

  // --- Warehouse Management Functions ---
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
          const currentInventory = productDoc.data().inventory || {};
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
        const currentInventory = { ...productDoc.data().inventory || {} };
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

  // --- Inventory Adjustment Functions ---
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
        userName: userId, // Placeholder for user name, could be expanded later
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


  // Close modal/popover when clicking outside or on escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (productModalRef.current && !productModalRef.current.contains(event.target)) {
        setShowProductFormModal(false);
        setEditingProduct(null);
        setNewProduct({ name: '', price: '', hsnSac: '', gstRate: '', description: '', category: '', type: '', volume: '', skuCode: '', inventory: {} });
      }
      if (userIdPopoverRef.current && !userIdPopoverRef.current.contains(event.target)) {
        setShowUserIdPopover(false);
      }
      if (warehouseModalRef.current && !warehouseModalRef.current.contains(event.target)) {
        setShowWarehouseFormModal(false);
        setEditingWarehouse(null);
        setNewWarehouse({ name: '', address: '', city: '', state: '', pincode: '', latitude: '', longitude: '', googleMapsCode: '', description: '' });
      }
      if (adjustmentModalRef.current && !adjustmentModalRef.current.contains(event.target)) {
        setShowAdjustmentModal(false);
        setInventoryAdjustments({ skuCode: '', warehouseId: '', quantity: '', type: 'increase', transactionType: 'Adjustment', reason: '' });
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setShowProductFormModal(false);
        setEditingProduct(null);
        setNewProduct({ name: '', price: '', hsnSac: '', gstRate: '', description: '', category: '', type: '', volume: '', skuCode: '', inventory: {} });
        setShowUserIdPopover(false);
        setShowWarehouseFormModal(false);
        setEditingWarehouse(null);
        setNewWarehouse({ name: '', address: '', city: '', state: '', pincode: '', latitude: '', longitude: '', googleMapsCode: '', description: '' });
        setShowAdjustmentModal(false);
        setInventoryAdjustments({ skuCode: '', warehouseId: '', quantity: '', type: 'increase', transactionType: 'Adjustment', reason: '' });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showProductFormModal, showUserIdPopover, showWarehouseFormModal, showAdjustmentModal]);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="text-xl font-semibold text-gray-700">Loading application...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 flex flex-col">
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Message Box */}
      {message && (
        <div className="fixed bottom-4 left-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in-up">
          {message}
          <button onClick={() => setMessage('')} className="ml-2 font-bold">X</button>
        </div>
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 shadow-lg flex justify-between items-center">
        <div className="flex items-center">
          <button
            onClick={() => setIsNavCollapsed(!isNavCollapsed)}
            className="p-2 mr-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-3xl font-bold">Just Pressed</h1>
        </div>

        {/* User Profile Icon and ID */}
        {userId && (
          <div className="relative">
            <button
              onClick={() => setShowUserIdPopover(!showUserIdPopover)}
              className="flex items-center px-3 py-2 rounded-full bg-blue-700 hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <User size={20} className="mr-2" />
              <span className="font-mono text-sm">{userId.substring(0, 8)}...</span>
            </button>
            {showUserIdPopover && (
              <div ref={userIdPopoverRef} className="absolute top-full right-0 mt-2 w-64 bg-white text-gray-800 p-4 rounded-lg shadow-xl z-50">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-lg">Your User ID</h3>
                  <button onClick={() => setShowUserIdPopover(false)} className="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
                </div>
                <p className="font-mono break-all text-sm">{userId}</p>
                <p className="text-xs text-gray-600 mt-2">This is your unique identifier for data storage.</p>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area with Sidebar */}
      <div className="flex flex-1">
        {/* Sidebar Navigation */}
        <nav className={`bg-gray-800 text-white p-4 shadow-lg flex-shrink-0 transition-all duration-300 ${isNavCollapsed ? 'w-20' : 'w-64'}`}>
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setCurrentPage('products')}
                className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200 flex items-center ${currentPage === 'products' ? 'bg-blue-700 font-semibold' : 'hover:bg-blue-700'}`}
              >
                <Package size={20} className={isNavCollapsed ? 'mx-auto' : 'mr-3'} />
                {!isNavCollapsed && 'Products'}
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentPage('warehouses')}
                className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200 flex items-center ${currentPage === 'warehouses' ? 'bg-blue-700 font-semibold' : 'hover:bg-blue-700'}`}
              >
                <Building size={20} className={isNavCollapsed ? 'mx-auto' : 'mr-3'} />
                {!isNavCollapsed && 'Warehouses'}
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentPage('inventory')}
                className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200 flex items-center ${currentPage === 'inventory' ? 'bg-blue-700 font-semibold' : 'hover:bg-blue-700'}`}
              >
                <Box size={20} className={isNavCollapsed ? 'mx-auto' : 'mr-3'} />
                {!isNavCollapsed && 'Inventory'}
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentPage('inventoryLogs')}
                className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200 flex items-center ${currentPage === 'inventoryLogs' ? 'bg-blue-700 font-semibold' : 'hover:bg-blue-700'}`}
              >
                <History size={20} className={isNavCollapsed ? 'mx-auto' : 'mr-3'} />
                {!isNavCollapsed && 'Inventory Logs'}
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentPage('customers')}
                className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200 flex items-center ${currentPage === 'customers' ? 'bg-blue-700 font-semibold' : 'hover:bg-blue-700'}`}
              >
                <Users size={20} className={isNavCollapsed ? 'mx-auto' : 'mr-3'} />
                {!isNavCollapsed && 'Customers'}
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentPage('createInvoice')}
                className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200 flex items-center ${currentPage === 'createInvoice' ? 'bg-blue-700 font-semibold' : 'hover:bg-blue-700'}`}
              >
                <FileText size={20} className={isNavCollapsed ? 'mx-auto' : 'mr-3'} />
                {!isNavCollapsed && 'Create Invoice'}
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentPage('invoiceList')}
                className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200 flex items-center ${currentPage === 'invoiceList' ? 'bg-blue-700 font-semibold' : 'hover:bg-blue-700'}`}
              >
                <ClipboardList size={20} className={isNavCollapsed ? 'mx-auto' : 'mr-3'} />
                {!isNavCollapsed && 'Invoices'}
              </button>
            </li>
          </ul>
        </nav>

        {/* Main Content Area - Render current page content */}
        <main className="flex-grow container mx-auto p-4 md:p-8">
          {/* Product Management Page */}
          {currentPage === 'products' && (
            <div className="bg-white p-6 rounded-lg shadow-xl">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900">Product Management</h2>

              <button
                onClick={() => {
                  setEditingProduct(null);
                  setNewProduct({ name: '', price: '', hsnSac: '', gstRate: '', description: '', category: '', type: '', volume: '', skuCode: '', inventory: {} });
                  setShowProductFormModal(true);
                }}
                className="mb-6 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 shadow-md"
              >
                Add New Product
              </button>

              {/* Product List */}
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Existing Products</h3>
              {(products || []).length === 0 ? (
                <p className="text-gray-600">No products added yet. Click "Add New Product" to get started!</p>
              ) : (
                <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price (INR)
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          HSN/SAC
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          GST Rate (%)
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Volume
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SKU Code
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th scope="col" className="relative px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(products || []).map((product) => (
                        <tr key={product.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {product.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ₹{product.price.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.hsnSac}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.gstRate}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.category || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.type || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.volume || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
                            {product.skuCode || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={product.description}>
                            {product.description || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="text-blue-600 hover:text-blue-900 mr-4 transition-colors duration-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-red-600 hover:text-red-900 transition-colors duration-200"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Product Form Side Panel/Modal */}
          {showProductFormModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-end z-40">
              <div ref={productModalRef} className="relative w-full md:w-1/2 lg:w-1/3 bg-white h-full shadow-2xl overflow-y-auto transform transition-transform ease-out duration-300 translate-x-0">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900">
                      {editingProduct ? 'Edit Product' : 'Add New Product'}
                    </h2>
                    <button
                      onClick={() => {
                        setShowProductFormModal(false);
                        setEditingProduct(null);
                        setNewProduct({ name: '', price: '', hsnSac: '', gstRate: '', description: '', category: '', type: '', volume: '', skuCode: '', inventory: {} });
                      }}
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                      &times;
                    </button>
                  </div>

                  <form onSubmit={handleSubmitProduct} className="space-y-4">
                    <div>
                      <label htmlFor="modal-name" className="block text-sm font-medium text-gray-700">
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="modal-name"
                        name="name"
                        value={editingProduct ? editingProduct.name : newProduct.name}
                        onChange={handleProductChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                        placeholder="e.g., Laptop"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="modal-price" className="block text-sm font-medium text-gray-700">
                        Price (INR) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="modal-price"
                        name="price"
                        value={editingProduct ? editingProduct.price : newProduct.price}
                        onChange={handleProductChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="e.g., 50000.00"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="modal-hsnSac" className="block text-sm font-medium text-gray-700">
                        HSN/SAC Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="modal-hsnSac"
                        name="hsnSac"
                        value={editingProduct ? editingProduct.hsnSac : newProduct.hsnSac}
                        onChange={handleProductChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                        placeholder="e.g., 8528"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="modal-gstRate" className="block text-sm font-medium text-gray-700">
                        GST Rate (%) <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="modal-gstRate"
                        name="gstRate"
                        value={editingProduct ? editingProduct.gstRate : newProduct.gstRate}
                        onChange={handleProductChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                        required
                      >
                        <option value="">Select GST Rate</option>
                        {gstRates.map(rate => (
                          <option key={rate} value={rate}>{rate}%</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="modal-category" className="block text-sm font-medium text-gray-700">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="modal-category"
                        name="category"
                        value={editingProduct ? editingProduct.category : newProduct.category}
                        onChange={handleProductChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                        required
                      >
                        <option value="">Select a category</option>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="modal-type" className="block text-sm font-medium text-gray-700">
                        Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="modal-type"
                        name="type"
                        value={editingProduct ? editingProduct.type : newProduct.type}
                        onChange={handleProductChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                        required
                      >
                        <option value="">Select a type</option>
                        {types.map(typeOption => (
                          <option key={typeOption} value={typeOption}>{typeOption}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="modal-volume" className="block text-sm font-medium text-gray-700">
                        Volume <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="modal-volume"
                        name="volume"
                        value={editingProduct ? editingProduct.volume : newProduct.volume}
                        onChange={handleProductChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                        required
                      >
                        <option value="">Select a volume</option>
                        {volumes.map(vol => (
                          <option key={vol} value={vol}>{vol}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="modal-skuCode" className="block text-sm font-medium text-gray-700">
                        SKU Code <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center">
                        <input
                          type="text"
                          id="modal-skuCode"
                          name="skuCode"
                          value={editingProduct ? editingProduct.skuCode : newProduct.skuCode}
                          onChange={handleProductChange}
                          className="mt-1 block w-full rounded-l-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                          placeholder="e.g., LAPTOP-MEDIUM"
                          required
                        />
                        <button
                          type="button"
                          onClick={suggestSkuCode}
                          disabled={isSuggestingSku || !(editingProduct ? editingProduct.name && editingProduct.volume : newProduct.name && newProduct.volume)}
                          className="mt-1 px-4 py-2 bg-yellow-500 text-white rounded-r-md hover:bg-yellow-600 transition-colors duration-200 shadow-md flex items-center justify-center"
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
                      <label htmlFor="modal-description" className="block text-sm font-medium text-gray-700">Product Description</label>
                      <textarea
                        id="modal-description"
                        name="description"
                        value={editingProduct ? editingProduct.description : newProduct.description}
                        onChange={handleProductChange}
                        rows="4"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
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
                    <div className="flex justify-end space-x-2 mt-6">
                      <button
                        type="button"
                        onClick={() => {
                          setShowProductFormModal(false);
                          setEditingProduct(null);
                          setNewProduct({ name: '', price: '', hsnSac: '', gstRate: '', description: '', category: '', type: '', volume: '', skuCode: '', inventory: {} });
                        }}
                        className="px-6 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors duration-200 shadow-md"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-8 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 shadow-md"
                      >
                        {editingProduct ? 'Update Product' : 'Add Product'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Warehouse Management Page */}
          {currentPage === 'warehouses' && (
            <div className="bg-white p-6 rounded-lg shadow-xl">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900">Warehouse Management</h2>

              <button
                onClick={() => {
                  setEditingWarehouse(null);
                  // Initialize newWarehouse with all new fields
                  setNewWarehouse({ name: '', address: '', city: '', state: '', pincode: '', latitude: '', longitude: '', googleMapsCode: '', description: '' });
                  setShowWarehouseFormModal(true);
                }}
                className="mb-6 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 shadow-md"
              >
                Add New Warehouse
              </button>

              <h3 className="text-xl font-semibold mb-4 text-gray-900">Existing Warehouses</h3>
              {(warehouses || []).length === 0 ? (
                <p className="text-gray-600">No warehouses added yet. Click "Add New Warehouse" to get started!</p>
              ) : (
                <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Address
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          City
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          State
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pincode
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Latitude
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Longitude
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Google Maps Code
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th scope="col" className="relative px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(warehouses || []).map((warehouse) => (
                        <tr key={warehouse.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {warehouse.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {warehouse.address || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {warehouse.city || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {warehouse.state || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {warehouse.pincode || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {warehouse.latitude || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {warehouse.longitude || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={warehouse.googleMapsCode}>
                            {warehouse.googleMapsCode || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={warehouse.description}>
                            {warehouse.description || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditWarehouse(warehouse)}
                              className="text-blue-600 hover:text-blue-900 mr-4 transition-colors duration-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteWarehouse(warehouse.id)}
                              className="text-red-600 hover:text-red-900 transition-colors duration-200"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Warehouse Form Side Panel/Modal */}
          {showWarehouseFormModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-end z-40">
              <div ref={warehouseModalRef} className="relative w-full md:w-1/2 lg:w-1/3 bg-white h-full shadow-2xl overflow-y-auto transform transition-transform ease-out duration-300 translate-x-0">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900">
                      {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
                    </h2>
                    <button
                      onClick={() => {
                        setShowWarehouseFormModal(false);
                        setEditingWarehouse(null);
                        setNewWarehouse({ name: '', address: '', city: '', state: '', pincode: '', latitude: '', longitude: '', googleMapsCode: '', description: '' });
                      }}
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                      &times;
                    </button>
                  </div>

                  <form onSubmit={handleSubmitWarehouse} className="space-y-4">
                    <div>
                      <label htmlFor="modal-wh-name" className="block text-sm font-medium text-gray-700">
                        Warehouse Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="modal-wh-name"
                        name="name"
                        value={editingWarehouse ? editingWarehouse.name : newWarehouse.name}
                        onChange={handleWarehouseChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                        placeholder="e.g., Main Warehouse"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="modal-wh-address" className="block text-sm font-medium text-gray-700">
                        Address
                      </label>
                      <input
                        type="text"
                        id="modal-wh-address"
                        name="address"
                        value={editingWarehouse ? editingWarehouse.address : newWarehouse.address}
                        onChange={handleWarehouseChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                        placeholder="e.g., 123 Main St"
                      />
                    </div>
                    <div>
                      <label htmlFor="modal-wh-city" className="block text-sm font-medium text-gray-700">
                        City
                      </label>
                      <input
                        type="text"
                        id="modal-wh-city"
                        name="city"
                        value={editingWarehouse ? editingWarehouse.city : newWarehouse.city}
                        onChange={handleWarehouseChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                        placeholder="e.g., Hyderabad"
                      />
                    </div>
                    <div>
                      <label htmlFor="modal-wh-state" className="block text-sm font-medium text-gray-700">
                        State
                      </label>
                      <input
                        type="text"
                        id="modal-wh-state"
                        name="state"
                        value={editingWarehouse ? editingWarehouse.state : newWarehouse.state}
                        onChange={handleWarehouseChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                        placeholder="e.g., Telangana"
                      />
                    </div>
                    <div>
                      <label htmlFor="modal-wh-pincode" className="block text-sm font-medium text-gray-700">
                        Pincode
                      </label>
                      <input
                        type="text"
                        id="modal-wh-pincode"
                        name="pincode"
                        value={editingWarehouse ? editingWarehouse.pincode : newWarehouse.pincode}
                        onChange={handleWarehouseChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                        placeholder="e.g., 500001"
                      />
                    </div>
                    <div>
                      <label htmlFor="modal-wh-latitude" className="block text-sm font-medium text-gray-700">Latitude</label>
                      <input
                        type="text"
                        id="modal-wh-latitude"
                        name="latitude"
                        value={editingWarehouse ? editingWarehouse.latitude : newWarehouse.latitude}
                        onChange={handleWarehouseChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                        placeholder="e.g., 17.3850"
                      />
                    </div>
                    <div>
                      <label htmlFor="modal-wh-longitude" className="block text-sm font-medium text-gray-700">Longitude</label>
                      <input
                        type="text"
                        id="modal-wh-longitude"
                        name="longitude"
                        value={editingWarehouse ? editingWarehouse.longitude : newWarehouse.longitude}
                        onChange={handleWarehouseChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                        placeholder="e.g., 78.4867"
                      />
                    </div>
                    <div>
                      <label htmlFor="modal-wh-googleMapsCode" className="block text-sm font-medium text-gray-700">Google Maps Code</label>
                      <textarea
                        id="modal-wh-googleMapsCode"
                        name="googleMapsCode"
                        value={editingWarehouse ? editingWarehouse.googleMapsCode : newWarehouse.googleMapsCode}
                        onChange={handleWarehouseChange}
                        rows="3"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                        placeholder="ABCD+DEF" // Updated placeholder
                      ></textarea>
                    </div>
                    <div>
                      <label htmlFor="modal-wh-description" className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        id="modal-wh-description"
                        name="description"
                        value={editingWarehouse ? editingWarehouse.description : newWarehouse.description}
                        onChange={handleWarehouseChange}
                        rows="3"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                        placeholder="Brief description of the warehouse..."
                      ></textarea>
                    </div>
                    <div className="flex justify-end space-x-2 mt-6">
                      <button
                        type="button"
                        onClick={() => {
                          setShowWarehouseFormModal(false);
                          setEditingWarehouse(null);
                          setNewWarehouse({ name: '', address: '', city: '', state: '', pincode: '', latitude: '', longitude: '', googleMapsCode: '', description: '' });
                        }}
                        className="px-6 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors duration-200 shadow-md"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-8 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 shadow-md"
                      >
                        {editingWarehouse ? 'Update Warehouse' : 'Add Warehouse'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Inventory Page */}
          {currentPage === 'inventory' && (
            <div className="bg-white p-6 rounded-lg shadow-xl">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900">Inventory Dashboard</h2>

              <div className="mb-6 flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
                <div className="w-full md:w-1/2">
                  <label htmlFor="select-warehouse" className="block text-sm font-medium text-gray-700 mb-1">View Inventory for:</label>
                  <select
                    id="select-warehouse"
                    value={selectedWarehouseForInventory}
                    onChange={(e) => setSelectedWarehouseForInventory(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                  >
                    <option value="">All Warehouses</option>
                    {(warehouses || []).map(wh => (
                      <option key={wh.id} value={wh.id}>{wh.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-full md:w-1/2 md:text-right">
                  <button
                    onClick={() => setShowAdjustmentModal(true)}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 shadow-md"
                  >
                    Log Entry
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-4 text-gray-900">Current Stock Levels</h3>
              {(products || []).length === 0 ? (
                <p className="text-gray-600">No products added yet. Go to "Products" to add some.</p>
              ) : (warehouses || []).length === 0 ? (
                <p className="text-gray-600">No warehouses added yet. Go to "Warehouses" to add some.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SKU Code
                        </th>
                        {selectedWarehouseForInventory ? (
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quantity ({(warehouses || []).find(wh => wh.id === selectedWarehouseForInventory)?.name})
                          </th>
                        ) : (
                          (warehouses || []).map(wh => (
                            <th key={wh.id} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Quantity ({wh.name})
                            </th>
                          ))
                        )}
                        {!selectedWarehouseForInventory && (
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Stock
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(products || []).map((product) => {
                        const totalStock = Object.values(product.inventory || {}).reduce((sum, qty) => sum + qty, 0);
                        if (selectedWarehouseForInventory && (product.inventory[selectedWarehouseForInventory] === undefined || product.inventory[selectedWarehouseForInventory] === 0)) {
                          return null;
                        }
                        return (
                          <tr key={product.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {product.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {product.skuCode}
                            </td>
                            {selectedWarehouseForInventory ? (
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {product.inventory[selectedWarehouseForInventory] || 0}
                              </td>
                            ) : (
                              (warehouses || []).map(wh => (
                                <td key={wh.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {product.inventory[wh.id] || 0}
                                </td>
                              ))
                            )}
                            {!selectedWarehouseForInventory && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">
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
          )}

          {/* Inventory Adjustment Modal */}
          {showAdjustmentModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-40">
              <div ref={adjustmentModalRef} className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Log Stock Entry</h2> {/* Updated header */}
                  <button
                    onClick={() => {
                      setShowAdjustmentModal(false);
                      setInventoryAdjustments({ skuCode: '', warehouseId: '', quantity: '', type: 'increase', transactionType: 'Adjustment', reason: '' });
                    }}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    &times;
                  </button>
                </div>
                <form onSubmit={handleAdjustInventory} className="space-y-4">
                  <div>
                    <label htmlFor="adj-skuCode" className="block text-sm font-medium text-gray-700">
                      Product SKU Code <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="adj-skuCode"
                      name="skuCode"
                      value={inventoryAdjustments.skuCode}
                      onChange={handleAdjustmentChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                      required
                    >
                      <option value="">Select Product by SKU</option>
                      {(products || []).map(p => (
                        <option key={p.id} value={p.skuCode}>{p.skuCode}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="adj-warehouseId" className="block text-sm font-medium text-gray-700">
                      Warehouse <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="adj-warehouseId"
                      name="warehouseId"
                      value={inventoryAdjustments.warehouseId}
                      onChange={handleAdjustmentChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                      required
                    >
                      <option value="">Select Warehouse</option>
                      {(warehouses || []).map(wh => (
                        <option key={wh.id} value={wh.id}>{wh.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="adj-quantity" className="block text-sm font-medium text-gray-700">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="adj-quantity"
                      name="quantity"
                      value={inventoryAdjustments.quantity}
                      onChange={handleAdjustmentChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                      placeholder="e.g., 10"
                      min="1"
                      required
                    />
                  </div>
                  {/* Transaction Type moved above Entry Type */}
                  <div>
                    <label htmlFor="adj-transactionType" className="block text-sm font-medium text-gray-700">
                      Transaction Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="adj-transactionType"
                      name="transactionType"
                      value={inventoryAdjustments.transactionType}
                      onChange={handleAdjustmentChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                      required
                    >
                      {transactionTypes.map(typeOption => (
                        <option key={typeOption} value={typeOption}>{typeOption}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Entry Type <span className="text-red-500">*</span> {/* Renamed label */}
                    </label>
                    <div className="mt-1 flex space-x-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="type"
                          value="increase"
                          checked={inventoryAdjustments.type === 'increase'}
                          onChange={handleAdjustmentChange}
                          className="form-radio text-blue-600"
                          required
                          disabled={inventoryAdjustments.transactionType === 'Sale' || inventoryAdjustments.transactionType === 'Return'} // Disabled based on Transaction Type
                        />
                        <span className="ml-2">Increase</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="type"
                          value="decrease"
                          checked={inventoryAdjustments.type === 'decrease'}
                          onChange={handleAdjustmentChange}
                          className="form-radio text-blue-600"
                          required
                          disabled={inventoryAdjustments.transactionType === 'Sale' || inventoryAdjustments.transactionType === 'Return'} // Disabled based on Transaction Type
                        />
                        <span className="ml-2">Decrease</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="adj-reason" className="block text-sm font-medium text-gray-700">Reason (Optional)</label>
                    <textarea
                      id="adj-reason"
                      name="reason"
                      value={inventoryAdjustments.reason}
                      onChange={handleAdjustmentChange}
                      rows="2"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                      placeholder="e.g., Damaged goods, Initial stock"
                    ></textarea>
                  </div>
                  <div className="flex justify-end space-x-2 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdjustmentModal(false);
                        setInventoryAdjustments({ skuCode: '', warehouseId: '', quantity: '', type: 'increase', transactionType: 'Adjustment', reason: '' });
                      }}
                      className="px-6 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors duration-200 shadow-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-8 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 shadow-md"
                    >
                      Log Entry
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Inventory Logs Page */}
          {currentPage === 'inventoryLogs' && (
            <div className="bg-white p-6 rounded-lg shadow-xl">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900">Inventory Logs</h2>

              {(inventoryLogs || []).length === 0 ? (
                <p className="text-gray-600">No inventory entries logged yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timestamp
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product (SKU)
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Warehouse
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Qty Change
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Old Qty
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          New Qty
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transaction Type
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reason
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Logged By (User ID)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(inventoryLogs || []).map((log) => (
                        <tr key={log.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(log.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {log.productName} ({log.skuCode})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.warehouseName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${log.changeType === 'increase' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {log.changeType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.quantityChange}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.oldQuantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.newQuantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.transactionType}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={log.reason}>
                            {log.reason || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.userName} ({log.userId.substring(0, 8)}...)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Placeholder for other pages */}
          {currentPage === 'customers' && (
            <div className="bg-white p-6 rounded-lg shadow-xl text-center text-gray-600 text-lg">
              Customer Management coming soon!
            </div>
          )}
          {currentPage === 'createInvoice' && (
            <div className="bg-white p-6 rounded-lg shadow-xl text-center text-gray-600 text-lg">
              Create Invoice functionality coming soon!
            </div>
          )}
          {currentPage === 'invoiceList' && (
            <div className="bg-white p-6 rounded-lg shadow-xl text-center text-gray-600 text-lg">
              Invoice List and Export functionality coming soon!
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white text-center p-4 mt-8 shadow-inner">
        <p>&copy; {new Date().getFullYear()} Just Pressed. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
