import { Head, useForm } from '@inertiajs/react'
import { route } from '@izzyjs/route/client'
import { FormEvent, useState } from 'react'
import { UserGenderEnum } from '#enums/user'
import { IndianStatesEnum } from '#enums/settings'

import AppLayout from '~/components/app/layout'
import { Header } from '~/components/app/header'
import { Main } from '~/components/app/main'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Field, FieldError, FieldLabel } from '~/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemPreview,
  FileUploadList,
} from '~/components/ui/file-upload'
import PasswordInput from '~/components/ui/password-input'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import {
  Call02Icon,
  FloppyDiskIcon,
  Home01Icon,
  Loading03Icon,
  LockIcon,
  Mail01Icon,
  Upload01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import useUser from '~/hooks/use-user' // Derive from backend enums to ensure sync

// Derive from backend enums to ensure sync
const INDIAN_STATES = Object.values(IndianStatesEnum).sort()

const GENDERS = [
  { value: UserGenderEnum.MALE, label: 'Male' },
  { value: UserGenderEnum.FEMALE, label: 'Female' },
  { value: UserGenderEnum.OTHER, label: 'Other' },
]

export default function ProfilePage() {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const user = useUser()!

  const form = useForm<{
    // name: string
    // email: string
    // phone: string
    gender: string
    avatar: File | null
    address: string
    city: string
    state: string
    zipcode: string
  }>({
    // name: user.name,
    // email: user.email,
    // phone: user.phone,
    gender: user.gender,
    avatar: null,
    address: user.address || '',
    city: user.city || '',
    state: user.state || '',
    zipcode: user.zipcode?.toString() || '',
  })

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    form.patch(route('settings.profile').toString(), {
      forceFormData: true,
    })
  }

  const passwordForm = useForm({
    currentPassword: '',
    password: '',
    password_confirmation: '',
  })

  const handlePasswordSubmit = (e: FormEvent) => {
    e.preventDefault()
    passwordForm.patch(route('settings.profile.password').toString(), {
      onSuccess: () => passwordForm.reset(),
      preserveScroll: true,
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <>
      <Head title="Profile" />
      <AppLayout>
        <Header>Profile</Header>
        <Main className="space-y-6">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Picture</CardTitle>
                  <CardDescription>
                    Upload a new profile pic (PNG, JPG, WEBP up to 2MB)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* Current Avatar Preview */}
                    <div className="flex flex-col items-center gap-3">
                      <Avatar className="h-32 w-32 border-4 border-border shadow-lg">
                        <AvatarImage src={avatarPreview || user.avatar || ''} alt={user.name} />
                        <AvatarFallback className="text-3xl font-bold">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm text-muted-foreground">Current profile pic</p>
                    </div>

                    {/* Avatar Upload */}
                    <div className="flex-1 w-full">
                      <FileUpload
                        maxFiles={1}
                        mode="replace"
                        accept="image/*"
                        onValueChange={(files) => {
                          const file = files[0] || null
                          form.setData('avatar', file)
                          if (file) {
                            form.clearErrors('avatar')
                            // Create preview
                            const reader = new FileReader()
                            reader.onloadend = () => {
                              setAvatarPreview(reader.result as string)
                            }
                            reader.readAsDataURL(file)
                          } else {
                            setAvatarPreview(null)
                          }
                        }}
                        onFileReject={(_, reason) => {
                          form.setError('avatar', reason)
                        }}
                      >
                        <FileUploadDropzone
                          className={`
                            border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300
                            ${form.errors.avatar ? 'border-destructive bg-destructive/10' : 'border-border bg-muted/50 hover:bg-primary/5 hover:border-primary/50'}
                          `}
                        >
                          {form.data.avatar ? (
                            <div className="flex flex-col items-center gap-2">
                              <FileUploadList>
                                <FileUploadItem value={form.data.avatar} className="border-none">
                                  <div className="flex items-center gap-3">
                                    <FileUploadItemPreview className="h-16 w-16 rounded-lg object-cover" />
                                    <div className="text-left">
                                      <p className="text-sm font-medium">{form.data.avatar.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {(form.data.avatar.size / 1024 / 1024).toFixed(2)} MB
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
                              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-3">
                                <HugeiconsIcon icon={Upload01Icon} className="w-6 h-6" />
                              </div>
                              <p className="text-sm font-medium text-foreground">
                                Click to upload profile pic
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                PNG, JPG, WEBP up to 2MB
                              </p>
                            </div>
                          )}
                        </FileUploadDropzone>
                      </FileUpload>
                      {form.errors.avatar && (
                        <p className="text-sm text-destructive mt-2">{form.errors.avatar}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Profile Details (Merged) */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Details</CardTitle>
                  <CardDescription>Update your personal information and address</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <Field className="gap-2">
                      <FieldLabel htmlFor="name">
                        <HugeiconsIcon icon={UserIcon} className="w-4 h-4 inline mr-1" />
                        Full Name
                      </FieldLabel>
                      <Input
                        id="name"
                        placeholder="Enter your full name"
                        value={user.name}
                        disabled
                        // onChange={(e) => form.setData('name', e.target.value)}
                        // aria-invalid={!!form.errors.name}
                      />
                    </Field>

                    {/* Email */}
                    <Field className="gap-2">
                      <FieldLabel htmlFor="email">
                        <HugeiconsIcon icon={Mail01Icon} className="w-4 h-4 inline mr-1" />
                        Email Address
                      </FieldLabel>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={user.email}
                        disabled
                        // onChange={(e) => form.setData('email', e.target.value)}
                        // aria-invalid={!!form.errors.email}
                      />
                    </Field>

                    {/* Phone */}
                    <Field className="gap-2">
                      <FieldLabel htmlFor="phone">
                        <HugeiconsIcon icon={Call02Icon} className="w-4 h-4 inline mr-1" />
                        Phone Number
                      </FieldLabel>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={user.phone}
                        disabled
                        // onChange={(e) => form.setData('phone', e.target.value)}
                        // aria-invalid={!!form.errors.phone}
                      />
                    </Field>

                    {/* Gender */}
                    <Field className="gap-2" data-invalid={!!form.errors.gender}>
                      <FieldLabel htmlFor="gender">Gender</FieldLabel>
                      <Select
                        value={form.data.gender}
                        onValueChange={(val) => form.setData('gender', val || '')}
                      >
                        <SelectTrigger id="gender">
                          <SelectValue placeholder="Select gender" className="capitalize" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {GENDERS.map((gender) => (
                              <SelectItem key={gender.value} value={gender.value}>
                                {gender.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {form.errors.gender && (
                        <FieldError errors={[{ message: form.errors.gender }]} />
                      )}
                    </Field>

                    {/* Address */}
                    <Field className="gap-2 md:col-span-2" data-invalid={!!form.errors.address}>
                      <FieldLabel htmlFor="address">
                        <HugeiconsIcon icon={Home01Icon} className="w-4 h-4 inline mr-1" />
                        Street Address
                      </FieldLabel>
                      <Input
                        id="address"
                        placeholder="Enter your street address"
                        value={form.data.address}
                        onChange={(e) => form.setData('address', e.target.value)}
                        aria-invalid={!!form.errors.address}
                      />
                      {form.errors.address && (
                        <FieldError errors={[{ message: form.errors.address }]} />
                      )}
                    </Field>

                    {/* City */}
                    <Field className="gap-2" data-invalid={!!form.errors.city}>
                      <FieldLabel htmlFor="city">City</FieldLabel>
                      <Input
                        id="city"
                        placeholder="Enter city"
                        value={form.data.city}
                        onChange={(e) => form.setData('city', e.target.value)}
                        aria-invalid={!!form.errors.city}
                      />
                      {form.errors.city && <FieldError errors={[{ message: form.errors.city }]} />}
                    </Field>

                    {/* State */}
                    <Field className="gap-2" data-invalid={!!form.errors.state}>
                      <FieldLabel htmlFor="state">State</FieldLabel>
                      <Select
                        value={form.data.state}
                        onValueChange={(val) => form.setData('state', val || '')}
                      >
                        <SelectTrigger id="state">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDIAN_STATES.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.errors.state && (
                        <FieldError errors={[{ message: form.errors.state }]} />
                      )}
                    </Field>

                    {/* Zipcode */}
                    <Field className="gap-2" data-invalid={!!form.errors.zipcode}>
                      <FieldLabel htmlFor="zipcode">Zipcode</FieldLabel>
                      <Input
                        id="zipcode"
                        type="text"
                        placeholder="Enter zipcode"
                        value={form.data.zipcode}
                        onChange={(e) => form.setData('zipcode', e.target.value)}
                        aria-invalid={!!form.errors.zipcode}
                      />
                      {form.errors.zipcode && (
                        <FieldError errors={[{ message: form.errors.zipcode }]} />
                      )}
                    </Field>
                  </div>

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
                            icon={Loading03Icon}
                            className="w-4 h-4 mr-2 animate-spin"
                          />
                          Saving Changes...
                        </>
                      ) : (
                        <>
                          <HugeiconsIcon icon={FloppyDiskIcon} className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>

            <form onSubmit={handlePasswordSubmit} className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HugeiconsIcon icon={LockIcon} className="w-5 h-5" />
                    Change Password
                  </CardTitle>
                  <CardDescription>
                    Ensure your account is using a long, random password to stay secure.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Field className="gap-2" data-invalid={!!passwordForm.errors.currentPassword}>
                    <FieldLabel htmlFor="currentPassword">Current Password</FieldLabel>
                    <PasswordInput
                      id="currentPassword"
                      placeholder="Enter current password"
                      value={passwordForm.data.currentPassword}
                      onChange={(e) => passwordForm.setData('currentPassword', e.target.value)}
                    />
                    {passwordForm.errors.currentPassword && (
                      <FieldError errors={[{ message: passwordForm.errors.currentPassword }]} />
                    )}
                  </Field>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field className="gap-2" data-invalid={!!passwordForm.errors.password}>
                      <FieldLabel htmlFor="password">New Password</FieldLabel>
                      <PasswordInput
                        id="password"
                        placeholder="Enter new password"
                        value={passwordForm.data.password}
                        onChange={(e) => passwordForm.setData('password', e.target.value)}
                      />
                      {passwordForm.errors.password && (
                        <FieldError errors={[{ message: passwordForm.errors.password }]} />
                      )}
                    </Field>

                    <Field
                      className="gap-2"
                      data-invalid={!!passwordForm.errors.password_confirmation}
                    >
                      <FieldLabel htmlFor="password_confirmation">Confirm Password</FieldLabel>
                      <PasswordInput
                        id="password_confirmation"
                        placeholder="Confirm new password"
                        value={passwordForm.data.password_confirmation}
                        onChange={(e) =>
                          passwordForm.setData('password_confirmation', e.target.value)
                        }
                      />
                      {passwordForm.errors.password_confirmation && (
                        <FieldError
                          errors={[{ message: passwordForm.errors.password_confirmation }]}
                        />
                      )}
                    </Field>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={passwordForm.processing}
                      size="lg"
                      className="w-full md:w-auto min-w-48"
                    >
                      {passwordForm.processing ? (
                        <>
                          <HugeiconsIcon
                            icon={Loading03Icon}
                            className="w-4 h-4 mr-2 animate-spin"
                          />
                          Updating Password...
                        </>
                      ) : (
                        <>
                          <HugeiconsIcon icon={FloppyDiskIcon} className="w-4 h-4 mr-2" />
                          Update Password
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>
        </Main>
      </AppLayout>
    </>
  )
}
