import { useState, Suspense, lazy, useEffect } from 'react';
import { UserRole, OrderStatus, Order, User, OrderItem } from './types';
import { BarChart3, Package, ClipboardList, Truck, Users, Calendar, BarChart2, Settings } from 'lucide-react';
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
const ReportsView = lazy(() => import('./components/views/ReportsView').then(m => ({ default: m.ReportsView })));
const HelpView = lazy(() => import('./components/views/HelpView').then(m => ({ default: m.HelpView })));

// Loading Component
const LoadingFallback = () => (
  <div className="flex items-center justify-center p-20 h-full w-full">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
  </div>
);

// ─── Role Picker Screen ──────────────────────────────────────────────────────
const ROLE_ICONS: Record<string, any> = {
  [UserRole.SELLER]: Package,
  [UserRole.WAREHOUSE]: ClipboardList,
  [UserRole.PRODUCTION]: BarChart3,
  [UserRole.ADMIN]: Users,
  [UserRole.DELIVERY]: Truck,
};
const ROLE_FIRST_VIEW: Record<string, string> = {
  [UserRole.SELLER]: 'orders',
  [UserRole.WAREHOUSE]: 'all-orders',
  [UserRole.PRODUCTION]: 'all-orders',
  [UserRole.ADMIN]: 'dashboard',
  [UserRole.DELIVERY]: 'delivery',
};

interface RolePickerProps {
  user: User;
  onSelectRole: (role: UserRole) => void;
}
const RolePicker = ({ user, onSelectRole }: RolePickerProps) => (
  <div className="min-h-screen bg-brand-50 dark:bg-gray-900 flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-transparent dark:border-gray-800 overflow-hidden">
      <div className="bg-brand-600 p-6 text-center">
        <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl font-bold text-white">{user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</span>
        </div>
        <h1 className="text-xl font-bold text-white">{user.name}</h1>
        <p className="text-brand-100 text-sm mt-1">Bienvenido/a — ¿Con qué rol deseas operar hoy?</p>
      </div>
      <div className="p-6 space-y-3">
        {user.roles.map(role => {
          const Icon = ROLE_ICONS[role] ?? Package;
          return (
            <button
              key={role}
              onClick={() => onSelectRole(role)}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 dark:hover:border-brand-500 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/40 flex items-center justify-center transition-colors">
                <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-brand-600 dark:group-hover:text-brand-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900 dark:text-white group-hover:text-brand-700 dark:group-hover:text-brand-300">{role}</p>
              </div>
              <svg className="ml-auto w-5 h-5 text-gray-400 group-hover:text-brand-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          );
        })}
      </div>
    </div>
  </div>
);
// ─────────────────────────────────────────────────────────────────────────────

const App = () => {
  const { addToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null); // Rol activo para la sesión
  const [currentView, setCurrentView] = useState<'login' | 'dashboard' | 'new-order' | 'edit-order' | 'users' | 'delivery' | 'availability' | 'orders' | 'all-orders' | 'config' | 'reports' | 'help'>('login');

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
    if (u.roles.length > 1) {
      // Multi-role: mostrar pantalla de selección
      setActiveRole(null);
    } else {
      // Single role: entrar directamente
      const singleRole = u.roles[0] ?? u.role;
      setActiveRole(singleRole);
      setCurrentView((ROLE_FIRST_VIEW[singleRole] as any) ?? 'dashboard');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveRole(null);
    setCurrentView('login');
  };

  const handleSelectRole = (role: UserRole) => {
    setActiveRole(role);
    setCurrentView((ROLE_FIRST_VIEW[role] as any) ?? 'dashboard');
  };

  const handleSaveOrder = async (order: Partial<Order>, isEdit: boolean = false) => {
    try {
      if (isEdit && order.id) {
        await updateOrder(order.id, order);
        addToast('Pedido actualizado correctamente', 'success');
        resetForm();
        // If editing from management dashboard, return to management view
        if (user && (user.roles.includes(UserRole.WAREHOUSE) || user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.PRODUCTION))) {
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

  // Usuario con múltiples roles y aún no ha seleccionado modo
  if (user.roles.length > 1 && !activeRole) {
    return <RolePicker user={user} onSelectRole={handleSelectRole} />;
  }

  // Vista de usuario con rol activo seleccionado
  // Creamos un objeto de usuario con solo el rol activo para filtrar el sidebar correctamente
  const sessionUser: User = activeRole
    ? { ...user, role: activeRole, roles: [activeRole] }
    : user;

  return (
    <div className={`min-h-screen transition-colors bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50 font-sans`}>
      <Sidebar
        user={sessionUser}
        onLogout={handleLogout}
        activeView={currentView}
        setView={(view: string) => setCurrentView(view as any)}
        toggleTheme={toggleTheme}
        isDark={isDark}
        onSwitchRole={user.roles.length > 1 ? () => setActiveRole(null) : undefined}
      />

      <div className="sm:ml-64 pt-14 sm:pt-0 pb-20 sm:pb-0 min-h-screen">
        <div key={currentView} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Suspense fallback={<LoadingFallback />}>
            {currentView === 'dashboard' && !sessionUser.roles.includes(UserRole.SELLER) && !sessionUser.roles.includes(UserRole.DELIVERY) && (
              <AdminDashboard
                orders={orders}
                isDark={isDark}
                loading={ordersLoading}
              />
            )}
            {/* SELLER DASHBOARD */}
            {currentView === 'orders' && (
              <SellerDashboard
                user={sessionUser}
                orders={orders}
                onSaveOrder={handleSaveOrder}
                isDark={isDark}
              />
            )}
            {/* FALLBACK FOR SELLER IF DASHBOARD IS SET BUT ROLE IS SELLER */}
            {currentView === 'dashboard' && sessionUser.roles.includes(UserRole.SELLER) && (
              <SellerDashboard
                user={sessionUser}
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
            {currentView === 'reports' && sessionUser?.roles.includes(UserRole.ADMIN) && (
              <ReportsView orders={orders} isDark={isDark} />
            )}
            {currentView === 'help' && (
              <HelpView user={sessionUser} />
            )}

            {/* GENERIC VIEWS (NEW/EDIT) */}
            {(currentView === 'new-order' || currentView === 'edit-order') && (
              <SellerDashboard
                user={sessionUser}
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