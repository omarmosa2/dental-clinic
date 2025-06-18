#!/usr/bin/env node

/**
 * مولد مفاتيح الترخيص - ملف الاختصار
 * يقوم بتشغيل الأداة الأساسية من مجلد tools
 */

const path = require('path')
const { spawn } = require('child_process')

// مسار الأداة الأساسية
const toolPath = path.join(__dirname, 'tools', 'license-generator.js')

// تمرير جميع المعاملات إلى الأداة الأساسية
const args = process.argv.slice(2)

console.log('🔐 تشغيل مولد تراخيص عيادة الأسنان...')
console.log(`📁 المسار: ${toolPath}`)
console.log(`📋 المعاملات: ${args.join(' ')}`)
console.log('')

// تشغيل الأداة الأساسية
const child = spawn('node', [toolPath, ...args], {
  stdio: 'inherit',
  cwd: __dirname
})

child.on('error', (error) => {
  console.error('❌ خطأ في تشغيل الأداة:', error.message)
  process.exit(1)
})

child.on('exit', (code) => {
  process.exit(code)
})
