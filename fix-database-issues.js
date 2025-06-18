// Database issues fix script
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

function fixDatabaseIssues() {
  console.log('🔧 Starting database issues fix...')
  
  const userDataPath = 'C:\\Users\\Abdul-Mohsen\\AppData\\Roaming\\dental-clinic-management'
  const dbPath = path.join(userDataPath, 'dental_clinic.db')
  
  if (!fs.existsSync(dbPath)) {
    console.log('❌ Database file not found:', dbPath)
    return
  }
  
  try {
    console.log('📂 Opening database:', dbPath)
    const db = new Database(dbPath)
    
    // Check database integrity
    console.log('🔍 Checking database integrity...')
    const integrityCheck = db.prepare('PRAGMA integrity_check').get()
    console.log('Integrity check result:', integrityCheck.integrity_check)
    
    // Force WAL checkpoint
    console.log('💾 Forcing WAL checkpoint...')
    const checkpoint = db.pragma('wal_checkpoint(TRUNCATE)')
    console.log('Checkpoint result:', checkpoint)
    
    // Check table existence
    console.log('📋 Checking tables...')
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
    console.log('Tables found:', tables.map(t => t.name))
    
    // Check data counts
    console.log('📊 Checking data counts...')
    const requiredTables = ['patients', 'appointments', 'payments', 'inventory', 'treatments', 'settings']
    
    requiredTables.forEach(table => {
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get()
        console.log(`${table}: ${count.count} records`)
      } catch (error) {
        console.log(`❌ Error checking ${table}:`, error.message)
      }
    })
    
    // Optimize database
    console.log('⚡ Optimizing database...')
    db.exec('VACUUM')
    db.exec('ANALYZE')
    
    // Set optimal pragmas
    console.log('⚙️ Setting optimal pragmas...')
    db.pragma('foreign_keys = ON')
    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = NORMAL')
    db.pragma('cache_size = 1000')
    db.pragma('temp_store = MEMORY')
    
    // Test basic operations
    console.log('🧪 Testing basic operations...')
    
    // Test patient creation
    try {
      const testPatient = {
        id: 'test-patient-' + Date.now(),
        first_name: 'اختبار',
        last_name: 'المريض',
        phone: '0500000000',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const insertStmt = db.prepare(`
        INSERT INTO patients (id, first_name, last_name, phone, email, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      
      const result = insertStmt.run(
        testPatient.id, testPatient.first_name, testPatient.last_name,
        testPatient.phone, testPatient.email, testPatient.created_at, testPatient.updated_at
      )
      
      console.log('✅ Test patient created:', result.changes, 'changes')
      
      // Clean up test data
      const deleteStmt = db.prepare('DELETE FROM patients WHERE id = ?')
      deleteStmt.run(testPatient.id)
      console.log('🧹 Test data cleaned up')
      
    } catch (error) {
      console.log('❌ Test patient creation failed:', error.message)
    }
    
    // Final checkpoint
    console.log('💾 Final WAL checkpoint...')
    db.pragma('wal_checkpoint(TRUNCATE)')
    
    db.close()
    console.log('✅ Database issues fix completed successfully!')
    
  } catch (error) {
    console.error('❌ Database fix failed:', error)
  }
}

fixDatabaseIssues()
