"use client"

import { useState, useTransition } from "react"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { reviewLeaveRequest } from "@/actions/admin"
import { toast } from "sonner"

export function QuickApproveButton({ requestId }: { requestId: string }) {
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (done) return null

  const handleApprove = () => {
    startTransition(async () => {
      const result = await reviewLeaveRequest(requestId, "approve", "")
      if (result?.error) {
        toast.error(result.error)
        return
      }
      setDone(true)
      toast.success("Request approved.")
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
      onClick={handleApprove}
      disabled={isPending}
      title="Quick approve"
    >
      <CheckCircle2 className="w-3.5 h-3.5" />
    </Button>
  )
}
