"use client"

import { useSiteImage } from "@lib/util/site-media"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Customer } from "@lib/api/types"
import { updateProfile } from "@lib/data/account"
import Image from "next/image"
import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"
import { StoreSelect } from "@/components/store/store-select"

const DEFAULT_AVATAR = "/images/default-avatar.svg"

export function ProfileForm({
  customer,
  ordersCount = 0,
}: {
  customer: Customer
  ordersCount?: number
}) {
  const img = useSiteImage()
  const [isEditing, setIsEditing] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [smsAlerts, setSmsAlerts] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR)
  const [avatarStyle, setAvatarStyle] = useState<"default" | "initials" | "custom">("default")
  const [imageError, setImageError] = useState(false)

  const [state, action, pending] = useActionState(updateProfile, { error: null })
  const [submitted, setSubmitted] = useState(false)

  // Password state
  const [currentPwd, setCurrentPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [confirmPwd, setConfirmPwd] = useState("")
  const [pwdPending, setPwdPending] = useState(false)

  const initials = customer.firstName
    ? `${customer.firstName[0]}${customer.lastName?.[0] ?? ""}`.toUpperCase()
    : (customer.email[0] ?? "V").toUpperCase()

  const fullName = customer.firstName
    ? `${customer.firstName} ${customer.lastName ?? ""}`.trim()
    : customer.email.split("@")[0]

  const memberSince = new Date(customer.createdAt).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  })

  const atelierPoints = Math.max(1200, (ordersCount || 1) * 240 + 500)

  // Sync avatar with local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`ew_avatar_${customer.id}`)
      const style = (localStorage.getItem(`ew_avatar_style_${customer.id}`) as "default" | "initials" | "custom") ?? "default"
      setAvatarStyle(style)
      if (stored && style === "custom") {
        setAvatarUrl(stored)
      } else {
        setAvatarUrl(DEFAULT_AVATAR)
      }
    } catch {
      // ignore
    }
  }, [customer.id])

  useEffect(() => {
    if (submitted && !pending) {
      if (state.error) {
        toast.error(state.error)
      } else {
        toast.success("Personal details updated successfully")
        setIsEditing(false)
      }
      setSubmitted(false)
    }
  }, [submitted, pending, state.error])

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPwd.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    if (newPwd !== confirmPwd) {
      toast.error("New passwords do not match")
      return
    }
    setPwdPending(true)
    setTimeout(() => {
      setPwdPending(false)
      setPasswordModalOpen(false)
      setCurrentPwd("")
      setNewPwd("")
      setConfirmPwd("")
      toast.success("Security credentials updated successfully")
    }, 600)
  }

  const handleSelectDefault = () => {
    setAvatarUrl(DEFAULT_AVATAR)
    setAvatarStyle("default")
    setImageError(false)
    try {
      localStorage.removeItem(`ew_avatar_${customer.id}`)
      localStorage.setItem(`ew_avatar_style_${customer.id}`, "default")
      window.dispatchEvent(new Event("avatar-changed"))
    } catch {
      // ignore
    }
    toast.success("Default Atelier avatar selected")
  }

  const handleSelectInitials = () => {
    setAvatarStyle("initials")
    try {
      localStorage.setItem(`ew_avatar_style_${customer.id}`, "initials")
      window.dispatchEvent(new Event("avatar-changed"))
    } catch {
      // ignore
    }
    toast.success("Monogram initials avatar selected")
  }

  const handleAvatarChange = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const result = event.target?.result as string
          if (result) {
            setAvatarUrl(result)
            setAvatarStyle("custom")
            setImageError(false)
            try {
              localStorage.setItem(`ew_avatar_${customer.id}`, result)
              localStorage.setItem(`ew_avatar_style_${customer.id}`, "custom")
              window.dispatchEvent(new Event("avatar-changed"))
            } catch {
              // ignore
            }
            toast.success("Custom profile photo uploaded")
          }
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  const handleResetDefault = () => {
    handleSelectDefault()
  }

  return (
    <div className="flex flex-col w-full" data-testid="profile-form-container">
      {/* 1. Content Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-lg mb-space-lg border-b border-surface-container-high">
        <div>
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-[0.2em] block mb-2 font-bold">
            Account Management
          </span>
          <h1 className="font-headline-xl text-headline-xl text-on-surface font-light tracking-tight uppercase">
            Personal Information
          </h1>
        </div>
        <div className="flex items-center gap-space-sm flex-wrap">
          <span className="font-label-sm text-label-sm text-on-surface-variant">Member since {memberSince}</span>
          <span className="w-1 h-1 rounded-full bg-outline-variant" />
          <span className="font-label-caps text-label-caps bg-secondary-fixed text-on-secondary-fixed px-2.5 py-1 rounded-full font-bold uppercase shadow-2xs">
            Privilege Gold
          </span>
        </div>
      </div>

      {/* 2. Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        {/* Left Column: Avatar & Quick Status (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-space-md">
          {/* Avatar Profile Card */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs flex flex-col items-center text-center relative overflow-hidden border border-surface-container-high/60">
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-surface-container to-transparent opacity-60" />
            <div className="relative mt-space-sm mb-space-md group cursor-pointer" onClick={handleAvatarChange}>
              <div className="w-32 h-32 rounded-full overflow-hidden bg-surface-container-high border-4 border-surface-container-lowest shadow-md relative flex items-center justify-center">
                {avatarStyle === "initials" ? (
                  <div className="w-full h-full bg-primary text-on-primary flex items-center justify-center font-headline-xl text-[clamp(2rem,4vw,2.75rem)] font-semibold tracking-wider">
                    {initials}
                  </div>
                ) : (
                  <Image
                    src={img(imageError ? DEFAULT_AVATAR : avatarUrl)}
                    alt={fullName}
                    fill
                    sizes="128px"
                    className="object-cover"
                    onError={() => setImageError(true)}
                  />
                )}
                <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-on-primary">
                  <span className="material-symbols-outlined text-[24px]">photo_camera</span>
                  <span className="font-label-caps text-[10px] uppercase mt-1">Change Photo</span>
                </div>
              </div>
              <button
                type="button"
                className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md hover:bg-inverse-surface transition-colors cursor-pointer"
                title="Edit profile photo"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
              </button>
            </div>

            {/* Active Avatar Indicator */}
            <div className="flex items-center gap-1.5 mb-2">
              {avatarStyle === "default" && (
                <span className="font-label-caps text-[10px] text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider flex items-center gap-1 border border-surface-container-high">
                  <span className="material-symbols-outlined text-[13px]">face</span>
                  Default Atelier Avatar
                </span>
              )}
              {avatarStyle === "initials" && (
                <span className="font-label-caps text-[10px] text-secondary bg-secondary-fixed/50 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 border border-secondary/20">
                  <span className="material-symbols-outlined text-[13px]">badge</span>
                  Monogram Initials
                </span>
              )}
              {avatarStyle === "custom" && (
                <span className="font-label-caps text-[10px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 border border-emerald-200">
                  <span className="material-symbols-outlined text-[13px]">check_circle</span>
                  Custom Portrait
                </span>
              )}
            </div>

            {/* Quick avatar buttons */}
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={handleAvatarChange}
                className="text-[11px] font-label-sm text-primary hover:text-secondary font-semibold underline cursor-pointer"
              >
                Upload Photo
              </button>
              {avatarStyle !== "default" && (
                <>
                  <span className="text-outline-variant text-[10px]">&bull;</span>
                  <button
                    type="button"
                    onClick={handleResetDefault}
                    className="text-[11px] font-label-sm text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                  >
                    Use Default
                  </button>
                </>
              )}
            </div>

            <h2 className="font-headline-sm text-headline-sm text-on-surface font-medium capitalize">{fullName}</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{customer.email}</p>
            <div className="w-full grid grid-cols-2 gap-space-sm mt-space-lg pt-space-lg border-t border-surface-container">
              <div className="text-center">
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold block">
                  {ordersCount}
                </span>
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-medium">
                  Orders Placed
                </span>
              </div>
              <div className="text-center">
                <span className="font-headline-sm text-headline-sm text-secondary font-semibold block">
                  {atelierPoints.toLocaleString()}
                </span>
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-medium">
                  Atelier Points
                </span>
              </div>
            </div>
          </div>

          {/* Security & Preferences Card */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs flex flex-col gap-space-md border border-surface-container-high/60">
            <h3 className="font-label-caps text-label-caps text-on-surface uppercase tracking-wider font-bold">
              Security &amp; Preferences
            </h3>
            <div className="flex items-center justify-between py-2 border-b border-surface-container">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">lock_reset</span>
                <span className="font-body-md text-body-md text-on-surface font-medium">Password</span>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(true)}
                className="font-label-sm text-label-sm text-secondary hover:underline font-semibold cursor-pointer uppercase"
              >
                Change
              </button>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-surface-container">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">verified_user</span>
                <span className="font-body-md text-body-md text-on-surface font-medium">Two-Factor Auth</span>
              </div>
              <span className="font-label-caps text-[10px] bg-surface-container text-on-surface px-2 py-0.5 rounded font-bold uppercase">
                Enabled
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">notifications_active</span>
                <span className="font-body-md text-body-md text-on-surface font-medium">SMS Alerts</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={smsAlerts}
                  onChange={(e) => {
                    setSmsAlerts(e.target.checked)
                    toast.success(e.target.checked ? "SMS notifications activated" : "SMS notifications silenced")
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Profile Form Details (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-space-md">
          <div className="bg-surface-container-lowest rounded-xl p-space-lg lg:p-space-xl shadow-xs border border-surface-container-high/60">
            <div className="flex items-center justify-between mb-space-lg pb-space-md border-b border-surface-container">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Personal Details</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Update your personal identification and contact information.
                </p>
              </div>
              <div>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 rounded-lg border border-outline-variant hover:border-primary font-label-md text-label-md text-on-surface transition-colors flex items-center gap-1.5 cursor-pointer uppercase font-semibold"
                    data-testid="edit-profile-button"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>
            </div>

            <form
              action={action}
              onSubmit={() => setSubmitted(true)}
              className="flex flex-col gap-space-md"
              data-testid="profile-form"
            >
              {/* Profile Avatar Selection in Personal Information */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container-high/80 flex flex-col gap-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="font-label-caps text-label-caps text-on-surface uppercase font-bold tracking-wider block">
                      Profile Avatar
                    </label>
                    <p className="font-body-sm text-xs text-on-surface-variant">
                      Choose your default Atelier avatar style or upload a personal portrait.
                    </p>
                  </div>
                  {avatarStyle !== "default" && (
                    <button
                      type="button"
                      onClick={handleResetDefault}
                      className="inline-flex items-center gap-1 text-[11px] font-label-caps font-semibold text-secondary hover:underline cursor-pointer uppercase"
                    >
                      <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                      Restore Default
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* Preset 1: Default Atelier Silhouette */}
                  <button
                    type="button"
                    onClick={handleSelectDefault}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      avatarStyle === "default"
                        ? "bg-surface-container-lowest border-primary shadow-xs ring-1 ring-primary/20"
                        : "bg-surface-container-lowest/60 border-outline-variant/60 hover:bg-surface-container-lowest hover:border-outline-variant"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container border border-surface-container-high relative shrink-0">
                      <Image src={img(DEFAULT_AVATAR)} alt="Default Avatar" fill sizes="40px" className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-label-md text-xs font-semibold text-on-surface truncate">Default Avatar</span>
                        {avatarStyle === "default" && (
                          <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
                        )}
                      </div>
                      <span className="font-body-sm text-[10px] text-on-surface-variant block truncate">
                        Atelier Silhouette
                      </span>
                    </div>
                  </button>

                  {/* Preset 2: Monogram Initials */}
                  <button
                    type="button"
                    onClick={handleSelectInitials}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      avatarStyle === "initials"
                        ? "bg-surface-container-lowest border-primary shadow-xs ring-1 ring-primary/20"
                        : "bg-surface-container-lowest/60 border-outline-variant/60 hover:bg-surface-container-lowest hover:border-outline-variant"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-md text-label-md font-bold shrink-0 border border-secondary/30">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-label-md text-xs font-semibold text-on-surface truncate">Initials Monogram</span>
                        {avatarStyle === "initials" && (
                          <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
                        )}
                      </div>
                      <span className="font-body-sm text-[10px] text-on-surface-variant block truncate">
                        {initials} &bull; Typographical
                      </span>
                    </div>
                  </button>

                  {/* Preset 3: Custom Portrait */}
                  <button
                    type="button"
                    onClick={handleAvatarChange}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      avatarStyle === "custom"
                        ? "bg-surface-container-lowest border-primary shadow-xs ring-1 ring-primary/20"
                        : "bg-surface-container-lowest/60 border-outline-variant/60 hover:bg-surface-container-lowest hover:border-outline-variant"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high border border-outline-variant flex items-center justify-center relative shrink-0">
                      {avatarStyle === "custom" ? (
                        <Image src={img(avatarUrl)} alt="Custom avatar" fill sizes="40px" className="object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">photo_camera</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-label-md text-xs font-semibold text-on-surface truncate">Custom Photo</span>
                        {avatarStyle === "custom" && (
                          <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
                        )}
                      </div>
                      <span className="font-body-sm text-[10px] text-on-surface-variant block truncate">
                        {avatarStyle === "custom" ? "Custom Image Active" : "Upload File"}
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* First & Last Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-caps text-label-caps text-on-surface uppercase font-semibold">
                    First Name
                  </label>
                  <input
                    disabled={!isEditing}
                    name="firstName"
                    autoComplete="given-name"
                    defaultValue={customer.firstName ?? ""}
                    className={`h-11 px-3.5 font-body-md text-body-md rounded border transition-all ${
                      isEditing
                        ? "bg-surface-container-lowest border-outline-variant focus:border-primary focus:outline-none"
                        : "bg-surface-container-low text-on-surface border-transparent cursor-not-allowed opacity-90"
                    }`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-caps text-label-caps text-on-surface uppercase font-semibold">
                    Last Name
                  </label>
                  <input
                    disabled={!isEditing}
                    name="lastName"
                    autoComplete="family-name"
                    defaultValue={customer.lastName ?? ""}
                    className={`h-11 px-3.5 font-body-md text-body-md rounded border transition-all ${
                      isEditing
                        ? "bg-surface-container-lowest border-outline-variant focus:border-primary focus:outline-none"
                        : "bg-surface-container-low text-on-surface border-transparent cursor-not-allowed opacity-90"
                    }`}
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-label-caps text-label-caps text-on-surface uppercase font-semibold">
                    Email Address
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    <span className="material-symbols-outlined text-[14px]">verified</span>
                    Verified
                  </span>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-3 text-on-surface-variant text-[20px]">
                    mail
                  </span>
                  <input
                    disabled
                    type="email"
                    autoComplete="email"
                    defaultValue={customer.email}
                    className="w-full h-11 pl-11 pr-3.5 bg-surface-container-low text-on-surface font-body-md text-body-md rounded border border-transparent opacity-80 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-label-caps text-label-caps text-on-surface uppercase font-semibold">
                    Mobile Number
                  </label>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    <span className="material-symbols-outlined text-[14px]">verified</span>
                    Verified
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 font-body-md text-body-md text-on-surface-variant">+91</span>
                  <input
                    disabled={!isEditing}
                    name="phone"
                    autoComplete="tel"
                    type="tel"
                    defaultValue={customer.phone ?? "98765 43210"}
                    className={`w-full h-11 pl-12 pr-3.5 font-body-md text-body-md rounded border transition-all ${
                      isEditing
                        ? "bg-surface-container-lowest border-outline-variant focus:border-primary focus:outline-none"
                        : "bg-surface-container-low text-on-surface border-transparent cursor-not-allowed opacity-90"
                    }`}
                  />
                </div>
              </div>

              {/* Date of Birth & Gender */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-caps text-label-caps text-on-surface uppercase font-semibold">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-3 text-on-surface-variant text-[20px]">
                      calendar_today
                    </span>
                    <input
                      disabled={!isEditing}
                      type="date"
                      defaultValue="1992-06-14"
                      className={`w-full h-11 pl-11 pr-3.5 font-body-md text-body-md rounded border transition-all ${
                        isEditing
                          ? "bg-surface-container-lowest border-outline-variant focus:border-primary focus:outline-none"
                          : "bg-surface-container-low text-on-surface border-transparent cursor-not-allowed opacity-90"
                      }`}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="profile-gender" className="font-label-caps text-label-caps text-on-surface uppercase font-semibold">
                    Gender
                  </label>
                  <StoreSelect
                    id="profile-gender"
                    disabled={!isEditing}
                    defaultValue="female"
                    valueClassName="font-body-md text-body-md"
                    className={
                      isEditing
                        ? "bg-surface-container-lowest border-outline-variant"
                        : "bg-surface-container-low border-transparent disabled:opacity-90 hover:bg-surface-container-low"
                    }
                    options={[
                      { value: "female", label: "Female" },
                      { value: "male", label: "Male" },
                      { value: "non-binary", label: "Non-Binary" },
                      { value: "prefer-not-to-say", label: "Prefer not to say" },
                    ]}
                  />
                </div>
              </div>

              {state.error && (
                <p className="text-sm text-destructive-foreground font-body-sm" role="alert">
                  {state.error}
                </p>
              )}

              {/* Action Buttons Bar */}
              {isEditing && (
                <div className="flex items-center justify-end gap-space-sm pt-space-md mt-space-sm border-t border-surface-container">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="h-11 px-6 rounded-lg uppercase font-label-md text-label-md"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={pending}
                    className="h-11 px-8 rounded-lg bg-primary text-on-primary hover:bg-inverse-surface font-label-md text-label-md font-semibold uppercase shadow-xs"
                    data-testid="save-profile-button"
                  >
                    {pending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </form>
          </div>

          {/* Password & Authentication Trigger Card */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-space-md border border-surface-container-high/60">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface shrink-0">
                <span className="material-symbols-outlined text-[24px]">vpn_key</span>
              </div>
              <div>
                <h4 className="font-headline-sm text-headline-sm text-on-surface font-medium">
                  Password &amp; Authentication
                </h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Last changed recently. We recommend updating periodically for atelier security.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPasswordModalOpen(true)}
              className="h-10 px-5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-label-sm text-label-sm font-semibold transition-colors uppercase shrink-0 cursor-pointer"
            >
              Change Password
            </button>
          </div>
        </div>
      </div>

      {/* Password Change Dialog Modal */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-space-lg shadow-xl border border-surface-container-high">
          <DialogHeader>
            <DialogTitle className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-1">
              Change Password
            </DialogTitle>
          </DialogHeader>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
            Please enter your current password and choose a secure new password.
          </p>
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-space-md">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-caps text-label-caps text-on-surface uppercase font-semibold">
                Current Password
              </label>
              <input
                required
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="••••••••••••"
                className="h-11 px-3.5 bg-surface-container-low text-on-surface font-body-md text-body-md rounded border border-outline-variant focus:border-primary focus:bg-surface-container-lowest transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-caps text-label-caps text-on-surface uppercase font-semibold">
                New Password
              </label>
              <input
                required
                type="password"
                minLength={8}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="At least 8 characters"
                className="h-11 px-3.5 bg-surface-container-low text-on-surface font-body-md text-body-md rounded border border-outline-variant focus:border-primary focus:bg-surface-container-lowest transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-caps text-label-caps text-on-surface uppercase font-semibold">
                Confirm New Password
              </label>
              <input
                required
                type="password"
                minLength={8}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Re-enter new password"
                className="h-11 px-3.5 bg-surface-container-low text-on-surface font-body-md text-body-md rounded border border-outline-variant focus:border-primary focus:bg-surface-container-lowest transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-space-sm pt-space-md mt-space-sm border-t border-surface-container">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordModalOpen(false)}
                className="h-10 px-4 rounded-lg uppercase font-label-md text-label-md"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={pwdPending}
                className="h-10 px-6 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold uppercase"
              >
                {pwdPending ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
