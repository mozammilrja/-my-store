"use client"

import { Button } from "@/components/ui/button"
import type { Address, Customer } from "@lib/api/types"
import { deleteAddress, saveAddress } from "@lib/data/account"
import { useActionState, useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

type Country = { code: string; name: string }
type Saved = Address & { id: string }

export function AddressBook({
  customer,
  countries,
}: {
  customer: Customer
  countries: Country[]
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"inline" | "drawer">("inline")
  const [editingAddress, setEditingAddress] = useState<Saved | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [defaultAddressId, setDefaultAddressId] = useState<string | null>(
    customer.addresses[0]?.id ?? null
  )

  const [addressType, setAddressType] = useState<"Home" | "Work" | "Studio" | "Other">("Home")
  const [state, formAction, pending] = useActionState(saveAddress, { error: null })
  const [formSent, setFormSent] = useState(false)
  const [, startTransition] = useTransition()
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (formSent && !pending) {
      if (!state.error) {
        toast.success(editingAddress ? "Address updated successfully" : "New address added to your atelier book")
        setFormOpen(false)
        setEditingAddress(null)
      } else {
        toast.error(state.error)
      }
      setFormSent(false)
    }
  }, [formSent, pending, state.error, editingAddress])

  const openAddForm = () => {
    setEditingAddress(null)
    setAddressType("Home")
    setFormOpen(true)
    if (formMode === "inline") {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 50)
    }
  }

  const openEditForm = (addr: Saved) => {
    setEditingAddress(addr)
    setAddressType((addr.company ? addr.company : "Home") as "Home" | "Work" | "Studio" | "Other")
    setFormOpen(true)
    if (formMode === "inline") {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 50)
    }
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingAddress(null)
  }

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    try {
      await deleteAddress(id)
      toast.success("Address removed from address book")
      setDeleteConfirmId(null)
    } catch {
      toast.error("Could not delete address. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSetDefault = (id: string) => {
    startTransition(() => {
      setDefaultAddressId(id)
      toast.success("Primary shipping address updated")
    })
  }

  const activeAddresses = customer.addresses

  // Shared Address Form Content
  const renderFormContent = (isDrawer = false) => (
    <form
      action={formAction}
      onSubmit={() => setFormSent(true)}
      className="space-y-space-md"
      data-testid="address-form"
    >
      {editingAddress && <input type="hidden" name="addressId" value={editingAddress.id} />}

      {/* Recipient Names */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
        <div className="flex flex-col gap-1.5">
          <label className="font-label-caps text-label-caps text-on-surface uppercase font-semibold">
            First Name <span className="text-error">*</span>
          </label>
          <input
            required
            name="firstName"
            defaultValue={editingAddress?.firstName ?? ""}
            placeholder="e.g. Sarah"
            className="h-11 px-3.5 bg-surface text-on-surface font-body-sm text-body-sm rounded-lg border border-outline-variant focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-label-caps text-label-caps text-on-surface uppercase font-semibold">
            Last Name <span className="text-error">*</span>
          </label>
          <input
            required
            name="lastName"
            defaultValue={editingAddress?.lastName ?? ""}
            placeholder="e.g. Jenkins"
            className="h-11 px-3.5 bg-surface text-on-surface font-body-sm text-body-sm rounded-lg border border-outline-variant focus:border-primary focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Contact Phone */}
      <div className="flex flex-col gap-1.5">
        <label className="font-label-caps text-label-caps text-on-surface uppercase font-semibold">
          Phone Number <span className="text-error">*</span>
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3.5 top-3 text-on-surface-variant text-[18px]">
            call
          </span>
          <input
            required
            name="phone"
            type="tel"
            defaultValue={editingAddress?.phone ?? ""}
            placeholder="+91 98765 43210"
            className="w-full h-11 pl-11 pr-3.5 bg-surface text-on-surface font-body-sm text-body-sm rounded-lg border border-outline-variant focus:border-primary focus:outline-none transition-colors"
          />
        </div>
        <p className="font-body-sm text-[11px] text-on-surface-variant">
          Required for courier delivery updates and dispatch OTP verification.
        </p>
      </div>

      {/* Street Address */}
      <div className="flex flex-col gap-1.5">
        <label className="font-label-caps text-label-caps text-on-surface uppercase font-semibold">
          Flat / House No. &amp; Street Address <span className="text-error">*</span>
        </label>
        <input
          required
          name="address1"
          defaultValue={editingAddress?.address1 ?? ""}
          placeholder="House/Flat no., Building or Villa name, Street coordinates"
          className="h-11 px-3.5 bg-surface text-on-surface font-body-sm text-body-sm rounded-lg border border-outline-variant focus:border-primary focus:outline-none transition-colors"
        />
      </div>

      {/* Landmark / Area */}
      <div className="flex flex-col gap-1.5">
        <label className="font-label-caps text-label-caps text-on-surface uppercase font-semibold">
          Landmark / Area / Suite (Optional)
        </label>
        <input
          name="address2"
          defaultValue={editingAddress?.address2 ?? ""}
          placeholder="e.g. Near Indiranagar Metro Station or 4th Block"
          className="h-11 px-3.5 bg-surface text-on-surface font-body-sm text-body-sm rounded-lg border border-outline-variant focus:border-primary focus:outline-none transition-colors"
        />
      </div>

      {/* City, State, PIN */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
        <div className="flex flex-col gap-1.5">
          <label className="font-label-caps text-label-caps text-on-surface uppercase font-semibold">
            City <span className="text-error">*</span>
          </label>
          <input
            required
            name="city"
            defaultValue={editingAddress?.city ?? ""}
            placeholder="Bengaluru"
            className="h-11 px-3.5 bg-surface text-on-surface font-body-sm text-body-sm rounded-lg border border-outline-variant focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-label-caps text-label-caps text-on-surface uppercase font-semibold">
            State / Province
          </label>
          <input
            name="province"
            defaultValue={editingAddress?.province ?? ""}
            placeholder="Karnataka"
            className="h-11 px-3.5 bg-surface text-on-surface font-body-sm text-body-sm rounded-lg border border-outline-variant focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-label-caps text-label-caps text-on-surface uppercase font-semibold">
            PIN / Postal Code <span className="text-error">*</span>
          </label>
          <input
            required
            name="postalCode"
            defaultValue={editingAddress?.postalCode ?? ""}
            placeholder="560034"
            className="h-11 px-3.5 bg-surface text-on-surface font-body-sm text-body-sm rounded-lg border border-outline-variant focus:border-primary focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Country & Address Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md pt-1">
        <div className="flex flex-col gap-1.5">
          <label className="font-label-caps text-label-caps text-on-surface uppercase font-semibold">
            Country <span className="text-error">*</span>
          </label>
          <select
            required
            name="countryCode"
            defaultValue={editingAddress?.countryCode ?? "in"}
            className="h-11 px-3.5 bg-surface text-on-surface font-body-sm text-body-sm rounded-lg border border-outline-variant focus:border-primary focus:outline-none transition-colors"
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-label-caps text-label-caps text-on-surface uppercase font-semibold">
            Address Classification
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { type: "Home" as const, icon: "home" },
              { type: "Work" as const, icon: "business" },
              { type: "Studio" as const, icon: "palette" },
              { type: "Other" as const, icon: "pin_drop" },
            ].map(({ type, icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => setAddressType(type)}
                className={`h-11 rounded-lg border text-[11px] font-label-caps uppercase font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  addressType === type
                    ? "bg-primary text-on-primary border-primary shadow-xs"
                    : "bg-surface-container-low text-on-surface border-outline-variant/60 hover:bg-surface-container"
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{icon}</span>
                <span>{type}</span>
              </button>
            ))}
            <input type="hidden" name="company" value={addressType} />
          </div>
        </div>
      </div>

      {state.error && (
        <div
          className="p-3 bg-error-container/40 border border-error/30 rounded-lg text-error font-body-sm text-xs"
          role="alert"
        >
          {state.error}
        </div>
      )}

      {/* Action Footer */}
      <div
        className={`pt-space-md border-t border-surface-container flex items-center justify-end gap-3 ${
          isDrawer ? "sticky bottom-0 bg-surface-container-lowest pb-2" : ""
        }`}
      >
        <Button
          type="button"
          variant="outline"
          onClick={closeForm}
          className="h-11 px-5 rounded-lg uppercase font-label-sm font-semibold cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={pending}
          className="h-11 px-6 bg-primary text-on-primary hover:bg-inverse-surface rounded-lg uppercase font-label-sm font-semibold shadow-xs cursor-pointer"
        >
          {pending ? "Saving..." : editingAddress ? "Update Destination" : "Save Destination"}
        </Button>
      </div>
    </form>
  )

  return (
    <div className="flex flex-col gap-space-lg w-full" data-testid="address-book">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-space-md pb-space-lg border-b border-surface-container-high">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-label-caps text-label-caps text-secondary uppercase tracking-[0.2em] font-bold">
              Address Book
            </span>
            <span className="text-on-surface-variant/40">/</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-medium">
              Management
            </span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-medium uppercase">
            My Addresses
          </h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Presentation Mode Selector: Inline vs Side Drawer */}
          <div className="flex items-center bg-surface-container-low p-1 rounded-lg border border-surface-container-high text-xs font-label-sm">
            <button
              type="button"
              onClick={() => setFormMode("inline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                formMode === "inline"
                  ? "bg-surface-container-lowest text-on-surface shadow-2xs font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              title="Expand form inline on page (no modal popup)"
            >
              <span className="material-symbols-outlined text-[15px]">view_agenda</span>
              <span>Inline</span>
            </button>
            <button
              type="button"
              onClick={() => setFormMode("drawer")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                formMode === "drawer"
                  ? "bg-surface-container-lowest text-on-surface shadow-2xs font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              title="Slide form from right side drawer"
            >
              <span className="material-symbols-outlined text-[15px]">side_navigation</span>
              <span>Side Drawer</span>
            </button>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="h-11 px-6 bg-primary text-on-primary hover:bg-inverse-surface transition-colors font-label-md text-label-md uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            data-testid="add-address-button"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Add New Address</span>
          </button>
        </div>
      </div>

      {/* 2. In-Page Inline Expandable Form (Way 1 - Primary) */}
      {formOpen && formMode === "inline" && (
        <div
          ref={formRef}
          className="bg-surface-container-lowest p-space-lg lg:p-space-xl rounded-2xl shadow-sm border-2 border-primary/20 relative animate-in fade-in slide-in-from-top-4 duration-300 ring-4 ring-primary/5"
        >
          {/* Form Header */}
          <div className="flex items-center justify-between pb-space-md mb-space-lg border-b border-surface-container">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">
                  {editingAddress ? "edit_location_alt" : "add_location_alt"}
                </span>
              </div>
              <div>
                <span className="font-label-caps text-label-caps text-secondary uppercase font-bold tracking-wider block">
                  {editingAddress ? "Update Existing Coordinates" : "New Atelier Destination"}
                </span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  {editingAddress ? `Edit Address: ${editingAddress.firstName} ${editingAddress.lastName}` : "Add Shipping Address"}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer"
              title="Close form"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Form Body */}
          {renderFormContent(false)}
        </div>
      )}

      {/* 3. Address Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        {activeAddresses.map((addr, idx) => {
          const isDefault = defaultAddressId ? addr.id === defaultAddressId : idx === 0
          const typeLabel = addr.company?.toLowerCase().includes("work")
            ? "Work"
            : addr.company?.toLowerCase().includes("studio")
            ? "Studio"
            : "Home"

          const isCurrentlyEditing = editingAddress?.id === addr.id

          return (
            <div
              key={addr.id}
              className={`bg-surface-container-lowest p-space-lg rounded-xl shadow-xs flex flex-col justify-between transition-all hover:shadow-md relative group border ${
                isCurrentlyEditing
                  ? "border-primary ring-2 ring-primary/10 shadow-sm"
                  : "border-surface-container-high/60"
              }`}
              data-testid="address-container"
            >
              <div>
                <div className="flex items-start justify-between gap-space-sm mb-space-md">
                  <div className="flex items-center gap-2">
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold capitalize">
                      {addr.firstName} {addr.lastName}
                    </span>
                    <span className="bg-surface-container text-on-surface-variant font-label-caps text-label-caps px-2.5 py-0.5 rounded uppercase font-semibold">
                      {typeLabel}
                    </span>
                    {isCurrentlyEditing && (
                      <span className="bg-primary text-on-primary font-label-caps text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">
                        Editing
                      </span>
                    )}
                  </div>

                  {isDefault && (
                    <span className="bg-secondary-fixed text-on-secondary-fixed font-label-caps text-label-caps px-2.5 py-1 rounded-full uppercase font-bold flex items-center gap-1 shadow-2xs">
                      <span className="material-symbols-outlined text-[13px]">check_circle</span>
                      <span>Default</span>
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 mb-space-lg text-on-surface-variant font-body-md text-body-md">
                  <p className="text-on-surface font-medium">{addr.address1}</p>
                  {addr.address2 && <p>{addr.address2}</p>}
                  <p>
                    {addr.city}, {addr.province ? `${addr.province} - ` : ""}
                    {addr.postalCode}
                  </p>
                  <p className="uppercase font-label-caps text-[10px] text-outline tracking-wider">
                    {addr.countryCode}
                  </p>
                  {addr.phone && (
                    <div className="pt-2 flex items-center gap-2 text-on-surface font-medium text-sm">
                      <span className="material-symbols-outlined text-[16px] text-outline">call</span>
                      <span>{addr.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* In-Card Inline Delete Confirmation */}
              {deleteConfirmId === addr.id ? (
                <div className="pt-space-md border-t border-error/30 mt-auto bg-error-container/20 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-error font-body-sm text-xs font-semibold">
                    <span className="material-symbols-outlined text-[16px]">warning</span>
                    <span>Remove this address from your book?</span>
                  </div>
                  <div className="flex items-center gap-2 self-end">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-3 py-1.5 text-xs font-label-sm text-on-surface hover:bg-surface-container rounded transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleDelete(addr.id)}
                      className="px-3 py-1.5 text-xs font-label-sm bg-error text-on-error hover:bg-error/90 font-semibold rounded transition-colors cursor-pointer"
                    >
                      {isDeleting ? "Deleting..." : "Confirm Delete"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-space-md border-t border-surface-container-high flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(addr)}
                      className="h-9 px-4 bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm uppercase rounded transition-colors flex items-center gap-1.5 cursor-pointer border border-surface-container-high"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(addr.id)}
                      className="h-9 px-4 bg-surface-container-low hover:bg-error-container hover:text-on-error-container text-on-surface font-label-sm text-label-sm uppercase rounded transition-colors flex items-center gap-1.5 cursor-pointer border border-surface-container-high"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                      <span>Delete</span>
                    </button>
                  </div>

                  {isDefault ? (
                    <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
                      Primary Shipping
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(addr.id)}
                      className="font-label-sm text-label-sm text-secondary hover:text-on-secondary-container font-semibold uppercase transition-colors cursor-pointer"
                    >
                      Set as Default
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* 4. Add Another Address Prompt Card */}
        <div
          onClick={openAddForm}
          className="border-2 border-dashed border-outline-variant hover:border-on-surface bg-surface-container-low/50 hover:bg-surface-container-low p-space-lg rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[260px] group"
        >
          <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center mb-space-md group-hover:bg-primary group-hover:text-on-primary transition-colors text-on-surface">
            <span className="material-symbols-outlined text-[28px]">add</span>
          </div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-1">
            Add Another Address
          </h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
            Save alternate shipping locations for seamless seasonal gift deliveries or workspace transfers.
          </p>
        </div>
      </div>

      {/* 5. Slide-Over Side Drawer (Way 2 - High-Fashion Sheet) */}
      {formOpen && formMode === "drawer" && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          {/* Subtle backdrop */}
          <div
            className="absolute inset-0 bg-inverse-surface/35 backdrop-blur-xs transition-opacity"
            onClick={closeForm}
          />

          {/* Slide Drawer Sheet */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-50">
            <div className="w-screen max-w-xl bg-surface-container-lowest shadow-2xl flex flex-col border-l border-surface-container-high animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="px-space-lg py-space-md border-b border-surface-container-high bg-surface-container-low flex items-center justify-between">
                <div>
                  <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider block font-bold">
                    Atelier Destination Drawer
                  </span>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold mt-0.5">
                    {editingAddress ? "Edit Shipping Address" : "Add New Address"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeForm}
                  className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors cursor-pointer"
                  title="Close drawer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Drawer Form Body */}
              <div className="p-space-lg overflow-y-auto flex-1">
                {renderFormContent(true)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
