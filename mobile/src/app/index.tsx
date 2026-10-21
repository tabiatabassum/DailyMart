import { Alert } from 'react-native';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Image,
  useWindowDimensions,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

// Categories and their subcategories
const categories = [
  {
    name: 'Food',
    icon: '🥦',
    subcategories: [
      'Fruits & Vegetables',
      'Meat & Fish',
      'Eggs',
      'Drinks',
      'Snacks',
      'Frozen Food',
      'Canned Food',
      'Dairy',
      'Ice Cream',
      'Candy & Chocolate',
      'Breakfast',
      'Cooking Essentials',
      'Baking Needs',
      'Sauces & Pickles',
    ],
  },
  {
    name: 'Baby Food & Care',
    icon: '🍼',
    subcategories: [
      'Baby Food',
      'Baby Wipes',
      'Baby Bath & Skincare',
      'Baby Oral Care',
      'Baby Accessories',
    ],
  },
  {
    name: 'Home Cleaning',
    icon: '🧹',
    subcategories: [
      'Dish Cleaner',
      'Laundry Products',
      'Air Fresheners',
      'Floor, Glass & Wood Cleaners',
      'Toilet Cleaners',
      'Pest Control',
      'Trash Supplies',
    ],
  },
  {
    name: 'Beauty & Health',
    icon: '🧴',
    subcategories: [
      'Skin Care',
      'Hair Care',
      'Personal Care',
      'Oral Care',
    ],
  },
  {
    name: 'Home & Kitchen',
    icon: '🏠',
    subcategories: [
      'Home Appliances',
      'Kitchen Accessories',
      'Kitchen Essentials',
      'Home Accessories',
      'Lights & Electrical',
      'Tools & Hardware',
    ],
  },
  {
    name: 'Stationeries',
    icon: '✏️',
    subcategories: [
      'Pens & Pencils',
      'Notebooks',
      'Office Supplies',
    ],
  },
];

// On computer browser, use localhost.
// On a physical phone, use your computer's local IP address.
const API_URL =
  Platform.OS === 'web'
    ? 'http://127.0.0.1:5000'
    : 'http://192.168.0.3:5000';

type Product = {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  oldPrice: number;
  unit: string;
  image: string;
  badge: string;
  stock: number;
};

