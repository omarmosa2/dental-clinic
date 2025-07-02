/**
 * Script to check database content using Electron's database service
 */

const { app, BrowserWindow } = require('electron')
const path = require('path')

// Import database service
const { DatabaseService } = require('../src/services/databaseService')

async function checkDatabase() {
  console.log('🔍 Checking database content...')

  try {
    // Initialize database service with correct path
    const dbPath = 'C:\\Users\\Abdul-Mohsen\\AppData\\Roaming\\dental-clinic-management\\dental_clinic.db'
    const dbService = new DatabaseService(dbPath)

    // First check table structure
    console.log('\n📊 Checking tooth_treatments table structure:')
    const tableInfo = dbService.db.prepare(`PRAGMA table_info(tooth_treatments)`).all()
    console.log('Columns:', tableInfo.map(col => col.name))

    console.log('\n🦷 Recent Tooth Treatments:')
    const treatments = dbService.db.prepare(`
      SELECT * FROM tooth_treatments
      ORDER BY created_at DESC
      LIMIT 5
    `).all()

    treatments.forEach(t => {
      console.log(`  Treatment:`)
      Object.keys(t).forEach(key => {
        console.log(`    ${key}: ${t[key]}`)
      })
      console.log('  ---')
    })

    console.log('\n🧪 Recent Lab Orders:')
    const labOrders = dbService.db.prepare(`
      SELECT id, lab_id, patient_id, tooth_treatment_id, tooth_number, service_name, cost, status, created_at
      FROM lab_orders
      ORDER BY created_at DESC
      LIMIT 10
    `).all()

    if (labOrders.length === 0) {
      console.log('  ⚠️ No lab orders found!')
    } else {
      labOrders.forEach(lo => {
        console.log(`  ID: ${lo.id}`)
        console.log(`  Lab: ${lo.lab_id}`)
        console.log(`  Patient: ${lo.patient_id}`)
        console.log(`  Treatment ID: ${lo.tooth_treatment_id}`)
        console.log(`  Tooth: ${lo.tooth_number}`)
        console.log(`  Service: ${lo.service_name}`)
        console.log(`  Cost: ${lo.cost}`)
        console.log(`  Status: ${lo.status}`)
        console.log(`  Created: ${lo.created_at}`)
        console.log('  ---')
      })
    }

    // Check specific treatment
    const specificTreatment = '2d7cf07d-386e-4b35-b4ff-8daf9ec3a69c'
    console.log(`\n🎯 Checking specific treatment: ${specificTreatment}`)

    const treatment = dbService.db.prepare(`
      SELECT * FROM tooth_treatments WHERE id = ?
    `).get(specificTreatment)

    if (treatment) {
      console.log('  ✅ Treatment found:')
      Object.keys(treatment).forEach(key => {
        console.log(`    ${key}: ${treatment[key]}`)
      })
    } else {
      console.log('  ❌ Treatment not found!')
    }

    // Check lab orders for this treatment
    const relatedLabOrders = dbService.db.prepare(`
      SELECT * FROM lab_orders WHERE tooth_treatment_id = ?
    `).all(specificTreatment)

    console.log(`\n🔗 Lab orders for treatment ${specificTreatment}:`)
    if (relatedLabOrders.length === 0) {
      console.log('  ⚠️ No lab orders found for this treatment!')
    } else {
      relatedLabOrders.forEach(lo => {
        console.log(`  Lab Order ID: ${lo.id}`)
        console.log(`  Lab: ${lo.lab_id}`)
        console.log(`  Service: ${lo.service_name}`)
        console.log(`  Cost: ${lo.cost}`)
        console.log('  ---')
      })
    }

    // Check all prosthetic treatments
    console.log('\n🔧 All Prosthetic Treatments:')
    const prostheticTreatments = dbService.db.prepare(`
      SELECT * FROM tooth_treatments
      WHERE treatment_category = 'التعويضات' OR treatment_category LIKE '%تعويض%'
      ORDER BY created_at DESC
    `).all()

    if (prostheticTreatments.length === 0) {
      console.log('  ⚠️ No prosthetic treatments found!')
    } else {
      prostheticTreatments.forEach(t => {
        console.log(`  Prosthetic Treatment:`)
        Object.keys(t).forEach(key => {
          console.log(`    ${key}: ${t[key]}`)
        })

        // Check if this treatment has lab orders
        const hasLabOrders = dbService.db.prepare(`
          SELECT COUNT(*) as count FROM lab_orders WHERE tooth_treatment_id = ?
        `).get(t.id)

        console.log(`    Lab Orders Count: ${hasLabOrders.count}`)
        console.log('  ---')
      })
    }

    dbService.close()
    console.log('\n✅ Database check completed')

  } catch (error) {
    console.error('❌ Error checking database:', error.message)
    console.error(error.stack)
  }

  process.exit(0)
}

// Initialize Electron app
app.whenReady().then(() => {
  checkDatabase()
})

app.on('window-all-closed', () => {
  app.quit()
})
