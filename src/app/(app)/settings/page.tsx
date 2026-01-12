"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Cloud, HardDrive, Plus, Trash2, FolderOpen, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

interface UserSettings {
  defaultCurrency: string
  scanFrequency: number
}

interface CloudStorage {
  id: string
  name: string
  provider: string
  invoiceFolders: Array<{
    id: string
    folderPath: string
    isActive: boolean
  }>
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    defaultCurrency: "CZK",
    scanFrequency: 60,
  })
  const [cloudStorages, setCloudStorages] = useState<CloudStorage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isConnectingOneDrive, setIsConnectingOneDrive] = useState(false)
  const { toast } = useToast()
  const searchParams = useSearchParams()

  const successMessage = searchParams.get("success")
  const errorMessage = searchParams.get("error")

  useEffect(() => {
    async function fetchData() {
      try {
        const [settingsRes, storageRes] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/cloud-storage"),
        ])

        if (settingsRes.ok) {
          const data = await settingsRes.json()
          if (data) {
            setSettings(data)
          }
        }

        if (storageRes.ok) {
          const data = await storageRes.json()
          setCloudStorages(data)
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleConnectOneDrive = async () => {
    setIsConnectingOneDrive(true)
    try {
      const response = await fetch("/api/onedrive/auth")
      const data = await response.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        })
        setIsConnectingOneDrive(false)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate OneDrive connection",
        variant: "destructive",
      })
      setIsConnectingOneDrive(false)
    }
  }

  const handleDisconnectStorage = async (storageId: string, storageName: string) => {
    if (!confirm(`Are you sure you want to disconnect ${storageName}? This will remove all associated invoice folder configurations.`)) {
      return
    }

    try {
      const response = await fetch(`/api/cloud-storage?id=${storageId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setCloudStorages(prev => prev.filter(s => s.id !== storageId))
        toast({
          title: "Disconnected",
          description: `${storageName} has been disconnected`,
        })
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to disconnect storage",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect storage",
        variant: "destructive",
      })
    }
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        toast({
          title: "Saved",
          description: "Settings have been updated",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Settings" description="Manage your preferences and integrations" />

      <div className="p-6 max-w-3xl space-y-6">
        {/* Success/Error Messages */}
        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}
        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>
              Configure default values and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Default Currency</Label>
                <Select
                  value={settings.defaultCurrency}
                  onValueChange={(value) =>
                    setSettings({ ...settings, defaultCurrency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CZK">CZK - Czech Koruna</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scanFrequency">Scan Frequency (minutes)</Label>
                <Select
                  value={String(settings.scanFrequency)}
                  onValueChange={(value) =>
                    setSettings({ ...settings, scanFrequency: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">Every 15 minutes</SelectItem>
                    <SelectItem value="30">Every 30 minutes</SelectItem>
                    <SelectItem value="60">Every hour</SelectItem>
                    <SelectItem value="360">Every 6 hours</SelectItem>
                    <SelectItem value="1440">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>

        {/* Cloud Storage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Cloud Storage
            </CardTitle>
            <CardDescription>
              Connect cloud storage to automatically scan invoice folders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {cloudStorages.length === 0 ? (
              <div className="text-center py-6">
                <HardDrive className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No cloud storage connected
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cloudStorages.map((storage) => (
                  <div
                    key={storage.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {storage.provider === "GOOGLE_DRIVE" ? (
                        <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center">
                          <svg className="h-5 w-5" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                            <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                            <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                            <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                            <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                            <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                            <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                          </svg>
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center">
                          <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none"/>
                          </svg>
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{storage.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {storage.provider === "GOOGLE_DRIVE" ? "Google Drive" : "OneDrive"}
                          {storage.invoiceFolders.length > 0 && (
                            <span className="ml-2">
                              · {storage.invoiceFolders.length} folder(s)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/settings/storage/${storage.id}`}>
                          <FolderOpen className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDisconnectStorage(storage.id, storage.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/api/auth/google-drive">
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                  </svg>
                  Connect Google Drive
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={handleConnectOneDrive}
                disabled={isConnectingOneDrive}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.5 18.5c-2.5 0-4.5-2-4.5-4.5 0-2.1 1.5-3.9 3.4-4.4.3-2.3 2.3-4.1 4.6-4.1 2.1 0 3.9 1.4 4.5 3.3.2 0 .3 0 .5 0 2.2 0 4 1.8 4 4s-1.8 4-4 4H10.5z" fill="#0364B8"/>
                  <path d="M10.5 18.5c-2.5 0-4.5-2-4.5-4.5 0-2.1 1.5-3.9 3.4-4.4.3-2.3 2.3-4.1 4.6-4.1.8 0 1.5.2 2.2.5-1.1.5-2 1.4-2.4 2.5-.2.6-.3 1.2-.3 1.9v.1c-1.7.4-3 1.9-3 3.5 0 2 1.5 3.6 3.4 4h-3.4v.5z" fill="#0078D4"/>
                  <path d="M6 14c0-2.1 1.5-3.9 3.5-4.4C9.8 7.3 11.7 5.5 14 5.5c.8 0 1.5.2 2.2.5-.7.3-1.3.8-1.8 1.4-.4.5-.7 1-.9 1.6-1.7.4-3 1.9-3 3.5 0 1.5.9 2.8 2.2 3.4H6.5c-.3-.6-.5-1.3-.5-1.9z" fill="#1490DF"/>
                  <path d="M3.5 17c-1.4 0-2.5-1.1-2.5-2.5S2.1 12 3.5 12c.2 0 .4 0 .6.1C4.4 10.3 6 9 8 9c.9 0 1.8.3 2.5.8-.6.5-1 1.2-1.3 2C7.4 12.2 6 13.9 6 16v.5c0 .2 0 .3.1.5H3.5z" fill="#28A8EA"/>
                </svg>
                {isConnectingOneDrive ? "Connecting..." : "Connect OneDrive"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Spaces Management */}
        <Card>
          <CardHeader>
            <CardTitle>Spaces</CardTitle>
            <CardDescription>
              Manage your business spaces (OSVČ, s.r.o., etc.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/settings/spaces">
                Manage Spaces
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
