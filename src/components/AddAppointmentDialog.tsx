import React, { useState, useEffect } from 'react'
import { X, Calendar, Clock, User, FileText, DollarSign } from 'lucide-react'
import { Appointment, Patient, Treatment } from '../types'

interface AddAppointmentDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>) => void
  patients: Patient[]
  treatments: Treatment[]
  selectedDate?: Date
  selectedTime?: string
  initialData?: Appointment
}

export default function AddAppointmentDialog({
  isOpen,
  onClose,
  onSave,
  patients,
  treatments,
  selectedDate,
  selectedTime,
  initialData
}: AddAppointmentDialogProps) {
  const [formData, setFormData] = useState({
    patient_id: '',
    treatment_id: '',
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    status: 'scheduled' as const,
    cost: '',
    notes: ''
  })

  useEffect(() => {
    if (initialData) {
      // Populate form with existing appointment data for editing
      setFormData({
        patient_id: initialData.patient_id || '',
        treatment_id: initialData.treatment_id || '',
        title: initialData.title || '',
        description: initialData.description || '',
        start_time: new Date(initialData.start_time).toISOString().slice(0, 16),
        end_time: new Date(initialData.end_time).toISOString().slice(0, 16),
        status: initialData.status || 'scheduled',
        cost: initialData.cost?.toString() || '',
        notes: initialData.notes || ''
      })
    } else if (selectedDate && selectedTime) {
      const startDateTime = new Date(selectedDate)
      const [hours, minutes] = selectedTime.split(':')
      startDateTime.setHours(parseInt(hours), parseInt(minutes))

      const endDateTime = new Date(startDateTime)
      endDateTime.setHours(startDateTime.getHours() + 1) // Default 1 hour duration

      setFormData(prev => ({
        ...prev,
        start_time: startDateTime.toISOString().slice(0, 16),
        end_time: endDateTime.toISOString().slice(0, 16)
      }))
    }
  }, [selectedDate, selectedTime, initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const appointmentData = {
      ...formData,
      cost: formData.cost ? parseFloat(formData.cost) : undefined,
      start_time: new Date(formData.start_time).toISOString(),
      end_time: new Date(formData.end_time).toISOString()
    }

    onSave(appointmentData)

    // Reset form
    setFormData({
      patient_id: '',
      treatment_id: '',
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      status: 'scheduled',
      cost: '',
      notes: ''
    })
    onClose()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Auto-generate title when patient and treatment are selected
    if (name === 'patient_id' || name === 'treatment_id') {
      const patient = patients.find(p => p.id === (name === 'patient_id' ? value : formData.patient_id))
      const treatment = treatments.find(t => t.id === (name === 'treatment_id' ? value : formData.treatment_id))

      if (patient && treatment) {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          title: `${treatment.name} - ${patient.first_name} ${patient.last_name}`,
          cost: treatment.default_cost?.toString() || ''
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }))
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {initialData ? 'تعديل الموعد' : 'إضافة موعد جديد'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Patient and Treatment Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline ml-1" />
                المريض *
              </label>
              <select
                name="patient_id"
                value={formData.patient_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">اختر المريض</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline ml-1" />
                نوع العلاج
              </label>
              <select
                name="treatment_id"
                value={formData.treatment_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">اختر نوع العلاج</option>
                {treatments.map(treatment => (
                  <option key={treatment.id} value={treatment.id}>
                    {treatment.name} - {treatment.default_cost} ريال
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Appointment Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              عنوان الموعد *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="أدخل عنوان الموعد"
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline ml-1" />
                تاريخ ووقت البداية *
              </label>
              <input
                type="datetime-local"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline ml-1" />
                تاريخ ووقت النهاية *
              </label>
              <input
                type="datetime-local"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status and Cost */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                حالة الموعد
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="scheduled">مجدول</option>
                <option value="completed">مكتمل</option>
                <option value="cancelled">ملغي</option>
                <option value="no_show">لم يحضر</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline ml-1" />
                التكلفة (ريال)
              </label>
              <input
                type="number"
                name="cost"
                value={formData.cost}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Description and Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              وصف الموعد
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="أدخل وصف الموعد"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ملاحظات إضافية
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="أي ملاحظات إضافية"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 space-x-reverse pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              حفظ الموعد
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
