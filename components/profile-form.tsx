"use client"

import { useState, useTransition } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateProfile } from "@/actions/profile"
import { toast } from "sonner"
import { Building, BookOpen } from "lucide-react"

interface Props {
  campuses: { id: string; name: string }[]
  departments: { id: string; name: string }[]
  currentCampusId: string
  currentDepartmentId: string
}

export function ProfileForm({ campuses, departments, currentCampusId, currentDepartmentId }: Props) {
  const { update } = useSession()
  const [campusId, setCampusId] = useState(currentCampusId)
  const [departmentId, setDepartmentId] = useState(currentDepartmentId)
  const [isPending, startTransition] = useTransition()

  const unchanged = campusId === currentCampusId && departmentId === currentDepartmentId

  const handleSave = () => {
    if (!campusId || !departmentId) {
      toast.error("Please select both a campus and department.")
      return
    }
    startTransition(async () => {
      const result = await updateProfile(campusId, departmentId)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      await update()
      toast.success("Profile updated.")
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Campus &amp; Department</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="campus" className="flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-muted-foreground" />
            Campus
          </Label>
          <Select value={campusId} onValueChange={setCampusId} disabled={isPending}>
            <SelectTrigger id="campus">
              <SelectValue placeholder="Select campus" />
            </SelectTrigger>
            <SelectContent>
              {campuses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="department" className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
            Department
          </Label>
          <Select value={departmentId} onValueChange={setDepartmentId} disabled={isPending}>
            <SelectTrigger id="department">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isPending || unchanged || !campusId || !departmentId}
          >
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
