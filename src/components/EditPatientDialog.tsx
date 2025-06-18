import React, { useState, useEffect } from 'react'
import { User, Phone, Mail, Calendar, MapPin, FileText, AlertTriangle } from 'lucide-react'
import { Patient } from '../types'

// shadcn/ui imports
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface EditPatientDialogProps {
  isOpen: boolean
  patient: Patient | null
  onClose: () => void
  onSave: (id: string, patient: Partial<Patient>) => void
}

export default function EditPatientDialog({ isOpen, patient, onClose, onSave }: EditPatientDialogProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    phone: '',
    email: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_history: '',
    allergies: '',
    insurance_info: '',
    notes: ''
  })

  useEffect(() => {
    if (patient) {
      setFormData({
        first_name: patient.first_name || '',
        last_name: patient.last_name || '',
        date_of_birth: patient.date_of_birth || '',
        phone: patient.phone || '',
        email: patient.email || '',
        address: patient.address || '',
        emergency_contact_name: patient.emergency_contact_name || '',
        emergency_contact_phone: patient.emergency_contact_phone || '',
        medical_history: patient.medical_history || '',
        allergies: patient.allergies || '',
        insurance_info: patient.insurance_info || '',
        notes: patient.notes || ''
      })
    }
  }, [patient])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (patient) {
      onSave(patient.id, formData)
      onClose()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (!patient) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تعديل بيانات المريض</DialogTitle>
          <DialogDescription>
            قم بتعديل معلومات المريض أدناه. الحقول المميزة بـ * مطلوبة.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">المعلومات الأساسية</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center space-x-1 space-x-reverse">
                  <User className="w-4 h-4" />
                  <span>الاسم الأول *</span>
                </Label>
                <Input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  placeholder="أدخل الاسم الأول"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center space-x-1 space-x-reverse">
                  <User className="w-4 h-4" />
                  <span>الاسم الأخير *</span>
                </Label>
                <Input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  placeholder="أدخل الاسم الأخير"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center space-x-1 space-x-reverse">
                  <Calendar className="w-4 h-4" />
                  <span>تاريخ الميلاد</span>
                </Label>
                <Input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center space-x-1 space-x-reverse">
                  <Phone className="w-4 h-4" />
                  <span>رقم الهاتف</span>
                </Label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="05xxxxxxxx"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center space-x-1 space-x-reverse">
                  <Mail className="w-4 h-4" />
                  <span>البريد الإلكتروني</span>
                </Label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="example@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center space-x-1 space-x-reverse">
                  <MapPin className="w-4 h-4" />
                  <span>العنوان</span>
                </Label>
                <Input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="أدخل العنوان"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">جهة الاتصال في حالات الطوارئ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم جهة الاتصال</Label>
                <Input
                  type="text"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                  placeholder="اسم جهة الاتصال"
                />
              </div>

              <div className="space-y-2">
                <Label>رقم هاتف الطوارئ</Label>
                <Input
                  type="tel"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleChange}
                  placeholder="05xxxxxxxx"
                />
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">المعلومات الطبية</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center space-x-1 space-x-reverse">
                  <FileText className="w-4 h-4" />
                  <span>التاريخ الطبي</span>
                </Label>
                <Textarea
                  name="medical_history"
                  value={formData.medical_history}
                  onChange={handleChange}
                  rows={3}
                  placeholder="أدخل التاريخ الطبي للمريض"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center space-x-1 space-x-reverse">
                  <AlertTriangle className="w-4 h-4" />
                  <span>الحساسية</span>
                </Label>
                <Textarea
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleChange}
                  rows={2}
                  placeholder="أدخل معلومات الحساسية"
                />
              </div>

              <div className="space-y-2">
                <Label>معلومات التأمين</Label>
                <Input
                  type="text"
                  name="insurance_info"
                  value={formData.insurance_info}
                  onChange={handleChange}
                  placeholder="معلومات التأمين الصحي"
                />
              </div>

              <div className="space-y-2">
                <Label>ملاحظات إضافية</Label>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="أي ملاحظات إضافية"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-end space-x-4 space-x-reverse">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              إلغاء
            </Button>
            <Button type="submit">
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
