#!/usr/bin/env node

/**
 * مولد مفاتيح الترخيص المحسن
 * أداة خاصة بالمطور لتوليد مفاتيح ترخيص مشفرة وآمنة
 *
 * الاستخدام:
 * node tools/license-generator.js --type standard --days 365 --output ./license.key
 * node tools/license-generator.js --type premium --days 730 --features "backup,export" --output ./premium-license.key
 * node tools/license-generator.js --interactive  # للوضع التفاعلي
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const readline = require('readline')
const { v4: uuidv4 } = require('uuid')

// إعدادات الترخيص (يجب أن تطابق التطبيق الرئيسي)
const LICENSE_CONFIG = {
  encryptionKey: 'dental-clinic-license-key-2025-secure-enhanced',
  signatureKey: 'dental-clinic-signature-key-2025-enhanced',
  storageKey: 'dental-clinic-license-storage',
  maxDevices: 1,
  gracePeriodDays: 7,
  warningDays: 7,
  algorithm: 'aes-256-gcm',
  keyDerivationIterations: 100000
}

// License Types
const LICENSE_TYPES = {
  trial: 'trial',
  standard: 'standard',
  premium: 'premium',
  enterprise: 'enterprise'
}

class LicenseGenerator {
  constructor() {
    this.signatureKey = LICENSE_CONFIG.signatureKey
    this.encryptionKey = LICENSE_CONFIG.encryptionKey
  }

  /**
   * توليد مفتاح مشتق من المفتاح الأساسي
   */
  deriveKey(salt) {
    return crypto.pbkdf2Sync(
      this.encryptionKey,
      salt,
      LICENSE_CONFIG.keyDerivationIterations,
      32,
      'sha256'
    )
  }

  /**
   * تشفير البيانات باستخدام AES-256-CBC (محسن للتوافق)
   */
  encryptData(data, salt) {
    const key = this.deriveKey(salt)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex')
    encrypted += cipher.final('hex')

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: '', // لا يُستخدم في CBC
      salt: salt.toString('hex')
    }
  }

  /**
   * توليد التوقيع الرقمي المحسن
   */
  generateSignature(data) {
    const hmac = crypto.createHmac('sha256', this.signatureKey)
    hmac.update(JSON.stringify(data))
    return hmac.digest('hex')
  }

  /**
   * توليد توقيع RSA (اختياري للحماية المتقدمة)
   */
  generateRSASignature(data) {
    // يمكن إضافة RSA لاحقاً للحماية المتقدمة
    return this.generateSignature(data)
  }

  generateLicense(options) {
    const {
      licenseType = 'standard',
      validityDays = 365,
      validityMinutes = null,
      features = [],
      metadata = {},
      customId = null,
      encrypted = true
    } = options

    // التحقق من صحة نوع الترخيص
    if (!Object.values(LICENSE_TYPES).includes(licenseType)) {
      throw new Error(`نوع ترخيص غير صالح. يجب أن يكون أحد: ${Object.values(LICENSE_TYPES).join(', ')}`)
    }

    // حساب مدة الصلاحية - إما بالأيام أو بالدقائق
    let finalValidityDays = validityDays
    if (validityMinutes !== null) {
      finalValidityDays = validityMinutes / (24 * 60) // تحويل الدقائق إلى أيام
    }

    // توليد بيانات الترخيص
    const licenseId = customId || uuidv4()
    const createdAt = new Date().toISOString()
    const salt = crypto.randomBytes(32)

    const licenseData = {
      licenseId,
      licenseType,
      maxDays: finalValidityDays,
      validityMinutes: validityMinutes, // إضافة الدقائق للمرجع
      createdAt,
      features: Array.isArray(features) ? features : features.split(',').map(f => f.trim()),
      metadata: {
        ...metadata,
        generator: 'dental-clinic-license-generator-v2',
        version: '2.0.0',
        validityType: validityMinutes !== null ? 'minutes' : 'days'
      }
    }

    // توليد التوقيع
    const dataForSignature = {
      licenseId: licenseData.licenseId,
      licenseType: licenseData.licenseType,
      maxDays: licenseData.maxDays,
      createdAt: licenseData.createdAt
    }

    const signature = this.generateSignature(dataForSignature)

    // إنشاء كائن الترخيص النهائي
    const finalLicense = {
      ...licenseData,
      signature
    }

    let licenseKey, encryptedData = null

    if (encrypted) {
      // تشفير البيانات
      encryptedData = this.encryptData(finalLicense, salt)

      // إنشاء مفتاح الترخيص المشفر
      const encryptedLicense = {
        version: '2.0',
        type: 'encrypted',
        data: encryptedData.encrypted,
        iv: encryptedData.iv,
        authTag: encryptedData.authTag,
        salt: encryptedData.salt,
        checksum: crypto.createHash('sha256').update(JSON.stringify(finalLicense)).digest('hex')
      }

      licenseKey = Buffer.from(JSON.stringify(encryptedLicense)).toString('base64')
    } else {
      // مفتاح غير مشفر (للتطوير فقط)
      licenseKey = Buffer.from(JSON.stringify(finalLicense)).toString('base64')
    }

    return {
      licenseId,
      licenseData: finalLicense,
      licenseJson: JSON.stringify(finalLicense, null, 2),
      licenseKey,
      encrypted,
      encryptedData,
      createdAt,
      expiresAfterActivation: validityDays
    }
  }

  saveLicenseToFile(license, outputPath) {
    // إنشاء مجلد بتاريخ اليوم داخل مجلد licenses
    const today = new Date()
    const dateFolder = today.toISOString().split('T')[0] // YYYY-MM-DD
    const licenseDir = path.join('licenses', dateFolder)

    // إنشاء المجلد إذا لم يكن موجوداً
    if (!fs.existsSync(licenseDir)) {
      fs.mkdirSync(licenseDir, { recursive: true })
    }

    // تحديث مسار الإخراج ليكون داخل مجلد التاريخ
    const fileName = path.basename(outputPath)
    const finalOutputPath = path.join(licenseDir, fileName)

    // حفظ تنسيق JSON (للتطوير)
    const jsonPath = finalOutputPath + '.json'
    fs.writeFileSync(jsonPath, license.licenseJson)

    // حفظ مفتاح الترخيص (للتوزيع)
    const keyPath = finalOutputPath + '.key'
    fs.writeFileSync(keyPath, license.licenseKey)

    // تحديد نوع المدة للعرض
    const validityDisplay = license.licenseData.validityMinutes !== null
      ? `${license.licenseData.validityMinutes} دقيقة`
      : `${license.licenseData.maxDays} يوم`

    // حفظ معلومات قابلة للقراءة
    const infoPath = finalOutputPath + '.info.txt'
    const info = `
معلومات ترخيص عيادة الأسنان
============================

معرف الترخيص: ${license.licenseId}
نوع الترخيص: ${license.licenseData.licenseType}
مدة الصلاحية: ${validityDisplay}
تاريخ الإنشاء: ${license.createdAt}
الميزات: ${license.licenseData.features.join(', ') || 'الميزات القياسية'}
مشفر: ${license.encrypted ? 'نعم' : 'لا'}
نوع المدة: ${license.licenseData.metadata.validityType === 'minutes' ? 'دقائق' : 'أيام'}

الملفات المُنشأة:
- ${jsonPath} (تنسيق JSON للتطوير)
- ${keyPath} (مفتاح الترخيص للتوزيع)
- ${infoPath} (ملف المعلومات هذا)

تعليمات الاستخدام:
1. وزع ملف .key على العميل
2. يجب على العميل استيراد هذا الملف في التطبيق
3. سيكون الترخيص صالحاً لمدة ${validityDisplay} بعد التفعيل
4. الترخيص مرتبط بأول جهاز يتم تفعيله عليه

ملاحظات الأمان:
- احتفظ بملف JSON آمناً (يحتوي على بيانات الترخيص القابلة للقراءة)
- وزع فقط ملف .key على العملاء
- كل ترخيص يمكن تفعيله على جهاز واحد فقط
- لا يمكن نقل الترخيص بين الأجهزة
- البيانات مشفرة بـ AES-256 مع HMAC-SHA256
`
    fs.writeFileSync(infoPath, info.trim())

    return {
      jsonPath,
      keyPath,
      infoPath,
      dateFolder: licenseDir
    }
  }

  /**
   * الوضع التفاعلي لتوليد الترخيص
   */
  async interactiveMode() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const question = (prompt) => new Promise((resolve) => {
      rl.question(prompt, resolve)
    })

    try {
      console.log('\n🔐 مولد تراخيص عيادة الأسنان - الوضع التفاعلي')
      console.log('=' .repeat(50))

      const licenseType = await question('\n1. نوع الترخيص (trial/standard/premium/enterprise) [standard]: ') || 'standard'

      // اختيار نوع المدة
      const durationType = await question('2. نوع المدة (days/minutes) [days]: ') || 'days'
      let validityDays = 365
      let validityMinutes = null

      if (durationType === 'minutes') {
        validityMinutes = parseInt(await question('   مدة الصلاحية بالدقائق [60]: ') || '60')
        validityDays = validityMinutes / (24 * 60) // للحساب الداخلي
      } else {
        validityDays = parseInt(await question('   مدة الصلاحية بالأيام [365]: ') || '365')
      }

      const features = await question('3. الميزات (مفصولة بفواصل) [اتركها فارغة للميزات القياسية]: ') || ''
      const customId = await question('4. معرف مخصص للترخيص [اتركه فارغ للتوليد التلقائي]: ') || null
      const outputPath = await question('5. مسار الحفظ [interactive-license]: ') || 'interactive-license'

      console.log('\n📋 ملخص الترخيص:')
      console.log(`   النوع: ${licenseType}`)
      if (validityMinutes !== null) {
        console.log(`   المدة: ${validityMinutes} دقيقة`)
      } else {
        console.log(`   المدة: ${validityDays} يوم`)
      }
      console.log(`   الميزات: ${features || 'قياسية'}`)
      console.log(`   المعرف: ${customId || 'تلقائي'}`)
      console.log(`   المسار: ${outputPath}`)

      const confirm = await question('\nهل تريد المتابعة؟ (y/n) [y]: ') || 'y'

      if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
        console.log('تم الإلغاء.')
        return
      }

      const options = {
        licenseType,
        validityDays,
        validityMinutes,
        features: features.split(',').map(f => f.trim()).filter(f => f),
        customId,
        encrypted: true
      }

      console.log('\n🔄 جاري توليد الترخيص...')
      const license = this.generateLicense(options)
      const files = this.saveLicenseToFile(license, outputPath)

      console.log('\n✅ تم توليد الترخيص بنجاح!')
      console.log('\n📁 الملفات المُنشأة:')
      console.log(`   JSON: ${files.jsonPath}`)
      console.log(`   Key:  ${files.keyPath}`)
      console.log(`   Info: ${files.infoPath}`)
      console.log(`\n📋 معرف الترخيص: ${license.licenseId}`)

    } catch (error) {
      console.error('\n❌ خطأ:', error.message)
    } finally {
      rl.close()
    }
  }
}

