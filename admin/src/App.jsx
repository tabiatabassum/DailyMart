
import { useEffect, useState } from 'react';
import './App.css';

const API_BASE_URL = 'http://192.168.0.3:5000';
const API_URL = `${API_BASE_URL}/api/products`;
const categories = [
  'All Categories',
  'Food',
  'Baby Food & Care',
  'Home Cleaning',
  'Beauty & Health',
  'Home & Kitchen',
  'Stationeries',
];

const emptyForm = {
  name: '',
  category: 'Food',
  subcategory: '',
  price: '',
  old_price: '',
  unit: '',
  stock: '',
  badge: '',
  image: '',
};

function App() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [products, setProducts] = useState([]);
  const [token, setToken] = useState(
  () => localStorage.getItem('dailymart_admin_token') || ''
);
const [loginEmail, setLoginEmail] = useState('');
const [loginPassword, setLoginPassword] = useState('');
const [loginError, setLoginError] = useState('');
const [loginLoading, setLoginLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [activePage, setActivePage] = useState('Products');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [orders, setOrders] = useState([]);
const [ordersLoading, setOrdersLoading] = useState(false);
const [ordersError, setOrdersError] = useState('');
const [updatingOrderId, setUpdatingOrderId] = useState(null);

async function handleAdminLogin(event) {
  event.preventDefault();
  setLoginError('');
  setLoginLoading(true);

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Admin login failed.');
    }

    localStorage.setItem(
      'dailymart_admin_token',
      data.access_token
    );

    setToken(data.access_token);
    localStorage.setItem('dailymart_admin_token', data.access_token);
    setLoginPassword('');
  } catch (error) {
    setLoginError(
      error instanceof Error
        ? error.message
        : 'Could not log in.'
    );
  } finally {
    setLoginLoading(false);
  }
}

