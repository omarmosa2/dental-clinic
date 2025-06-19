-- Patients table
CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    serial_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    age INTEGER NOT NULL CHECK (age > 0),
    patient_condition TEXT NOT NULL,
    allergies TEXT,
    medical_conditions TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Treatments table
CREATE TABLE IF NOT EXISTS treatments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    default_cost DECIMAL(10,2),
    duration_minutes INTEGER,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    treatment_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled, no_show
    cost DECIMAL(10,2),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (treatment_id) REFERENCES treatments(id) ON DELETE SET NULL
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    appointment_id TEXT,
    amount DECIMAL(10,2) NOT NULL, -- المبلغ المدفوع في هذه الدفعة
    payment_method TEXT NOT NULL, -- cash, card, bank_transfer, insurance, installment
    payment_date DATETIME NOT NULL,
    description TEXT,
    receipt_number TEXT,
    status TEXT DEFAULT 'completed', -- pending, completed, partial, failed, refunded
    notes TEXT,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2), -- المبلغ الإجمالي لهذه الدفعة (amount + tax - discount)
    total_amount_due DECIMAL(10,2), -- المبلغ الإجمالي المطلوب للعلاج/الخدمة
    amount_paid DECIMAL(10,2), -- إجمالي المبلغ المدفوع حتى الآن
    remaining_balance DECIMAL(10,2), -- المبلغ المتبقي (total_amount_due - amount_paid)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);

-- Installment payments table
CREATE TABLE IF NOT EXISTS installment_payments (
    id TEXT PRIMARY KEY,
    payment_id TEXT NOT NULL,
    installment_number INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    status TEXT DEFAULT 'pending', -- pending, paid, overdue
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);

-- Patient images table
CREATE TABLE IF NOT EXISTS patient_images (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    appointment_id TEXT,
    image_path TEXT NOT NULL,
    image_type TEXT, -- x-ray, photo, scan, etc.
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);



-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    quantity INTEGER DEFAULT 0,
    unit TEXT,
    cost_per_unit DECIMAL(10,2),
    supplier TEXT,
    expiry_date DATE,
    minimum_stock INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inventory usage table
CREATE TABLE IF NOT EXISTS inventory_usage (
    id TEXT PRIMARY KEY,
    inventory_id TEXT NOT NULL,
    appointment_id TEXT,
    quantity_used INTEGER NOT NULL,
    usage_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT 'clinic_settings',
    clinic_name TEXT DEFAULT 'Dental Clinic',
    doctor_name TEXT DEFAULT 'د. محمد أحمد',
    clinic_address TEXT,
    clinic_phone TEXT,
    clinic_email TEXT,
    clinic_logo TEXT,
    currency TEXT DEFAULT 'SAR',
    language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    backup_frequency TEXT DEFAULT 'daily', -- hourly, daily, weekly
    auto_save_interval INTEGER DEFAULT 300, -- seconds
    appointment_duration INTEGER DEFAULT 60, -- minutes
    working_hours_start TEXT DEFAULT '09:00',
    working_hours_end TEXT DEFAULT '17:00',
    working_days TEXT DEFAULT 'monday,tuesday,wednesday,thursday,friday',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT OR IGNORE INTO settings (id) VALUES ('clinic_settings');

-- Insert default treatments
INSERT OR IGNORE INTO treatments (id, name, description, default_cost, duration_minutes, category) VALUES
('cleaning', 'Dental Cleaning', 'Regular dental cleaning and checkup', 100.00, 60, 'Preventive'),
('filling', 'Dental Filling', 'Tooth filling procedure', 150.00, 90, 'Restorative'),
('extraction', 'Tooth Extraction', 'Tooth removal procedure', 200.00, 45, 'Surgery'),
('crown', 'Dental Crown', 'Crown placement procedure', 800.00, 120, 'Restorative'),
('root_canal', 'Root Canal', 'Root canal treatment', 600.00, 90, 'Endodontic'),
('whitening', 'Teeth Whitening', 'Professional teeth whitening', 300.00, 60, 'Cosmetic'),
('checkup', 'Regular Checkup', 'Routine dental examination', 75.00, 30, 'Preventive');

-- Performance Indexes
-- Patient indexes for search optimization
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name);
CREATE INDEX IF NOT EXISTS idx_patients_serial ON patients(serial_number);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_name_phone ON patients(full_name, phone);

-- Appointment indexes for calendar and search optimization
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_treatment ON appointments(treatment_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments(start_time, status);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date ON appointments(patient_id, start_time);

-- Payment indexes for financial reports and search
CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_appointment ON payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_receipt ON payments(receipt_number);
CREATE INDEX IF NOT EXISTS idx_payments_date_status ON payments(payment_date, status);
CREATE INDEX IF NOT EXISTS idx_payments_patient_date ON payments(patient_id, payment_date);

-- Treatment indexes for quick lookup
CREATE INDEX IF NOT EXISTS idx_treatments_name ON treatments(name);
CREATE INDEX IF NOT EXISTS idx_treatments_category ON treatments(category);

-- Inventory indexes for stock management
CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory(name);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory(supplier);
CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON inventory(expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory(quantity, minimum_stock);

-- Inventory usage indexes for tracking
CREATE INDEX IF NOT EXISTS idx_inventory_usage_item ON inventory_usage(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_usage_appointment ON inventory_usage(appointment_id);
CREATE INDEX IF NOT EXISTS idx_inventory_usage_date ON inventory_usage(usage_date);

-- Patient images indexes for quick access
CREATE INDEX IF NOT EXISTS idx_patient_images_patient ON patient_images(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_images_appointment ON patient_images(appointment_id);
CREATE INDEX IF NOT EXISTS idx_patient_images_type ON patient_images(image_type);

-- Installment payments indexes for payment tracking
CREATE INDEX IF NOT EXISTS idx_installment_payments_payment ON installment_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_installment_payments_due_date ON installment_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_installment_payments_status ON installment_payments(status);
CREATE INDEX IF NOT EXISTS idx_installment_payments_due_status ON installment_payments(due_date, status);
