CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(32),
    address TEXT,
    city VARCHAR(128),
    state VARCHAR(128),
    country VARCHAR(128) DEFAULT 'India',
    pincode VARCHAR(16),
    logo_url TEXT,
    primary_color VARCHAR(32) DEFAULT '#6366f1',
    timezone VARCHAR(64) DEFAULT 'Asia/Kolkata',
    currency VARCHAR(16) DEFAULT 'INR',
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    subscription_plan VARCHAR(32) DEFAULT 'basic',
    subscription_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    company_id UUID REFERENCES companies(id),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(32),
    roles TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    user_id UUID REFERENCES users(id),
    license_number VARCHAR(64) NOT NULL,
    license_type VARCHAR(32),
    license_expiry DATE,
    phone VARCHAR(32),
    address TEXT,
    city VARCHAR(128),
    photo_url TEXT,
    is_background_verified BOOLEAN DEFAULT false,
    status VARCHAR(32) DEFAULT 'available',
    assigned_vehicle_id UUID,
    rating DECIMAL(3,2) DEFAULT 5.0,
    safe_driving_score INTEGER DEFAULT 100,
    total_trips INTEGER DEFAULT 0,
    total_experience_years INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    plate_number VARCHAR(32) NOT NULL,
    vehicle_type VARCHAR(32) DEFAULT 'bus',
    make VARCHAR(64),
    model VARCHAR(64),
    year INTEGER,
    color VARCHAR(32),
    seating_capacity INTEGER NOT NULL,
    insurance_number VARCHAR(64),
    insurance_expiry DATE,
    permit_number VARCHAR(64),
    permit_expiry DATE,
    fitness_certificate VARCHAR(64),
    fitness_expiry DATE,
    gps_device_id VARCHAR(64),
    gps_installed BOOLEAN DEFAULT false,
    status VARCHAR(32) DEFAULT 'active',
    is_available BOOLEAN DEFAULT true,
    current_odometer INTEGER DEFAULT 0,
    fuel_level INTEGER DEFAULT 100,
    total_km INTEGER DEFAULT 0,
    last_maintenance_at TIMESTAMPTZ,
    next_maintenance_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    route_code VARCHAR(32),
    description TEXT,
    start_point VARCHAR(255),
    end_point VARCHAR(255),
    direction VARCHAR(16) DEFAULT 'pickup',
    total_distance_km DECIMAL(10,2) DEFAULT 0,
    estimated_time_minutes INTEGER DEFAULT 0,
    morning_pickup_time TIME,
    evening_drop_time TIME,
    operating_days VARCHAR(32) DEFAULT 'mon-fri',
    geofence_enabled BOOLEAN DEFAULT true,
    status VARCHAR(32) DEFAULT 'active',
    optimized_order UUID[] DEFAULT '{}',
    base_fare DECIMAL(10,2) DEFAULT 0,
    vehicle_id UUID REFERENCES vehicles(id),
    driver_id UUID REFERENCES drivers(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    route_id UUID REFERENCES routes(id),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    landmark VARCHAR(255),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    stop_order INTEGER NOT NULL,
    estimated_arrival_time TIME,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128) NOT NULL,
    student_id VARCHAR(32) NOT NULL,
    class_name VARCHAR(32),
    section VARCHAR(16),
    gender VARCHAR(16),
    date_of_birth DATE,
    photo_url TEXT,
    blood_group VARCHAR(8),
    father_name VARCHAR(128),
    father_phone VARCHAR(32),
    mother_name VARCHAR(128),
    mother_phone VARCHAR(32),
    address TEXT,
    route_id UUID REFERENCES routes(id),
    pickup_stop_id UUID REFERENCES stops(id),
    drop_stop_id UUID REFERENCES stops(id),
    pickup_time TIME,
    drop_time TIME,
    transport_fees DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(32) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, student_id)
);

CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    route_id UUID REFERENCES routes(id),
    vehicle_id UUID REFERENCES vehicles(id),
    driver_id UUID REFERENCES drivers(id),
    trip_type VARCHAR(16) DEFAULT 'pickup',
    scheduled_start_time TIMESTAMPTZ,
    scheduled_end_time TIMESTAMPTZ,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    status VARCHAR(32) DEFAULT 'scheduled',
    students_count INTEGER DEFAULT 0,
    distance_km DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    student_id UUID REFERENCES students(id),
    trip_id UUID REFERENCES trips(id),
    date DATE NOT NULL,
    trip_type VARCHAR(16) NOT NULL,
    status VARCHAR(16) NOT NULL,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    stop_name VARCHAR(255),
    marked_by UUID REFERENCES users(id),
    source VARCHAR(32) DEFAULT 'manual',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, student_id, date, trip_type)
);

CREATE TABLE IF NOT EXISTS ridership_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    trip_id UUID REFERENCES trips(id),
    student_id UUID REFERENCES students(id),
    vehicle_id UUID REFERENCES vehicles(id),
    action VARCHAR(16) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gps_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id),
    trip_id UUID REFERENCES trips(id),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed DECIMAL(6,2) DEFAULT 0,
    heading DECIMAL(6,2) DEFAULT 0,
    accuracy DECIMAL(6,2) DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geofence_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    zone_type VARCHAR(32) NOT NULL,
    coordinates JSONB NOT NULL,
    radius_meters DOUBLE PRECISION,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    driver_id UUID REFERENCES drivers(id),
    vehicle_id UUID REFERENCES vehicles(id),
    trip_id UUID REFERENCES trips(id),
    checklist_date DATE NOT NULL,
    items JSONB NOT NULL,
    overall_status VARCHAR(16) DEFAULT 'pending',
    submitted_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    user_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    channel VARCHAR(32) NOT NULL,
    notification_type VARCHAR(32) DEFAULT 'info',
    status VARCHAR(32) DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    alert_type VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id),
    driver_id UUID REFERENCES drivers(id),
    student_id UUID REFERENCES students(id),
    route_id UUID REFERENCES routes(id),
    severity VARCHAR(16) DEFAULT 'medium',
    is_read BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id),
    maintenance_type VARCHAR(64) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    scheduled_date DATE NOT NULL,
    completed_date DATE,
    odometer_reading INTEGER,
    cost DECIMAL(10,2),
    vendor_name VARCHAR(255),
    status VARCHAR(32) DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trip_stop_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    trip_id UUID REFERENCES trips(id),
    stop_id UUID REFERENCES stops(id),
    vehicle_id UUID REFERENCES vehicles(id),
    actual_arrival TIMESTAMPTZ,
    actual_departure TIMESTAMPTZ,
    student_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    student_id UUID REFERENCES students(id),
    fee_type VARCHAR(32) DEFAULT 'transport',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    gst_rate DECIMAL(5,2) DEFAULT 0,
    gst_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(16) DEFAULT 'pending',
    paid_amount DECIMAL(10,2) DEFAULT 0,
    paid_date DATE,
    payment_method VARCHAR(32),
    transaction_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    report_type VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    parameters JSONB DEFAULT '{}',
    file_url TEXT,
    status VARCHAR(32) DEFAULT 'pending',
    generated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    user_id UUID REFERENCES users(id),
    action VARCHAR(64) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(64) NOT NULL,
    role VARCHAR(16) NOT NULL,
    content TEXT NOT NULL,
    intent VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drivers_tenant ON drivers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant ON vehicles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_routes_tenant ON routes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stops_tenant ON stops(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stops_route ON stops(route_id);
CREATE INDEX IF NOT EXISTS idx_students_tenant ON students(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trips_tenant ON trips(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant ON attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_ridership_tenant ON ridership_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ridership_trip ON ridership_logs(trip_id);
CREATE INDEX IF NOT EXISTS idx_gps_tenant ON gps_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gps_vehicle ON gps_locations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_gps_recorded ON gps_locations(recorded_at);
CREATE INDEX IF NOT EXISTS idx_geofence_tenant ON geofence_zones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alerts_tenant ON alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_maintenance_tenant ON maintenance_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fees_tenant ON fees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reports_tenant ON reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_checklist_driver ON driver_checklists(driver_id);
CREATE INDEX IF NOT EXISTS idx_checklist_date ON driver_checklists(checklist_date);