function handleAdminLogout() {
  localStorage.removeItem('dailymart_admin_token');
  setToken('');
  setLoginEmail('');
  setLoginPassword('');
  setLoginError('');
}


  // Load products from MySQL through the Flask API.
  async function fetchProducts() {
    setLoading(true);
    setLoadError('');

    try {
      const response = await fetch(API_URL);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not load products.');
      }

      setProducts(data);
    } catch (error) {
      console.error('Loading products failed:', error);
      setLoadError(
        'Could not connect to the backend. Make sure Flask is running at http://127.0.0.1:5000.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

async function fetchOrders() {
  setOrdersLoading(true);
  setOrdersError('');

  try {
    const response = await fetch(`${API_BASE_URL}/api/orders`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Could not load orders.');
    }

    setOrders(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('Loading orders failed:', error);
    setOrdersError(
      error instanceof Error ? error.message : 'Could not load orders.'
    );
  } finally {
    setOrdersLoading(false);
  }
}

useEffect(() => {
  if (activePage === 'Orders') {
    fetchOrders();
  }
}, [activePage]);

async function updateOrderStatus(orderId, status) {
  setUpdatingOrderId(orderId);
  setOrdersError('');

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/orders/${orderId}`,
      {
        method: 'PUT',
        
headers: {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
},

        body: JSON.stringify({ status }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Could not update order status.');
    }

    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId ? { ...order, status } : order
      )
    );
  } catch (error) {
    console.error('Updating order status failed:', error);
    setOrdersError(
      error instanceof Error
        ? error.message
        : 'Could not update order status.'
    );
  } finally {
    setUpdatingOrderId(null);
  }
}

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(search.toLowerCase().trim());

    const matchesCategory =
      categoryFilter === 'All Categories' ||
      product.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const totalProducts = products.length;

  const totalStock = products.reduce(
    (total, product) => total + Number(product.stock),
    0
  );

  const outOfStock = products.filter(
    (product) => Number(product.stock) === 0
  ).length;

  const lowStock = products.filter(
    (product) => Number(product.stock) > 0 && Number(product.stock) < 10
  ).length;

  function openAddForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setSelectedImage(null);
    setShowForm(true);
  }

  function openEditForm(product) {
    setEditingId(product.id);

    setForm({
      name: product.name ?? '',
      category: product.category ?? 'Food',
      subcategory: product.subcategory ?? '',
      price: String(product.price ?? ''),
      old_price: String(product.old_price ?? ''),
      unit: product.unit ?? '',
      stock: String(product.stock ?? 0),
      badge: product.badge ?? '',
      image: product.image ?? '',
    });

    setShowForm(true);
    setSelectedImage(null);
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

function handleImageChange(event) {
  const file = event.target.files?.[0];

  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('Please select an image file.');
    event.target.value = '';
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert('Image size must be 5 MB or less.');
    event.target.value = '';
    return;
  }

  setSelectedImage(file);
}
  // Add a product or update an existing product in MySQL.
  async function saveProduct(event) {
    event.preventDefault();

    if (
      !form.name.trim() ||
      form.price === '' ||
      form.stock === ''
    ) {
      alert('Please fill in product name, price and stock.');
      return;
    }

    const price = Number(form.price);
    const stock = Number(form.stock);
    const oldPrice =
      form.old_price === '' ? price : Number(form.old_price);

    if (
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isFinite(oldPrice) ||
      oldPrice < 0 ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      alert('Enter a valid price and a whole-number stock quantity.');
      return;
    }

    const productData = {
      name: form.name.trim(),
      category: form.category,
      subcategory: form.subcategory.trim() || null,
      price,
      old_price: oldPrice,
      unit: form.unit.trim() || null,
      stock,
      badge: form.badge.trim() || null,
      image: form.image || null,
    };

    setSaving(true);

    try {
      if (selectedImage) {
  const imageFormData = new FormData();
  imageFormData.append('image', selectedImage);

  const uploadResponse = await fetch(
    `${API_BASE_URL}/api/upload-image`,
    
{
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: imageFormData,
}

  );

  const uploadResult = await uploadResponse.json();

  if (!uploadResponse.ok) {
    throw new Error(uploadResult.error || 'Image upload failed.');
  }

  productData.image = uploadResult.image;
}
      const isEditing = editingId !== null;

      
const response = await fetch(
  isEditing ? `${API_URL}/${editingId}` : API_URL,
  {
    method: isEditing ? 'PUT' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(productData),
  }
);


      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not save product.');
      }

      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });

      await fetchProducts();

      alert(
        isEditing
          ? 'Product updated successfully!'
          : 'Product added successfully!'
      );
    } catch (error) {
      console.error('Saving product failed:', error);
      alert(
        `Could not save product: ${error.message}\n\nCheck that Flask is running and look at its terminal for errors.`
      );
    } finally {
      setSaving(false);
    }
  }

  // Delete a product from MySQL.
  async function deleteProduct(productId) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this product?'
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/${productId}`, {
  method: 'DELETE',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not delete product.');
      }

      await fetchProducts();
      alert('Product deleted successfully!');
    } catch (error) {
      console.error('Deleting product failed:', error);
      alert(
        `Could not delete product: ${error.message}\n\nCheck that Flask is running.`
      );
    }
  }

  function renderDashboard() {
    
    return (
      <>
        <div className="page-heading">
          <div>
            <h1>Dashboard</h1>
            <p>Welcome to your DailyMart admin panel.</p>
          </div>

          <button className="primary-button" onClick={openAddForm}>
            + Add Product
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon red-icon">▦</div>
            <p>Total Products</p>
            <h2>{totalProducts}</h2>
            <span>Products in catalogue</span>
          </div>

          <div className="stat-card">
            <div className="stat-icon yellow-icon">▤</div>
            <p>Total Stock Units</p>
            <h2>{totalStock}</h2>
            <span>Units currently recorded</span>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange-icon">!</div>
            <p>Low Stock</p>
            <h2>{lowStock}</h2>
            <span>Products below 10 units</span>
          </div>

          <div className="stat-card">
            <div className="stat-icon gray-icon">×</div>
            <p>Out of Stock</p>
            <h2>{outOfStock}</h2>
            <span>Products unavailable</span>
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Recent Products</h2>
              <p>Review your current product catalogue.</p>
            </div>

            <button
              className="text-button"
              onClick={() => setActivePage('Products')}
            >
              View all →
            </button>
          </div>

          {renderProductTable(products.slice(0, 5))}
        </div>
      </>
    );
  }

  function renderProductTable(items) {
    return (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>PRODUCT</th>
              <th>CATEGORY</th>
              <th>PRICE</th>
              <th>STOCK</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {items.map((product) => (
              <tr key={product.id}>
                <td>
                  <div className="product-cell">
                    <div className="product-avatar">
                      {product.name.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <strong>{product.name}</strong>
                      <small>{product.unit || 'Unit not specified'}</small>
                    </div>
                  </div>
                </td>

                <td>
                  <span>{product.category}</span>
                  <small className="subcategory">
                    {product.subcategory}
                  </small>
                </td>

                <td>
                  <strong>৳{Number(product.price).toFixed(2)}</strong>

                  {Number(product.old_price) > Number(product.price) && (
                    <small className="old-price">
                      ৳{Number(product.old_price).toFixed(2)}
                    </small>
                  )}
                </td>

                <td>{product.stock}</td>

                <td>
                  <span
                    className={`status-pill ${
                      Number(product.stock) === 0
                        ? 'status-out'
                        : Number(product.stock) < 10
                          ? 'status-low'
                          : 'status-in'
                    }`}
                  >
                    {Number(product.stock) === 0
                      ? 'Out of Stock'
                      : Number(product.stock) < 10
                        ? 'Low Stock'
                        : 'In Stock'}
                  </span>
                </td>

                <td>
                  <div className="action-buttons">
                    <button
                      className="edit-button"
                      onClick={() => openEditForm(product)}
                      title="Edit product"
                    >
                      Edit
                    </button>

                    <button
                      className="delete-button"
                      onClick={() => deleteProduct(product.id)}
                      title="Delete product"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td colSpan="6" className="empty-table">
                  {loading ? 'Loading products...' : 'No products found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function renderProductsPage() {
    return (
      <>
        <div className="page-heading">
          <div>
            <h1>Products</h1>
            <p>Add, edit and manage your grocery products.</p>
          </div>

          <button className="primary-button" onClick={openAddForm}>
            + Add Product
          </button>
        </div>

        <div className="panel">
          <div className="product-toolbar">
            <input
              className="search-field"
              type="search"
              placeholder="Search products by name..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              className="filter-field"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {renderProductTable(filteredProducts)}
        </div>
      </>
    );
  }

  
function renderOrdersPage() {
  const statuses = [
    'Pending',
    'Confirmed',
    'Preparing',
    'Out for Delivery',
    'Delivered',
  ];

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Orders</h1>
          <p>View customer orders and manage their delivery status.</p>
        </div>

        <button
          className="primary-button"
          onClick={fetchOrders}
          disabled={ordersLoading}
        >
          {ordersLoading ? 'Loading...' : '↻ Refresh Orders'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon red-icon">▤</div>
          <p>Total Orders</p>
          <h2>{orders.length}</h2>
          <span>All recorded orders</span>
        </div>

        <div className="stat-card">
          <div className="stat-icon yellow-icon">◷</div>
          <p>Pending</p>
          <h2>
            {orders.filter((order) => order.status === 'Pending').length}
          </h2>
          <span>Waiting for confirmation</span>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange-icon">▣</div>
          <p>Preparing</p>
          <h2>
            {orders.filter((order) => order.status === 'Preparing').length}
          </h2>
          <span>Orders being prepared</span>
        </div>

        <div className="stat-card">
          <div className="stat-icon gray-icon">✓</div>
          <p>Delivered</p>
          <h2>
            {orders.filter((order) => order.status === 'Delivered').length}
          </h2>
          <span>Successfully delivered</span>
        </div>
      </div>

      {ordersError && (
        <div className="orders-error" role="alert">
          {ordersError}
          <button className="text-button" onClick={fetchOrders}>
            Try again
          </button>
        </div>
      )}

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Customer Orders</h2>
            <p>Order details, payment and delivery status.</p>
          </div>
        </div>

        {ordersLoading && orders.length === 0 ? (
          <div className="empty-state">
            <p>Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">▤</div>
            <h2>No orders found</h2>
            <p>Customer orders will appear here.</p>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div className="order-card" key={order.id}>
                <div className="order-card-heading">
                  <div>
                    <h3>Order #{order.id}</h3>
                    <p>
                      {order.created_at
                        ? new Date(order.created_at).toLocaleString()
                        : 'Date not available'}
                    </p>
                  </div>

                  <span
                    className={`order-status status-${String(
                      order.status
                    ).toLowerCase().replaceAll(' ', '-')}`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="order-customer-grid">
                  <div>
                    <span>Customer</span>
                    <strong>{order.customer_name}</strong>
                  </div>

                  <div>
                    <span>Phone</span>
                    <strong>{order.phone}</strong>
                  </div>

                  <div className="order-address">
                    <span>Delivery address</span>
                    <strong>{order.address}</strong>
                  </div>

                  <div>
                    <span>Payment</span>
                    <strong>{order.payment_method}</strong>
                  </div>
                </div>

                <div className="order-items">
                  <h4>Ordered Products</h4>

                  {(order.items || []).map((item, index) => (
                    <div
                      className="order-item-row"
                      key={`${order.id}-${index}`}
                    >
                      <span>
                        {item.product_name} × {item.quantity}
                      </span>
                      <strong>
                        ৳
                        {(
                          Number(item.price) * Number(item.quantity)
                        ).toFixed(2)}
                      </strong>
                    </div>
                  ))}
                </div>

                <div className="order-card-footer">
                  <div>
                    <span>Order Total</span>
                    <strong className="order-total">
                      ৳{Number(order.total_amount).toFixed(2)}
                    </strong>
                  </div>

                  <label className="order-status-control">
                    Update Status
                    <select
                      value={order.status}
                      disabled={updatingOrderId === order.id}
                      onChange={(event) =>
                        updateOrderStatus(order.id, event.target.value)
                      }
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    {updatingOrderId === order.id && (
                      <small>Saving status...</small>
                    )}
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}


  
  function renderContent() {
    if (activePage === 'Dashboard') return renderDashboard();
    if (activePage === 'Products') return renderProductsPage();
    if (activePage === 'Orders') return renderOrdersPage();

    return (
      <div className="page-heading">
        <div>
          <h1>{activePage}</h1>
          <p>This section will be connected in the next steps.</p>
        </div>
      </div>
    );
  }

  // Show the login screen before opening the admin panel.
  if (!token) {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={handleAdminLogin}>
          <div className="brand-mark">D</div>

          <h1>DailyMart Admin</h1>
          <p>Sign in to manage your store</p>

          {loginError && (
            <div role="alert" className="login-error">
              {loginError}
            </div>
          )}

          <label>
            Email
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          <button
            type="submit"
            className="primary-button"
            disabled={loginLoading}
          >
            {loginLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">D</div>
          <div>
            <h2>DailyMart</h2>
            <span>ADMIN PANEL</span>
          </div>
        </div>

        <div className="menu-label">MAIN MENU</div>

        <nav className="side-navigation">
          <button
            className={`side-link ${
              activePage === 'Dashboard' ? 'active' : ''
            }`}
            onClick={() => setActivePage('Dashboard')}
          >
            <span className="menu-icon">▦</span>
            Dashboard
          </button>

          <button
            className={`side-link ${
              activePage === 'Products' ? 'active' : ''
            }`}
            onClick={() => setActivePage('Products')}
          >
            <span className="menu-icon">▤</span>
            Products
          </button>

          <button
            className={`side-link ${
              activePage === 'Orders' ? 'active' : ''
            }`}
            onClick={() => setActivePage('Orders')}
          >
            <span className="menu-icon">🛒</span>
            Orders
          </button>

          <button
            className={`side-link ${
              activePage === 'Categories' ? 'active' : ''
            }`}
            onClick={() => setActivePage('Categories')}
          >
            <span className="menu-icon">▧</span>
            Categories
          </button>

          <button
            className={`side-link ${
              activePage === 'Inventory' ? 'active' : ''
            }`}
            onClick={() => setActivePage('Inventory')}
          >
            <span className="menu-icon">▣</span>
            Inventory
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="admin-profile">
            <div className="profile-avatar">A</div>
            <div>
              <strong>DailyMart Admin</strong>
              <span>Administrator</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="breadcrumb">DailyMart / </span>
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-right">
            <span className="connection-indicator">
              <span className="indicator-dot" />
              {loadError ? 'Connection issue' : 'Live product data'}
            </span>

            <button
              className="text-button"
              onClick={fetchProducts}
              disabled={loading}
              title="Refresh products"
            >
              {loading ? 'Loading...' : '↻ Refresh'}
            </button>

           <div className="profile-menu-container">
  <button
    type="button"
    className="topbar-avatar"
    onClick={() => setShowProfileMenu((prev) => !prev)}
    aria-label="Open admin profile menu"
    aria-expanded={showProfileMenu}
  >
    A
  </button>

  {showProfileMenu && (
    <div className="profile-dropdown">
      <button
        type="button"
        onClick={() => {
          setActivePage('Admin Profile');
          setShowProfileMenu(false);
        }}
      >
        Admin Profile
      </button>

      <button
        type="button"
        onClick={() => {
          setActivePage('Add New Admin');
          setShowProfileMenu(false);
        }}
      >
        Add New Admin
      </button>

      <button
        type="button"
        onClick={() => {
          setShowProfileMenu(false);
          handleAdminLogout();
        }}
      >
        Logout
      </button>
    </div>
  )}
</div>
          </div>
        </header>

        <section className="page-content">
          {loadError && (
            <div
              role="alert"
              style={{
                background: '#fff0f0',
                color: '#a61b1b',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
              }}
            >
              {loadError}
              <button
                className="text-button"
                onClick={fetchProducts}
                style={{ marginLeft: '12px' }}
              >
                Try again
              </button>
            </div>
          )}

          {renderContent()}
        </section>
      </main>

      {showForm && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              setShowForm(false);
            }
          }}
        >
          <div className="product-modal">
            <div className="modal-heading">
              <div>
                <h2>
                  {editingId !== null ? 'Edit Product' : 'Add Product'}
                </h2>
                <p>Enter the product details below.</p>
              </div>

              <button
                className="close-button"
                onClick={() => setShowForm(false)}
                aria-label="Close form"
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form onSubmit={saveProduct}>
              <label>
                Product name *
                <input
                  name="name"
                  value={form.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Fresh Apples"
                  required
                />
              </label>

              <div className="form-two-columns">
                <label>
                  Category *
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleInputChange}
                    required
                  >
                    {categories
                      .filter((category) => category !== 'All Categories')
                      .map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                  </select>
                </label>

                <label>
                  Subcategory
                  <input
                    name="subcategory"
                    value={form.subcategory}
                    onChange={handleInputChange}
                    placeholder="e.g. Fruits & Vegetables"
                  />
                </label>

                <label>
                  Price (৳) *
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={handleInputChange}
                    required
                  />
                </label>

                <label>
                  Old price (৳)
                  <input
                    name="old_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.old_price}
                    onChange={handleInputChange}
                  />
                </label>

                <label>
                  Unit
                  <input
                    name="unit"
                    value={form.unit}
                    onChange={handleInputChange}
                    placeholder="e.g. 500 g"
                  />
                </label>

                <label>
                  Stock quantity *
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={handleInputChange}
                    required
                  />
                </label>
              </div>

              <label>
                <label>
  Product image
  <input
    type="file"
    accept="image/*"
    onChange={handleImageChange}
  />
</label>

{(selectedImage || form.image) && (
  <div style={{ margin: '12px 0' }}>
    <p>Image preview</p>

    <img
      src={
        selectedImage
          ? URL.createObjectURL(selectedImage)
          : form.image.startsWith('/uploads/')
            ? `${API_BASE_URL}${form.image}`
            : form.image
      }
      alt="Product preview"
      style={{
        width: '120px',
        height: '120px',
        objectFit: 'cover',
        borderRadius: '8px',
        border: '1px solid #ddd',
      }}
    />
  </div>
)}
                Product badge
                <input
                  name="badge"
                  value={form.badge}
                  onChange={handleInputChange}
                  placeholder="e.g. Popular, Fresh"
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingId !== null
                      ? 'Save Changes'
                      : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
