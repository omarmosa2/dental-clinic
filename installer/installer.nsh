; ملف تخصيص المثبت للغة العربية
; Arabic Installer Customization for Dental Clinic Management System

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "WinMessages.nsh"

; تعريف المتغيرات
!define PRODUCT_NAME "نظام إدارة العيادة السنية"
!define PRODUCT_VERSION "2.1.4"
!define PRODUCT_PUBLISHER "فريق تطوير العيادة السنية"
!define PRODUCT_WEB_SITE "https://dental-clinic.com"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\dental-clinic.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define PRODUCT_UNINST_ROOT_KEY "HKLM"

; إعدادات عامة
Name "${PRODUCT_NAME}"
OutFile "${PRODUCT_NAME}-${PRODUCT_VERSION}-Setup.exe"
InstallDir "$PROGRAMFILES\${PRODUCT_NAME}"
InstallDirRegKey HKLM "${PRODUCT_DIR_REGKEY}" ""
ShowInstDetails show
ShowUnInstDetails show

; إعدادات واجهة المستخدم الحديثة
!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

; صفحة الترحيب
!define MUI_WELCOMEPAGE_TITLE "مرحباً بك في معالج تثبيت ${PRODUCT_NAME}"
!define MUI_WELCOMEPAGE_TEXT "سيقوم هذا المعالج بإرشادك خلال عملية تثبيت ${PRODUCT_NAME}.$\r$\n$\r$\nيُنصح بإغلاق جميع التطبيقات الأخرى قبل المتابعة. هذا سيمكن المعالج من تحديث ملفات النظام ذات الصلة دون الحاجة لإعادة تشغيل الكمبيوتر.$\r$\n$\r$\nانقر التالي للمتابعة."

; صفحة الترخيص
!define MUI_LICENSEPAGE_TEXT_TOP "يرجى مراجعة شروط الترخيص التالية قبل تثبيت ${PRODUCT_NAME}."
!define MUI_LICENSEPAGE_TEXT_BOTTOM "إذا كنت توافق على جميع شروط الاتفاقية، انقر أوافق للمتابعة. يجب أن توافق على الاتفاقية لتثبيت ${PRODUCT_NAME}."
!define MUI_LICENSEPAGE_BUTTON "&أوافق"

; صفحة اختيار المجلد
!define MUI_DIRECTORYPAGE_TEXT_TOP "سيقوم المعالج بتثبيت ${PRODUCT_NAME} في المجلد التالي.$\r$\n$\r$\nللتثبيت في مجلد مختلف، انقر استعراض واختر مجلداً آخر. انقر التالي للمتابعة."
!define MUI_DIRECTORYPAGE_TEXT_DESTINATION "مجلد الوجهة"

; صفحة التثبيت
!define MUI_INSTFILESPAGE_FINISHHEADER_TEXT "اكتمل التثبيت"
!define MUI_INSTFILESPAGE_FINISHHEADER_SUBTEXT "تم تثبيت ${PRODUCT_NAME} بنجاح."
!define MUI_INSTFILESPAGE_ABORTHEADER_TEXT "تم إلغاء التثبيت"
!define MUI_INSTFILESPAGE_ABORTHEADER_SUBTEXT "لم يكتمل التثبيت."

; صفحة الانتهاء
!define MUI_FINISHPAGE_TITLE "اكتمل تثبيت ${PRODUCT_NAME}"
!define MUI_FINISHPAGE_TEXT "تم تثبيت ${PRODUCT_NAME} على جهاز الكمبيوتر الخاص بك.$\r$\n$\r$\nانقر إنهاء لإغلاق هذا المعالج."
!define MUI_FINISHPAGE_RUN "$INSTDIR\dental-clinic.exe"
!define MUI_FINISHPAGE_RUN_TEXT "تشغيل ${PRODUCT_NAME}"
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\README.txt"
!define MUI_FINISHPAGE_SHOWREADME_TEXT "عرض ملف اقرأني"

; صفحات المثبت
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "license-ar.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; صفحات إلغاء التثبيت
!define MUI_UNWELCOMEPAGE_TEXT "سيقوم هذا المعالج بإرشادك خلال عملية إلغاء تثبيت ${PRODUCT_NAME}.$\r$\n$\r$\nقبل البدء في إلغاء التثبيت، تأكد من أن ${PRODUCT_NAME} غير قيد التشغيل.$\r$\n$\r$\nانقر التالي للمتابعة."
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; اللغات
!insertmacro MUI_LANGUAGE "Arabic"
!insertmacro MUI_LANGUAGE "English"

; معلومات الإصدار
VIProductVersion "1.0.0.0"
VIAddVersionKey /LANG=${LANG_ARABIC} "ProductName" "${PRODUCT_NAME}"
VIAddVersionKey /LANG=${LANG_ARABIC} "Comments" "نظام شامل لإدارة العيادات السنية"
VIAddVersionKey /LANG=${LANG_ARABIC} "CompanyName" "${PRODUCT_PUBLISHER}"
VIAddVersionKey /LANG=${LANG_ARABIC} "LegalTrademarks" "${PRODUCT_NAME} هو علامة تجارية لـ ${PRODUCT_PUBLISHER}"
VIAddVersionKey /LANG=${LANG_ARABIC} "LegalCopyright" "© ${PRODUCT_PUBLISHER}"
VIAddVersionKey /LANG=${LANG_ARABIC} "FileDescription" "${PRODUCT_NAME}"
VIAddVersionKey /LANG=${LANG_ARABIC} "FileVersion" "${PRODUCT_VERSION}"

; دالة التثبيت الرئيسية
Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite ifnewer
  
  ; نسخ الملفات
  File /r "${BUILD_RESOURCES_DIR}\*.*"
  
  ; إنشاء اختصارات
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\dental-clinic.exe"
  CreateShortCut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\dental-clinic.exe"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\إلغاء تثبيت ${PRODUCT_NAME}.lnk" "$INSTDIR\uninst.exe"
  
  ; تسجيل في النظام
  WriteRegStr HKLM "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\dental-clinic.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayName" "$(^Name)"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninst.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\dental-clinic.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
SectionEnd

; دالة إلغاء التثبيت
Section Uninstall
  ; حذف الاختصارات
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\إلغاء تثبيت ${PRODUCT_NAME}.lnk"
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  
  RMDir "$SMPROGRAMS\${PRODUCT_NAME}"
  
  ; حذف الملفات
  RMDir /r "$INSTDIR"
  
  ; حذف مفاتيح التسجيل
  DeleteRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKLM "${PRODUCT_DIR_REGKEY}"
  
  SetAutoClose true
SectionEnd

; دالة التهيئة
Function .onInit
  ; تحديد اللغة الافتراضية
  !insertmacro MUI_LANGDLL_DISPLAY
FunctionEnd

Function un.onInit
  !insertmacro MUI_UNGETLANGUAGE
FunctionEnd
