; تكوين الأيقونات والصور للمثبت
; Icons and Images Configuration for Installer

; مسارات الأيقونات
!define ICON_MAIN "assets\icon.ico"
!define ICON_UNINSTALL "assets\icon.ico"
!define ICON_INSTALLER "assets\icon.ico"

; صور المثبت
!define IMAGE_HEADER "assets\header.bmp"
!define IMAGE_WIZARD "assets\wizard.bmp"
!define IMAGE_BANNER "assets\banner.bmp"

; إعدادات الأيقونات
Icon "${ICON_INSTALLER}"
UninstallIcon "${ICON_UNINSTALL}"

; إعدادات صور الواجهة
!define MUI_ICON "${ICON_MAIN}"
!define MUI_UNICON "${ICON_UNINSTALL}"

; صورة الرأس
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "${IMAGE_HEADER}"
!define MUI_HEADERIMAGE_UNBITMAP "${IMAGE_HEADER}"
!define MUI_HEADERIMAGE_RIGHT

; صور صفحات الترحيب والانتهاء
!define MUI_WELCOMEFINISHPAGE_BITMAP "${IMAGE_WIZARD}"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "${IMAGE_WIZARD}"

; إعدادات إضافية للصور
!define MUI_HEADERIMAGE_BITMAP_NOSTRETCH
!define MUI_WELCOMEFINISHPAGE_BITMAP_NOSTRETCH

; دالة إنشاء الأيقونات والاختصارات
Function CreateIcons
  ; إنشاء مجلد في قائمة ابدأ
  CreateDirectory "$SMPROGRAMS\نظام إدارة العيادة السنية"
  
  ; اختصار البرنامج الرئيسي
  CreateShortCut "$SMPROGRAMS\نظام إدارة العيادة السنية\نظام إدارة العيادة السنية.lnk" \
                 "$INSTDIR\dental-clinic.exe" \
                 "" \
                 "$INSTDIR\dental-clinic.exe" \
                 0 \
                 SW_SHOWNORMAL \
                 "" \
                 "نظام شامل لإدارة العيادات السنية"
  
  ; اختصار إلغاء التثبيت
  CreateShortCut "$SMPROGRAMS\نظام إدارة العيادة السنية\إلغاء تثبيت نظام إدارة العيادة السنية.lnk" \
                 "$INSTDIR\uninstall.exe" \
                 "" \
                 "$INSTDIR\uninstall.exe" \
                 0 \
                 SW_SHOWNORMAL \
                 "" \
                 "إلغاء تثبيت نظام إدارة العيادة السنية"
  
  ; اختصار ملف المساعدة
  CreateShortCut "$SMPROGRAMS\نظام إدارة العيادة السنية\دليل المستخدم.lnk" \
                 "$INSTDIR\README-ar.txt" \
                 "" \
                 "$INSTDIR\README-ar.txt" \
                 0 \
                 SW_SHOWNORMAL \
                 "" \
                 "دليل المستخدم والمساعدة"
  
  ; اختصار الموقع الإلكتروني
  WriteINIStr "$SMPROGRAMS\نظام إدارة العيادة السنية\الموقع الإلكتروني.url" \
              "InternetShortcut" \
              "URL" \
              "https://dental-clinic.com"
  
  ; اختصار سطح المكتب
  CreateShortCut "$DESKTOP\نظام إدارة العيادة السنية.lnk" \
                 "$INSTDIR\dental-clinic.exe" \
                 "" \
                 "$INSTDIR\dental-clinic.exe" \
                 0 \
                 SW_SHOWNORMAL \
                 "" \
                 "نظام شامل لإدارة العيادات السنية"
  
  ; اختصار الشريط السريع (إذا كان متاحاً)
  CreateShortCut "$QUICKLAUNCH\نظام إدارة العيادة السنية.lnk" \
                 "$INSTDIR\dental-clinic.exe" \
                 "" \
                 "$INSTDIR\dental-clinic.exe" \
                 0 \
                 SW_SHOWNORMAL \
                 "" \
                 "نظام إدارة العيادة السنية"