export default function HomeScreen() {
  const { width } = useWindowDimensions();
const isMobile = width < 768;
const [showAccountChoice, setShowAccountChoice] = useState(true);
const [showAdminLogin, setShowAdminLogin] = useState(false);
const [adminEmail, setAdminEmail] = useState('');
const [adminPassword, setAdminPassword] = useState('');
const [adminToken, setAdminToken] = useState('');
const [adminMessage, setAdminMessage] = useState('');
const [adminLoading, setAdminLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(
    null
  );
  const [cart, setCart] = useState<Record<string, number>>({});
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [trackedOrderId, setTrackedOrderId] = useState<number | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<any>(null);
  const [trackingError, setTrackingError] = useState('');
    // Login and Registration
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [authPhone, setAuthPhone] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: number;
    name: string;
    email: string;
  } | null>(null);
  

const submitAdminLogin = async () => {
  setAdminMessage('');

  if (!adminEmail.trim() || !adminPassword) {
    setAdminMessage('Please enter your email and password.');
    return;
  }

  setAdminLoading(true);

  try {
    const response = await fetch(`${API_URL}/api/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: adminEmail.trim().toLowerCase(),
        password: adminPassword,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Admin login failed.');
    }

    if (!result.access_token) {
      throw new Error('Admin access token was not received.');
    }

    setAdminToken(result.access_token);
setAdminPassword('');
setAdminMessage('');
setShowAdminLogin(false);
setShowAccountChoice(false);
setShowAdminPanel(true);


  } catch (error) {
    setAdminMessage(
      error instanceof Error
        ? error.message
        : 'Could not connect to DailyMart.'
    );
  } finally {
    setAdminLoading(false);
  }
};


  // Restore the last tracked order after a page refresh.
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const savedOrderId = window.localStorage.getItem(
      'dailymart_tracked_order_id'
    );

    if (savedOrderId) {
      const orderId = Number(savedOrderId);

      if (Number.isInteger(orderId) && orderId > 0) {
        setTrackedOrderId(orderId);
      }
    }
  }, []);

  // Checkout form
const [showCheckout, setShowCheckout] = useState(false);
const [customerName, setCustomerName] = useState('');
const [phone, setPhone] = useState('');
const [address, setAddress] = useState('');
const [submittingOrder, setSubmittingOrder] = useState(false);
const [orderMessage, setOrderMessage] = useState('');

  // Track the current order and refresh its status every 5 seconds.
  useEffect(() => {
  if (trackedOrderId === null) return;

  let active = true;

  const fetchTrackedOrder = async () => {
    try {
      const response = await fetch(`${API_URL}/api/orders`);

      if (!response.ok) {
        throw new Error('Could not load order status.');
      }

      const orders = await response.json();

      const order = orders.find(
        (item: any) => Number(item.id) === trackedOrderId
      );

      if (active) {
        setTrackedOrder(order || null);
        setTrackingError(
          order ? '' : 'Order not found.'
        );
      }
    } catch {
      if (active) {
        setTrackingError(
          'Could not load order status. Please try again.'
        );
      }
    }
  };

  fetchTrackedOrder();

  const timer = setInterval(fetchTrackedOrder, 5000);

  return () => {
    active = false;
    clearInterval(timer);
  };
}, [trackedOrderId]);

useEffect(() => {
  let isMounted = true;

  const loadProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/products`);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Unexpected product data received from API.');
      }

      const loadedProducts: Product[] = data.map((item: any) => ({
        id: String(item.id),
        name: item.name ?? '',
        category: item.category ?? '',
        subcategory: item.subcategory ?? '',
        price: Number(item.price ?? 0),
        oldPrice: Number(item.old_price ?? item.price ?? 0),
        unit: item.unit ?? '',
        image: item.image
  ? item.image.startsWith('/uploads/')
    ? `${API_URL}${item.image}`
    : item.image
  : '',
        badge: item.badge ?? '',
        stock: Number(item.stock ?? 0),
      }));

      if (isMounted) {
        setProducts(loadedProducts);
        setProductError(null);
      }
    } catch (error) {
      console.error('Failed to load DailyMart products:', error);

      if (isMounted) {
        setProductError(
          'Could not load products. Make sure the Python backend is running.'
        );
      }
    } finally {
      if (isMounted) {
        setLoadingProducts(false);
      }
    }
  };

  loadProducts();

  const refreshInterval = setInterval(() => {
    loadProducts();
  }, 5000);

  return () => {
    isMounted = false;
    clearInterval(refreshInterval);
  };
}, []);


  // Add or remove a product from the wishlist.
  const toggleWishlist = (productId: string) => {
    setWishlist((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  };

  // Update cart quantity without exceeding available stock.
  const updateQuantity = (productId: string, change: number) => {
    const product = products.find((item) => item.id === productId);

    if (!product) return;

    setCart((currentCart) => {
      const currentQuantity = currentCart[productId] || 0;
      const newQuantity = currentQuantity + change;

      if (newQuantity > product.stock) {
        return currentCart;
      }

      const updatedCart = { ...currentCart };

      if (newQuantity <= 0) {
        delete updatedCart[productId];
      } else {
        updatedCart[productId] = newQuantity;
      }

      return updatedCart;
    });
  };

  // Total quantity of products in the cart.
  const cartCount = Object.values(cart).reduce(
    (total, quantity) => total + quantity,
    0
  );

  // Total price of products in the cart.
  const cartTotal = products.reduce(
    (total, product) =>
      total + product.price * (cart[product.id] || 0),
    0
  );

  // Filter products by search, category and subcategory.
  const filteredProducts = products.filter((product) => {
    const query = searchText.trim().toLowerCase();

    const matchesSearch =
      product.name.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query) ||
      product.subcategory.toLowerCase().includes(query);

    const matchesCategory =
      activeCategory === null || product.category === activeCategory;

    const matchesSubcategory =
      activeSubcategory === null ||
      product.subcategory === activeSubcategory;

    return matchesSearch && matchesCategory && matchesSubcategory;
  });

  // Clear selected category and subcategory filters.
  const resetFilters = () => {
    setActiveCategory(null);
    setActiveSubcategory(null);
    setOpenCategory(null);
  };
    // Restore the demo account on web refresh.
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    try {
      const savedUser = window.localStorage.getItem('dailymart_user');

      if (savedUser) {
        const user = JSON.parse(savedUser);

        if (
          Number.isInteger(user.id) &&
          typeof user.name === 'string' &&
          typeof user.email === 'string'
        ) {
          setCurrentUser(user);
          setCustomerName(user.name);
        }
      }
    } catch {
      window.localStorage.removeItem('dailymart_user');
    }
  }, []);

  const submitAuth = async () => {
    setAuthMessage('');

    if (!authEmail.trim() || !authPassword) {
      setAuthMessage('Please enter your email and password.');
      return;
    }

    if (authMode === 'register') {
      if (!authName.trim() || !authPhone.trim()) {
        setAuthMessage('Please enter your name and phone number.');
        return;
      }

      if (authPassword.length < 8) {
        setAuthMessage('Password must be at least 8 characters.');
        return;
      }
    }

    setAuthLoading(true);

    try {
      const endpoint =
        authMode === 'register' ? '/api/register' : '/api/login';

      const payload =
        authMode === 'register'
          ? {
              name: authName.trim(),
              email: authEmail.trim().toLowerCase(),
              phone: authPhone.trim(),
              password: authPassword,
            }
          : {
              email: authEmail.trim().toLowerCase(),
              password: authPassword,
            };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Something went wrong.');
      }

      if (authMode === 'register') {
        setAuthMode('login');
        setAuthPassword('');
        setAuthMessage('Registration successful! Please log in.');
        return;
      }

      const user = result.user;

      if (
        !user ||
        !Number.isInteger(user.id) ||
        typeof user.name !== 'string' ||
        typeof user.email !== 'string'
      ) {
        throw new Error('Invalid account information received.');
      }

      setCurrentUser(user);
      setCustomerName(user.name);
      setAuthPassword('');
      setAuthMessage('');

      if (Platform.OS === 'web') {
        window.localStorage.setItem(
          'dailymart_user',
          JSON.stringify(user)
        );
      }

      setShowAuth(false);
    } catch (error) {
      setAuthMessage(
        error instanceof Error
          ? error.message
          : 'Could not connect to DailyMart.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const logoutUser = () => {
    setCurrentUser(null);
    setAuthPassword('');
    setShowAuth(false);
    setAuthMessage('');

    if (Platform.OS === 'web') {
      window.localStorage.removeItem('dailymart_user');
    }

    setCustomerName('');
    setPhone('');
  };
const placeOrder = async () => {
  if (cartCount === 0) {
    setOrderMessage('Your cart is empty.');
    return;
  }

  if (!customerName.trim() || !phone.trim() || !address.trim()) {
    setOrderMessage('Please fill in your name, phone and address.');
    return;
  }

  const orderItems = products
    .filter((product) => (cart[product.id] || 0) > 0)
    .map((product) => ({
      product_id: Number(product.id),
      quantity: cart[product.id],
    }));

  if (orderItems.length === 0) {
    setOrderMessage('No valid products found in your cart.');
    return;
  }

  setSubmittingOrder(true);
  setOrderMessage('');

  try {
    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_name: customerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        payment_method: 'Cash on Delivery',
        items: orderItems,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Could not place your order.');
    }
    setTrackedOrderId(Number(result.order_id));
    if (Platform.OS === 'web') {
  window.localStorage.setItem(
    'dailymart_tracked_order_id',
    String(result.order_id)
  );
}
    setCart({});
    setShowCheckout(false);
    setCustomerName('');
    setPhone('');
    setAddress('');

    setOrderMessage(
      `Order placed successfully! Order ID: ${result.order_id}. Total: ৳${Number(
        result.total_amount
      ).toFixed(2)}. Payment: Cash on Delivery.`
    );
  } catch (error) {
    setOrderMessage(
      error instanceof Error
        ? error.message
        : 'Could not place your order. Please try again.'
    );
  } finally {
    setSubmittingOrder(false);
  }
};
  // Account Choice Screen
  if (showAccountChoice) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F6F6F6', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: '#FFFFFF', padding: 28, borderRadius: 16, maxWidth: 420, width: '100%', alignSelf: 'center', gap: 16 }}>
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#D71920', textAlign: 'center' }}>
            DailyMart
          </Text>
          <Text style={{ fontSize: 18, textAlign: 'center', color: '#333333' }}>
            Choose your account
          </Text>

          
