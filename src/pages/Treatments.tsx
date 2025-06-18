import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Stethoscope, Plus } from 'lucide-react'

export default function Treatments() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Treatments</h1>
          <p className="text-muted-foreground mt-2">
            Manage treatment types, procedures, and pricing
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Treatment
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Treatment Management</CardTitle>
          <CardDescription>
            Configure available treatments and their details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Stethoscope className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Treatment Catalog</h3>
            <p className="text-muted-foreground">
              Treatment management interface will be implemented here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
