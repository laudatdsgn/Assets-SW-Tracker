"use client"

import { useEffect, useState } from "react"
import { useSpace } from "@/contexts/space-context"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2, Building2, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Space {
  id: string
  name: string
  description: string | null
  color: string | null
  _count?: {
    assets: number
    software: number
    invoices: number
  }
}

export default function SpacesSettingsPage() {
  const { spaces, refreshSpaces } = useSpace()
  const [spacesWithCounts, setSpacesWithCounts] = useState<Space[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSpace, setEditingSpace] = useState<Space | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#6366f1",
  })
  const { toast } = useToast()

  useEffect(() => {
    async function fetchSpacesWithCounts() {
      try {
        const responses = await Promise.all(
          spaces.map((s) => fetch(`/api/spaces/${s.id}`))
        )
        const data = await Promise.all(
          responses.map((r) => (r.ok ? r.json() : null))
        )
        setSpacesWithCounts(data.filter(Boolean))
      } catch (error) {
        console.error("Failed to fetch space counts:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (spaces.length > 0) {
      fetchSpacesWithCounts()
    } else {
      setIsLoading(false)
    }
  }, [spaces])

  const handleCreate = () => {
    setEditingSpace(null)
    setFormData({ name: "", description: "", color: "#6366f1" })
    setDialogOpen(true)
  }

  const handleEdit = (space: Space) => {
    setEditingSpace(space)
    setFormData({
      name: space.name,
      description: space.description || "",
      color: space.color || "#6366f1",
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    const space = spacesWithCounts.find((s) => s.id === id)
    if (!space) return

    if (
      space._count &&
      (space._count.assets > 0 ||
        space._count.software > 0 ||
        space._count.invoices > 0)
    ) {
      toast({
        title: "Cannot delete",
        description: "Space contains items. Delete or move them first.",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Are you sure you want to delete this space?")) return

    try {
      const response = await fetch(`/api/spaces/${id}`, { method: "DELETE" })
      if (response.ok) {
        refreshSpaces()
        setSpacesWithCounts(spacesWithCounts.filter((s) => s.id !== id))
        toast({
          title: "Deleted",
          description: "Space has been deleted",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete space",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingSpace
        ? `/api/spaces/${editingSpace.id}`
        : "/api/spaces"
      const method = editingSpace ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: editingSpace ? "Updated" : "Created",
          description: `Space has been ${editingSpace ? "updated" : "created"}`,
        })
        setDialogOpen(false)
        refreshSpaces()

        // Refresh counts
        const newSpace = await response.json()
        if (editingSpace) {
          setSpacesWithCounts(
            spacesWithCounts.map((s) =>
              s.id === editingSpace.id ? { ...s, ...newSpace } : s
            )
          )
        } else {
          setSpacesWithCounts([...spacesWithCounts, newSpace])
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save space",
        variant: "destructive",
      })
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
      <PageHeader title="Manage Spaces" description="Create and manage business spaces">
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Space
        </Button>
      </PageHeader>

      <div className="p-6 max-w-3xl">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Space</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Assets</TableHead>
                <TableHead className="text-right">Software</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {spacesWithCounts.map((space) => (
                <TableRow key={space.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: space.color || "#6366f1" }}
                      />
                      <div className="flex items-center gap-1">
                        {space.name === "OSVČ" ? (
                          <User className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{space.name}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {space.description || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {space._count?.assets || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {space._count?.software || 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(space)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(space.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSpace ? "Edit Space" : "Add New Space"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className="h-10 w-14 p-1"
                />
                <Input
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className="flex-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingSpace ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
