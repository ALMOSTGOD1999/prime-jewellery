import { Head, useForm } from '@inertiajs/react'
import { useState } from 'react'

import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Badge } from '~/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  RupeeCircleIcon,
  CheckmarkCircle01Icon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons'

interface ConfigItem {
  id: number
  key: string
  value: string
  group: string
  label: string
  description: string | null
}

interface GoldBillingPageProps {
  configs: ConfigItem[]
}

const CONFIG_ORDER = [
  'gold_rate_18ct',
  'gold_rate_22ct',
  'gold_rate_24ct',
  'gold_making_charge_percent',
  'gold_gst_percent',
  'gold_hallmark_additional_percent',
]

const CONFIG_LABELS: Record<string, string> = {
  gold_rate_18ct: 'Gold Rate — 18 CT (per gram)',
  gold_rate_22ct: 'Gold Rate — 22 CT (per gram)',
  gold_rate_24ct: 'Gold Rate — 24 CT (per gram)',
  gold_making_charge_percent: 'Making Charge (%)',
  gold_gst_percent: 'GST (%)',
  gold_hallmark_additional_percent: 'Hallmark & Additional (%)',
}

const CONFIG_UNITS: Record<string, string> = {
  gold_rate_18ct: '₹/gm',
  gold_rate_22ct: '₹/gm',
  gold_rate_24ct: '₹/gm',
  gold_making_charge_percent: '%',
  gold_gst_percent: '%',
  gold_hallmark_additional_percent: '%',
}

export default function GoldBillingConfigPage({ configs }: GoldBillingPageProps) {
  const configMap = new Map(configs.map((c) => [c.key, c]))

  const initialData: Record<string, string> = {}
  CONFIG_ORDER.forEach((key) => {
    initialData[key] = configMap.get(key)?.value ?? ''
  })

  const form = useForm(initialData)
  const [saved, setSaved] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    form.post('/admin/config/gold-billing/update', {
      onSuccess: () => {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      },
    })
  }

  return (
    <>
      <Head title="Gold Billing Rates" />
      <AppLayout>
        <Header>Gold Billing Rates</Header>
        <Main className="max-w-3xl mx-auto space-y-6">
          <Alert className="border-amber-200 bg-amber-50/50">
            <HugeiconsIcon icon={InformationCircleIcon} className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">How calculations work</AlertTitle>
            <AlertDescription className="text-amber-700">
              When a user enters gold weight, the system computes: Gold Price = Weight × Rate,
              Making Charges = Gold Price × Making Charge %, GST = (Gold Price + Making) × GST %,
              Hallmark = Weight × Hallmark Charge, Additional = (Gold Price + Making) × Additional
              %, Package Amount = Sum of all.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gold/10">
                  <HugeiconsIcon icon={RupeeCircleIcon} className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <CardTitle>Gold Rate & Charges</CardTitle>
                  <CardDescription>
                    Update rates and percentages used in the gold jewellery billing module
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {CONFIG_ORDER.map((key) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={key} className="text-sm font-medium">
                        {CONFIG_LABELS[key]}
                      </Label>
                      <Badge variant="outline" className="text-xs">
                        {CONFIG_UNITS[key]}
                      </Badge>
                    </div>
                    <div className="relative">
                      <Input
                        id={key}
                        name={key}
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.data[key]}
                        onChange={(e) => form.setData(key, e.target.value)}
                        placeholder="Enter value"
                        className="pr-14"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {CONFIG_UNITS[key]}
                      </span>
                    </div>
                    {form.errors[key] && (
                      <p className="text-xs text-destructive">{form.errors[key]}</p>
                    )}
                  </div>
                ))}

                {saved && (
                  <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3">
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon
                        icon={CheckmarkCircle01Icon}
                        className="h-5 w-5 text-green-600"
                      />
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">
                        Rates updated successfully
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Changes take effect immediately on the billing page.
                  </p>
                  <Button type="submit" disabled={form.processing}>
                    {form.processing ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </Main>
      </AppLayout>
    </>
  )
}
