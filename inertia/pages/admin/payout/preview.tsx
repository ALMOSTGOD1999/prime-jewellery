import { Head, router, useForm } from '@inertiajs/react'
import { useState, useEffect, useCallback } from 'react'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowLeft02Icon,
  Download04Icon,
  CashIcon,
  Wallet01Icon,
  DollarCircleIcon,
  RefreshIcon,
} from '@hugeicons/core-free-icons'

interface IncomeWallet {
  investmentAmount: number
  returnRate: number
  returnAmount: number
  incomeShare: number
  repurchaseShare: number
  adminShare: number
}

interface WorkingWallet {
  activationCashback: number
  activationSponsor: number
  activationLevel: number
  levelIncome: number
  emiLevelIncome: number
  salary: number
  grossTotal: number
  workingShare: number
  repurchaseShare: number
  adminShare: number
}

interface PayoutUser {
  userId: number
  userCode: string
  userName: string
  incomeWallet: IncomeWallet | null
  workingWallet: WorkingWallet | null
  totalPayout: number
}

interface Props {
  month: string
  users: PayoutUser[]
  summary: {
    totalIncomeWallet: number
    totalWorkingWallet: number
    grandTotal: number
    eligibleUsers: number
  }
  availableMonths: { value: string; label: string }[]
  generatedAt: string | null
}

function fmt(n: number): string {
  return (
    '₹' +
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
  )
}

function fmtShort(n: number): string {
  return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
}

function Field({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={accent ? 'font-semibold text-emerald-600' : 'font-medium'}>{value}</span>
    </div>
  )
}