FunctionEnd

; دالة حذف الأيقونات والاختصارات
Function un.RemoveIcons
  ; حذف اختصارات قائمة ابدأ
  Delete "$SMPROGRAMS\نظام إدارة العيادة السنية\نظام إدارة العيادة السنية.lnk"
  Delete "$SMPROGRAMS\نظام إدارة العيادة السنية\إلغاء تثبيت نظام إدارة العيادة السنية.lnk"
  Delete "$SMPROGRAMS\نظام إدارة العيادة السنية\دليل المستخدم.lnk"
  Delete "$SMPROGRAMS\نظام إدارة العيادة السنية\الموقع الإلكتروني.url"
  RMDir "$SMPROGRAMS\نظام إدارة العيادة السنية"
  
  ; حذف اختصار سطح المكتب
  Delete "$DESKTOP\نظام إدارة العيادة السنية.lnk"
  
  ; حذف اختصار الشريط السريع
  Delete "$QUICKLAUNCH\نظام إدارة العيادة السنية.lnk"
FunctionEnd

; دالة تسجيل أنواع الملفات
Function RegisterFileTypes
  ; تسجيل امتداد .dcm (Dental Clinic Management)
  WriteRegStr HKCR ".dcm" "" "DentalClinic.DataFile"
  WriteRegStr HKCR "DentalClinic.DataFile" "" "ملف بيانات العيادة السنية"
  WriteRegStr HKCR "DentalClinic.DataFile\DefaultIcon" "" "$INSTDIR\dental-clinic.exe,0"
  WriteRegStr HKCR "DentalClinic.DataFile\shell\open\command" "" '"$INSTDIR\dental-clinic.exe" "%1"'
  
  ; تسجيل امتداد .dcb (Dental Clinic Backup)
  WriteRegStr HKCR ".dcb" "" "DentalClinic.BackupFile"
  WriteRegStr HKCR "DentalClinic.BackupFile" "" "ملف نسخة احتياطية للعيادة السنية"
  WriteRegStr HKCR "DentalClinic.BackupFile\DefaultIcon" "" "$INSTDIR\dental-clinic.exe,1"
  WriteRegStr HKCR "DentalClinic.BackupFile\shell\open\command" "" '"$INSTDIR\dental-clinic.exe" --restore "%1"'
  
  ; تحديث قاعدة بيانات الأيقونات
  System::Call 'shell32.dll::SHChangeNotify(l, l, p, p) v (0x08000000, 0, 0, 0)'
FunctionEnd

; دالة إلغاء تسجيل أنواع الملفات
Function un.UnregisterFileTypes
  ; إلغاء تسجيل امتدادات الملفات
  DeleteRegKey HKCR ".dcm"
  DeleteRegKey HKCR "DentalClinic.DataFile"
  DeleteRegKey HKCR ".dcb"
  DeleteRegKey HKCR "DentalClinic.BackupFile"
  
  ; تحديث قاعدة بيانات الأيقونات
  System::Call 'shell32.dll::SHChangeNotify(l, l, p, p) v (0x08000000, 0, 0, 0)'
FunctionEnd

; دالة إنشاء ملف معلومات التطبيق
Function CreateAppInfo
  ; إنشاء ملف معلومات التطبيق
  FileOpen $0 "$INSTDIR\app-info.txt" w
  FileWrite $0 "نظام إدارة العيادة السنية$\r$\n"
  FileWrite $0 "الإصدار: 1.0.0$\r$\n"
  FileWrite $0 "تاريخ التثبيت: $\r$\n"
  FileWrite $0 "مجلد التثبيت: $INSTDIR$\r$\n"
  FileWrite $0 "معرف التطبيق: com.dentalclinic.management$\r$\n"
  FileWrite $0 "الناشر: فريق تطوير العيادة السنية$\r$\n"
  FileWrite $0 "الموقع الإلكتروني: https://dental-clinic.com$\r$\n"
  FileWrite $0 "الدعم الفني: support@dental-clinic.com$\r$\n"
  FileClose $0
FunctionEnd
