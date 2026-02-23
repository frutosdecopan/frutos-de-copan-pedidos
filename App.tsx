import { useState, Suspense, lazy, useEffect } from 'react';
import { UserRole, OrderStatus, Order, User, OrderItem } from './types';
import { useToast } from './ToastContext';
import { useOrders } from './hooks/useOrders';
import { useUsers } from './hooks/useUsers';
import { useCities } from './hooks/useCities';
import { useTheme } from './hooks/useTheme';
import { useNotifications } from './hooks/useNotifications';
import { useDestinations } from './hooks/useDestinations';
import { Sidebar } from './components/layout/Sidebar';

// Lazy Load Components
const LoginView = lazy(() => import('./components/views/LoginView').then(m => ({ default: m.LoginView })));
const UserManagementView = lazy(() => import('./components/views/UserManagementView').then(m => ({ default: m.UserManagementView })));
const AvailabilityView = lazy(() => import('./components/views/AvailabilityView').then(m => ({ default: m.AvailabilityView })));
const DeliveryDashboard = lazy(() => import('./components/views/DeliveryDashboard').then(m => ({ default: m.DeliveryDashboard })));
const SellerDashboard = lazy(() => import('./components/views/SellerDashboard').then(m => ({ default: m.SellerDashboard })));
const AdminDashboard = lazy(() => import('./components/views/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ManagementDashboard = lazy(() => import('./components/views/ManagementDashboard').then(m => ({ default: m.ManagementDashboard })));
const ConfigurationView = lazy(() => import('./components/views/ConfigurationView').then(m => ({ default: m.ConfigurationView })));

// Loading Component
const LoadingFallback = () => (
  <div className="flex items-center justify-center p-20 h-full w-full">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
  </div>
);

const App = () => {
  const { addToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'login' | 'dashboard' | 'new-order' | 'edit-order' | 'users' | 'delivery' | 'availability' | 'orders' | 'all-orders' | 'config'>('login');

  const { isDark, toggleTheme } = useTheme();
  const { destinations } = useDestinations();
  const { cities } = useCities();

  // Form State Lifted to App (for Management Dashboard editing)
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [selectedOrderType, setSelectedOrderType] = useState<string>('Venta');
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [cart, setCart] = useState<OrderItem[]>([]);

  // Initialize destination when destinations load
  useEffect(() => {
    if (destinations.length > 0 && !selectedDestination) {
      setSelectedDestination(destinations[0].name);
    }
  }, [destinations, selectedDestination]);

  const resetForm = () => {
    setEditingOrderId(null);
    setClientName('');
    setSelectedOrderType('Venta');
    setSelectedDestination(destinations[0]?.name || '');
    setCart([]);
  };

  // Use Supabase hooks
  const {
    users,
    loading: usersLoading,
    createUser,
    updateUser,
    deleteUser
  } = useUsers();

  const {
    orders,
    loading: ordersLoading,
    createOrder,
    updateOrder,
    updateOrderStatus,
    assignDelivery,
    addComment,
    loadMore,
    hasMore
  } = useOrders();

  // Wrapper for addComment to match ManagementDashboard interface
  const handleAddComment = async (orderId: string, content: string) => {
    if (!user) return;
    await addComment(orderId, user.id, user.name, content);
  };

  // Push Notifications Hook
  useNotifications(user);

  // Use users from Supabase
  const displayUsers = users;

  const handleLogin = (u: User) => {
    setUser(u);
    // Set default view based on role
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('login');
  };

  const handleSaveOrder = async (order: Partial<Order>, isEdit: boolean = false) => {
    try {
      if (isEdit && order.id) {
        await updateOrder(order.id, order);
        addToast('Pedido actualizado correctamente', 'success');
        resetForm();
        // If editing from management dashboard, return to management view
        if (user && (user.role === UserRole.WAREHOUSE || user.role === UserRole.ADMIN || user.role === UserRole.PRODUCTION)) {
          setCurrentView('all-orders');
        } else {
          setCurrentView('dashboard');
        }
      } else {
        await createOrder(order);
        addToast('Pedido creado exitosamente', 'success');
        resetForm();
        setCurrentView('dashboard');
      }
    } catch (error: any) {
      console.error('Error saving order:', error);
      addToast('Error al guardar pedido', 'error');
    }
  };

  const handleUpdateStatus = async (id: string, status: OrderStatus, reason?: string) => {
    try {
      await updateOrderStatus(id, status, user?.name || 'Sistema', reason);
      addToast(`Estado actualizado a ${status}`, 'success');
    } catch (error: any) {
      console.error('Error updating status:', error);
      addToast('Error al actualizar el estado', 'error');
    }
  };

  const handleAssignDelivery = async (orderId: string, deliveryUserId: string) => {
    try {
      await assignDelivery(orderId, deliveryUserId, user?.name || 'Sistema');
      addToast('Repartidor asignado correctamente', 'success');
    } catch (error: any) {
      console.error('Error assigning delivery:', error);
      addToast('Error al asignar repartidor', 'error');
    }
  };

  const handleAddUser = async (u: Omit<User, 'id'>) => {
    try {
      await createUser(u);
      addToast('Usuario creado correctamente', 'success');
    } catch (error: any) {
      console.error('Error creating user:', error);
      addToast('Error al crear usuario', 'error');
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await deleteUser(id);
      addToast('Usuario eliminado correctamente', 'success');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      addToast('Error al eliminar usuario', 'error');
    }
  };

  const handleUpdateUser = async (u: User) => {
    try {
      await updateUser(u.id, u);
      addToast('Usuario actualizado correctamente', 'success');
    } catch (error: any) {
      console.error('Error updating user:', error);
      addToast('Error al actualizar usuario', 'error');
    }
  }

  // Define handleEditOrder before using it
  const handleEditOrder = (order: Order) => {
    try {
      console.log("Starting edit for:", order.id);
      setEditingOrderId(order.id);

      // Basic population
      if (order.clientName) setClientName(order.clientName);
      if (order.orderType) setSelectedOrderType(order.orderType);

      // Safer city lookup
      try {
        const _matchedCity = cities.find(c => c.name === order.destinationName);
        if (_matchedCity) setSelectedDestination(_matchedCity.name);
        else setSelectedDestination(destinations[0]?.name || '');
      } catch (e) { console.error("City lookup error", e); }

      // Populate Cart safely
      if (order.items && Array.isArray(order.items)) {
        // Deep copy to avoid ref issues
        setCart(JSON.parse(JSON.stringify(order.items)));
      } else {
        setCart([]);
      }

      console.log("Switching view to edit-order");
      setCurrentView('edit-order');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error("Critical error in handleEditOrder:", err);
      // Fallback
      setCurrentView('edit-order');
    }
  };

  if (!user) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <LoginView onLogin={handleLogin} users={displayUsers} />
      </Suspense>
    );
  }

  return (
    <div className={`min-h-screen transition-colors bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50 font-sans`}>
      <Sidebar
        user={user}
        onLogout={handleLogout}
        activeView={currentView}
        setView={(view: string) => setCurrentView(view as any)}
        toggleTheme={toggleTheme}
        isDark={isDark}
      />

      <div className="sm:ml-64 pt-14 sm:pt-0 pb-20 sm:pb-0 min-h-screen">
        <div key={currentView} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Suspense fallback={<LoadingFallback />}>
            {currentView === 'dashboard' && user.role !== UserRole.SELLER && user.role !== UserRole.DELIVERY && (
              <AdminDashboard
                orders={orders}
                isDark={isDark}
                loading={ordersLoading}
              />
            )}
            {/* SELLER DASHBOARD */}
            {currentView === 'orders' && (
              <SellerDashboard
                user={user}
                orders={orders}
                onSaveOrder={handleSaveOrder}
                isDark={isDark}
              />
            )}
            {/* FALLBACK FOR SELLER IF DASHBOARD IS SET BUT ROLE IS SELLER */}
            {currentView === 'dashboard' && user.role === UserRole.SELLER && (
              <SellerDashboard
                user={user}
                orders={orders}
                onSaveOrder={handleSaveOrder}
                isDark={isDark}
              />
            )}

            {currentView === 'all-orders' && (
              <ManagementDashboard
                user={user}
                orders={orders}
                users={displayUsers}
                onUpdateStatus={handleUpdateStatus}
                onAssignDelivery={handleAssignDelivery}
                onEditOrder={handleEditOrder}
                onAddComment={handleAddComment}
                loadMore={loadMore}
                hasMore={hasMore}
                isDark={isDark}
              />
            )}
            {currentView === 'delivery' && (
              <DeliveryDashboard
                user={user}
                orders={orders}
                onUpdateStatus={handleUpdateStatus}
                onLogout={handleLogout}
              />
            )}
            {currentView === 'users' && (
              <UserManagementView
                users={displayUsers}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
              />
            )}
            {currentView === 'availability' && (
              <AvailabilityView
                users={displayUsers}
                onUpdateUser={handleUpdateUser}
              />
            )}
            {currentView === 'config' && user && (
              <ConfigurationView user={user} />
            )}

            {/* GENERIC VIEWS (NEW/EDIT) */}
            {(currentView === 'new-order' || currentView === 'edit-order') && (
              <SellerDashboard
                user={user}
                orders={orders}
                onSaveOrder={handleSaveOrder}
                editingOrderId={editingOrderId}
                isDark={isDark}
              />
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default App;