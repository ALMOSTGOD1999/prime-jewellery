import { InferPageProps } from '@adonisjs/inertia/types'
import { Head, useForm } from '@inertiajs/react'
import { FormEvent, useState } from 'react'
import {
  CreditCardIcon,
  FileValidationIcon,
  Loading01Icon,
  FloppyDiskIcon,
  Upload01Icon,
  AlertCircleIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { route } from '@izzyjs/route/client'

import { cn } from '~/lib/utils'
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
import { Image } from '~/components/ui/image'

export default function KycPage({ kyc }: InferPageProps<SettingsController, 'kycPage'>) {
  const [panPreview, setPanPreview] = useState<string | null>(null)
  const [aadhaarPreview, setAadhaarPreview] = useState<string | null>(null)
  const isApproved = !!kyc?.approvedAt

  const form = useForm({
    panNumber: kyc?.panNumber || '',
    aadhaarNumber: kyc?.aadhaarNumber || '',
    panProof: null as File | null,
    aadhaarProof: null as File | null,
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    form.post(route('settings.kyc').toString(), {
      forceFormData: true,
      preserveScroll: true,
    })
  }

  return (
    <>
      <Head title="KYC Details" />
      <AppLayout>
        <Header>KYC Details</Header>
        <Main className="space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {kyc &&
              (isApproved ? (
                <Alert variant="default" className="bg-primary/10 border-primary/20">
                  <HugeiconsIcon icon={FileValidationIcon} className="h-4 w-4" />
                  <AlertTitle>KYC Details Approved</AlertTitle>
                  <AlertDescription>
                    Your KYC details have been approved by the administrator. You cannot change them
                    anymore. If you need to update your details, please contact admin.
                  </AlertDescription>
                </Alert>
              ) : kyc.rejectedAt ? (
                <Alert variant="destructive">
                  <HugeiconsIcon icon={AlertCircleIcon} className="h-4 w-4" />
                  <AlertTitle>KYC Details Rejected</AlertTitle>
                  <AlertDescription>
                    Your KYC details were rejected. Please review the details and submit again.
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
                    Your KYC details are currently pending approval. You can update them until they
                    are approved.
                  </AlertDescription>
                </Alert>
              ))}

            <form onSubmit={handleSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle>KYC Information</CardTitle>
                  <CardDescription>
                    Provide your PAN and Aadhaar details for verification.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* PAN Number */}
                    <Field className="gap-2" data-invalid={!!form.errors.panNumber}>
                      <FieldLabel htmlFor="panNumber">
                        <HugeiconsIcon icon={CreditCardIcon} className="w-4 h-4 inline mr-1" />
                        PAN Card Number
                      </FieldLabel>
                      <Input
                        id="panNumber"
                        placeholder="Enter PAN Number"
                        value={form.data.panNumber}
                        onChange={(e) => form.setData('panNumber', e.target.value)}
                        disabled={isApproved}
                      />
                      {form.errors.panNumber && (
                        <FieldError errors={[{ message: form.errors.panNumber }]} />
                      )}
                    </Field>

                    {/* Aadhaar Number */}
                    <Field className="gap-2" data-invalid={!!form.errors.aadhaarNumber}>
                      <FieldLabel htmlFor="aadhaarNumber">
                        <HugeiconsIcon icon={FileValidationIcon} className="w-4 h-4 inline mr-1" />
                        Aadhaar Card Number
                      </FieldLabel>
                      <Input
                        id="aadhaarNumber"
                        placeholder="Enter Aadhaar Number"
                        value={form.data.aadhaarNumber}
                        onChange={(e) => form.setData('aadhaarNumber', e.target.value)}
                        disabled={isApproved}
                      />
                      {form.errors.aadhaarNumber && (
                        <FieldError errors={[{ message: form.errors.aadhaarNumber }]} />
                      )}
                    </Field>

                    {/* PAN Proof */}
                    <div className="md:col-span-2">
                      <Field className="gap-2" data-invalid={!!form.errors.panProof}>
                        <FieldLabel>
                          <HugeiconsIcon icon={Upload01Icon} className="w-4 h-4 inline mr-1" />
                          PAN Card Image
                        </FieldLabel>

                        {isApproved && kyc?.panProof ? (
                          <div className="border rounded-xl p-4 flex items-center gap-4 bg-muted/50">
                            <Image
                              src={kyc.panProof.url}
                              alt="PAN Proof"
                              className="w-32 h-32 object-contain rounded-lg bg-white"
                            />
                            <div>
                              <p className="font-medium">Current PAN Proof</p>
                              <p className="text-sm text-muted-foreground">
                                Uploaded on {new Date(kyc.updatedAt).toLocaleDateString()}
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
                              form.setData('panProof', file)
                              if (file) {
                                form.clearErrors('panProof')
                                const reader = new FileReader()
                                reader.onloadend = () => {
                                  setPanPreview(reader.result as string)
                                }
                                reader.readAsDataURL(file)
                              } else {
                                setPanPreview(null)
                              }
                            }}
                            onFileReject={(_, reason) => {
                              form.setError('panProof', reason)
                            }}
                          >
                            <FileUploadDropzone
                              className={cn(
                                'border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300',
                                form.errors.panProof
                                  ? 'border-destructive bg-destructive/10'
                                  : 'border-border bg-muted/50 hover:bg-primary/5 hover:border-primary/50'
                              )}
                            >
                              {form.data.panProof ? (
                                <div className="flex flex-col items-center gap-2">
                                  <FileUploadList>
                                    <FileUploadItem
                                      value={form.data.panProof}
                                      className="border-none"
                                    >
                                      <div className="flex items-center gap-3">
                                        <FileUploadItemPreview className="h-16 w-16 rounded-lg object-cover" />
                                        <div className="text-left">
                                          <p className="text-sm font-medium">
                                            {form.data.panProof.name}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {(form.data.panProof.size / 1024 / 1024).toFixed(2)} MB
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
                                  {kyc?.panFront && !panPreview && (
                                    <div className="mb-4">
                                      <Image
                                        src={kyc.panFront.url}
                                        alt="Current PAN"
                                        className="w-full h-32 object-contain rounded-lg border bg-white"
                                      />
                                      <p className="text-xs text-muted-foreground mt-1 text-center">
                                        Current PAN Card (Front)
                                      </p>
                                    </div>
                                  )}
                                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-3">
                                    <HugeiconsIcon icon={Upload01Icon} className="w-6 h-6" />
                                  </div>
                                  <p className="text-sm font-medium text-foreground text-center">
                                    Click to upload PAN Card (Front)
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    PNG, JPG, WEBP up to 2MB
                                  </p>
                                </div>
                              )}
                            </FileUploadDropzone>
                          </FileUpload>
                        )}
                        {form.errors.panProof && (
                          <FieldError errors={[{ message: form.errors.panProof }]} />
                        )}
                      </Field>
                    </div>

                    {/* Aadhaar Proof */}
                    <div className="md:col-span-2">
                      <Field className="gap-2" data-invalid={!!form.errors.aadhaarProof}>
                        <FieldLabel>
                          <HugeiconsIcon icon={Upload01Icon} className="w-4 h-4 inline mr-1" />
                          Aadhaar Card Image
                        </FieldLabel>

                        {isApproved && kyc?.aadhaarProof ? (
                          <div className="border rounded-xl p-4 flex items-center gap-4 bg-muted/50">
                            <Image
                              src={kyc.aadhaarProof.url}
                              alt="Aadhaar Proof"
                              className="w-32 h-32 object-contain rounded-lg bg-white"
                            />
                            <div>
                              <p className="font-medium">Current Aadhaar Proof</p>
                              <p className="text-sm text-muted-foreground">
                                Uploaded on {new Date(kyc.updatedAt).toLocaleDateString()}
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
                              form.setData('aadhaarProof', file)
                              if (file) {
                                form.clearErrors('aadhaarProof')
                                const reader = new FileReader()
                                reader.onloadend = () => {
                                  setAadhaarPreview(reader.result as string)
                                }
                                reader.readAsDataURL(file)
                              } else {
                                setAadhaarPreview(null)
                              }
                            }}
                            onFileReject={(_, reason) => {
                              form.setError('aadhaarProof', reason)
                            }}
                          >
                            <FileUploadDropzone
                              className={cn(
                                'border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300',
                                form.errors.aadhaarProof
                                  ? 'border-destructive bg-destructive/10'
                                  : 'border-border bg-muted/50 hover:bg-primary/5 hover:border-primary/50'
                              )}
                            >
                              {form.data.aadhaarProof ? (
                                <div className="flex flex-col items-center gap-2">
                                  <FileUploadList>
                                    <FileUploadItem
                                      value={form.data.aadhaarProof}
                                      className="border-none"
                                    >
                                      <div className="flex items-center gap-3">
                                        <FileUploadItemPreview className="h-16 w-16 rounded-lg object-cover" />
                                        <div className="text-left">
                                          <p className="text-sm font-medium">
                                            {form.data.aadhaarProof.name}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {(form.data.aadhaarProof.size / 1024 / 1024).toFixed(2)}{' '}
                                            MB
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
                                  {kyc?.aadharBack && !aadhaarPreview && (
                                    <div className="mb-4">
                                      <Image
                                        src={kyc.aadharBack.url}
                                        alt="Current Aadhar"
                                        className="w-full h-32 object-contain rounded-lg border bg-white"
                                      />
                                      <p className="text-xs text-muted-foreground mt-1 text-center">
                                        Current Aadhar Card (Back)
                                      </p>
                                    </div>
                                  )}
                                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-3">
                                    <HugeiconsIcon icon={Upload01Icon} className="w-6 h-6" />
                                  </div>
                                  <p className="text-sm font-medium text-foreground text-center">
                                    Click to upload Aadhar Card (Back)
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    PNG, JPG, WEBP up to 2MB
                                  </p>
                                </div>
                              )}
                            </FileUploadDropzone>
                          </FileUpload>
                        )}
                        {form.errors.aadhaarProof && (
                          <FieldError errors={[{ message: form.errors.aadhaarProof }]} />
                        )}
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
