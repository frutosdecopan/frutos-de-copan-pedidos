export enum UserRole {
  SELLER = 'Vendedor',
  WAREHOUSE = 'Bodega',
  PRODUCTION = 'Producción',
  ADMIN = 'Administrador',
  DELIVERY = 'Repartidor'
}

export enum OrderStatus {
  DRAFT = 'Borrador',
  SENT = 'Enviado', // Yellow
  REVIEW = 'En Revisión', // Blue
  PRODUCTION = 'En Producción', // Purple
  DISPATCH = 'En Despacho', // Orange
  DELIVERED = 'Entregado', // Green
  CANCELLED = 'Cancelado', // Red (User)
  REJECTED = 'Rechazado' // Red (System/Warehouse)
}

export enum OrderType {
  SALE = 'Venta',
  TASTING = 'Degustación',
  EXCHANGE = 'Cambio',
  SAMPLE = 'Muestra',
  PROMO = 'Promoción',
  DONATION = 'Donación'
}

export interface Product {
  id: string;
  name: string;
  category: string;
  available: boolean;
  image_url?: string;
}

export interface Presentation {
  id: string;
  name: string; // e.g., 'Libra', 'Medio Galón', 'Galón'
  weightKg: number; // For logic if needed later
}

export interface OrderItem {
  productId: string;
  presentationId: string;
  quantity: number;
  productName: string;
  presentationName: string;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  clientName: string;
  originCityName: string; // Ciudad base del vendedor

  // Logistics
  orderType: OrderType;
  destinationName: string; // Lugar de entrega (Villanueva, Tegucigalpa, etc.)

  // Fulfillment Warehouse (Where stock comes from)
  cityId: string;
  cityName: string;
  warehouseId: string;
  warehouseName: string;

  createdAt: string; // ISO Date
  updatedAt: string;
  status: OrderStatus;
  items: OrderItem[];
  logs: OrderLog[];
  comments?: OrderComment[];
  assignedDeliveryId?: string;
}

export interface OrderLog {
  timestamp: string;
  message: string;
  user: string;
}

export interface OrderComment {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: UserRole;
  assignedCities: string[]; // IDs of cities
  unavailableDates?: string[]; // Array de strings 'YYYY-MM-DD' para vacaciones/bajas
  isActive: boolean;
}

export interface City {
  id: string;
  name: string;
  warehouses: Warehouse[];
}

export interface Warehouse {
  id: string;
  name: string;
  type: 'Local' | 'Principal';
}