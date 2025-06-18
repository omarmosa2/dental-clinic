import React, { useState, useEffect } from 'react'
import { useInventoryStore } from '../store/inventoryStore'
import { useAppointmentStore } from '../store/appointmentStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Calendar,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Edit,
  Trash2,
  Activity,
  Bell,
  RefreshCw,
  Download
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import AddInventoryDialog from '../components/AddInventoryDialog'
import EditInventoryDialog from '../components/EditInventoryDialog'
import ConfirmDeleteInventoryDialog from '../components/ConfirmDeleteInventoryDialog'
import UsageDialog from '../components/UsageDialog'
import InventoryAlerts from '../components/InventoryAlerts'
import UsageHistoryDialog from '../components/UsageHistoryDialog'

export default function Inventory() {
  const { toast } = useToast()
  const [showAddItem, setShowAddItem] = useState(false)
  const [showEditItem, setShowEditItem] = useState(false)
  const [showDeleteItem, setShowDeleteItem] = useState(false)
  const [showUsageDialog, setShowUsageDialog] = useState(false)
  const [showUsageHistory, setShowUsageHistory] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('inventory')

  const {
    items,
    filteredItems,
    isLoading,
    error,
    searchQuery,
    filters,
    categories,
    suppliers,
    totalItems,
    totalValue,
    lowStockCount,
    expiredCount,
    expiringSoonCount,
    loadItems,
    createItem,
    updateItem,
    deleteItem,
    recordUsage,
    setSearchQuery,
    setFilters,
    getLowStockItems,
    getExpiredItems,
    getExpiringSoonItems,
    clearError
  } = useInventoryStore()

  const { appointments, loadAppointments } = useAppointmentStore()

  useEffect(() => {
    loadItems()
    loadAppointments()
  }, [loadItems, loadAppointments])

  // Handler functions
  const handleAddItem = async (data: any) => {
    await createItem(data)
  }

  const handleEditItem = async (id: string, data: any) => {
    await updateItem(id, data)
  }

  const handleDeleteItem = async (id: string) => {
    await deleteItem(id)
  }

  const handleRecordUsage = async (data: any) => {
    await recordUsage(data)
  }

  const handleItemClick = (item: any) => {
    setSelectedItem(item)
    setShowEditItem(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount)
  }

  const getStatusBadge = (item: any) => {
    const today = new Date()

    // Check if expired
    if (item.expiry_date && new Date(item.expiry_date) < today) {
      return <Badge variant="destructive">منتهي الصلاحية</Badge>
    }

    // Check if expiring soon (within 30 days)
    if (item.expiry_date) {
      const expiryDate = new Date(item.expiry_date)
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
        return <Badge variant="secondary">ينتهي قريباً</Badge>
      }
    }

    // Check stock levels
    if (item.quantity === 0) {
      return <Badge variant="destructive">نفد المخزون</Badge>
    } else if (item.quantity <= item.minimum_stock) {
      return <Badge variant="secondary">مخزون منخفض</Badge>
    }

    return <Badge variant="default">متوفر</Badge>
  }

  const StatCard = ({ title, value, icon, color = "blue", trend }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {trend && (
              <div className="flex items-center mt-1">
                {trend > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={`text-xs ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.abs(trend)}%
                </span>
              </div>
            )}
          </div>
          <div className="text-primary text-2xl">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة المخزون</h1>
          <p className="text-muted-foreground mt-2">
            تتبع المواد والمعدات ومستويات المخزون
          </p>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="outline"
            onClick={loadItems}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              // Export inventory data
              if (filteredItems.length === 0) {
                alert('لا توجد بيانات مخزون للتصدير')
                return
              }

              const csvData = filteredItems.map(item => ({
                'الاسم': item.name || '',
                'الوصف': item.description || '',
                'الفئة': item.category || '',
                'الكمية': item.quantity || 0,
                'الوحدة': item.unit || 'قطعة',
                'التكلفة': item.cost_per_unit || 0,
                'الحد الأدنى': item.minimum_stock || 0,
                'تاريخ الانتهاء': item.expiry_date || '',
                'المورد': item.supplier || ''
              }))

              // Create CSV with BOM for Arabic support
              const headers = Object.keys(csvData[0]).join(',')
              const rows = csvData.map(row =>
                Object.values(row).map(value =>
                  `"${String(value).replace(/"/g, '""')}"`
                ).join(',')
              )
              const csvContent = '\uFEFF' + [headers, ...rows].join('\n')

              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
              const link = document.createElement('a')
              link.href = URL.createObjectURL(blob)

              // Generate descriptive filename with date and time
              const now = new Date()
              const dateStr = now.toISOString().split('T')[0] // YYYY-MM-DD
              const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-') // HH-MM-SS
              const fileName = `تقرير_المخزون_${dateStr}_${timeStr}.csv`

              link.download = fileName
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)

              alert(`تم تصدير ${filteredItems.length} عنصر مخزون بنجاح!`)
            }}
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
          <Button onClick={() => setShowAddItem(true)} className="flex items-center space-x-2 space-x-reverse">
            <Plus className="w-4 h-4" />
            <span>إضافة عنصر جديد</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            المخزون
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            التنبيهات
            {(lowStockCount + expiredCount + expiringSoonCount) > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {lowStockCount + expiredCount + expiringSoonCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="إجمالي العناصر"
              value={totalItems}
              icon={<Package />}
              color="blue"
            />
            <StatCard
              title="قيمة المخزون"
              value={formatCurrency(totalValue)}
              icon={<DollarSign />}
              color="green"
            />
            <StatCard
              title="مخزون منخفض"
              value={lowStockCount}
              icon={<AlertTriangle />}
              color="yellow"
            />
            <StatCard
              title="منتهي الصلاحية"
              value={expiredCount + expiringSoonCount}
              icon={<Calendar />}
              color="red"
            />
          </div>

          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="البحث في المخزون..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10"
              />
            </div>

            <div className="flex gap-2 shrink-0">
              <Select
                value={filters.category || 'all'}
                onValueChange={(value) => setFilters({ ...filters, category: value === 'all' ? undefined : value })}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="الفئة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفئات</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? undefined : value as any })}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="in_stock">متوفر</SelectItem>
                  <SelectItem value="low_stock">مخزون منخفض</SelectItem>
                  <SelectItem value="out_of_stock">نفد المخزون</SelectItem>
                  <SelectItem value="expired">منتهي الصلاحية</SelectItem>
                  <SelectItem value="expiring_soon">ينتهي قريباً</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-destructive">خطأ: {error}</p>
              <Button variant="outline" size="sm" onClick={clearError} className="mt-2">
                إغلاق
              </Button>
            </div>
          )}

          {/* Inventory Grid */}
          {!isLoading && !error && (
            <div className="grid gap-4">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">لا توجد عناصر مخزون</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || filters.category || filters.status
                      ? 'لا توجد عناصر تطابق البحث'
                      : 'ابدأ بإضافة عناصر المخزون'
                    }
                  </p>
                  {!searchQuery && !filters.category && !filters.status && (
                    <Button onClick={() => setShowAddItem(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      إضافة عنصر جديد
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map(item => (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-semibold text-foreground">
                              {item.name}
                            </CardTitle>
                            {item.description && (
                              <CardDescription className="mt-1">
                                {item.description}
                              </CardDescription>
                            )}
                          </div>
                          {getStatusBadge(item)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">الكمية:</span>
                            <span className="font-medium">
                              {item.quantity} {item.unit || 'قطعة'}
                            </span>
                          </div>

                          {item.category && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">الفئة:</span>
                              <span>{item.category}</span>
                            </div>
                          )}

                          {item.cost_per_unit && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">التكلفة:</span>
                              <span>{formatCurrency(item.cost_per_unit)}</span>
                            </div>
                          )}

                          {item.expiry_date && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">تاريخ الانتهاء:</span>
                              <span>{new Date(item.expiry_date).toLocaleDateString('ar-SA')}</span>
                            </div>
                          )}

                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">الحد الأدنى:</span>
                            <span>{item.minimum_stock}</span>
                          </div>
                        </div>

                        <div className="flex gap-1 mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setSelectedItem(item)
                              setShowEditItem(true)
                            }}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            تعديل
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedItem(item)
                              setShowUsageDialog(true)
                            }}
                            disabled={item.quantity === 0}
                          >
                            <Activity className="w-3 h-3 mr-1" />
                            استخدام
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedItem(item)
                              setShowUsageHistory(true)
                            }}
                            title="عرض تاريخ الاستخدام"
                          >
                            <Calendar className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedItem(item)
                              setShowDeleteItem(true)
                            }}
                            title="حذف العنصر"
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <InventoryAlerts
            items={items}
            onRefresh={loadItems}
            onItemClick={handleItemClick}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddInventoryDialog
        isOpen={showAddItem}
        onClose={() => setShowAddItem(false)}
        onSave={handleAddItem}
        categories={categories}
        suppliers={suppliers}
      />

      <EditInventoryDialog
        isOpen={showEditItem}
        onClose={() => setShowEditItem(false)}
        onSave={handleEditItem}
        item={selectedItem}
        categories={categories}
        suppliers={suppliers}
      />

      <ConfirmDeleteInventoryDialog
        isOpen={showDeleteItem}
        onClose={() => setShowDeleteItem(false)}
        onConfirm={handleDeleteItem}
        item={selectedItem}
        isLoading={isLoading}
      />

      <UsageDialog
        isOpen={showUsageDialog}
        onClose={() => setShowUsageDialog(false)}
        onSave={handleRecordUsage}
        item={selectedItem}
        appointments={appointments}
      />

      <UsageHistoryDialog
        isOpen={showUsageHistory}
        onClose={() => setShowUsageHistory(false)}
        item={selectedItem}
      />
    </div>
  )
}