function UserCard({ user }: { user: PayoutUser }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div>
            <div className="font-medium">
              {user.userName}{' '}
              <span className="text-muted-foreground text-xs">{user.userCode}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 flex gap-3">
              {user.incomeWallet && (
                <span>
                  Income: {fmt(user.incomeWallet.incomeShare)}
                </span>
              )}
              {user.workingWallet && (
                <span>
                  Working: {fmt(user.workingWallet.workingShare)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-base">{fmt(user.totalPayout)}</div>
          <div className="text-xs text-muted-foreground">Total Payout</div>
        </div>
      </button>

      {expanded && (
        <div className="border-t">
          {/* Income Wallet Section */}
          {user.incomeWallet && (
            <div className="p-4 bg-blue-50/30 dark:bg-blue-950/20">
              <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-2 uppercase tracking-wide">
                Income Wallet (Cashback)
              </div>
              <div className="space-y-1.5">
                <Field label="Investment Amount" value={fmt(user.incomeWallet.investmentAmount)} />
                <Field label="Return Rate" value={`${user.incomeWallet.returnRate}%`} />
                <Field label="Return Amount" value={fmt(user.incomeWallet.returnAmount)} />
                <div className="border-t border-blue-200 dark:border-blue-800 my-1" />
                <Field label="→ Income Wallet (70%)" value={fmt(user.incomeWallet.incomeShare)} accent />
                <Field label="→ Repurchase (20%)" value={fmt(user.incomeWallet.repurchaseShare)} />
                <Field label="→ Admin (10%)" value={fmt(user.incomeWallet.adminShare)} />
              </div>
            </div>
          )}

          {/* Working Wallet Section */}
          {user.workingWallet && (
            <div className="p-4 bg-emerald-50/30 dark:bg-emerald-950/20">
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2 uppercase tracking-wide">
                Working Wallet
              </div>
              <div className="space-y-1.5">
                <Field
                  label="Activation Cashback"
                  value={fmt(user.workingWallet.activationCashback)}
                />
                <Field
                  label="Activation Sponsor"
                  value={fmt(user.workingWallet.activationSponsor)}
                />
                <Field
                  label="Activation Level"
                  value={fmt(user.workingWallet.activationLevel)}
                />
                <Field label="Level Income" value={fmt(user.workingWallet.levelIncome)} />
                <Field
                  label="EMI Level Income"
                  value={fmt(user.workingWallet.emiLevelIncome)}
                />
                <Field label="Salary" value={fmt(user.workingWallet.salary)} />
                <div className="border-t border-emerald-200 dark:border-emerald-800 my-1" />
                <Field label="Gross Total" value={fmt(user.workingWallet.grossTotal)} />
                <Field
                  label="→ Working Wallet (70%)"
                  value={fmt(user.workingWallet.workingShare)}
                  accent
                />
                <Field
                  label="→ Repurchase (20%)"
                  value={fmt(user.workingWallet.repurchaseShare)}
                />
                <Field label="→ Admin (10%)" value={fmt(user.workingWallet.adminShare)} />
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export default function PayoutPreview({
  month,
  users,
  summary,
  availableMonths,
  generatedAt,
}: Props) {
  const [showAll, setShowAll] = useState(false)
  const [isGenerating, setIsGenerating] = useState(!generatedAt && users.length === 0)
  const generateForm = useForm({})
  const visibleUsers = showAll ? users : users.slice(0, 50)

  const monthLabel = new Date(month + '-01').toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  // Poll for completion when generating
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`/admin/payout/preview/status?month=${month}`)
      const data = await res.json()
      if (data.ready) {
        setIsGenerating(false)
        router.reload({ only: ['users', 'summary', 'generatedAt'] })
      }
    } catch {
      // ignore fetch errors, keep polling
    }
  }, [month])

  useEffect(() => {
    if (!isGenerating) return
    const interval = setInterval(checkStatus, 5000)
    return () => clearInterval(interval)
  }, [isGenerating, checkStatus])

  function handleMonthChange(value: string) {
    router.get('/admin/payout/preview', { month: value }, { preserveState: true })
  }

  function handleGenerate() {
    setIsGenerating(true)
    generateForm.post(`/admin/payout/preview/generate?month=${month}`, {})
  }

  return (
    <>
      <Head title={`Payout Preview — ${monthLabel}`} />
      <AppLayout>
        <Header>Total Payout Preview</Header>
        <Main className="space-y-6">
          {/* Top bar: back link, month selector, download */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <a
              href="/admin/payout"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <HugeiconsIcon icon={ArrowLeft02Icon} className="h-4 w-4" />
              Back to Payout
            </a>

            <div className="flex items-center gap-3">
              {/* Month selector */}
              <select
                value={month}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm bg-background"
              >
                {availableMonths.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={generateForm.processing}
                variant="default"
                size="sm"
              >
                <HugeiconsIcon icon={RefreshIcon} className={`h-4 w-4 ${generateForm.processing ? 'animate-spin' : ''}`} />
                {generateForm.processing ? 'Generating...' : 'Generate Preview'}
              </Button>

              {/* PDF Download — only when data exists */}
              {users.length > 0 && (
                <a
                  href={`/admin/payout/preview/download?month=${month}`}
                  className="inline-flex items-center gap-2 border rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <HugeiconsIcon icon={Download04Icon} className="h-4 w-4" />
                  Download PDF
                </a>
              )}
            </div>
          </div>

          {/* Generated timestamp */}
          {generatedAt && (
            <p className="text-xs text-muted-foreground">
              Last generated: {new Date(generatedAt).toLocaleString('en-IN')}
            </p>
          )}

          {/* Generating banner */}
          {isGenerating && (
            <div className="flex items-center gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50/50 text-amber-800">
              <HugeiconsIcon icon={RefreshIcon} className="h-5 w-5 animate-spin text-amber-600" />
              <div>
                <div className="font-medium text-sm">Generating payout preview...</div>
                <div className="text-xs text-amber-600">This may take a few minutes. The page will refresh automatically when ready.</div>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          {users.length > 0 && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-blue-200 bg-blue-50/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={CashIcon} className="h-4 w-4 text-blue-600" />
                    <CardTitle className="text-sm text-blue-800">Income Wallet Payout</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700">
                    {fmtShort(summary.totalIncomeWallet)}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-emerald-200 bg-emerald-50/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={Wallet01Icon} className="h-4 w-4 text-emerald-600" />
                    <CardTitle className="text-sm text-emerald-800">Working Wallet Payout</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-700">
                    {fmtShort(summary.totalWorkingWallet)}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={DollarCircleIcon} className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm">Grand Total</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fmtShort(summary.grandTotal)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Eligible Users: {summary.eligibleUsers}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* User List */}
          {users.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <div className="text-muted-foreground">
                  No payout preview generated yet for {monthLabel}.
                </div>
                <p className="text-sm text-muted-foreground">
                  Click "Generate Preview" above to compute the full payout breakdown.
                  This may take a minute for large user bases.
                </p>
                <Button onClick={handleGenerate} disabled={generateForm.processing}>
                  <HugeiconsIcon icon={RefreshIcon} className={`h-4 w-4 ${generateForm.processing ? 'animate-spin' : ''}`} />
                  {generateForm.processing ? 'Generating... please wait' : 'Generate Preview for ' + monthLabel}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {users.length} eligible user{users.length !== 1 ? 's' : ''}
                </h2>
                {users.length > 50 && !showAll && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAll(true)}
                  >
                    Show All ({users.length})
                  </Button>
                )}
              </div>

              {visibleUsers.map((user) => (
                <UserCard key={user.userId} user={user} />
              ))}

              {showAll && users.length > 50 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowAll(false)}
                >
                  Show Less
                </Button>
              )}
            </div>
          )}
        </Main>
      </AppLayout>
    </>
  )
}
