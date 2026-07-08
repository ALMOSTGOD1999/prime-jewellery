import { Head } from '@inertiajs/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { InformationCircleIcon } from '@hugeicons/core-free-icons'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { columns } from '~/components/withdrawals/columns'
import { WithdrawalsDataTable } from '~/components/withdrawals/data-table'

export default function WithdrawalsIndex({ withdrawals, isPayoutReleased }: any) {
  return (
    <>
      <Head title="Withdrawal History" />
      <AppLayout>
        <Header>Withdrawal History</Header>
        <Main className="space-y-6">
          {!isPayoutReleased && (
            <Alert className="border-amber-200 bg-amber-50/50">
              <HugeiconsIcon icon={InformationCircleIcon} className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Month-end payout pending</AlertTitle>
              <AlertDescription className="text-amber-700">
                Your income, transactions, and Cashback will be visible after the admin processes the
                month-end payout.
              </AlertDescription>
            </Alert>
          )}
          <WithdrawalsDataTable columns={columns} data={withdrawals.data} meta={withdrawals.meta} />
        </Main>
      </AppLayout>
    </>
  )
}
