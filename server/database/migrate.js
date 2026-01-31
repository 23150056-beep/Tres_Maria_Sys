import { query } from './db.js';

const migrate = async () => {
  console.log('Starting database migration...');

  try {
    // Enable UUID extension
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // ============================================
    // USERS & ROLES
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        permissions JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        avatar_url TEXT,
        role_id INTEGER REFERENCES roles(id),
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_id VARCHAR(100),
        old_values JSONB,
        new_values JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================
    // WAREHOUSE & LOCATIONS
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        address TEXT,
        city VARCHAR(100),
        province VARCHAR(100),
        postal_code VARCHAR(10),
        phone VARCHAR(20),
        email VARCHAR(255),
        manager_id UUID REFERENCES users(id),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        total_capacity DECIMAL(15, 2) DEFAULT 0,
        used_capacity DECIMAL(15, 2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS warehouse_zones (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
        code VARCHAR(20) NOT NULL,
        name VARCHAR(100) NOT NULL,
        zone_type VARCHAR(50), -- storage, receiving, shipping, staging
        temperature_controlled BOOLEAN DEFAULT false,
        min_temperature DECIMAL(5, 2),
        max_temperature DECIMAL(5, 2),
        capacity DECIMAL(15, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(warehouse_id, code)
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS storage_locations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
        zone_id UUID REFERENCES warehouse_zones(id),
        code VARCHAR(30) NOT NULL,
        aisle VARCHAR(10),
        rack VARCHAR(10),
        shelf VARCHAR(10),
        bin VARCHAR(10),
        location_type VARCHAR(50), -- bulk, pick, reserve
        max_weight DECIMAL(10, 2),
        max_volume DECIMAL(10, 2),
        is_occupied BOOLEAN DEFAULT false,
        current_product_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(warehouse_id, code)
      );
    `);

    // ============================================
    // PRODUCTS & CATEGORIES
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        parent_id UUID REFERENCES categories(id),
        image_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sku VARCHAR(50) UNIQUE NOT NULL,
        barcode VARCHAR(50),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category_id UUID REFERENCES categories(id),
        unit_of_measure VARCHAR(20) DEFAULT 'piece',
        weight DECIMAL(10, 3),
        dimensions JSONB, -- {length, width, height}
        base_price DECIMAL(15, 2) NOT NULL,
        cost_price DECIMAL(15, 2),
        wholesale_price DECIMAL(15, 2),
        vip_price DECIMAL(15, 2),
        min_stock_level INTEGER DEFAULT 0,
        max_stock_level INTEGER,
        reorder_point INTEGER DEFAULT 10,
        reorder_quantity INTEGER DEFAULT 50,
        is_perishable BOOLEAN DEFAULT false,
        shelf_life_days INTEGER,
        requires_batch_tracking BOOLEAN DEFAULT false,
        image_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        is_primary BOOLEAN DEFAULT false,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================
    // INVENTORY MANAGEMENT
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
        location_id UUID REFERENCES storage_locations(id),
        quantity INTEGER NOT NULL DEFAULT 0,
        reserved_quantity INTEGER DEFAULT 0,
        available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
        batch_number VARCHAR(50),
        lot_number VARCHAR(50),
        manufacture_date DATE,
        expiry_date DATE,
        cost_price DECIMAL(15, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(product_id, warehouse_id, batch_number, location_id)
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID REFERENCES products(id),
        warehouse_id UUID REFERENCES warehouses(id),
        transaction_type VARCHAR(50) NOT NULL, -- receive, issue, transfer, adjustment, return
        reference_type VARCHAR(50), -- purchase_order, sales_order, transfer, adjustment
        reference_id UUID,
        quantity INTEGER NOT NULL,
        unit_cost DECIMAL(15, 2),
        batch_number VARCHAR(50),
        from_location_id UUID REFERENCES storage_locations(id),
        to_location_id UUID REFERENCES storage_locations(id),
        reason TEXT,
        performed_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS stock_alerts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        warehouse_id UUID REFERENCES warehouses(id),
        alert_type VARCHAR(50) NOT NULL, -- low_stock, overstock, expiring, expired
        threshold_value INTEGER,
        current_value INTEGER,
        message TEXT,
        is_acknowledged BOOLEAN DEFAULT false,
        acknowledged_by UUID REFERENCES users(id),
        acknowledged_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================
    // CLIENTS / RETAILERS
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS pricing_tiers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        discount_percentage DECIMAL(5, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code VARCHAR(20) UNIQUE NOT NULL,
        business_name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(200),
        email VARCHAR(255),
        phone VARCHAR(20),
        mobile VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        province VARCHAR(100),
        postal_code VARCHAR(10),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        pricing_tier_id INTEGER REFERENCES pricing_tiers(id),
        credit_limit DECIMAL(15, 2) DEFAULT 0,
        current_balance DECIMAL(15, 2) DEFAULT 0,
        payment_terms INTEGER DEFAULT 30, -- days
        tax_id VARCHAR(50),
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS client_addresses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        address_type VARCHAR(50) DEFAULT 'delivery', -- billing, delivery
        address TEXT NOT NULL,
        city VARCHAR(100),
        province VARCHAR(100),
        postal_code VARCHAR(10),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        is_default BOOLEAN DEFAULT false,
        contact_person VARCHAR(200),
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================
    // SUPPLIERS
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code VARCHAR(20) UNIQUE NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(200),
        email VARCHAR(255),
        phone VARCHAR(20),
        mobile VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        province VARCHAR(100),
        postal_code VARCHAR(10),
        tax_id VARCHAR(50),
        payment_terms INTEGER DEFAULT 30,
        lead_time_days INTEGER DEFAULT 7,
        rating DECIMAL(3, 2), -- 0-5
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS supplier_products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        supplier_sku VARCHAR(50),
        cost_price DECIMAL(15, 2),
        min_order_quantity INTEGER DEFAULT 1,
        lead_time_days INTEGER,
        is_preferred BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(supplier_id, product_id)
      );
    `);

    // ============================================
    // PURCHASE ORDERS
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        po_number VARCHAR(30) UNIQUE NOT NULL,
        supplier_id UUID REFERENCES suppliers(id),
        warehouse_id UUID REFERENCES warehouses(id),
        status VARCHAR(50) DEFAULT 'draft', -- draft, pending, approved, ordered, partial, received, cancelled
        order_date DATE NOT NULL,
        expected_date DATE,
        received_date DATE,
        subtotal DECIMAL(15, 2) DEFAULT 0,
        tax_amount DECIMAL(15, 2) DEFAULT 0,
        discount_amount DECIMAL(15, 2) DEFAULT 0,
        total_amount DECIMAL(15, 2) DEFAULT 0,
        notes TEXT,
        created_by UUID REFERENCES users(id),
        approved_by UUID REFERENCES users(id),
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id),
        quantity INTEGER NOT NULL,
        received_quantity INTEGER DEFAULT 0,
        unit_cost DECIMAL(15, 2) NOT NULL,
        total_cost DECIMAL(15, 2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS goods_receipts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        grn_number VARCHAR(30) UNIQUE NOT NULL,
        purchase_order_id UUID REFERENCES purchase_orders(id),
        warehouse_id UUID REFERENCES warehouses(id),
        received_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'pending', -- pending, inspecting, completed
        notes TEXT,
        received_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS goods_receipt_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        goods_receipt_id UUID REFERENCES goods_receipts(id) ON DELETE CASCADE,
        purchase_order_item_id UUID REFERENCES purchase_order_items(id),
        product_id UUID REFERENCES products(id),
        quantity_received INTEGER NOT NULL,
        quantity_accepted INTEGER,
        quantity_rejected INTEGER DEFAULT 0,
        batch_number VARCHAR(50),
        lot_number VARCHAR(50),
        manufacture_date DATE,
        expiry_date DATE,
        location_id UUID REFERENCES storage_locations(id),
        inspection_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================
    // SALES ORDERS
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_number VARCHAR(30) UNIQUE NOT NULL,
        client_id UUID REFERENCES clients(id),
        warehouse_id UUID REFERENCES warehouses(id),
        status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, processing, picking, packed, shipped, delivered, cancelled
        order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        required_date DATE,
        shipped_date TIMESTAMP,
        delivered_date TIMESTAMP,
        delivery_address_id UUID REFERENCES client_addresses(id),
        shipping_address TEXT,
        subtotal DECIMAL(15, 2) DEFAULT 0,
        tax_amount DECIMAL(15, 2) DEFAULT 0,
        discount_amount DECIMAL(15, 2) DEFAULT 0,
        shipping_fee DECIMAL(15, 2) DEFAULT 0,
        total_amount DECIMAL(15, 2) DEFAULT 0,
        payment_status VARCHAR(50) DEFAULT 'unpaid', -- unpaid, partial, paid
        payment_method VARCHAR(50),
        notes TEXT,
        priority INTEGER DEFAULT 5, -- 1 highest, 10 lowest
        created_by UUID REFERENCES users(id),
        approved_by UUID REFERENCES users(id),
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id),
        quantity INTEGER NOT NULL,
        picked_quantity INTEGER DEFAULT 0,
        unit_price DECIMAL(15, 2) NOT NULL,
        discount_percentage DECIMAL(5, 2) DEFAULT 0,
        tax_percentage DECIMAL(5, 2) DEFAULT 0,
        total_price DECIMAL(15, 2) NOT NULL,
        batch_number VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        notes TEXT,
        changed_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================
    // DELIVERY & LOGISTICS
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        plate_number VARCHAR(20) UNIQUE NOT NULL,
        vehicle_type VARCHAR(50), -- truck, van, motorcycle
        make VARCHAR(100),
        model VARCHAR(100),
        year INTEGER,
        capacity_weight DECIMAL(10, 2),
        capacity_volume DECIMAL(10, 2),
        fuel_type VARCHAR(20),
        status VARCHAR(50) DEFAULT 'available', -- available, in_use, maintenance
        current_driver_id UUID,
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        employee_id VARCHAR(20) UNIQUE,
        license_number VARCHAR(50) NOT NULL,
        license_type VARCHAR(20),
        license_expiry DATE,
        phone VARCHAR(20),
        emergency_contact VARCHAR(200),
        emergency_phone VARCHAR(20),
        status VARCHAR(50) DEFAULT 'available', -- available, on_delivery, off_duty
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS delivery_routes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        route_code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        estimated_distance DECIMAL(10, 2),
        estimated_duration INTEGER, -- in minutes
        waypoints JSONB, -- array of lat/lng coordinates
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS deliveries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        delivery_number VARCHAR(30) UNIQUE NOT NULL,
        route_id UUID REFERENCES delivery_routes(id),
        driver_id UUID REFERENCES drivers(id),
        vehicle_id UUID REFERENCES vehicles(id),
        warehouse_id UUID REFERENCES warehouses(id),
        status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, loading, in_transit, delivered, failed, returned
        scheduled_date DATE NOT NULL,
        departure_time TIMESTAMP,
        completion_time TIMESTAMP,
        total_stops INTEGER DEFAULT 0,
        completed_stops INTEGER DEFAULT 0,
        total_distance DECIMAL(10, 2),
        notes TEXT,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS delivery_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE,
        order_id UUID REFERENCES orders(id),
        client_id UUID REFERENCES clients(id),
        sequence_number INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'pending', -- pending, delivered, failed, partial
        delivery_address TEXT,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        estimated_arrival TIMESTAMP,
        actual_arrival TIMESTAMP,
        signature_url TEXT,
        photo_url TEXT,
        recipient_name VARCHAR(200),
        notes TEXT,
        failure_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================
    // DISTRIBUTION MANAGEMENT
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS distribution_plans (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        plan_number VARCHAR(30) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        plan_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'draft', -- draft, active, completed, cancelled
        total_orders INTEGER DEFAULT 0,
        total_quantity INTEGER DEFAULT 0,
        total_value DECIMAL(15, 2) DEFAULT 0,
        optimization_score DECIMAL(5, 2),
        created_by UUID REFERENCES users(id),
        approved_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS distribution_allocations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        plan_id UUID REFERENCES distribution_plans(id) ON DELETE CASCADE,
        order_id UUID REFERENCES orders(id),
        product_id UUID REFERENCES products(id),
        warehouse_id UUID REFERENCES warehouses(id),
        allocated_quantity INTEGER NOT NULL,
        priority_score DECIMAL(5, 2),
        allocation_status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, picked, shipped
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================
    // FINANCIAL / INVOICING
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        invoice_number VARCHAR(30) UNIQUE NOT NULL,
        order_id UUID REFERENCES orders(id),
        client_id UUID REFERENCES clients(id),
        invoice_date DATE NOT NULL,
        due_date DATE NOT NULL,
        subtotal DECIMAL(15, 2) NOT NULL,
        tax_amount DECIMAL(15, 2) DEFAULT 0,
        discount_amount DECIMAL(15, 2) DEFAULT 0,
        total_amount DECIMAL(15, 2) NOT NULL,
        amount_paid DECIMAL(15, 2) DEFAULT 0,
        balance_due DECIMAL(15, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'unpaid', -- unpaid, partial, paid, overdue, cancelled
        notes TEXT,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        payment_number VARCHAR(30) UNIQUE NOT NULL,
        invoice_id UUID REFERENCES invoices(id),
        client_id UUID REFERENCES clients(id),
        payment_date DATE NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL, -- cash, check, bank_transfer, credit_card
        reference_number VARCHAR(100),
        bank_name VARCHAR(100),
        check_number VARCHAR(50),
        notes TEXT,
        received_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS supplier_payments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        payment_number VARCHAR(30) UNIQUE NOT NULL,
        supplier_id UUID REFERENCES suppliers(id),
        purchase_order_id UUID REFERENCES purchase_orders(id),
        payment_date DATE NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        reference_number VARCHAR(100),
        notes TEXT,
        processed_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================
    // NOTIFICATIONS
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50), -- info, warning, error, success
        category VARCHAR(50), -- order, inventory, delivery, payment
        reference_type VARCHAR(50),
        reference_id UUID,
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================
    // SYSTEM SETTINGS
    // ============================================
    await query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================
    // CREATE INDEXES
    // ============================================
    await query(`CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON inventory(warehouse_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON inventory(expiry_date);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_deliveries_date ON deliveries(scheduled_date);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);`);

    console.log('✅ Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrate();
