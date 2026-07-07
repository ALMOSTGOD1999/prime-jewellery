import { Head, Link, router, useForm } from '@inertiajs/react'
import React, { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowLeft02Icon,
  BankIcon,
  Calendar03Icon,
  Call02Icon,
  Cancel01Icon,
  Cursor02Icon,
  Edit02Icon,
  FileValidationIcon,
  Location01Icon,
  LockPasswordIcon,
  Login03Icon,
  Mail01Icon,
  SecurityCheckIcon,
  ShoppingBag03Icon,
  Structure01Icon,
  Tick02Icon,
  UserGroupIcon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons'

import { formatDateWithRelative } from '~/lib/format'
import { cn } from '~/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { Button, buttonVariants } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import { Label } from '~/components/ui/label'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
} from '~/components/ui/file-upload'
import { Image } from '~/components/ui/image'

import { IndianStatesEnum } from '#enums/settings'
import { route } from '@izzyjs/route/client'
import PasswordInput from '~/components/ui/password-input'
import { InferPageProps } from '@adonisjs/inertia/types'
import AdminUsersController from '#controllers/admin/users_controller'

export default function MemberShow({ member }: InferPageProps<AdminUsersController, 'show'>) {
  const [isBankOpen, setIsBankOpen] = useState(false)
  const [isKycOpen, setIsKycOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isActivateOpen, setIsActivateOpen] = useState(false)
  const [isBankActionOpen, setIsBankActionOpen] = useState(false)
  const [bankActionType, setBankActionType] = useState<'approve' | 'reject' | null>(null)

  const {
    data: bankData,
    setData: setBankData,
    post: postBank,
    processing: bankProcessing,
    errors: bankErrors,
  } = useForm({
    name: member.bank?.name || '',
    branch: member.bank?.branch || '',
    ifsc: member.bank?.ifsc || '',
    holderName: member.bank?.holderName || '',
    accountNumber: member.bank?.accountNumber || '',
    upi: member.bank?.upi || '',
    qr: null as File | null,
    _method: 'PATCH',
  })

  const {
    data: kycData,
    setData: setKycData,
    post: postKyc,
    processing: kycProcessing,
    errors: kycErrors,
  } = useForm({
    panNumber: member.kyc?.panNumber || '',
    aadhaarNumber: member.kyc?.aadhaarNumber || '',
    panProof: null as File | null,
    aadhaarProof: null as File | null,
    _method: 'PATCH',
  })

  const {
    data: profileData,
    setData: setProfileData,
    patch: patchProfile,
    processing: profileProcessing,
    errors: profileErrors,
  } = useForm({
    name: member.name,
    email: member.email,
    phone: member.phone,
    address: member.profile.address || '',
    city: member.profile.city || '',
    state: member.profile.state || '',
    zipcode: member.profile.zip || '',
    gender: 'male', // Required by validator but not edited here, defaulting
    avatar: null as File | null,
  })

  const {
    data: passwordData,
    setData: setPasswordData,
    patch: patchPassword,
    processing: passwordProcessing,
    errors: passwordErrors,
    reset: resetPassword,
  } = useForm({
    password: '',
  })

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault()
    patchPassword(route('admin.users.password.update', { params: { id: member.id } }).toString(), {
      onSuccess: () => {
        resetPassword()
      },
    })
  }

  const submitBank = (e: React.FormEvent) => {
    e.preventDefault()
    postBank(route('admin.users.bank.update', { params: { id: member.id } }).toString(), {
      forceFormData: true,
      onSuccess: () => {
        setIsBankOpen(false)
      },
    })
  }

  const submitKyc = (e: React.FormEvent) => {
    e.preventDefault()
    postKyc(route('admin.users.kyc.update', { params: { id: member.id } }).toString(), {
      forceFormData: true,
      onSuccess: () => {
        setIsKycOpen(false)
      },
    })
  }

  const submitProfile = (e: React.FormEvent) => {
    e.preventDefault()
    patchProfile(route('admin.users.update', { params: { id: member.id } }).toString(), {
      forceFormData: true,
      onSuccess: () => {
        setIsProfileOpen(false)
      },
    })
  }

  const { formatted: joinedFormatted, relative: joinedRelative } = formatDateWithRelative(
    member.createdAt
  )
  const activatedFormatted = member.activatedAt
    ? formatDateWithRelative(member.activatedAt).formatted
    : null

  return (
    <AppLayout>
      <Head title={`Member: ${member.name}`} />
      <Header>Member Details</Header>
      <Main className="space-y-2">
        <div className="flex items-center gap-4">
          <Link
            href={route('admin.users.page')}
            className={buttonVariants({ variant: 'ghost', size: 'icon' })}
          >
            <HugeiconsIcon icon={ArrowLeft02Icon} className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{member.name}</h1>
            <p className="text-muted-foreground">Detailed information and management</p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Main Profile Card */}
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {member.avatar ? (
                  <div className="h-20 w-20 overflow-hidden rounded-full">
                    <Image
                      src={member.avatar}
                      alt={member.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="text-lg">{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    Personal Information
                    {member.activatedAt && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                    )}
                  </CardTitle>
                  <p className="text-muted-foreground">Manage personal and contact details</p>
                </div>
              </div>
              <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                <DialogTrigger className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                  <HugeiconsIcon icon={Edit02Icon} className="h-4 w-4 mr-2" />
                  Edit
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Profile Details</DialogTitle>
                    <DialogDescription>
                      Update profile information for this member.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={submitProfile} className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={profileData.name}
                        onChange={(e) => setProfileData('name', e.target.value)}
                      />
                      {profileErrors.name && (
                        <span className="text-sm text-destructive">{profileErrors.name}</span>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="avatar">Profile Pic</Label>
                      <FileUpload
                        maxFiles={1}
                        mode="replace"
                        onValueChange={(files) => setProfileData('avatar', files[0] || null)}
                        accept="image/*"
                      >
                        <FileUploadDropzone className="p-4 h-32">
                          <span className="text-sm text-muted-foreground">
                            Drag & drop or click to upload
                          </span>
                        </FileUploadDropzone>
                        <FileUploadList>
                          <FileUploadItem value={profileData.avatar as File}>
                            <FileUploadItemPreview />
                            <FileUploadItemMetadata />
                            <FileUploadItemDelete />
                          </FileUploadItem>
                        </FileUploadList>
                        {!profileData.avatar && member.avatar && (
                          <div className="relative flex items-center gap-2.5 rounded-md border p-3 mt-2">
                            <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded border bg-accent/50">
                              <Image
                                src={member.avatar}
                                alt="Current Profile Pic"
                                className="size-full object-cover"
                              />
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate font-medium text-sm">
                                Current Profile Pic
                              </span>
                              <span className="truncate text-muted-foreground text-xs">
                                Existing
                              </span>
                            </div>
                          </div>
                        )}
                      </FileUpload>
                      {profileErrors.avatar && (
                        <span className="text-sm text-destructive">{profileErrors.avatar}</span>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData('email', e.target.value)}
                      />
                      {profileErrors.email && (
                        <span className="text-sm text-destructive">{profileErrors.email}</span>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData('phone', e.target.value)}
                      />
                      {profileErrors.phone && (
                        <span className="text-sm text-destructive">{profileErrors.phone}</span>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={profileData.address}
                        onChange={(e) => setProfileData('address', e.target.value)}
                      />
                      {profileErrors.address && (
                        <span className="text-sm text-destructive">{profileErrors.address}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={profileData.city}
                          onChange={(e) => setProfileData('city', e.target.value)}
                        />
                        {profileErrors.city && (
                          <span className="text-sm text-destructive">{profileErrors.city}</span>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="state">State</Label>
                        <Select
                          value={profileData.state}
                          onValueChange={(value) => setProfileData('state', value!)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(IndianStatesEnum)
                              .sort()
                              .map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {profileErrors.state && (
                          <span className="text-sm text-destructive">{profileErrors.state}</span>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="zipcode">Zip Code</Label>
                      <Input
                        id="zipcode"
                        type="number"
                        value={profileData.zipcode}
                        onChange={(e) => setProfileData('zipcode', e.target.value)}
                      />
                      {profileErrors.zipcode && (
                        <span className="text-sm text-destructive">{profileErrors.zipcode}</span>
                      )}
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={profileProcessing}>
                        Save Changes
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={Mail01Icon} className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{member.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={Call02Icon} className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{member.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={Calendar03Icon} className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Joined {joinedFormatted} ({joinedRelative})
                  </span>
                </div>
                {activatedFormatted && (
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon
                      icon={SecurityCheckIcon}
                      className="h-4 w-4 text-muted-foreground"
                    />
                    <span className="text-sm">
                      Activated on {activatedFormatted}
                      {member.activatedByAdmin && (
                        <span className="text-destructive"> by Admin</span>
                      )}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={Location01Icon} className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {[
                      member.profile.address,
                      member.profile.city,
                      member.profile.state,
                      member.profile.zip,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'No address provided'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HugeiconsIcon icon={Cursor02Icon} className="h-5 w-5" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {!member.activatedAt && (
                  <Dialog open={isActivateOpen} onOpenChange={setIsActivateOpen}>
                    <DialogTrigger className={buttonVariants({ variant: 'default' })}>
                      <HugeiconsIcon icon={SecurityCheckIcon} className="h-4 w-4 mr-2" />
                      Activate Member
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Activate Member</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to activate this member? This will allow them to
                          access all features.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsActivateOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            router.post(
                              route('admin.users.activate', { params: { id: member.id } }),
                              {
                                // @ts-ignore
                                onSuccess: () => setIsActivateOpen(false),
                              }
                            )
                          }}
                        >
                          Confirm Activation
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                <Button
                  variant="outline"
                  onClick={() => {
                    router.post(route('admin.users.impersonate', { params: { id: member.id } }))
                  }}
                >
                  <HugeiconsIcon icon={Login03Icon} className="h-4 w-4 mr-2" />
                  Login as User
                </Button>

                <Link
                  href={route('admin.users.tree', { params: { id: member.id } })}
                  className={buttonVariants({ variant: 'outline' })}
                >
                  <HugeiconsIcon icon={Structure01Icon} className="h-4 w-4 mr-2" />
                  View Tree
                </Link>

                <Link
                  href={route('admin.wallet.user.history', { params: { userId: member.id } })}
                  className={buttonVariants({ variant: 'outline' })}
                >
                  <HugeiconsIcon icon={Wallet01Icon} className="h-4 w-4 mr-2" />
                  Wallet History
                </Link>

                <Link
                  href={route('admin.purchases.user.history', {
                    params: { userId: member.id },
                  })}
                  className={buttonVariants({ variant: 'outline' })}
                >
                  <HugeiconsIcon icon={ShoppingBag03Icon} className="h-4 w-4 mr-2" />
                  Purchase History
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Network Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HugeiconsIcon icon={UserGroupIcon} className="h-5 w-5" />
                Network Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Sponsor (Parent)</span>
                {member.parent ? (
                  <Link
                    href={route('admin.users.show', { params: { id: member.parent.id } })}
                    className={cn(buttonVariants({ variant: 'link' }), 'text-sm text-primary')}
                  >
                    {member.parent.name}({member.parent.id})
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">None (Root)</span>
                )}
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Direct Recruits</span>
                <span className="text-sm">{member.childrenCount}</span>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HugeiconsIcon icon={LockPasswordIcon} className="h-5 w-5" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitPassword} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="password">Reset Password</Label>
                  <div className="flex gap-2 max-w-md">
                    <PasswordInput
                      id="password"
                      type="password"
                      value={passwordData.password}
                      onChange={(e) => setPasswordData('password', e.target.value)}
                      placeholder="Enter new password"
                    />
                    <Button type="submit" disabled={passwordProcessing}>
                      Update
                    </Button>
                  </div>
                  {passwordErrors.password && (
                    <span className="text-sm text-destructive">{passwordErrors.password}</span>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Admins can directly reset member passwords here.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <HugeiconsIcon icon={BankIcon} className="h-5 w-5" />
                Bank Details
                {member.bank?.rejectedAt && (
                  <span className="text-destructive text-xs">Rejected</span>
                )}
                {member.bank?.approvedAt && (
                  <span className="text-muted-foreground text-xs">Approved</span>
                )}
              </CardTitle>
              <div className="flex gap-2">
                <Dialog open={isBankOpen} onOpenChange={setIsBankOpen}>
                  <DialogTrigger className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                    <HugeiconsIcon icon={Edit02Icon} className="h-4 w-4 mr-2" />
                    Edit
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Bank Details</DialogTitle>
                      <DialogDescription>
                        Update bank information for this member. Changes are auto-approved.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitBank} className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="bankName">Bank Name</Label>
                        <Input
                          id="bankName"
                          value={bankData.name}
                          onChange={(e) => setBankData('name', e.target.value)}
                        />
                        {bankErrors.name && (
                          <span className="text-sm text-destructive">{bankErrors.name}</span>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="branch">Branch</Label>
                        <Input
                          id="branch"
                          value={bankData.branch}
                          onChange={(e) => setBankData('branch', e.target.value)}
                        />
                        {bankErrors.branch && (
                          <span className="text-sm text-destructive">{bankErrors.branch}</span>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="ifsc">IFSC Code</Label>
                        <Input
                          id="ifsc"
                          value={bankData.ifsc}
                          onChange={(e) => setBankData('ifsc', e.target.value)}
                        />
                        {bankErrors.ifsc && (
                          <span className="text-sm text-destructive">{bankErrors.ifsc}</span>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="holderName">Account Holder Name</Label>
                        <Input
                          id="holderName"
                          value={bankData.holderName}
                          onChange={(e) => setBankData('holderName', e.target.value)}
                        />
                        {bankErrors.holderName && (
                          <span className="text-sm text-destructive">{bankErrors.holderName}</span>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="accountNumber">Account Number</Label>
                        <Input
                          id="accountNumber"
                          value={bankData.accountNumber}
                          onChange={(e) => setBankData('accountNumber', e.target.value)}
                        />
                        {bankErrors.accountNumber && (
                          <span className="text-sm text-destructive">
                            {bankErrors.accountNumber}
                          </span>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="upi">UPI ID</Label>
                        <Input
                          id="upi"
                          value={bankData.upi}
                          onChange={(e) => setBankData('upi', e.target.value)}
                        />
                        {bankErrors.upi && (
                          <span className="text-sm text-destructive">{bankErrors.upi}</span>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="qr">QR Code</Label>
                        <FileUpload
                          maxFiles={1}
                          mode="replace"
                          onValueChange={(files) => setBankData('qr', files[0] || null)}
                          accept="image/*"
                        >
                          <FileUploadDropzone className="p-4 h-32">
                            <span className="text-sm text-muted-foreground">
                              Drag & drop or click to upload
                            </span>
                          </FileUploadDropzone>
                          <FileUploadList>
                            <FileUploadItem value={bankData.qr as File}>
                              <FileUploadItemPreview />
                              <FileUploadItemMetadata />
                              <FileUploadItemDelete />
                            </FileUploadItem>
                          </FileUploadList>
                          {!bankData.qr && member.bank?.qr && (
                            <div className="relative flex items-center gap-2.5 rounded-md border p-3 mt-2">
                              <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded border bg-accent/50">
                                <Image
                                  src={member.bank.qr.url}
                                  alt="Current QR"
                                  className="size-full object-cover"
                                />
                              </div>
                              <div className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate font-medium text-sm">
                                  Current QR Code
                                </span>
                                <span className="truncate text-muted-foreground text-xs">
                                  Existing
                                </span>
                              </div>
                            </div>
                          )}
                        </FileUpload>
                        {bankErrors.qr && (
                          <span className="text-sm text-destructive">{bankErrors.qr}</span>
                        )}
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={bankProcessing}>
                          Save Changes
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {member.bank && !member.bank.approvedAt && (
                  <>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setBankActionType('approve')
                          setIsBankActionOpen(true)
                        }}
                      >
                        <HugeiconsIcon icon={Tick02Icon} className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={!!member.bank.rejectedAt}
                        onClick={() => {
                          setBankActionType('reject')
                          setIsBankActionOpen(true)
                        }}
                      >
                        <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                      </Button>
                    </div>

                    <Dialog open={isBankActionOpen} onOpenChange={setIsBankActionOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            {bankActionType === 'approve'
                              ? 'Approve Bank Request'
                              : 'Reject Bank Request'}
                          </DialogTitle>
                          <DialogDescription>
                            Are you sure you want to {bankActionType} this bank request?
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsBankActionOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            variant={bankActionType === 'approve' ? 'default' : 'destructive'}
                            onClick={() => {
                              if (!bankActionType) return
                              router.post(
                                route('admin.bank.update', {
                                  params: { id: member.bank!.id || member.id },
                                }),
                                { type: bankActionType === 'approve' ? 'approved' : 'rejected' },
                                {
                                  onSuccess: () => setIsBankActionOpen(false),
                                }
                              )
                            }}
                          >
                            Confirm {bankActionType === 'approve' ? 'Approval' : 'Rejection'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {member.bank ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1">
                    <span className="text-sm font-medium">Bank Name</span>
                    <span className="text-sm text-muted-foreground">{member.bank.name}</span>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-sm font-medium">Branch</span>
                    <span className="text-sm text-muted-foreground">{member.bank.branch}</span>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-sm font-medium">IFSC</span>
                    <span className="text-sm text-muted-foreground">{member.bank.ifsc}</span>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-sm font-medium">Account Number</span>
                    <span className="text-sm text-muted-foreground">
                      {member.bank.accountNumber}
                    </span>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-sm font-medium">Holder Name</span>
                    <span className="text-sm text-muted-foreground">{member.bank.holderName}</span>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-sm font-medium">UPI</span>
                    <span className="text-sm text-muted-foreground">
                      {member.bank.upi || 'N/A'}
                    </span>
                  </div>
                  {member.bank.qr && (
                    <div className="col-span-2 grid gap-1">
                      <span className="text-sm font-medium">QR Code</span>
                      <div className="h-32 w-32 overflow-hidden rounded-md border">
                        <Image
                          src={member.bank.qr.url}
                          alt="Bank QR Code"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No bank details provided.</p>
              )}
            </CardContent>
          </Card>

          {/* KYC Details */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <HugeiconsIcon icon={FileValidationIcon} className="h-5 w-5" />
                KYC Details
                {member.kyc?.rejectedAt && (
                  <span className="text-destructive text-xs">Rejected</span>
                )}
                {member.kyc?.approvedAt && (
                  <span className="text-muted-foreground text-xs">Approved</span>
                )}
              </CardTitle>
              <div className="flex gap-2">
                <Dialog open={isKycOpen} onOpenChange={setIsKycOpen}>
                  <DialogTrigger className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                    <HugeiconsIcon icon={Edit02Icon} className="h-4 w-4 mr-2" />
                    Edit
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit KYC Details</DialogTitle>
                      <DialogDescription>
                        Update KYC information for this member. Changes are auto-approved.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitKyc} className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="panNumber">PAN Number</Label>
                        <Input
                          id="panNumber"
                          value={kycData.panNumber}
                          onChange={(e) => setKycData('panNumber', e.target.value)}
                        />
                        {kycErrors.panNumber && (
                          <span className="text-sm text-destructive">{kycErrors.panNumber}</span>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="aadhaarNumber">Aadhaar Number</Label>
                        <Input
                          id="aadhaarNumber"
                          value={kycData.aadhaarNumber}
                          onChange={(e) => setKycData('aadhaarNumber', e.target.value)}
                        />
                        {kycErrors.aadhaarNumber && (
                          <span className="text-sm text-destructive">
                            {kycErrors.aadhaarNumber}
                          </span>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="panProof">PAN Proof</Label>
                        <FileUpload
                          maxFiles={1}
                          mode="replace"
                          onValueChange={(files) => setKycData('panProof', files[0] || null)}
                          accept="image/*,application/pdf"
                        >
                          <FileUploadDropzone className="p-4 h-32">
                            <span className="text-sm text-muted-foreground">
                              Drag & drop or click to upload
                            </span>
                          </FileUploadDropzone>
                          <FileUploadList>
                            <FileUploadItem value={kycData.panProof as File}>
                              <FileUploadItemPreview />
                              <FileUploadItemMetadata />
                              <FileUploadItemDelete />
                            </FileUploadItem>
                          </FileUploadList>
                          {!kycData.panProof && member.kyc?.panProof && (
                            <div className="relative flex items-center gap-2.5 rounded-md border p-3 mt-2">
                              <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded border bg-accent/50">
                                <Image
                                  src={member.kyc.panProof.url}
                                  alt="Current PAN Proof"
                                  className="size-full object-cover"
                                />
                              </div>
                              <div className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate font-medium text-sm">
                                  Current PAN Proof
                                </span>
                                <span className="truncate text-muted-foreground text-xs">
                                  Existing
                                </span>
                              </div>
                            </div>
                          )}
                        </FileUpload>
                        {kycErrors.panProof && (
                          <span className="text-sm text-destructive">{kycErrors.panProof}</span>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="aadhaarProof">Aadhaar Proof</Label>
                        <FileUpload
                          maxFiles={1}
                          mode="replace"
                          onValueChange={(files) => setKycData('aadhaarProof', files[0] || null)}
                          accept="image/*,application/pdf"
                        >
                          <FileUploadDropzone className="p-4 h-32">
                            <span className="text-sm text-muted-foreground">
                              Drag & drop or click to upload
                            </span>
                          </FileUploadDropzone>
                          <FileUploadList>
                            <FileUploadItem value={kycData.aadhaarProof as File}>
                              <FileUploadItemPreview />
                              <FileUploadItemMetadata />
                              <FileUploadItemDelete />
                            </FileUploadItem>
                          </FileUploadList>
                          {!kycData.aadhaarProof && member.kyc?.aadhaarProof && (
                            <div className="relative flex items-center gap-2.5 rounded-md border p-3 mt-2">
                              <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded border bg-accent/50">
                                <Image
                                  src={member.kyc.aadhaarProof.url}
                                  alt="Current Aadhaar Proof"
                                  className="size-full object-cover"
                                />
                              </div>
                              <div className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate font-medium text-sm">
                                  Current Aadhaar Proof
                                </span>
                                <span className="truncate text-muted-foreground text-xs">
                                  Existing
                                </span>
                              </div>
                            </div>
                          )}
                        </FileUpload>
                        {kycErrors.aadhaarProof && (
                          <span className="text-sm text-destructive">{kycErrors.aadhaarProof}</span>
                        )}
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={kycProcessing}>
                          Save Changes
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                {member.kyc && !member.kyc.approvedAt && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        router.patch(
                          route('admin.kyc.update', { params: { id: member.kyc?.id } }),
                          { type: 'approved' }
                        )
                      }}
                    >
                      <HugeiconsIcon icon={Tick02Icon} className="h-4 w-4 " />
                    </Button>
                    <Button
                      size="sm"
                      disabled={!!member.kyc?.rejectedAt}
                      variant="destructive"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        router.patch(
                          route('admin.kyc.update', { params: { id: member.kyc?.id } }),
                          { type: 'rejected' }
                        )
                      }}
                    >
                      <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4 " />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {member.kyc ? (
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1">
                      <span className="text-sm font-medium">PAN Number</span>
                      <span className="text-sm text-muted-foreground">{member.kyc.panNumber}</span>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-sm font-medium">Aadhaar Number</span>
                      <span className="text-sm text-muted-foreground">
                        {member.kyc.aadhaarNumber}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {member.kyc.panProof && (
                      <div className="grid gap-1">
                        <span className="text-sm font-medium">PAN Proof</span>
                        <div className="h-32 w-32 overflow-hidden rounded-md border">
                          <Image
                            src={member.kyc.panProof.url}
                            alt="PAN Proof"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                    {member.kyc.aadhaarProof && (
                      <div className="grid gap-1">
                        <span className="text-sm font-medium">Aadhaar Proof</span>
                        <div className="h-32 w-32 overflow-hidden rounded-md border">
                          <Image
                            src={member.kyc.aadhaarProof.url}
                            alt="Aadhaar Proof"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No KYC details provided.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </AppLayout>
  )
}
