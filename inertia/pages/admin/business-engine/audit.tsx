import { Head } from '@inertiajs/react'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'

interface AuditLogProps {
  logs: {
    meta: any
    data: Array<{
      id: number
      entityType: string
      entityId: number
      field: string
      oldValue: string | null
      newValue: string
      reason: string | null
      createdAt: string
      changer: { id: number; name: string } | null
    }>
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncate(str: string | null, max = 40) {
  if (!str) return '—'
  return str.length > max ? str.slice(0, max) + '…' : str
}

export default function AuditLogPage({ logs }: AuditLogProps) {
  return (
    <>
      <Head title="Audit Log - Business Engine" />
      <AppLayout>
        <Header>Audit Log</Header>
        <Main>
          <Card>
            <CardHeader>
              <CardTitle>Configuration Change History</CardTitle>
              <CardDescription>
                Every change made through the Business Engine is recorded here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Date</th>
                      <th className="py-2 pr-3 font-medium">Entity</th>
                      <th className="py-2 pr-3 font-medium">Field</th>
                      <th className="py-2 pr-3 font-medium">Old Value</th>
                      <th className="py-2 pr-3 font-medium">New Value</th>
                      <th className="py-2 pr-3 font-medium">Changed By</th>
                      <th className="py-2 pr-3 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.data.map((log) => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge variant="outline" className="text-[10px]">
                            {log.entityType}#{log.entityId}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs">{log.field}</td>
                        <td className="py-2 pr-3 text-muted-foreground max-w-[150px] truncate">
                          {truncate(log.oldValue)}
                        </td>
                        <td className="py-2 pr-3 max-w-[150px] truncate">
                          {log.field === 'all' ? 'Created' : truncate(log.newValue)}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                          {log.changer?.name ?? 'System'}
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground max-w-[150px] truncate">
                          {log.reason ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {logs.data.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No audit logs yet.</p>
              )}

              {/* Pagination */}
              {logs.meta.lastPage > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    Page {logs.meta.currentPage} of {logs.meta.lastPage}
                  </span>
                  <div className="flex gap-2">
                    {logs.meta.currentPage > 1 && (
                      <a
                        href={`?page=${logs.meta.currentPage - 1}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Previous
                      </a>
                    )}
                    {logs.meta.currentPage < logs.meta.lastPage && (
                      <a
                        href={`?page=${logs.meta.currentPage + 1}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Next
                      </a>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </Main>
      </AppLayout>
    </>
  )
}
