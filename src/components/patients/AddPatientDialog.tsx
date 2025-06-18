import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { usePatientStore } from '@/store/patientStore'
import { useToast } from '@/hooks/use-toast'
import type { Patient } from '@/types'

interface AddPatientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface PatientFormData {
  first_name: string
  last_name: string
  date_of_birth?: string
  phone?: string
  email?: string
  address?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  medical_history?: string
  allergies?: string
  insurance_info?: string
  notes?: string
}

export default function AddPatientDialog({ open, onOpenChange }: AddPatientDialogProps) {
  const { createPatient, isLoading } = usePatientStore()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<PatientFormData>()

  const onSubmit = async (data: PatientFormData) => {
    setIsSubmitting(true)
    try {
      await createPatient(data)
      toast({
        title: "Success",
        description: "Patient added successfully",
      })
      reset()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add patient",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Patient</DialogTitle>
          <DialogDescription>
            Enter the patient's information below. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  First Name *
                </label>
                <Input
                  {...register('first_name', { required: 'First name is required' })}
                  placeholder="Enter first name"
                />
                {errors.first_name && (
                  <p className="text-sm text-destructive">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Last Name *
                </label>
                <Input
                  {...register('last_name', { required: 'Last name is required' })}
                  placeholder="Enter last name"
                />
                {errors.last_name && (
                  <p className="text-sm text-destructive">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Date of Birth
                </label>
                <Input
                  type="date"
                  {...register('date_of_birth')}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Phone Number
                </label>
                <Input
                  {...register('phone')}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Email Address
              </label>
              <Input
                type="email"
                {...register('email')}
                placeholder="Enter email address"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Address
              </label>
              <Input
                {...register('address')}
                placeholder="Enter full address"
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Emergency Contact</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Contact Name
                </label>
                <Input
                  {...register('emergency_contact_name')}
                  placeholder="Enter contact name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Contact Phone
                </label>
                <Input
                  {...register('emergency_contact_phone')}
                  placeholder="Enter contact phone"
                />
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Medical Information</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Medical History
              </label>
              <textarea
                {...register('medical_history')}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter medical history"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Allergies
              </label>
              <Input
                {...register('allergies')}
                placeholder="Enter known allergies"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Insurance Information
              </label>
              <Input
                {...register('insurance_info')}
                placeholder="Enter insurance details"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Additional Notes
              </label>
              <textarea
                {...register('notes')}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter any additional notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? 'Adding...' : 'Add Patient'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