// واجهة سطر الأوامر
function parseArguments() {
  const args = process.argv.slice(2)
  const options = {}

  // التحقق من الوضع التفاعلي
  if (args.includes('--interactive') || args.includes('-i')) {
    options.interactive = true
    return options
  }

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]
    const value = args[i + 1]

    switch (key) {
      case '--type':
        options.licenseType = value
        break
      case '--days':
        options.validityDays = parseInt(value)
        break
      case '--minutes':
        options.validityMinutes = parseInt(value)
        break
      case '--features':
        options.features = value
        break
      case '--output':
        options.outputPath = value
        break
      case '--id':
        options.customId = value
        break
      case '--no-encrypt':
        options.encrypted = false
        i-- // لا يحتاج قيمة
        break
      case '--help':
      case '-h':
        showHelp()
        process.exit(0)
      default:
        if (key.startsWith('--')) {
          console.error(`خيار غير معروف: ${key}`)
          showHelp()
          process.exit(1)
        }
    }
  }

  return options
}

function showHelp() {
  console.log(`
مولد تراخيص عيادة الأسنان المحسن
===============================

الاستخدام: node tools/license-generator.js [خيارات]

الخيارات:
  --type <نوع>         نوع الترخيص (trial, standard, premium, enterprise)
                       الافتراضي: standard

  --days <رقم>         مدة الصلاحية بالأيام بعد التفعيل
                       الافتراضي: 365

  --minutes <رقم>      مدة الصلاحية بالدقائق بعد التفعيل
                       (يتم استخدامها بدلاً من --days إذا تم تحديدها)

  --features <قائمة>   قائمة الميزات مفصولة بفواصل
                       مثال: "backup,export,reports"

  --output <مسار>      مسار ملف الإخراج (بدون امتداد)
                       الافتراضي: ./licenses/license-<timestamp>

  --id <نص>           معرف ترخيص مخصص (اختياري)
                       الافتراضي: UUID تلقائي

  --no-encrypt        إنشاء ترخيص غير مشفر (للتطوير فقط)

  --interactive, -i   الوضع التفاعلي

  --help, -h          عرض رسالة المساعدة هذه

أمثلة:
  # توليد ترخيص قياسي لسنة واحدة
  node tools/license-generator.js --type standard --days 365 --output license

  # توليد ترخيص مميز لسنتين مع ميزات
  node tools/license-generator.js --type premium --days 730 --features "backup,export,reports" --output premium-license

  # توليد ترخيص تجريبي لـ 30 يوم
  node tools/license-generator.js --type trial --days 30 --output trial-license

  # توليد ترخيص لـ 60 دقيقة (للاختبار)
  node tools/license-generator.js --type trial --minutes 60 --output test-license

  # توليد ترخيص لـ 5 دقائق (للاختبار السريع)
  node tools/license-generator.js --type standard --minutes 5 --output quick-test

  # الوضع التفاعلي
  node tools/license-generator.js --interactive

أنواع التراخيص:
  - trial: تجريبي لـ 30 يوم مع الميزات الأساسية
  - standard: ميزات كاملة للعيادات الصغيرة
  - premium: ميزات متقدمة + دعم أولوية
  - enterprise: جميع الميزات + تكاملات مخصصة

الأمان:
  - التشفير: AES-256-GCM مع PBKDF2
  - التوقيع: HMAC-SHA256
  - ربط الجهاز: بصمة الجهاز الفريدة
  - حماية التلاعب: تحقق من التكامل
`)
}

