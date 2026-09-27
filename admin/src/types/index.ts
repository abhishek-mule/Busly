export interface User {
  id: string;
  email: string;
  full_name?: string;
  name?: string;
  phone?: string;
  role: string;
  roles?: string[];
  is_active: boolean;
}

export interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  seating_capacity: number;
  status: 'active' | 'maintenance' | 'inactive';
  is_available: boolean;
  gps_device_id?: string;
  gps_installed: boolean;
  current_odometer?: number;
  fuel_level?: number;
  total_km?: number;
  insurance_expiry?: string;
  permit_expiry?: string;
  created_at?: string;
}

export interface Driver {
  id: string;
  first_name: string;
  last_name?: string;
  full_name?: string;
  phone: string;
  email?: string;
  license_number: string;
  license_type?: string;
  license_expiry?: string;
  status: 'active' | 'inactive' | 'available' | 'on_leave';
  is_available: boolean;
  rating: number;
  safe_driving_score: number;
  total_trips: number;
  vehicle_id?: string;
  created_at?: string;
}

export interface Route {
  id: string;
  name: string;
  route_code?: string;
  description?: string;
  start_point?: string;
  end_point?: string;
  direction: string;
  total_distance_km?: number;
  estimated_time_minutes?: number;
  morning_pickup_time?: string;
  evening_drop_time?: string;
  status: 'active' | 'inactive';
  vehicle_id?: string;
  driver_id?: string;
  stops?: Stop[];
  created_at?: string;
}

export interface Stop {
  id: string;
  route_id: string;
  name: string;
  address?: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  stop_order: number;
  estimated_arrival_time?: string;
  is_active: boolean;
}

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
  class_name?: string;
  section?: string;
  gender?: string;
  date_of_birth?: string;
  blood_group?: string;
  father_name?: string;
  father_phone?: string;
  mother_name?: string;
  mother_phone?: string;
  address?: string;
  route_id?: string;
  pickup_stop_id?: string;
  drop_stop_id?: string;
  status: 'active' | 'inactive';
  created_at?: string;
}

export interface Trip {
  id: string;
  route_id: string;
  vehicle_id?: string;
  driver_id?: string;
  trip_type: string;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  students_count?: number;
  distance_km?: number;
  notes?: string;
  created_at?: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  trip_id?: string;
  date: string;
  trip_type: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  check_in_time?: string;
  check_out_time?: string;
  stop_name?: string;
  marked_by?: string;
  source?: string;
  created_at?: string;
}

export interface Alert {
  id: string;
  alert_type: string;
  title: string;
  message: string;
  vehicle_id?: string;
  driver_id?: string;
  student_id?: string;
  route_id?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  is_read: boolean;
  is_resolved: boolean;
  created_at: string;
  resolved_at?: string;
}

export interface GPSLocation {
  id: string;
  vehicle_id: string;
  trip_id?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  recorded_at: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  notes?: string;
}

export interface DriverChecklist {
  id: string;
  driver_id: string;
  vehicle_id: string;
  trip_id?: string;
  checklist_date: string;
  items: ChecklistItem[];
  overall_status: 'pending' | 'completed' | 'issues';
  submitted_at?: string;
  reviewed_by?: string;
  notes?: string;
}

export interface DashboardStats {
  total_students: number;
  active_students: number;
  total_vehicles: number;
  active_vehicles: number;
  total_drivers: number;
  active_drivers: number;
  total_routes: number;
  active_routes: number;
  today_trips: number;
  completed_trips: number;
  ongoing_trips: number;
  attendance_rate: number;
  fee_collection_rate: number;
  total_revenue: number;
  pending_fees: number;
}

export interface ApiResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
