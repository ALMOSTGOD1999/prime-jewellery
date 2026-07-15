import { Head, useForm } from '@inertiajs/react'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Badge } from '~/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { cn } from '~/lib/utils'

// ─── Config Input ──────────────────────────────────────────────
function ConfigField({
  label,
  name,
  value,
  onChange,
  type = 'number',
  placeholder,
  hint,
}: {
  label: string
  name: string
  value: string
  onChange: (name: string, value: string) => void
  type?: string
  placeholder?: string
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        className="h-9"
      />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

// ─── Section Card ──────────────────────────────────────────────
function SectionCard({
  title,
  desc,
  children,
  onSubmit,
  processing,
  reason,
}: {
  title: string
  desc?: string
  children: React.ReactNode
  onSubmit: (e: React.FormEvent) => void
  processing?: boolean
  reason?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {desc && <CardDescription>{desc}</CardDescription>}
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {children}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Change Reason</Label>
              <Input name="_reason" placeholder="Why this change?" className="h-9" />
            </div>
            <Button type="submit" size="sm" disabled={processing}>
              Save
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ─── Slab Row ──────────────────────────────────────────────────
function SlabRow({
  slab,
  onEdit,
  onDelete,
  onToggle,
}: {
  slab: any
  onEdit: (s: any) => void
  onDelete: (id: number) => void
  onToggle: (id: number, active: boolean) => void
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        slab.isActive ? 'bg-muted/30' : 'bg-muted/10 opacity-60'
      )}
    >
      <div className="flex-1 grid grid-cols-5 gap-2 text-sm">
        <span className="font-medium">{slab.name}</span>
        <span className="text-muted-foreground">
          ₹{Number(slab.minAmount).toLocaleString('en-IN')} -{' '}
          {slab.maxAmount ? `₹${Number(slab.maxAmount).toLocaleString('en-IN')}` : '∞'}
        </span>
        <span>{slab.monthlyReturnPercent}%/mo</span>
        <span>{slab.maxReturnPercent}% max</span>
        <Badge variant={slab.isActive ? 'default' : 'secondary'}>
          {slab.isActive ? 'Active' : 'Disabled'}
        </Badge>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => onEdit(slab)}>
          Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onToggle(slab.id, !slab.isActive)}>
          {slab.isActive ? 'Disable' : 'Enable'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => onDelete(slab.id)}
        >
          Del
        </Button>
      </div>
    </div>
  )
}

// ─── Level Row ─────────────────────────────────────────────────
function LevelRow({
  level,
  onEdit,
  onToggle,
}: {
  level: any
  onEdit: (l: any) => void
  onToggle: (id: number, active: boolean) => void
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        level.isActive ? 'bg-muted/30' : 'bg-muted/10 opacity-60'
      )}
    >
      <div className="flex-1 grid grid-cols-4 gap-2 text-sm">
        <span className="font-medium">Level {level.level}</span>
        <span>{level.percentage}%</span>
        {level.minDirects != null && (
          <span className="text-muted-foreground">Min {level.minDirects} directs</span>
        )}
        <Badge variant={level.isActive ? 'default' : 'secondary'}>
          {level.isActive ? 'Active' : 'Disabled'}
        </Badge>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => onEdit(level)}>
          Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onToggle(level.id, !level.isActive)}>
          {level.isActive ? 'Disable' : 'Enable'}
        </Button>
      </div>
    </div>
  )
}

// ─── Incentive Row ─────────────────────────────────────────────
function IncentiveRow({
  incentive,
  onEdit,
  onToggle,
}: {
  incentive: any
  onEdit: (i: any) => void
  onToggle: (id: number, active: boolean) => void
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        incentive.isActive ? 'bg-muted/30' : 'bg-muted/10 opacity-60'
      )}
    >
      <div className="flex-1 grid grid-cols-4 gap-2 text-sm">
        <span className="font-medium">{incentive.title}</span>
        <span>Target: ₹{Number(incentive.businessTarget).toLocaleString('en-IN')}</span>
        <span>Reward: ₹{Number(incentive.rewardAmount).toLocaleString('en-IN')}</span>
        <Badge variant={incentive.isActive ? 'default' : 'secondary'}>
          {incentive.isActive ? 'Active' : 'Disabled'}
        </Badge>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={() => onEdit(incentive)}>
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggle(incentive.id, !incentive.isActive)}
        >
          {incentive.isActive ? 'Disable' : 'Enable'}
        </Button>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────
