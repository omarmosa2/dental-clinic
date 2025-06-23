; تكوين واجهة المستخدم الحديثة للمثبت
; Modern UI Configuration for Arabic Installer

!include "MUI2.nsh"

; إعدادات الواجهة الحديثة
!define MUI_CUSTOMFUNCTION_GUIINIT myGUIInit

; ألوان وتصميم حديث
!define MUI_BGCOLOR 0xF8F9FA
!define MUI_TEXTCOLOR 0x212529
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "assets\header.bmp"
!define MUI_HEADERIMAGE_RIGHT
!define MUI_WELCOMEFINISHPAGE_BITMAP "assets\wizard.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "assets\wizard.bmp"

; إعدادات الخط للغة العربية
!define MUI_FONT "Tahoma"
!define MUI_FONTSIZE 9

; تخصيص النصوص
!define MUI_WELCOMEPAGE_TITLE_3LINES
!define MUI_FINISHPAGE_TITLE_3LINES

; إعدادات متقدمة للواجهة
!define MUI_COMPONENTSPAGE_SMALLDESC
!define MUI_FINISHPAGE_NOAUTOCLOSE
!define MUI_UNFINISHPAGE_NOAUTOCLOSE

; تخصيص الأزرار
!define MUI_BUTTONTEXT_NEXT "&التالي >"
!define MUI_BUTTONTEXT_BACK "< &السابق"
!define MUI_BUTTONTEXT_CANCEL "&إلغاء"
!define MUI_BUTTONTEXT_CLOSE "&إغلاق"
!define MUI_BUTTONTEXT_FINISH "&إنهاء"

; نصوص مخصصة للصفحات
!define MUI_TEXT_WELCOME_INFO_TITLE "مرحباً بك في معالج تثبيت $(^NameDA)"
!define MUI_TEXT_WELCOME_INFO_TEXT "سيقوم هذا المعالج بإرشادك خلال تثبيت $(^NameDA).$\r$\n$\r$\nيُنصح بإغلاق جميع التطبيقات الأخرى قبل بدء التثبيت. هذا سيمكن المعالج من تحديث ملفات النظام ذات الصلة دون الحاجة لإعادة تشغيل الكمبيوتر.$\r$\n$\r$\nانقر التالي للمتابعة."

!define MUI_TEXT_LICENSE_TITLE "اتفاقية الترخيص"
!define MUI_TEXT_LICENSE_SUBTITLE "يرجى مراجعة شروط الترخيص قبل تثبيت $(^NameDA)."

!define MUI_TEXT_COMPONENTS_TITLE "اختيار المكونات"
!define MUI_TEXT_COMPONENTS_SUBTITLE "اختر المكونات التي تريد تثبيتها من $(^NameDA)."

!define MUI_TEXT_DIRECTORY_TITLE "اختيار موقع التثبيت"
!define MUI_TEXT_DIRECTORY_SUBTITLE "اختر المجلد الذي تريد تثبيت $(^NameDA) فيه."

!define MUI_TEXT_INSTALLING_TITLE "جاري التثبيت"
!define MUI_TEXT_INSTALLING_SUBTITLE "يرجى الانتظار بينما يتم تثبيت $(^NameDA)."

!define MUI_TEXT_FINISH_TITLE "اكتمل التثبيت"
!define MUI_TEXT_FINISH_SUBTITLE "تم تثبيت $(^NameDA) بنجاح."

!define MUI_TEXT_ABORT_TITLE "تم إلغاء التثبيت"
!define MUI_TEXT_ABORT_SUBTITLE "لم يكتمل التثبيت."

; نصوص إلغاء التثبيت
!define MUI_UNTEXT_WELCOME_INFO_TITLE "مرحباً بك في معالج إلغاء تثبيت $(^NameDA)"
!define MUI_UNTEXT_WELCOME_INFO_TEXT "سيقوم هذا المعالج بإرشادك خلال إلغاء تثبيت $(^NameDA).$\r$\n$\r$\nقبل بدء إلغاء التثبيت، تأكد من أن $(^NameDA) غير قيد التشغيل.$\r$\n$\r$\nانقر التالي للمتابعة."

