import { query } from './db.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const seed = async () => {
  console.log('Starting database seeding...');

  try {
    // ============================================
    // SEED ROLES
    // ============================================
    await query(`
      INSERT INTO roles (name, description, permissions) VALUES
      ('Admin', 'Full system access', '{"all": true}'),
      ('Manager', 'Warehouse and operations management', '{"inventory": true, "orders": true, "reports": true, "users": false}'),
      ('Sales', 'Sales and client management', '{"orders": true, "clients": true, "products": ["read"]}'),
      ('Warehouse Staff', 'Warehouse operations', '{"inventory": true, "receiving": true, "picking": true}'),
      ('Driver', 'Delivery operations', '{"deliveries": true}')
      ON CONFLICT (name) DO NOTHING;
    `);

    // ============================================
    // SEED DEFAULT ADMIN USER
    // ============================================
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await query(`
      INSERT INTO users (id, email, password, first_name, last_name, phone, role_id, is_active)
      VALUES (
        $1,
        'admin@tresmarias.ph',
        $2,
        'System',
        'Administrator',
        '+63 912 345 6789',
        1,
        true
      )
      ON CONFLICT (email) DO NOTHING;
    `, [uuidv4(), hashedPassword]);

    // Seed additional users
    const managerPassword = await bcrypt.hash('manager123', 10);
    const staffPassword = await bcrypt.hash('staff123', 10);
    const driverPassword = await bcrypt.hash('driver123', 10);

    const driverUserId = uuidv4();

    await query(`
      INSERT INTO users (id, email, password, first_name, last_name, phone, role_id, is_active)
      VALUES 
        ($1, 'manager@tresmarias.ph', $5, 'Juan', 'Dela Cruz', '+63 917 123 4567', 2, true),
        ($2, 'sales@tresmarias.ph', $6, 'Maria', 'Santos', '+63 918 234 5678', 3, true),
        ($3, 'warehouse@tresmarias.ph', $6, 'Pedro', 'Reyes', '+63 919 345 6789', 4, true),
        ($4, 'driver@tresmarias.ph', $7, 'Carlos', 'Garcia', '+63 920 456 7890', 5, true)
      ON CONFLICT (email) DO NOTHING;
    `, [uuidv4(), uuidv4(), uuidv4(), driverUserId, managerPassword, staffPassword, driverPassword]);

    // Seed driver profile
    await query(`
      INSERT INTO drivers (id, user_id, employee_id, license_number, license_type, license_expiry, phone, emergency_contact, emergency_phone, status, is_active)
      VALUES ($1, $2, 'DRV-001', 'N01-23-456789', 'Professional', '2027-12-31', '+63 920 456 7890', 'Elena Garcia', '+63 921 567 8901', 'available', true)
      ON CONFLICT (employee_id) DO NOTHING;
    `, [uuidv4(), driverUserId]);

    // ============================================
    // SEED PRICING TIERS
    // ============================================
    await query(`
      INSERT INTO pricing_tiers (name, description, discount_percentage) VALUES
      ('Regular', 'Standard retail pricing', 0),
      ('Wholesale', 'Wholesale pricing with 10% discount', 10),
      ('VIP', 'VIP clients with 15% discount', 15),
      ('Distributor', 'Distributor pricing with 20% discount', 20)
      ON CONFLICT (name) DO NOTHING;
    `);

    // ============================================
    // SEED WAREHOUSE
    // ============================================
    const warehouseId = uuidv4();
    await query(`
      INSERT INTO warehouses (id, code, name, address, city, province, postal_code, phone, email, latitude, longitude, total_capacity, is_active)
      VALUES ($1, 'WH-MAIN', 'Tres Marias Main Warehouse', '123 MacArthur Highway', 'San Fernando City', 'La Union', '2500', '+63 72 888 1234', 'warehouse@tresmarias.ph', 16.6159, 120.3175, 10000.00, true)
      ON CONFLICT (code) DO NOTHING;
    `, [warehouseId]);

    // Seed warehouse zones
    await query(`
      INSERT INTO warehouse_zones (warehouse_id, code, name, zone_type, capacity)
      SELECT $1, code, name, zone_type, capacity
      FROM (VALUES
        ('ZONE-A', 'Storage Zone A', 'storage', 3000),
        ('ZONE-B', 'Storage Zone B', 'storage', 3000),
        ('ZONE-C', 'Cold Storage', 'storage', 1000),
        ('RECV', 'Receiving Area', 'receiving', 500),
        ('SHIP', 'Shipping Area', 'shipping', 500),
        ('STAGE', 'Staging Area', 'staging', 500)
      ) AS zones(code, name, zone_type, capacity)
      WHERE NOT EXISTS (SELECT 1 FROM warehouse_zones WHERE warehouse_id = $1);
    `, [warehouseId]);

    // ============================================
    // SEED CATEGORIES
    // ============================================
    await query(`
      INSERT INTO categories (id, name, description, is_active) VALUES
      ('${uuidv4()}', 'Food & Beverages', 'Food and beverage products', true),
      ('${uuidv4()}', 'Household Supplies', 'Cleaning and household items', true),
      ('${uuidv4()}', 'Personal Care', 'Personal hygiene and care products', true),
      ('${uuidv4()}', 'Canned Goods', 'Canned food products', true),
      ('${uuidv4()}', 'Snacks & Confectionery', 'Snacks, candies, and sweets', true),
      ('${uuidv4()}', 'Dairy Products', 'Milk and dairy items', true),
      ('${uuidv4()}', 'Frozen Foods', 'Frozen food items', true),
      ('${uuidv4()}', 'Rice & Grains', 'Rice and grain products', true)
      ON CONFLICT DO NOTHING;
    `);

    // ============================================
    // SEED SAMPLE PRODUCTS
    // ============================================
    const productsResult = await query(`SELECT id FROM categories LIMIT 1`);
    if (productsResult.rows.length > 0) {
      const categoryId = productsResult.rows[0].id;
      
      await query(`
        INSERT INTO products (id, sku, barcode, name, description, category_id, unit_of_measure, base_price, cost_price, wholesale_price, vip_price, min_stock_level, reorder_point, reorder_quantity, is_active)
        VALUES 
          ('${uuidv4()}', 'SKU-001', '4800016123456', 'Lucky Me Pancit Canton Original', 'Instant noodles 55g', $1, 'pack', 12.00, 9.50, 10.50, 10.00, 100, 200, 500, true),
          ('${uuidv4()}', 'SKU-002', '4800016123457', 'Century Tuna Flakes in Oil', 'Canned tuna 155g', $1, 'can', 35.00, 28.00, 31.50, 30.00, 50, 100, 200, true),
          ('${uuidv4()}', 'SKU-003', '4800016123458', 'Argentina Corned Beef', 'Corned beef 260g', $1, 'can', 65.00, 52.00, 58.50, 56.00, 50, 100, 200, true),
          ('${uuidv4()}', 'SKU-004', '4800016123459', 'Bear Brand Powdered Milk', 'Powdered milk 300g', $1, 'pack', 95.00, 78.00, 85.50, 82.00, 30, 60, 150, true),
          ('${uuidv4()}', 'SKU-005', '4800016123460', 'Tide Powder Detergent', 'Laundry detergent 1kg', $1, 'pack', 145.00, 120.00, 130.50, 125.00, 40, 80, 200, true),
          ('${uuidv4()}', 'SKU-006', '4800016123461', 'Joy Dishwashing Liquid', 'Dishwashing liquid 500ml', $1, 'bottle', 85.00, 68.00, 76.50, 73.00, 40, 80, 200, true),
          ('${uuidv4()}', 'SKU-007', '4800016123462', 'Safeguard Soap Bar', 'Antibacterial soap 135g', $1, 'bar', 45.00, 36.00, 40.50, 39.00, 60, 120, 300, true),
          ('${uuidv4()}', 'SKU-008', '4800016123463', 'Coca-Cola Regular', 'Soft drink 1.5L', $1, 'bottle', 65.00, 52.00, 58.50, 56.00, 100, 200, 400, true),
          ('${uuidv4()}', 'SKU-009', '4800016123464', 'Kopiko Brown Coffee', 'Instant coffee 25g x 10', $1, 'pack', 95.00, 76.00, 85.50, 82.00, 50, 100, 250, true),
          ('${uuidv4()}', 'SKU-010', '4800016123465', 'San Miguel Pale Pilsen', 'Beer 330ml x 24', $1, 'case', 780.00, 650.00, 702.00, 680.00, 20, 40, 100, true)
        ON CONFLICT (sku) DO NOTHING;
      `, [categoryId]);
    }

    // ============================================
    // SEED SAMPLE SUPPLIERS
    // ============================================
    await query(`
      INSERT INTO suppliers (id, code, company_name, contact_person, email, phone, address, city, province, payment_terms, lead_time_days, is_active)
      VALUES 
        ('${uuidv4()}', 'SUP-001', 'Monde Nissin Corporation', 'John Smith', 'supplier@mondenissin.com', '+63 2 8888 1111', '123 Industrial Ave', 'Pasig City', 'Metro Manila', 30, 3, true),
        ('${uuidv4()}', 'SUP-002', 'Century Pacific Food Inc', 'Jane Doe', 'supplier@centurypacific.com', '+63 2 8888 2222', '456 Food Street', 'Taguig City', 'Metro Manila', 30, 5, true),
        ('${uuidv4()}', 'SUP-003', 'Procter & Gamble Philippines', 'Bob Wilson', 'supplier@pg.com', '+63 2 8888 3333', '789 Consumer Road', 'Makati City', 'Metro Manila', 45, 7, true),
        ('${uuidv4()}', 'SUP-004', 'Nestle Philippines Inc', 'Alice Brown', 'supplier@nestle.com', '+63 2 8888 4444', '321 Nutrition Blvd', 'Meycauayan', 'Bulacan', 30, 5, true),
        ('${uuidv4()}', 'SUP-005', 'San Miguel Corporation', 'Carlos Garcia', 'supplier@sanmiguel.com', '+63 2 8888 5555', '654 Beverage Lane', 'Mandaluyong City', 'Metro Manila', 30, 3, true)
      ON CONFLICT (code) DO NOTHING;
    `);

    // ============================================
    // SEED SAMPLE CLIENTS
    // ============================================
    await query(`
      INSERT INTO clients (id, code, business_name, contact_person, email, phone, address, city, province, postal_code, pricing_tier_id, credit_limit, payment_terms, is_active)
      VALUES 
        ('${uuidv4()}', 'CLI-001', 'Sari-Sari Store ni Aling Maria', 'Maria Garcia', 'maria@email.com', '+63 917 111 1111', '123 Barangay Street', 'San Fernando City', 'La Union', '2500', 1, 50000.00, 15, true),
        ('${uuidv4()}', 'CLI-002', 'Mini Mart Express', 'Pedro Santos', 'pedro@minimart.com', '+63 917 222 2222', '456 Commercial Ave', 'San Fernando City', 'La Union', '2500', 2, 150000.00, 30, true),
        ('${uuidv4()}', 'CLI-003', 'Grocery King', 'Juan Dela Cruz', 'juan@groceryking.com', '+63 917 333 3333', '789 Market Road', 'Bauang', 'La Union', '2501', 3, 300000.00, 30, true),
        ('${uuidv4()}', 'CLI-004', 'Northern Supermart', 'Ana Reyes', 'ana@northernsuper.com', '+63 917 444 4444', '321 Highway North', 'Agoo', 'La Union', '2504', 3, 500000.00, 45, true),
        ('${uuidv4()}', 'CLI-005', 'Barangay Store Plus', 'Luis Mendoza', 'luis@barangaystore.com', '+63 917 555 5555', '654 Village Road', 'Bacnotan', 'La Union', '2515', 1, 30000.00, 15, true),
        ('${uuidv4()}', 'CLI-006', 'Super Save Mart', 'Rosa Cruz', 'rosa@supersave.com', '+63 917 666 6666', '987 Savings Street', 'Rosario', 'La Union', '2506', 2, 200000.00, 30, true),
        ('${uuidv4()}', 'CLI-007', 'Family Choice Store', 'Carlos Tan', 'carlos@familychoice.com', '+63 917 777 7777', '147 Family Lane', 'Naguilian', 'La Union', '2511', 1, 75000.00, 15, true),
        ('${uuidv4()}', 'CLI-008', 'Quick Stop Convenience', 'Elena Lim', 'elena@quickstop.com', '+63 917 888 8888', '258 Express Road', 'Baguio City', 'Benguet', '2600', 2, 250000.00, 30, true)
      ON CONFLICT (code) DO NOTHING;
    `);

    // ============================================
    // SEED DELIVERY ROUTES
    // ============================================
    await query(`
      INSERT INTO delivery_routes (id, route_code, name, description, estimated_distance, estimated_duration, is_active)
      VALUES 
        ('${uuidv4()}', 'RT-001', 'San Fernando City Route', 'Covers all stops within San Fernando City', 25.5, 120, true),
        ('${uuidv4()}', 'RT-002', 'Bauang-Bacnotan Route', 'Southern La Union municipalities', 45.0, 180, true),
        ('${uuidv4()}', 'RT-003', 'Agoo-Rosario Route', 'Northern La Union municipalities', 55.0, 210, true),
        ('${uuidv4()}', 'RT-004', 'Baguio City Route', 'Baguio City deliveries', 65.0, 180, true),
        ('${uuidv4()}', 'RT-005', 'Pangasinan Route', 'Cross-province deliveries to Pangasinan', 80.0, 240, true)
      ON CONFLICT (route_code) DO NOTHING;
    `);

    // ============================================
    // SEED VEHICLES
    // ============================================
    await query(`
      INSERT INTO vehicles (id, plate_number, vehicle_type, make, model, year, capacity_weight, capacity_volume, fuel_type, status, is_active)
      VALUES 
        ('${uuidv4()}', 'ABC 1234', 'truck', 'Isuzu', 'Elf', 2022, 3500.00, 15.0, 'diesel', 'available', true),
        ('${uuidv4()}', 'XYZ 5678', 'truck', 'Mitsubishi', 'Canter', 2021, 4000.00, 18.0, 'diesel', 'available', true),
        ('${uuidv4()}', 'DEF 9012', 'van', 'Toyota', 'Hiace', 2023, 1500.00, 8.0, 'diesel', 'available', true),
        ('${uuidv4()}', 'GHI 3456', 'van', 'Nissan', 'Urvan', 2022, 1200.00, 7.0, 'diesel', 'available', true),
        ('${uuidv4()}', 'JKL 7890', 'motorcycle', 'Honda', 'TMX 155', 2023, 150.00, 0.5, 'gasoline', 'available', true)
      ON CONFLICT (plate_number) DO NOTHING;
    `);

    // ============================================
    // SEED SYSTEM SETTINGS
    // ============================================
    await query(`
      INSERT INTO system_settings (key, value, description) VALUES
      ('company_name', 'Tres Marias Marketing', 'Company name'),
      ('company_address', '123 MacArthur Highway, San Fernando City, La Union 2500', 'Company address'),
      ('company_phone', '+63 72 888 1234', 'Company phone number'),
      ('company_email', 'info@tresmarias.ph', 'Company email'),
      ('tax_rate', '12', 'Default VAT rate percentage'),
      ('currency', 'PHP', 'Default currency'),
      ('currency_symbol', '₱', 'Currency symbol'),
      ('date_format', 'MM/DD/YYYY', 'Date format'),
      ('low_stock_threshold', '10', 'Default low stock threshold'),
      ('order_prefix', 'SO', 'Sales order number prefix'),
      ('invoice_prefix', 'INV', 'Invoice number prefix'),
      ('po_prefix', 'PO', 'Purchase order number prefix'),
      ('delivery_prefix', 'DL', 'Delivery number prefix')
      ON CONFLICT (key) DO NOTHING;
    `);

    console.log('✅ Database seeding completed successfully!');
    console.log('');
    console.log('Default Admin Credentials:');
    console.log('  Email: admin@tresmarias.ph');
    console.log('  Password: admin123');
    console.log('');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
