"use client"

import { useState, useTransition } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { completeOnboarding } from "@/actions/onboarding"
import { toast } from "sonner"

interface Campus {
  id: string
  name: string
}

interface Department {
  id: string
  name: string
}

interface Props {
  campuses: Campus[]
  departments: Department[]
}

export function OnboardingForm({ campuses, departments }: Props) {
  const { update } = useSession()
  const [campusId, setCampusId] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!campusId) { toast.error("Please select your campus."); return }
    if (!departmentId) { toast.error("Please select your department."); return }

    startTransition(async () => {
      const result = await completeOnboarding(campusId, departmentId)
      if (result?.error) { toast.error(result.error); return }
      await update({})
      window.location.href = "/dashboard"
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="campus">Campus</Label>
        <Select onValueChange={setCampusId} value={campusId}>
          <SelectTrigger id="campus" className="w-full">
            <SelectValue placeholder="Select a campus..." />
          </SelectTrigger>
          <SelectContent>
            {campuses.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="department">Department</Label>
        <Select onValueChange={setDepartmentId} value={departmentId}>
          <SelectTrigger id="department" className="w-full">
            <SelectValue placeholder="Select a department..." />
          </SelectTrigger>
          <SelectContent>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isPending || !campusId || !departmentId}
      >
        {isPending ? "Saving..." : "Continue"}
      </Button>
    </form>
  )
}