<Pressable
  onPress={() => {
    setShowAccountChoice(false);
    setAuthMode('login');
    setAuthMessage('');
    setShowAuth(true);
  }}
  style={{
    backgroundColor: '#D71920',
    padding: 16,
    borderRadius: 8,
  }}
>
  <Text
    style={{
      color: '#FFFFFF',
      textAlign: 'center',
      fontWeight: 'bold',
    }}
  >
    Customer Account
  </Text>
</Pressable>


          <Pressable
            onPress={() => {
              setAdminMessage('');
              setShowAccountChoice(false);
              setShowAdminLogin(true);
            }}
            style={{ backgroundColor: '#FFD43B', padding: 16, borderRadius: 8 }}
          >
            <Text style={{ color: '#222222', textAlign: 'center', fontWeight: 'bold' }}>
              Admin Account
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
  // Admin Panel Screen
if (showAdminPanel) {
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, height: '100vh' as any }}>
        <iframe
          src="http://localhost:5173/"
          title="DailyMart Admin Panel"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <WebView
        source={{ uri: 'http://192.168.0.3:5173/' }}
        style={{ flex: 1 }}
      />
    </SafeAreaView>
  );
}

  // Admin Login Screen
  if (showAdminLogin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F6F6F6', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: '#FFFFFF', padding: 24, borderRadius: 16, maxWidth: 420, width: '100%', alignSelf: 'center', gap: 14 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#D71920', textAlign: 'center' }}>
            Admin Login
          </Text>

          <TextInput
            placeholder="Admin email"
            value={adminEmail}
            onChangeText={setAdminEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={{ borderWidth: 1, borderColor: '#CCCCCC', borderRadius: 8, padding: 12 }}
          />

          <TextInput
            placeholder="Password"
            value={adminPassword}
            onChangeText={setAdminPassword}
            secureTextEntry
            style={{ borderWidth: 1, borderColor: '#CCCCCC', borderRadius: 8, padding: 12 }}
          />

          {adminMessage !== '' && (
            <Text style={{ color: '#D71920' }}>{adminMessage}</Text>
          )}

          <Pressable
            disabled={adminLoading}
            onPress={submitAdminLogin}
            style={{ backgroundColor: '#D71920', padding: 15, borderRadius: 8, opacity: adminLoading ? 0.6 : 1 }}
          >
            <Text style={{ color: '#FFFFFF', textAlign: 'center', fontWeight: 'bold' }}>
              {adminLoading ? 'Logging in...' : 'Login'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setShowAdminLogin(false);
              setShowAccountChoice(true);
              setAdminMessage('');
              setAdminPassword('');
            }}
            style={{ padding: 10 }}
          >
            <Text style={{ textAlign: 'center', color: '#333333' }}>
              ← Back to account selection
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.logo}>DailyMart</Text>

            <View style={styles.headerActions}>
              <Text style={styles.delivery}>📍 Deliver to: Dhaka</Text>
              <Pressable
  onPress={() => {
    setAuthMessage('');
    setAuthMode('login');
    setShowAuth(true);
  }}
