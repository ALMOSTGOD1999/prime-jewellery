import { InferPageProps } from '@adonisjs/inertia/types'
import { Head, useForm } from '@inertiajs/react'
import { FormEvent, useState } from 'react'
import {
  Building03Icon,
  CreditCardIcon,
  BankIcon,
  Loading01Icon,
  QrCodeIcon,
  FloppyDiskIcon,
  Upload01Icon,
  UserIcon,
  AlertCircleIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Image } from '~/components/ui/image'
import { route } from '@izzyjs/route/client'

import type SettingsController from '#controllers/settings_controller'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Field, FieldError, FieldLabel } from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemPreview,
  FileUploadList,
} from '~/components/ui/file-upload'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'

export default function BankPage({ bank }: InferPageProps<SettingsController, 'bankPage'>) {
  const [qrPreview, setQrPreview] = useState<string | null>(null)
  const isApproved = !!bank?.approvedAt

  const form = useForm({
    name: bank?.name || '',
    branch: bank?.branch || '',
    ifsc: bank?.ifsc || '',
    holderName: bank?.holderName || '',
    accountNumber: bank?.accountNumber || '',
    upi: bank?.upi || '',
    qr: null as File | null,
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    form.post(route('settings.bank').toString(), {
      forceFormData: true,
      preserveScroll: true,
    })
  }

  return (
    <>
      <Head title="Bank Details" />
      <AppLayout>
        <Header>Bank Details</Header>
        <Main className="space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {bank &&
              (isApproved ? (
                <Alert variant="default" className="bg-primary/10 border-primary/20">
                  <HugeiconsIcon icon={BankIcon} className="h-4 w-4" />
                  <AlertTitle>Bank Details Approved</AlertTitle>
                  <AlertDescription>
                    Your bank details have been approved by the administrator. You cannot change
                    them anymore. If you need to update your details, please contact admin.
                  </AlertDescription>
                </Alert>
              ) : bank.rejectedAt ? (
                <Alert variant="destructive">
                  <HugeiconsIcon icon={AlertCircleIcon} className="h-4 w-4" />
                  <AlertTitle>Bank Details Rejected</AlertTitle>
                  <AlertDescription>
                    Your bank details were rejected. Please review the details and submit again.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="default" className="bg-yellow-500/10 border-yellow-500/20">
                  <HugeiconsIcon
                    icon={Loading01Icon}
                    className="h-4 w-4 text-yellow-600 animate-spin"
                  />
                  <AlertTitle className="text-yellow-700">Pending Approval</AlertTitle>
                  <AlertDescription className="text-yellow-600">
                    Your bank details are currently pending approval. You can update them until they
                    are approved.
                  </AlertDescription>
                </Alert>
              ))}

            <form onSubmit={handleSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle>Bank Information</CardTitle>
                  <CardDescription>Provide your bank account details for payouts.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Bank Name */}
                    <Field className="gap-2" data-invalid={!!form.errors.name}>
                      <FieldLabel htmlFor="name">
                        <HugeiconsIcon icon={BankIcon} className="w-4 h-4 inline mr-1" />
                        Bank Name
                      </FieldLabel>
                      <Input
                        id="name"
                        placeholder="e.g. Indian Bank"
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        disabled={isApproved}
                      />
                      {form.errors.name && <FieldError errors={[{ message: form.errors.name }]} />}
                    </Field>

                    {/* Branch */}
                    <Field className="gap-2" data-invalid={!!form.errors.branch}>
                      <FieldLabel htmlFor="branch">
                        <HugeiconsIcon icon={Building03Icon} className="w-4 h-4 inline mr-1" />
                        Branch Name
                      </FieldLabel>
                      <Input
                        id="branch"
                        placeholder="e.g. Babla"
                        value={form.data.branch}
                        onChange={(e) => form.setData('branch', e.target.value)}
                        disabled={isApproved}
                      />
                      {form.errors.branch && (
                        <FieldError errors={[{ message: form.errors.branch }]} />
                      )}
                    </Field>

                    {/* IFSC */}
                    <Field className="gap-2" data-invalid={!!form.errors.ifsc}>
                      <FieldLabel htmlFor="ifsc">IFSC Code</FieldLabel>
                      <Input
                        id="ifsc"
                        placeholder="e.g. IDIB000B512"
                        value={form.data.ifsc}
                        onChange={(e) => form.setData('ifsc', e.target.value)}
                        disabled={isApproved}
                      />
                      {form.errors.ifsc && <FieldError errors={[{ message: form.errors.ifsc }]} />}
                    </Field>

                    {/* Holder Name */}
                    <Field className="gap-2" data-invalid={!!form.errors.holderName}>
                      <FieldLabel htmlFor="holderName">
                        <HugeiconsIcon icon={UserIcon} className="w-4 h-4 inline mr-1" />
                        Account Holder Name
                      </FieldLabel>
                      <Input
                        id="holderName"
                        placeholder="Name as per bank records"
                        value={form.data.holderName}
                        onChange={(e) => form.setData('holderName', e.target.value)}
                        disabled={isApproved}
                      />
                      {form.errors.holderName && (
                        <FieldError errors={[{ message: form.errors.holderName }]} />
                      )}
                    </Field>

                    {/* Account Number */}
                    <Field className="gap-2" data-invalid={!!form.errors.accountNumber}>
                      <FieldLabel htmlFor="accountNumber">
                        <HugeiconsIcon icon={CreditCardIcon} className="w-4 h-4 inline mr-1" />
                        Account Number
                      </FieldLabel>
                      <Input
                        id="accountNumber"
                        type="text"
                        placeholder="Enter account number"
                        value={form.data.accountNumber}
                        onChange={(e) => form.setData('accountNumber', e.target.value)}
                        disabled={isApproved}
                      />
                      {form.errors.accountNumber && (
                        <FieldError errors={[{ message: form.errors.accountNumber }]} />
                      )}
                    </Field>

                    {/* UPI ID */}
                    <Field className="gap-2" data-invalid={!!form.errors.upi}>
                      <FieldLabel htmlFor="upi">UPI ID</FieldLabel>
                      <Input
                        id="upi"
                        placeholder="e.g. username@ybl"
                        value={form.data.upi}
                        onChange={(e) => form.setData('upi', e.target.value)}
                        disabled={isApproved}
                      />
                      {form.errors.upi && <FieldError errors={[{ message: form.errors.upi }]} />}
                    </Field>

                    {/* QR Code */}
                    <div className="md:col-span-2">
                      <Field className="gap-2" data-invalid={!!form.errors.qr}>
                        <FieldLabel>
                          <HugeiconsIcon icon={QrCodeIcon} className="w-4 h-4 inline mr-1" />
                          UPI QR Code
                        </FieldLabel>

                        {isApproved && bank?.qr ? (
                          <div className="border rounded-xl p-4 flex items-center gap-4 bg-muted/50">
                            <Image
                              src={bank.qr.url}
                              alt="QR Code"
                              className="w-32 h-32 object-contain rounded-lg bg-white"
                            />
                            <div>
                              <p className="font-medium">Current QR Code</p>
                              <p className="text-sm text-muted-foreground">
                                Uploaded on {new Date(bank.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <FileUpload
                            maxFiles={1}
                            mode="replace"
                            accept="image/*"
                            disabled={isApproved}
                            onValueChange={(files) => {
                              const file = files[0] || null
                              form.setData('qr', file)
                              if (file) {
                                form.clearErrors('qr')
                                const reader = new FileReader()
                                reader.onloadend = () => {
                                  setQrPreview(reader.result as string)
                                }
                                reader.readAsDataURL(file)
                              } else {
                                setQrPreview(null)
                              }
                            }}
                            onFileReject={(_, reason) => {
                              form.setError('qr', reason)
                            }}
                          >
                            <FileUploadDropzone
                              className={`
                                border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300
                                ${form.errors.qr ? 'border-destructive bg-destructive/10' : 'border-border bg-muted/50 hover:bg-primary/5 hover:border-primary/50'}
                              `}
                            >
                              {form.data.qr ? (
                                <div className="flex flex-col items-center gap-2">
                                  <FileUploadList>
                                    <FileUploadItem value={form.data.qr} className="border-none">
                                      <div className="flex items-center gap-3">
                                        <FileUploadItemPreview className="h-16 w-16 rounded-lg object-cover" />
                                        <div className="text-left">
                                          <p className="text-sm font-medium">{form.data.qr.name}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {(form.data.qr.size / 1024 / 1024).toFixed(2)} MB
                                          </p>
                                        </div>
                                      </div>
                                    </FileUploadItem>
                                  </FileUploadList>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Click to change image
                                  </p>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center py-4">
                                  {bank?.qr && !qrPreview && (
                                    <div className="mb-4">
                                      <Image
                                        src={bank.qr.url}
                                        alt="Current QR"
                                        className="w-24 h-24 object-contain rounded-lg border bg-white"
                                      />
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Current QR Code
                                      </p>
                                    </div>
                                  )}
                                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-3">
                                    <HugeiconsIcon icon={Upload01Icon} className="w-6 h-6" />
                                  </div>
                                  <p className="text-sm font-medium text-foreground">
                                    Click to upload new QR code
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    PNG, JPG, WEBP up to 2MB
                                  </p>
                                </div>
                              )}
                            </FileUploadDropzone>
                          </FileUpload>
                        )}
                        {form.errors.qr && <FieldError errors={[{ message: form.errors.qr }]} />}
                      </Field>
                    </div>
                  </div>

                  {!isApproved && (
                    <div className="flex justify-end pt-4">
                      <Button
                        type="submit"
                        disabled={form.processing}
                        size="lg"
                        className="w-full md:w-auto min-w-48"
                      >
                        {form.processing ? (
                          <>
                            <HugeiconsIcon
                              icon={Loading01Icon}
                              className="w-4 h-4 mr-2 animate-spin"
                            />
                            Saving Details...
                          </>
                        ) : (
                          <>
                            <HugeiconsIcon icon={FloppyDiskIcon} className="w-4 h-4 mr-2" />
                            Save Details
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </form>
          </div>
        </Main>
      </AppLayout>
    </>
  )
}
