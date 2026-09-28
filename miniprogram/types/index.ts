export type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  username?: string;
  nickname: string;
  avatar: string;
  phone?: string;
  role: Role;
}

export interface Venue {
  id: string;
  name: string;
  type: string;
  description: string;
  address: string;
  coverImage: string;
  basePrice: number; // 分
  capacity: number;
  openTime: string;
  closeTime: string;
  status: string;
  facilities: string[];
  rules?: string;
  availableSlotsCount?: number;
  totalRemaining?: number;
  utilizationRate?: number;
  recommendScore?: number;
  rating?: number;
  totalBookings?: number;
  reviews?: Array<{
    id: string;
    user: string;
    avatar: string;
    rating: number;
    date: string;
    content: string;
  }>;
}

export interface VenueSlot {
  id: string;
  venueId: string;
  date: string;
  startTime: string;
  endTime: string;
  timeRange: string;
  price: number; // 分
  totalCapacity: number;
  bookedCapacity: number;
  remaining: number;
  status: 'AVAILABLE' | 'TIGHT' | 'FULL' | 'CLOSED';
  statusText: string;
  statusColor: 'green' | 'orange' | 'red' | 'gray';
  isSelectable: boolean;
}

export interface AvailabilityData {
  venueId: string;
  venueName: string;
  basePrice: number;
  date: string;
  isClosed: boolean;
  closedReason?: string;
  slots: VenueSlot[];
  peakAdvice: string;
}

export interface OrderItem {
  id: string;
  orderNo: string;
  bookingId: string;
  bookingNo: string;
  bookingCode: string;
  venueId: string;
  venueName: string;
  venueImage: string;
  venueAddress: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  timeRange: string;
  quantity: number;
  amount: number;
  paidAmount: number;
  refundAmount: number;
  paymentStatus: string;
  orderStatus: string;
  bookingStatus: string;
  createdAt: string;
  paidAt?: string;
  expiredAt?: string;
}

export interface OrderDetail {
  id: string;
  orderNo: string;
  amount: number;
  paidAmount: number;
  paymentStatus: string;
  orderStatus: string;
  booking: {
    id: string;
    bookingNo: string;
    bookingCode: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    quantity: number;
    studentNo?: string;
    contactName: string;
    contactPhone: string;
    status: string;
    expiredAt?: string;
    venue: Venue;
    checkinRecords: any[];
  };
  payments: any[];
  refunds: any[];
}

export interface DashboardKPI {
  todayOrders: number;
  todayOrderGrowth: number;
  todayBookings: number;
  todayBookingGrowth: number;
  todayNetIncome: number; // 元
  todayIncomeGrowth: number;
  yesterdayNetIncome: number;
  monthRevenue: number;
  totalRevenue: number;
  pendingSettlement: number;
  totalRefunds: number;
  realtimeUsage: {
    used: number;
    total: number;
    rate: number;
  };
}

export interface DashboardData {
  kpi: DashboardKPI;
  incomeTrend: Array<{ date: string; income: number; fullDate: string }>;
  bookingTrend: Array<{ date: string; count: number; fullDate: string }>;
  venuePieData: Array<{ name: string; value: number; percentage: number }>;
  venueRanking: Array<{ id: string; name: string; type: string; income: number; utilization: number }>;
  hotTimeSlots: Array<{ timeRange: string; booked: number; total: number; rate: number }>;
  suggestions: Array<{ id: string; title: string; content: string; tag: string; level: string }>;
}
