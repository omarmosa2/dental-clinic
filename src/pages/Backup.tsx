import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, Download, Upload } from 'lucide-react'

export default function Backup() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Backup & Restore</h1>
          <p className="text-muted-foreground mt-2">
            Secure your data with automated backups
          </p>
        </div>
        <div className="flex space-x-2">
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Create Backup
          </Button>
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Restore
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Protection</CardTitle>
          <CardDescription>
            Automated backups and data recovery options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">Backup System</h3>
            <p className="text-muted-foreground">
              Backup and restore functionality will be implemented here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