interface Props {
  goldConfig: Record<string, string>
  incomeConfig: Record<string, string>
  cashRewardSlabs: any[]
  membershipLevels: any[]
  levelIncomes: any[]
  performanceIncentives: any[]
  businessRules: Record<string, string>
}

export default function BusinessEngineIndex(props: Props) {
  const goldPost = useForm({ ...props.goldConfig })
  const incomePost = useForm({ ...props.incomeConfig })
  const rulesPost = useForm({ ...props.businessRules })

  const updateGold = (name: string, value: string) => goldPost.setData(name, value)
  const updateIncome = (name: string, value: string) => incomePost.setData(name, value)
  const updateRules = (name: string, value: string) => rulesPost.setData(name, value)
  const slabPost = useForm({
    id: '',
    name: '',
    minAmount: '',
    maxAmount: '',
    monthlyReturnPercent: '',
    maxReturnPercent: '100',
    sortOrder: '',
    isActive: 'true',
    _reason: '',
  })
  const membershipPost = useForm({
    id: '',
    level: '',
    percentage: '',
    isActive: 'true',
    _reason: '',
  })
  const levelPost = useForm({
    id: '',
    level: '',
    percentage: '',
    minDirects: '0',
    isActive: 'true',
    _reason: '',
  })
  const incentivePost = useForm({
    id: '',
    title: '',
    businessTarget: '',
    rewardAmount: '',
    sortOrder: '',
    isActive: 'true',
    _reason: '',
  })

  const handleGoldSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    goldPost.post('/admin/system/advanced/business-engine/gold-config')
  }
  const handleIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    incomePost.post('/admin/system/advanced/business-engine/income-distribution')
  }
  const handleRulesSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    rulesPost.post('/admin/system/advanced/business-engine/business-rules')
  }

  return (
    <>
      <Head title="Business Engine" />
      <AppLayout>
        <Header>Business Engine</Header>
        <Main className="space-y-6">
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="py-3 text-sm text-amber-400">
              Advanced Configuration — All changes are written to the Audit Log and only affect
              future transactions.
            </CardContent>
          </Card>

          <Tabs defaultValue="gold" className="w-full">
            <TabsList className="w-full overflow-x-auto flex-nowrap gap-1 justify-start">
              <TabsTrigger value="gold">Gold Purchase</TabsTrigger>
              <TabsTrigger value="income">Income Distribution</TabsTrigger>
              <TabsTrigger value="slabs">Cash Rewards</TabsTrigger>
              <TabsTrigger value="membership">Membership Levels</TabsTrigger>
              <TabsTrigger value="levels">Level Income</TabsTrigger>
              <TabsTrigger value="incentives">Performance Incentives</TabsTrigger>
              <TabsTrigger value="rules">Business Rules</TabsTrigger>
            </TabsList>

            {/* Gold Purchase Config */}
            <TabsContent value="gold" className="mt-4 space-y-4">
              <SectionCard
                title="Gold Purchase Configuration"
                desc="Configure gold pricing parameters"
                onSubmit={handleGoldSubmit}
                processing={goldPost.processing}
              >
                <div className="grid grid-cols-2 gap-4">
                  <ConfigField
                    label="Jewellery Value %"
                    name="gold_jewellery_value_percent"
                    value={goldPost.data.gold_jewellery_value_percent ?? '70'}
                    onChange={updateGold}
                    hint="Default: 70%"
                  />
                  <ConfigField
                    label="Making Charge %"
                    name="gold_making_charge_percent"
                    value={goldPost.data.gold_making_charge_percent ?? '37.85'}
                    onChange={updateGold}
                    hint="Auto-derived from Jewellery %, GST % and Additional %"
                  />
                  <ConfigField
                    label="GST %"
                    name="gold_gst_percent"
                    value={goldPost.data.gold_gst_percent ?? '3'}
                    onChange={updateGold}
                    hint="Default: 3%"
                  />
                  <ConfigField
                    label="Additional Charge %"
                    name="gold_additional_charge_percent"
                    value={goldPost.data.gold_additional_charge_percent ?? '2'}
                    onChange={updateGold}
                    hint="Default: 2%"
                  />
                  <ConfigField
                    label="Rate Source"
                    name="gold_rate_source"
                    value={goldPost.data.gold_rate_source ?? 'live'}
                    onChange={updateGold}
                    type="text"
                    hint="live or manual"
                  />
                  <ConfigField
                    label="Manual Rate Override"
                    name="gold_rate_manual_override"
                    value={goldPost.data.gold_rate_manual_override ?? ''}
                    onChange={updateGold}
                    hint="Leave empty to use live rate"
                  />
                </div>
              </SectionCard>
            </TabsContent>

            {/* Income Distribution */}
            <TabsContent value="income" className="mt-4 space-y-4">
              <SectionCard
                title="Income Distribution Configuration"
                desc="Wallet distribution percentages"
                onSubmit={handleIncomeSubmit}
                processing={incomePost.processing}
              >
                <div className="grid grid-cols-2 gap-4">
                  <ConfigField
                    label="Repurchase Wallet %"
                    name="repurchase_wallet_percent"
                    value={incomePost.data.repurchase_wallet_percent ?? '20'}
                    onChange={updateIncome}
                    hint="Default: 20%"
                  />
                  <ConfigField
                    label="Admin Charge %"
                    name="admin_charge_percent"
                    value={incomePost.data.admin_charge_percent ?? '10'}
                    onChange={updateIncome}
                    hint="Default: 10%"
                  />
                </div>
              </SectionCard>
            </TabsContent>

            {/* Cash Reward Slabs */}
            <TabsContent value="slabs" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Monthly Cash Reward Slabs</CardTitle>
                  <CardDescription>
                    Investment packages with min/max amount and return rates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {props.cashRewardSlabs.map((s) => (
                    <SlabRow
                      key={s.id}
                      slab={s}
                      onEdit={(slab) =>
                        slabPost.setData({
                          id: String(slab.id),
                          name: slab.name,
                          minAmount: String(slab.minAmount),
                          maxAmount: slab.maxAmount ? String(slab.maxAmount) : '',
                          monthlyReturnPercent: String(slab.monthlyReturnPercent),
                          maxReturnPercent: String(slab.maxReturnPercent),
                          sortOrder: String(slab.sortOrder),
                          isActive: String(slab.isActive),
                          _reason: '',
                        })
                      }
                      onDelete={(id) =>
                        slabPost.post(
                          `/admin/system/advanced/business-engine/cash-reward/${id}/delete`
                        )
                      }
                      onToggle={(id, active) => {
                        const s = props.cashRewardSlabs.find((x) => x.id === id)
                        if (s)
                          slabPost.post('/admin/system/advanced/business-engine/cash-reward', {
                            ...s,
                            isActive: active,
                            id,
                          })
                      }}
                    />
                  ))}
                  {props.cashRewardSlabs.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No slabs configured yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Add/Edit Slab Form */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {slabPost.data.id ? 'Edit Slab' : 'Add New Slab'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      slabPost.post('/admin/system/advanced/business-engine/cash-reward')
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={slabPost.data.name}
                          onChange={(e) => slabPost.setData('name', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Min Amount</Label>
                        <Input
                          type="number"
                          value={slabPost.data.minAmount}
                          onChange={(e) => slabPost.setData('minAmount', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Max Amount</Label>
                        <Input
                          type="number"
                          value={slabPost.data.maxAmount}
                          onChange={(e) => slabPost.setData('maxAmount', e.target.value)}
                          className="h-9"
                          placeholder="Leave empty for no limit"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Monthly Return %</Label>
                        <Input
                          type="number"
                          value={slabPost.data.monthlyReturnPercent}
                          onChange={(e) => slabPost.setData('monthlyReturnPercent', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Max Return %</Label>
                        <Input
                          type="number"
                          value={slabPost.data.maxReturnPercent}
                          onChange={(e) => slabPost.setData('maxReturnPercent', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Sort Order</Label>
                        <Input
                          type="number"
                          value={slabPost.data.sortOrder}
                          onChange={(e) => slabPost.setData('sortOrder', e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Reason</Label>
                        <Input
                          value={slabPost.data._reason}
                          onChange={(e) => slabPost.setData('_reason', e.target.value)}
                          className="h-9"
                          placeholder="Why this change?"
                        />
                      </div>
                      <Button type="submit" size="sm" disabled={slabPost.processing}>
                        {slabPost.data.id ? 'Update' : 'Create'}
                      </Button>
                      {slabPost.data.id && (
                        <Button variant="ghost" size="sm" onClick={() => slabPost.reset()}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Membership Levels */}
            <TabsContent value="membership" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Membership Level Income</CardTitle>
                  <CardDescription>Income percentages per membership level</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {props.membershipLevels.map((l) => (
                    <LevelRow
                      key={l.id}
                      level={l}
                      onEdit={(level) =>
                        membershipPost.setData({
                          id: String(level.id),
                          level: String(level.level),
                          percentage: String(level.percentage),
                          isActive: String(level.isActive),
                          _reason: '',
                        })
                      }
                      onToggle={(id, active) => {
                        const l = props.membershipLevels.find((x) => x.id === id)
                        if (l)
                          membershipPost.post(
                            '/admin/system/advanced/business-engine/membership-level',
                            { ...l, isActive: active, id }
                          )
                      }}
                    />
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {membershipPost.data.id ? 'Edit Level' : 'Add Level'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      membershipPost.post('/admin/system/advanced/business-engine/membership-level')
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-3 gap-4">
                      <ConfigField
                        label="Level"
                        name="level"
                        value={membershipPost.data.level}
                        onChange={(n, v) => membershipPost.setData('level', v)}
                      />
                      <ConfigField
                        label="Percentage"
                        name="percentage"
                        value={membershipPost.data.percentage}
                        onChange={(n, v) => membershipPost.setData('percentage', v)}
                      />
                    </div>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Reason</Label>
                        <Input
                          value={membershipPost.data._reason}
                          onChange={(e) => membershipPost.setData('_reason', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <Button type="submit" size="sm" disabled={membershipPost.processing}>
                        {membershipPost.data.id ? 'Update' : 'Create'}
                      </Button>
                      {membershipPost.data.id && (
                        <Button variant="ghost" size="sm" onClick={() => membershipPost.reset()}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Level Income */}
            <TabsContent value="levels" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Level Income Configuration</CardTitle>
                  <CardDescription>Percentage and qualification rules per level</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {props.levelIncomes.map((l) => (
                    <LevelRow
                      key={l.id}
                      level={l}
                      onEdit={(level) =>
                        levelPost.setData({
                          id: String(level.id),
                          level: String(level.level),
                          percentage: String(level.percentage),
                          minDirects: String(level.minDirects ?? 0),
                          isActive: String(level.isActive),
                          _reason: '',
                        })
                      }
                      onToggle={(id, active) => {
                        const l = props.levelIncomes.find((x) => x.id === id)
                        if (l)
                          levelPost.post('/admin/system/advanced/business-engine/level-income', {
                            ...l,
                            isActive: active,
                            id,
                          })
                      }}
                    />
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {levelPost.data.id ? 'Edit Level' : 'Add Level'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      levelPost.post('/admin/system/advanced/business-engine/level-income')
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-3 gap-4">
                      <ConfigField
                        label="Level"
                        name="level"
                        value={levelPost.data.level}
                        onChange={(n, v) => levelPost.setData('level', v)}
                      />
                      <ConfigField
                        label="Percentage"
                        name="percentage"
                        value={levelPost.data.percentage}
                        onChange={(n, v) => levelPost.setData('percentage', v)}
                      />
                      <ConfigField
                        label="Min Directs"
                        name="minDirects"
                        value={levelPost.data.minDirects}
                        onChange={(n, v) => levelPost.setData('minDirects', v)}
                        hint="Qualification rule"
                      />
                    </div>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Reason</Label>
                        <Input
                          value={levelPost.data._reason}
                          onChange={(e) => levelPost.setData('_reason', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <Button type="submit" size="sm" disabled={levelPost.processing}>
                        {levelPost.data.id ? 'Update' : 'Create'}
                      </Button>
                      {levelPost.data.id && (
                        <Button variant="ghost" size="sm" onClick={() => levelPost.reset()}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Performance Incentives */}
            <TabsContent value="incentives" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Performance Incentives</CardTitle>
                  <CardDescription>Rank-based rewards for business targets</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {props.performanceIncentives.map((p) => (
                    <IncentiveRow
                      key={p.id}
                      incentive={p}
                      onEdit={(inc) =>
                        incentivePost.setData({
                          id: String(inc.id),
                          title: inc.title,
                          businessTarget: String(inc.businessTarget),
                          rewardAmount: String(inc.rewardAmount),
                          sortOrder: String(inc.sortOrder),
                          isActive: String(inc.isActive),
                          _reason: '',
                        })
                      }
                      onToggle={(id, active) => {
                        const inc = props.performanceIncentives.find((x) => x.id === id)
                        if (inc)
                          incentivePost.post(
                            '/admin/system/advanced/business-engine/performance-incentive',
                            { ...inc, isActive: active, id }
                          )
                      }}
                    />
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {incentivePost.data.id ? 'Edit Rank' : 'Add Rank'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      incentivePost.post(
                        '/admin/system/advanced/business-engine/performance-incentive'
                      )
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <ConfigField
                        label="Rank Name"
                        name="title"
                        value={incentivePost.data.title}
                        onChange={(n, v) => incentivePost.setData('title', v)}
                        type="text"
                      />
                      <ConfigField
                        label="Business Target"
                        name="businessTarget"
                        value={incentivePost.data.businessTarget}
                        onChange={(n, v) => incentivePost.setData('businessTarget', v)}
                      />
                      <ConfigField
                        label="Reward Amount"
                        name="rewardAmount"
                        value={incentivePost.data.rewardAmount}
                        onChange={(n, v) => incentivePost.setData('rewardAmount', v)}
                      />
                      <ConfigField
                        label="Sort Order"
                        name="sortOrder"
                        value={incentivePost.data.sortOrder}
                        onChange={(n, v) => incentivePost.setData('sortOrder', v)}
                      />
                    </div>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Reason</Label>
                        <Input
                          value={incentivePost.data._reason}
                          onChange={(e) => incentivePost.setData('_reason', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <Button type="submit" size="sm" disabled={incentivePost.processing}>
                        {incentivePost.data.id ? 'Update' : 'Create'}
                      </Button>
                      {incentivePost.data.id && (
                        <Button variant="ghost" size="sm" onClick={() => incentivePost.reset()}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Business Rules */}
            <TabsContent value="rules" className="mt-4 space-y-4">
              <SectionCard
                title="Business Rules"
                desc="Operational limits and thresholds"
                onSubmit={handleRulesSubmit}
                processing={rulesPost.processing}
              >
                <div className="grid grid-cols-2 gap-4">
                  <ConfigField
                    label="Min Gold Purchase"
                    name="min_gold_purchase_amount"
                    value={rulesPost.data.min_gold_purchase_amount ?? '10000'}
                    onChange={updateRules}
                    hint="Default: ₹10,000"
                  />
                  <ConfigField
                    label="Min Withdrawal"
                    name="min_withdrawal_amount"
                    value={rulesPost.data.min_withdrawal_amount ?? '500'}
                    onChange={updateRules}
                    hint="Default: ₹500"
                  />
                  <ConfigField
                    label="Withdrawal Processing Days"
                    name="withdrawal_processing_days"
                    value={rulesPost.data.withdrawal_processing_days ?? '7'}
                    onChange={updateRules}
                    hint="Default: 7 days"
                  />
                  <ConfigField
                    label="Wallet Transfer Limit"
                    name="wallet_transfer_limit"
                    value={rulesPost.data.wallet_transfer_limit ?? '50000'}
                    onChange={updateRules}
                    hint="Default: ₹50,000/day"
                  />
                  <ConfigField
                    label="Gold Purchase Self Min"
                    name="gold_purchase_self_min"
                    value={rulesPost.data.gold_purchase_self_min ?? '10000'}
                    onChange={updateRules}
                    hint="Default: ₹10,000"
                  />
                  <ConfigField
                    label="Activation Amount"
                    name="activation_amount"
                    value={rulesPost.data.activation_amount ?? '1000'}
                    onChange={updateRules}
                    hint="Default: ₹1,000"
                  />
                  <ConfigField
                    label="Deposit Auto-Approve"
                    name="deposit_auto_approve"
                    value={rulesPost.data.deposit_auto_approve ?? 'false'}
                    onChange={updateRules}
                    type="text"
                    hint="true or false"
                  />
                </div>
              </SectionCard>
            </TabsContent>
          </Tabs>

          {/* Audit Log Link */}
          <Card className="border-dashed">
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Version Control & Audit Log</p>
                <p className="text-xs text-muted-foreground">
                  Every configuration change is recorded with old/new values, timestamp, and reason.
                </p>
              </div>
              <a
                href="/admin/system/advanced/business-engine/audit-log"
                className="text-sm text-primary hover:underline"
              >
                View Audit Log
              </a>
            </CardContent>
          </Card>
        </Main>
      </AppLayout>
    </>
  )
}