!define MUI_UNTEXT_CONFIRM_TITLE "إلغاء تثبيت $(^NameDA)"
!define MUI_UNTEXT_CONFIRM_SUBTITLE "إزالة $(^NameDA) من جهاز الكمبيوتر."

!define MUI_UNTEXT_UNINSTALLING_TITLE "جاري إلغاء التثبيت"
!define MUI_UNTEXT_UNINSTALLING_SUBTITLE "يرجى الانتظار بينما يتم إلغاء تثبيت $(^NameDA)."

!define MUI_UNTEXT_FINISH_TITLE "اكتمل إلغاء التثبيت"
!define MUI_UNTEXT_FINISH_SUBTITLE "تم إلغاء تثبيت $(^NameDA) بنجاح."

; دالة تهيئة الواجهة
Function myGUIInit
  ; تطبيق إعدادات RTL للغة العربية
  System::Call "kernel32::GetUserDefaultLangID() i .r0"
  IntCmp $0 1025 arabic_detected
  IntCmp $0 2049 arabic_detected
  IntCmp $0 3073 arabic_detected
  IntCmp $0 4097 arabic_detected
  IntCmp $0 5121 arabic_detected
  Goto end_arabic_check
  
  arabic_detected:
    ; تطبيق تخطيط RTL
    System::Call "user32::SetProcessDefaultLayout(i 1)"
    
  end_arabic_check:
FunctionEnd

; تخصيص صفحة المكونات
!macro CUSTOM_COMPONENTS_PAGE
  !insertmacro MUI_HEADER_TEXT "اختيار المكونات" "اختر المكونات التي تريد تثبيتها"
  
  ; المكون الرئيسي
  Section "البرنامج الأساسي" SEC_MAIN
    SectionIn RO
    SetDetailsPrint textonly
    DetailPrint "تثبيت الملفات الأساسية..."
    SetDetailsPrint listonly
  SectionEnd
  
  ; مكونات إضافية
  Section "ملفات المساعدة" SEC_HELP
    SetDetailsPrint textonly
    DetailPrint "تثبيت ملفات المساعدة..."
    SetDetailsPrint listonly
  SectionEnd
  
  Section "اختصارات سطح المكتب" SEC_DESKTOP
    SetDetailsPrint textonly
    DetailPrint "إنشاء اختصارات سطح المكتب..."
    SetDetailsPrint listonly
  SectionEnd
  
  ; أوصاف المكونات
  LangString DESC_SEC_MAIN ${LANG_ARABIC} "الملفات الأساسية المطلوبة لتشغيل البرنامج"
  LangString DESC_SEC_HELP ${LANG_ARABIC} "ملفات المساعدة والتوثيق"
  LangString DESC_SEC_DESKTOP ${LANG_ARABIC} "إنشاء اختصارات على سطح المكتب وقائمة ابدأ"
  
  !insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
    !insertmacro MUI_DESCRIPTION_TEXT ${SEC_MAIN} $(DESC_SEC_MAIN)
    !insertmacro MUI_DESCRIPTION_TEXT ${SEC_HELP} $(DESC_SEC_HELP)
    !insertmacro MUI_DESCRIPTION_TEXT ${SEC_DESKTOP} $(DESC_SEC_DESKTOP)
  !insertmacro MUI_FUNCTION_DESCRIPTION_END
!macroend

; تخصيص صفحة الانتهاء
!macro CUSTOM_FINISH_PAGE
  !define MUI_FINISHPAGE_RUN_TEXT "تشغيل نظام إدارة العيادة السنية"
  !define MUI_FINISHPAGE_RUN_FUNCTION "LaunchApplication"
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "عرض ملف اقرأني"
  !define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\README-ar.txt"
  !define MUI_FINISHPAGE_LINK "زيارة موقعنا الإلكتروني"
  !define MUI_FINISHPAGE_LINK_LOCATION "https://dental-clinic.com"
!macroend

; دالة تشغيل التطبيق
Function LaunchApplication
  ExecShell "" "$INSTDIR\dental-clinic.exe"
FunctionEnd
