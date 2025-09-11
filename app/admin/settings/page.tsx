'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SystemSettings {
  businessName: string
  operationsPort: number
  emailFrom: string
  backupSchedule: string
  debugMode: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const mockSettings: SystemSettings = {
      businessName: 'Andreas Vibe',
      operationsPort: 8080,
      emailFrom: 'admin@andreasvibe.com',
      backupSchedule: 'daily',
      debugMode: false
    }
    
    setTimeout(() => {
      setSettings(mockSettings)
      setLoading(false)
    }, 1000)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      // In production, this would save to the API
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!settings) return null

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">System Settings</h1>
        <p className="text-muted-foreground">Configure system parameters and operational settings</p>
      </div>

      <div className="grid gap-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Business Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={settings.businessName}
                onChange={(e) => setSettings({...settings, businessName: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="emailFrom">Email From Address</Label>
              <Input
                id="emailFrom"
                type="email"
                value={settings.emailFrom}
                onChange={(e) => setSettings({...settings, emailFrom: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operations Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="operationsPort">WebSocket Operations Port</Label>
              <Input
                id="operationsPort"
                type="number"
                value={settings.operationsPort}
                onChange={(e) => setSettings({...settings, operationsPort: parseInt(e.target.value)})}
              />
              <p className="text-xs text-muted-foreground">Default: 8080. Restart required after change.</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="backupSchedule">Database Backup Schedule</Label>
              <select 
                id="backupSchedule"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={settings.backupSchedule}
                onChange={(e) => setSettings({...settings, backupSchedule: e.target.value})}
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">ADMIN_TOKEN</Label>
                <p className="text-sm font-mono">{process.env.ADMIN_TOKEN ? '✅ Set' : '❌ Missing'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">OPENAI_API_KEY</Label>
                <p className="text-sm font-mono">{process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">POSTGRES_URL</Label>
                <p className="text-sm font-mono">{process.env.POSTGRES_URL ? '✅ Set' : '❌ Missing'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">SMOKE_MODE</Label>
                <p className="text-sm font-mono">{process.env.SMOKE_MODE === '1' ? '⚠️ Enabled' : '✅ Disabled'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="min-w-32">
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  )
}
