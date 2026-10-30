"use client"

import { useState } from "react"
import { CategoryNavPanel } from "./components/category-nav-panel"
import { QuickPredictionsPanel } from "./components/quick-predictions-panel"
import { CategoryShortcuts } from "./components/category-shortcuts"
import { ModernHeritageWardrobe } from "./components/modern-heritage-wardrobe"
import { ServiceGuarantee } from "./components/service-guarantee"

export function MarketplaceView() {
  const [activeTab, setActiveTab] = useState("womens-atelier")
  const [searchLensActive, setSearchLensActive] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  return (
    <main className="w-full bg-background">
      <div className="flex flex-col w-full relative">
        {/* Interactive Women's Category Mega-Menu Panel */}
        <CategoryNavPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          searchLensActive={searchLensActive}
          onToggleSearchLens={() => setSearchLensActive((prev) => !prev)}
          dismissed={dismissed}
          onDismiss={() => setDismissed(true)}
        />

        {/* Omnichannel Quick Predictions Panel (Toggled by Search Lens) */}
        <QuickPredictionsPanel visible={searchLensActive} />

        {/* Category Shortcuts Bar */}
        <CategoryShortcuts />

        {/* The Modern Heritage Wardrobe - 4 Product Grid */}
        <ModernHeritageWardrobe />

        {/* Omnichannel Service Guarantee Box */}
        <ServiceGuarantee />
      </div>
    </main>
  )
}