async function main() {
  try {
    const options = parseArguments()
    const generator = new LicenseGenerator()

    // التحقق من الوضع التفاعلي
    if (options.interactive) {
      await generator.interactiveMode()
      return
    }

    // تعيين القيم الافتراضية
    if (!options.outputPath) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      options.outputPath = `./licenses/license-${timestamp}`
    }

    // تعيين التشفير الافتراضي
    if (options.encrypted === undefined) {
      options.encrypted = true
    }

    console.log('🔐 جاري توليد ترخيص عيادة الأسنان...')
    console.log(`النوع: ${options.licenseType || 'standard'}`)

    if (options.validityMinutes !== null && options.validityMinutes !== undefined) {
      console.log(`المدة: ${options.validityMinutes} دقيقة`)
    } else {
      console.log(`المدة: ${options.validityDays || 365} يوم`)
    }

    console.log(`الميزات: ${options.features || 'الميزات القياسية'}`)
    console.log(`مشفر: ${options.encrypted ? 'نعم' : 'لا'}`)
    console.log('')

    const license = generator.generateLicense(options)
    const files = generator.saveLicenseToFile(license, options.outputPath)

    console.log('✅ تم توليد الترخيص بنجاح!')
    console.log('')
    console.log('📁 الملفات المُنشأة:')
    console.log(`   JSON: ${files.jsonPath}`)
    console.log(`   Key:  ${files.keyPath}`)
    console.log(`   Info: ${files.infoPath}`)
    console.log('')
    console.log('🚀 الخطوات التالية:')
    console.log(`   1. وزع ${files.keyPath} على العميل`)
    console.log('   2. يستورد العميل ملف .key في التطبيق')
    console.log(`   3. سيكون الترخيص صالحاً لمدة ${license.expiresAfterActivation} يوم بعد التفعيل`)
    console.log('')
    console.log(`📋 معرف الترخيص: ${license.licenseId}`)

  } catch (error) {
    console.error('❌ خطأ في توليد الترخيص:', error.message)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { LicenseGenerator }
