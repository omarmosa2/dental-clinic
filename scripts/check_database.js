#!/usr/bin/env node

/**
 * Script to check database content for debugging lab orders
 */

const Database = require('better-sqlite3')
const path = require('path')

// Database path
const DB_PATH = 'C:\\Users\\Abdul-Mohsen\\AppData\\Roaming\\dental-clinic-management\\dental_clinic.db'

console.log('🔍 Checking database at:', DB_PATH)

try {
  const db = new Database(DB_PATH, { readonly: true })
  
  console.log('\n📊 Database Tables:')
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
  tables.forEach(table => console.log(`  - ${table.name}`))
  
  // Check tooth_treatments
  console.log('\n🦷 Tooth Treatments:')
  const treatments = db.prepare(`
    SELECT id, patient_id, tooth_number, current_treatment, treatment_category, cost, created_at 
    FROM tooth_treatments 
    ORDER BY created_at DESC 
    LIMIT 10
  `).all()
  
  treatments.forEach(t => {
    console.log(`  ID: ${t.id}`)
    console.log(`  Patient: ${t.patient_id}`)
    console.log(`  Tooth: ${t.tooth_number}`)
    console.log(`  Treatment: ${t.current_treatment}`)
    console.log(`  Category: ${t.treatment_category}`)
    console.log(`  Cost: ${t.cost}`)
    console.log(`  Created: ${t.created_at}`)
    console.log('  ---')
  })
  
  // Check lab_orders
  console.log('\n🧪 Lab Orders:')
  const labOrders = db.prepare(`
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
  
  const treatment = db.prepare(`
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
  const relatedLabOrders = db.prepare(`
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
  const prostheticTreatments = db.prepare(`
    SELECT id, patient_id, tooth_number, current_treatment, treatment_category, cost, created_at 
    FROM tooth_treatments 
    WHERE treatment_category = 'التعويضات'
    ORDER BY created_at DESC
  `).all()
  
  if (prostheticTreatments.length === 0) {
    console.log('  ⚠️ No prosthetic treatments found!')
  } else {
    prostheticTreatments.forEach(t => {
      console.log(`  ID: ${t.id}`)
      console.log(`  Patient: ${t.patient_id}`)
      console.log(`  Tooth: ${t.tooth_number}`)
      console.log(`  Treatment: ${t.current_treatment}`)
      console.log(`  Cost: ${t.cost}`)
      console.log(`  Created: ${t.created_at}`)
      
      // Check if this treatment has lab orders
      const hasLabOrders = db.prepare(`
        SELECT COUNT(*) as count FROM lab_orders WHERE tooth_treatment_id = ?
      `).get(t.id)
      
      console.log(`  Lab Orders: ${hasLabOrders.count}`)
      console.log('  ---')
    })
  }
  
  db.close()
  console.log('\n✅ Database check completed')
  
} catch (error) {
  console.error('❌ Error checking database:', error.message)
  process.exit(1)
}
