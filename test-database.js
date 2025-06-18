// Test script to check database operations
const { app } = require('electron')
const { DatabaseService } = require('./src/services/databaseService')

// Mock app.getPath for testing
if (!app.getPath) {
  app.getPath = () => 'C:\\Users\\Abdul-Mohsen\\AppData\\Roaming\\dental-clinic-management'
}

async function testDatabase() {
  console.log('🧪 Starting database test...')
  
  try {
    // Initialize database service
    const db = new DatabaseService()
    console.log('✅ Database service initialized')
    
    // Test patient creation
    const testPatient = {
      first_name: 'أحمد',
      last_name: 'محمد',
      phone: '0501234567',
      email: 'ahmed@example.com',
      date_of_birth: '1990-01-01',
      address: 'الرياض، السعودية'
    }
    
    console.log('🧪 Testing patient creation...')
    const createdPatient = await db.createPatient(testPatient)
    console.log('✅ Patient created:', createdPatient.id)
    
    // Test getting all patients
    console.log('🧪 Testing get all patients...')
    const allPatients = await db.getAllPatients()
    console.log('✅ Total patients:', allPatients.length)
    
    // Test appointment creation
    const testAppointment = {
      patient_id: createdPatient.id,
      title: 'فحص عام',
      description: 'فحص دوري للأسنان',
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      status: 'scheduled',
      cost: 100
    }
    
    console.log('🧪 Testing appointment creation...')
    const createdAppointment = await db.createAppointment(testAppointment)
    console.log('✅ Appointment created:', createdAppointment.id)
    
    // Test payment creation
    const testPayment = {
      patient_id: createdPatient.id,
      appointment_id: createdAppointment.id,
      amount: 100,
      payment_method: 'cash',
      payment_date: new Date().toISOString(),
      description: 'دفع فحص عام',
      status: 'completed'
    }
    
    console.log('🧪 Testing payment creation...')
    const createdPayment = await db.createPayment(testPayment)
    console.log('✅ Payment created:', createdPayment.id)
    
    // Test inventory item creation
    const testInventoryItem = {
      name: 'قفازات طبية',
      description: 'قفازات طبية معقمة',
      category: 'مستلزمات طبية',
      quantity: 100,
      unit: 'صندوق',
      cost_per_unit: 50,
      supplier: 'شركة المستلزمات الطبية',
      minimum_stock: 10
    }
    
    console.log('🧪 Testing inventory item creation...')
    const createdInventoryItem = await db.createInventoryItem(testInventoryItem)
    console.log('✅ Inventory item created:', createdInventoryItem.id)
    
    // Test dashboard stats
    console.log('🧪 Testing dashboard stats...')
    const stats = await db.getDashboardStats()
    console.log('✅ Dashboard stats:', stats)
    
    console.log('🎉 All tests passed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
testDatabase()
