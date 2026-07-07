import { Copy01Icon, Share01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useState } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { toast } from 'sonner'
import { formatUserId } from '~/lib/utils'

export function InviteSection({ userId }: { userId: number }) {
  const [refId, setRefId] = useState(formatUserId(userId))

  const getInviteLink = () => `${window.location.origin}/signup?ref=${refId}`

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grow Your Team</CardTitle>
        <CardDescription>
          Share your invite link to add new members directly under you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Ref ID</Label>
          <Input
            type="text"
            value={refId}
            onChange={(e) => setRefId(e.target.value)}
            placeholder="PJ123456"
          />
        </div>

        <div className="space-y-2">
          <Label>Invite Link</Label>
          <div className="flex gap-2">
            <Input readOnly value={getInviteLink()} className="font-mono text-sm" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard
                  .writeText(getInviteLink())
                  .then(() => toast('Invite link copied!'))
                  .catch(() => toast('Failed to copy'))
              }}
            >
              <HugeiconsIcon icon={Copy01Icon} className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const text = `Join my ${leg} team at PRIME Jewellery! Use my invite link to sign up: ${getInviteLink()}`
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
              }}
            >
              <HugeiconsIcon icon={Share01Icon} className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
