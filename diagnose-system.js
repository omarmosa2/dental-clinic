// System diagnosis script
const fs = require('fs')
const path = require('path')

function diagnoseSystem() {
  console.log('🔍 Starting system diagnosis...')
  
  // Check database files
  const userDataPath = 'C:\\Users\\Abdul-Mohsen\\AppData\\Roaming\\dental-clinic-management'
  const dbPath = path.join(userDataPath, 'dental_clinic.db')
  const jsonPath = path.join(userDataPath, 'dental_clinic.json')
  
  console.log('\n📁 Checking database files:')
  console.log('Database path:', dbPath)
  
  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath)
    console.log('✅ SQLite database exists')
    console.log('   Size:', stats.size, 'bytes')
    console.log('   Modified:', stats.mtime)
  } else {
    console.log('❌ SQLite database not found')
  }
  
  if (fs.existsSync(jsonPath)) {
    const stats = fs.statSync(jsonPath)
    console.log('✅ JSON database exists')
    console.log('   Size:', stats.size, 'bytes')
    console.log('   Modified:', stats.mtime)
  } else {
    console.log('❌ JSON database not found')
  }
  
  // Check WAL files
  const walPath = dbPath + '-wal'
  const shmPath = dbPath + '-shm'
  
  console.log('\n📝 Checking WAL files:')
  if (fs.existsSync(walPath)) {
    const stats = fs.statSync(walPath)
    console.log('✅ WAL file exists')
    console.log('   Size:', stats.size, 'bytes')
    console.log('   Modified:', stats.mtime)
  } else {
    console.log('❌ WAL file not found')
  }
  
  if (fs.existsSync(shmPath)) {
    const stats = fs.statSync(shmPath)
    console.log('✅ SHM file exists')
    console.log('   Size:', stats.size, 'bytes')
    console.log('   Modified:', stats.mtime)
  } else {
    console.log('❌ SHM file not found')
  }
  
  // Check backup files
  const backupPath = path.join(userDataPath, 'backups')
  console.log('\n💾 Checking backup directory:')
  console.log('Backup path:', backupPath)
  
  if (fs.existsSync(backupPath)) {
    console.log('✅ Backup directory exists')
    const backupFiles = fs.readdirSync(backupPath)
    console.log('   Backup files:', backupFiles.length)
    backupFiles.forEach(file => {
      const filePath = path.join(backupPath, file)
      const stats = fs.statSync(filePath)
      console.log(`   - ${file} (${stats.size} bytes, ${stats.mtime})`)
    })
  } else {
    console.log('❌ Backup directory not found')
  }
  
  // Check source files
  console.log('\n📄 Checking source files:')
  const sourceFiles = [
    'src/services/databaseService.ts',
    'src/services/databaseService.js',
    'src/services/lowdbService.ts',
    'src/services/lowdbService.js',
    'src/services/autoSaveService.ts',
    'src/services/backupService.ts',
    'electron/main.ts'
  ]
  
  sourceFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} exists`)
    } else {
      console.log(`❌ ${file} not found`)
    }
  })
  
  // Check package.json
  console.log('\n📦 Checking package.json:')
  if (fs.existsSync('package.json')) {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    console.log('✅ package.json exists')
    console.log('   Name:', packageJson.name)
    console.log('   Version:', packageJson.version)
    
    // Check important dependencies
    const importantDeps = ['better-sqlite3', 'lowdb', 'electron', 'uuid']
    console.log('   Dependencies:')
    importantDeps.forEach(dep => {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        console.log(`   ✅ ${dep}: ${packageJson.dependencies[dep]}`)
      } else if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
        console.log(`   ✅ ${dep}: ${packageJson.devDependencies[dep]} (dev)`)
      } else {
        console.log(`   ❌ ${dep}: not found`)
      }
    })
  } else {
    console.log('❌ package.json not found')
  }
  
  console.log('\n🏁 Diagnosis complete!')
}

diagnoseSystem()