>
  <Text style={styles.delivery}>
    {currentUser ? `👤 ${currentUser.name}` : '👤 Login / Account'}
  </Text>
</Pressable>

{currentUser && (
  <Pressable onPress={logoutUser}>
    <Text style={styles.delivery}>Logout</Text>
  </Pressable>
)}            
              <Pressable
                onPress={() => {
                  setSearchText('');
                  resetFilters();
                }}
              >
                <Text style={styles.delivery}>
                  ❤️ Wishlist ({wishlist.length})
                </Text>
              </Pressable>

             <Pressable
  style={styles.cartButton}
  onPress={() => {
    setOrderMessage('');
    setShowCheckout(true);
  }}
>
  <Text style={styles.cartText}>
    🛒 Cart ({cartCount}) · ৳{cartTotal.toFixed(2)}
  </Text>
</Pressable>
            </View>
          </View>

          {/* Search */}
          <View style={styles.searchBox}>
            <TextInput
              placeholder="Search groceries, brands..."
              placeholderTextColor="#777777"
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
              onSubmitEditing={() => setOpenCategory(null)}
            />

            <Pressable
              style={styles.searchButton}
              onPress={() => setOpenCategory(null)}
            >
              <Text style={styles.searchButtonText}>Search</Text>
            </Pressable>
          </View>
        </View>

        {/* Top navigation */}
                {/* Login and Registration */}
        {showAuth && (
          <View style={styles.authContainer}>
            <Text style={styles.authTitle}>
              {authMode === 'login'
                ? 'Welcome Back!'
                : 'Create Your Account'}
            </Text>

            <Text style={styles.authSubtitle}>
              {authMode === 'login'
                ? 'Log in to your DailyMart account.'
                : 'Register to start shopping with DailyMart.'}
            </Text>

            {authMode === 'register' && (
              <>
                <TextInput
                  style={styles.authInput}
                  placeholder="Full name"
                  placeholderTextColor="#777777"
                  value={authName}
                  onChangeText={setAuthName}
                  maxLength={100}
                />

                <TextInput
                  style={styles.authInput}
                  placeholder="Phone number"
                  placeholderTextColor="#777777"
                  value={authPhone}
                  onChangeText={setAuthPhone}
                  keyboardType="phone-pad"
                  maxLength={20}
                />
              </>
            )}

            <TextInput
              style={styles.authInput}
              placeholder="Email address"
              placeholderTextColor="#777777"
              value={authEmail}
              onChangeText={setAuthEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <TextInput
              style={styles.authInput}
              placeholder="Password (minimum 8 characters)"
              placeholderTextColor="#777777"
              value={authPassword}
              onChangeText={setAuthPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            {authMessage !== '' && (
              <Text style={styles.authMessage}>
                {authMessage}
              </Text>
            )}

            <Pressable
              style={[
                styles.authButton,
                authLoading && styles.authButtonDisabled,
              ]}
              disabled={authLoading}
              onPress={submitAuth}
            >
              <Text style={styles.authButtonText}>
                {authLoading
                  ? 'Please wait...'
                  : authMode === 'login'
                    ? 'Login'
                    : 'Create Account'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setAuthMode((mode) =>
                  mode === 'login' ? 'register' : 'login'
                );
                setAuthMessage('');
              }}
              style={styles.authSwitch}
            >
              <Text style={styles.authSwitchText}>
                {authMode === 'login'
                  ? "Don't have an account? Register"
                  : 'Already have an account? Login'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setShowAuth(false);
                setAuthMessage('');
              }}
              style={styles.authSwitch}
            >
              <Text style={styles.authCancelText}>Close</Text>
            </Pressable>
          </View>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.nav}
          contentContainerStyle={styles.navContent}
        >
          {[
            'Great Deals',
            'Stock & Save',
            'Our Brands',
            'Best Sellers',
            'New Arrivals',
          ].map((item) => (
            <Pressable
              key={item}
              style={styles.navItem}
              onPress={resetFilters}
            >
              <Text style={styles.navText}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Main layout */}
        <View
  style={[
    styles.mainLayout,
    isMobile && { flexDirection: 'column', padding: 8, gap: 12 },
  ]}
>
          {/* Category sidebar */}
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeading}>
              <Text style={styles.sidebarHeadingText}>
                ☰ SHOP BY CATEGORY
              </Text>
            </View>

            {categories.map((category) => (
              <View
                key={category.name}
                style={styles.categoryWrapper}
                onMouseEnter={
                  Platform.OS === 'web'
                    ? () => setOpenCategory(category.name)
                    : undefined
                }
                onMouseLeave={
                  Platform.OS === 'web'
                    ? () => setOpenCategory(null)
                    : undefined
                }
              >
                <Pressable
                  style={[
                    styles.categoryItem,
                    activeCategory === category.name &&
                      styles.categoryItemActive,
                  ]}
                  onPress={() => {
                    setActiveCategory((current) => {
                      if (current === category.name) {
                        setActiveSubcategory(null);
                        return null;
                      }

                      setActiveSubcategory(null);
                      return category.name;
                    });

                    if (Platform.OS !== 'web') {
                      setOpenCategory((current) =>
                        current === category.name ? null : category.name
                      );
                    }
                  }}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryArrow}>›</Text>
                </Pressable>

                {/* Popup subcategories */}
                {openCategory === category.name && (
                  <View style={styles.subcategoryPopup}>
                    <Text style={styles.popupTitle}>{category.name}</Text>

                    <Pressable
                      style={styles.subcategoryItem}
                      onPress={() => {
                        setActiveCategory(category.name);
                        setActiveSubcategory(null);
                        setOpenCategory(null);
                      }}
                    >
                      <Text style={styles.subcategoryText}>
                        All {category.name}
                      </Text>
                    </Pressable>

                    {category.subcategories.map((subcategory) => (
                      <Pressable
                        key={subcategory}
                        style={styles.subcategoryItem}
                        onPress={() => {
                          setActiveCategory(category.name);
                          setActiveSubcategory(subcategory);
                          setOpenCategory(null);
                        }}
                      >
                        <Text style={styles.subcategoryText}>
                          {subcategory}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Main content */}
          <View style={styles.content}>
            {/* Hero banner */}
            <View style={styles.heroBanner}>
              <Text style={styles.heroEyebrow}>
                FRESHNESS AT YOUR DOORSTEP
              </Text>

              <Text style={styles.heroTitle}>
                Fresh groceries,{'\n'}better everyday!
              </Text>

              <Text style={styles.heroDescription}>
                Shop your daily essentials at great prices.
              </Text>

              <Pressable style={styles.shopButton} onPress={resetFilters}>
                <Text style={styles.shopButtonText}>SHOP NOW →</Text>
              </Pressable>

              <Text style={styles.heroEmoji}>🛍️ 🥦 🍎</Text>
            </View>

            {/* Trust features */}
            <View style={styles.trustRow}>
              <View style={styles.trustItem}>
                <Text style={styles.trustIcon}>🚚</Text>
                <Text style={styles.trustText}>Fast Delivery</Text>
              </View>

              <View style={styles.trustItem}>
                <Text style={styles.trustIcon}>✓</Text>
                <Text style={styles.trustText}>Quality Products</Text>
              </View>

              <View style={styles.trustItem}>
                <Text style={styles.trustIcon}>💳</Text>
                <Text style={styles.trustText}>Easy Payments</Text>
              </View>
            </View>

            {/* Products heading */}
            <View style={styles.sectionHeader}>
              <View style={styles.headingGroup}>
                <Text style={styles.sectionTitle}>
                  {activeSubcategory ||
                    activeCategory ||
                    'Recommended for You'}
                </Text>

                {(activeCategory !== null ||
                  activeSubcategory !== null ||
                  searchText.length > 0) && (
                  <Pressable
                    onPress={() => {
                      resetFilters();
                      setSearchText('');
                    }}
                  >
                    <Text style={styles.clearFilters}>Clear filters ✕</Text>
                  </Pressable>
                )}
              </View>

              <Text style={styles.seeAll}>
                {filteredProducts.length} items
              </Text>
            </View>

            {/* Product loading, error and product cards */}
            {loadingProducts ? (
              <Text style={styles.noResults}>
                Loading products from DailyMart...
              </Text>
            ) : productError ? (
              <Text style={styles.noResults}>{productError}</Text>
            ) : filteredProducts.length === 0 ? (
              <Text style={styles.noResults}>
                No products found. Try another search.
              </Text>
            ) : (
              <View style={styles.productGrid}>
                {filteredProducts.map((product) => {
                  const quantity = cart[product.id] || 0;
                  const discount =
                    product.oldPrice > 0
                      ? Math.round(
                          ((product.oldPrice - product.price) /
                            product.oldPrice) *
                            100
                        )
                      : 0;

                  return (
                    <View key={product.id} style={styles.productCard}>
                      <View style={styles.productTopRow}>
                        {product.badge ? (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                              {product.badge}
                            </Text>
                          </View>
                        ) : (
                          <View />
                        )}

                        <Pressable
                          style={styles.wishlistButton}
                          onPress={() => toggleWishlist(product.id)}
                        >
                          <Text style={styles.wishlistHeart}>
                            {wishlist.includes(product.id) ? '❤️' : '🤍'}
                          </Text>
                        </Pressable>
                      </View>

                      {product.image ? (
                        <Image
                          source={{ uri: product.image }}
                          style={styles.productImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <Text style={styles.placeholderEmoji}>🛒</Text>
                        </View>
                      )}

                      <Text style={styles.productName}>{product.name}</Text>

                      <Text
                        style={[
                          styles.stockText,
                          product.stock > 0
                            ? styles.inStock
                            : styles.outOfStock,
                        ]}
                      >
                        {product.stock > 0
                          ? `${product.stock} in stock`
                          : 'Out of Stock'}
                      </Text>

                      <Text style={styles.productUnit}>{product.unit}</Text>

                      <View style={styles.priceRow}>
                        <Text style={styles.productPrice}>
                          ৳{product.price}
                        </Text>

                        {discount > 0 && (
                          <Text style={styles.discountText}>
                            {discount}% OFF
                          </Text>
                        )}

                        {product.oldPrice > product.price && (
                          <Text style={styles.oldPrice}>
                            ৳{product.oldPrice}
                          </Text>
                        )}
                      </View>

                      {/* Add to Bag and quantity controls */}
                      {product.stock <= 0 ? (
                        <View style={styles.disabledButton}>
                          <Text style={styles.addButtonText}>
                            Out of Stock
                          </Text>
                        </View>
                      ) : quantity === 0 ? (
                        <Pressable
                          style={styles.addButton}
                          onPress={() => updateQuantity(product.id, 1)}
                        >
                          <Text style={styles.addButtonText}>
                            + Add to Bag
                          </Text>
                        </Pressable>
                      ) : (
                        <View style={styles.quantitySelector}>
                          <Pressable
                            style={styles.quantityButton}
                            onPress={() => updateQuantity(product.id, -1)}
                          >
                            <Text style={styles.quantityButtonText}>−</Text>
                          </Pressable>

                          <Text style={styles.quantityText}>{quantity}</Text>

                          <Pressable
                            style={[
                              styles.quantityButton,
                              quantity >= product.stock && styles.limitButton,
                            ]}
                            disabled={quantity >= product.stock}
                            onPress={() => updateQuantity(product.id, 1)}
                          >
                            <Text style={styles.quantityButtonText}>+</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
        {/* Checkout */}
        {showCheckout && (
          <View style={styles.checkoutContainer}>
            <Text style={styles.checkoutTitle}>Your Shopping Cart</Text>

            {products
              .filter((product) => (cart[product.id] || 0) > 0)
              .map((product) => (
                <View key={product.id} style={styles.checkoutItem}>
                  <View style={styles.checkoutProductInfo}>
                    <Text style={styles.checkoutProductName}>
                      {product.name}
                    </Text>
                    <Text style={styles.checkoutMuted}>
                      ৳{product.price} × {cart[product.id]}
                    </Text>
                  </View>

                  <Text style={styles.checkoutPrice}>
                    ৳{(product.price * cart[product.id]).toFixed(2)}
                  </Text>
                </View>
              ))}

            <View style={styles.checkoutTotalRow}>
              <Text style={styles.checkoutTotalLabel}>Estimated Total</Text>
              <Text style={styles.checkoutTotalPrice}>
                ৳{cartTotal.toFixed(2)}
              </Text>
            </View>

            <Text style={styles.checkoutSubtitle}>
              Delivery Information
            </Text>

            <TextInput
              style={styles.checkoutInput}
              placeholder="Your full name"
              placeholderTextColor="#777777"
              value={customerName}
              onChangeText={setCustomerName}
              maxLength={100}
            />

            <TextInput
              style={styles.checkoutInput}
              placeholder="Phone number"
              placeholderTextColor="#777777"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={20}
            />

            <TextInput
              style={[styles.checkoutInput, styles.addressInput]}
              placeholder="Full delivery address"
              placeholderTextColor="#777777"
              value={address}
              onChangeText={setAddress}
              multiline
            />

            <Text style={styles.paymentLabel}>
              Payment Method: Cash on Delivery
            </Text>

            <Pressable
              style={[
                styles.placeOrderButton,
                submittingOrder && styles.placeOrderDisabled,
              ]}
              disabled={submittingOrder}
              onPress={placeOrder}
            >
              <Text style={styles.placeOrderButtonText}>
                {submittingOrder ? 'Placing Order...' : 'Place Order'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.cancelCheckoutButton}
              onPress={() => setShowCheckout(false)}
            >
              <Text style={styles.cancelCheckoutText}>
                Continue Shopping
              </Text>
            </Pressable>
          </View>
        )}
{trackedOrderId !== null && (
  <View
    style={{
      margin: 16,
      padding: 16,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#D71920',
      borderRadius: 12,
    }}
  >
    <Text
      style={{
        fontSize: 18,
        fontWeight: 'bold',
        color: '#D71920',
        marginBottom: 8,
      }}
    >
      Order Tracking
    </Text>

    <Text>Order ID: {trackedOrderId}</Text>

    {trackingError ? (
      <Text style={{ color: '#D71920', marginTop: 8 }}>
        {trackingError}
      </Text>
    ) : trackedOrder ? (
      <>
        <Text style={{ marginTop: 8 }}>
          Status: {trackedOrder.status}
        </Text>

        <Text style={{ marginTop: 4 }}>
          Total: ৳{Number(trackedOrder.total_amount).toFixed(2)}
        </Text>

        <Text style={{ marginTop: 8, color: '#555555' }}>
          Your order status updates automatically.
        </Text>
      </>
    ) : (
      <Text style={{ marginTop: 8 }}>
        Loading order status...
      </Text>
    )}
  </View>
)}
        {orderMessage !== '' && (
          <View style={styles.orderMessageBox}>
            <Text style={styles.orderMessageText}>{orderMessage}</Text>
          </View>
        )}
        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>DailyMart</Text>
          <Text style={styles.footerText}>
            Your neighbourhood grocery shopping app.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6F6',
  },
  page: {
    flex: 1,
  },
  pageContent: {
    paddingBottom: 30,
  },
  header: {
    backgroundColor: '#D71920',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 16,
  },
  logo: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  delivery: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  cartButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
  },
  cartText: {
    color: '#D71920',
    fontWeight: 'bold',
  },
  searchBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginTop: 18,
    borderRadius: 10,
    padding: 5,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#222222',
    minWidth: 0,
  },
  searchButton: {
    backgroundColor: '#FFD43B',
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 7,
  },
  searchButtonText: {
    color: '#222222',
    fontWeight: 'bold',
  },
  nav: {
    backgroundColor: '#FFFFFF',
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#E6E6E6',
  },
  navContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  navItem: {
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  navText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
  },
  mainLayout: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  padding: 16,
  gap: 16,
},
  sidebar: {
    width: 230,
    flexShrink: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 10,
    zIndex: 10,
    ...(Platform.OS === 'web' ? { position: 'relative' as const } : {}),
  },
  sidebarHeading: {
    backgroundColor: '#D71920',
    padding: 14,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
  },
  sidebarHeadingText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  categoryWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
    minHeight: 44,
  },
  categoryItemActive: {
    backgroundColor: '#FFF0E6',
  },
  categoryIcon: {
    fontSize: 17,
    marginRight: 8,
  },
  categoryName: {
    flex: 1,
    fontSize: 12,
    color: '#333333',
  },
  categoryArrow: {
    fontSize: 22,
    color: '#D71920',
  },
  subcategoryPopup: {
    position: 'absolute',
    left: '100%',
    top: 0,
    width: 230,
    maxHeight: 440,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 10,
    zIndex: 100,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 14px rgba(0,0,0,0.15)' }
      : { elevation: 8 }),
  },
  popupTitle: {
    color: '#D71920',
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  subcategoryItem: {
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  subcategoryText: {
    fontSize: 12,
    color: '#333333',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  heroBanner: {
    backgroundColor: '#FFF0E6',
    borderRadius: 14,
    padding: 24,
    minHeight: 245,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroEyebrow: {
    color: '#D71920',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  heroTitle: {
    color: '#A9141A',
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 12,
  },
  heroDescription: {
    color: '#444444',
    fontSize: 13,
    marginTop: 10,
  },
  shopButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#D71920',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    marginTop: 18,
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  heroEmoji: {
    fontSize: 35,
    marginTop: 12,
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 16,
    marginTop: 16,
    gap: 12,
  },
  trustItem: {
    alignItems: 'center',
    minWidth: 75,
  },
  trustIcon: {
    fontSize: 21,
    color: '#D71920',
  },
  trustText: {
    color: '#444444',
    fontSize: 10,
    marginTop: 5,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 14,
  },
  headingGroup: {
    flex: 1,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#252525',
    flexShrink: 1,
  },
  clearFilters: {
    color: '#D71920',
    fontSize: 12,
    fontWeight: '600',
  },
  seeAll: {
    color: '#D71920',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: '47%',
    flexGrow: 1,
    flexBasis: 140,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 4,
  },
  productTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFE7B0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    color: '#8A5A00',
    fontWeight: 'bold',
  },
  wishlistButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#FFF1F1',
  },
  wishlistHeart: {
    fontSize: 19,
  },
  productImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    marginVertical: 12,
  },
  imagePlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 42,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#252525',
    marginTop: 4,
  },
  productUnit: {
    marginTop: 5,
    color: '#777777',
    fontSize: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D71920',
  },
  oldPrice: {
    fontSize: 12,
    color: '#888888',
    textDecorationLine: 'line-through',
  },
  discountText: {
    color: '#D71920',
    backgroundColor: '#FFF0F0',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 5,
  },
  stockText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 6,
  },
  inStock: {
    color: '#218838',
  },
  outOfStock: {
    color: '#D71920',
  },
  addButton: {
    marginTop: 12,
    backgroundColor: '#D71920',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledButton: {
    marginTop: 12,
    backgroundColor: '#999999',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    backgroundColor: '#FFF0E6',
    borderRadius: 22,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    backgroundColor: '#D71920',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  limitButton: {
    backgroundColor: '#999999',
  },
  quantityButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  quantityText: {
    color: '#252525',
    fontSize: 15,
    fontWeight: 'bold',
  },
  noResults: {
    color: '#666666',
    paddingVertical: 20,
  },
  footer: {
    backgroundColor: '#262626',
    padding: 24,
    marginTop: 16,
  },
  footerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  footerText: {
    color: '#DDDDDD',
    marginTop: 8,
  },
    checkoutContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 20,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  checkoutTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#D71920',
    marginBottom: 18,
  },
  checkoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    gap: 10,
  },
  checkoutProductInfo: {
    flex: 1,
  },
  checkoutProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#252525',
  },
  checkoutMuted: {
    fontSize: 12,
    color: '#777777',
    marginTop: 4,
  },
  checkoutPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#252525',
  },
  checkoutTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
  },
  checkoutTotalLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#252525',
  },
  checkoutTotalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D71920',
  },
  checkoutSubtitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#252525',
    marginTop: 8,
    marginBottom: 12,
  },
  checkoutInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#222222',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  addressInput: {
    minHeight: 85,
    textAlignVertical: 'top',
  },
  paymentLabel: {
    fontSize: 14,
    color: '#333333',
    marginVertical: 10,
  },
  placeOrderButton: {
    backgroundColor: '#D71920',
    paddingVertical: 15,
    borderRadius: 9,
    alignItems: 'center',
    marginTop: 8,
  },
  placeOrderDisabled: {
    opacity: 0.6,
  },
  placeOrderButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  cancelCheckoutButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelCheckoutText: {
    color: '#D71920',
    fontWeight: '600',
  },
  orderMessageBox: {
    backgroundColor: '#FFF0E6',
    borderRadius: 10,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  orderMessageText: {
    color: '#333333',
    fontSize: 14,
    lineHeight: 21,
  },
    authContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D71920',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 18,
  },
  authInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#222222',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  authMessage: {
    color: '#D71920',
    fontSize: 13,
    marginBottom: 12,
  },
  authButton: {
    backgroundColor: '#D71920',
    paddingVertical: 14,
    borderRadius: 9,
    alignItems: 'center',
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  authSwitch: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  authSwitchText: {
    color: '#D71920',
    fontSize: 13,
    fontWeight: '600',
  },
  authCancelText: {
    color: '#666666',
    fontSize: 13,
  },
});