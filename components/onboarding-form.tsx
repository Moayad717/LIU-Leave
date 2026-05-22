"use client"

import { useState, useTransition } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
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

export function OnboardingForm({ campuses }: { campuses: Campus[] }) {
  const { update } = useSession()
  const router = useRouter()
  const [campusId, setCampusId] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!campusId) {
      toast.error("Please select your campus.")
      return
    }

    startTransition(async () => {
      const result = await completeOnboarding(campusId)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      await update({})
      window.location.href = "/dashboard"
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="campus">Your campus</Label>
        <Select onValueChange={setCampusId} value={campusId}>
          <SelectTrigger id="campus" className="w-full">
            <SelectValue placeholder="Select a campus..." />
          </SelectTrigger>
          <SelectContent>
            {campuses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={isPending || !campusId}>
        {isPending ? "Saving..." : "Continue"}
      </Button>
    </form>
  )
}
