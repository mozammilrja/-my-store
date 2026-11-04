import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Headset,
  Heart,
  ShoppingBag,
  SlidersHorizontal,
  ChevronDown,
  BookOpen,
  RefreshCw,
  BadgeCheck,
  Sparkles,
  Ruler,
  Truck,
  ArrowLeftRight,
  ArrowRight,
  ArrowLeft,
  X,
  User,
  Clock,
  Undo2,
  Flame,
  Star,
  Shirt,
  Footprints,
  Watch,
  Flower2,
  Lock,
  Award,
  Search,
  Check,
  Leaf,
  Hammer,
  Compass,
  Copy,
  type LucideProps,
} from "lucide-react"

type IconComponent = React.ComponentType<LucideProps>

const ICON_MAP: Record<string, IconComponent> = {
  // Navigation & UI
  support_agent: Headset,
  favorite_border: Heart,
  favorite: Heart,
  shopping_bag: ShoppingBag,
  filter_list: SlidersHorizontal,
  expand_more: ChevronDown,
  close: X,
  person: User,
  search: Search,
  check: Check,

  // Editorial & Guarantee
  auto_stories: BookOpen,
  published_with_changes: RefreshCw,
  verified: BadgeCheck,
  verified_user: BadgeCheck,
  lock: Lock,
  loyalty: Award,

  // Atelier & Origin
  eco: Leaf,
  handyman: Hammer,
  architecture: Compass,

  // Services & Specifications
  dry_cleaning: Sparkles,
  straighten: Ruler,
  local_shipping: Truck,
  swap_horizontal_circle: ArrowLeftRight,

  // Arrows & Directions
  arrow_forward: ArrowRight,
  west: ArrowLeft,
  east: ArrowRight,

  // Order & Timeline
  schedule: Clock,
  assignment_return: Undo2,

  // Department & Categories
  checkroom: Shirt,
  steps: Footprints,
  watch: Watch,
  spa: Flower2,

  // Marketing & Rating
  local_fire_department: Flame,
  star: Star,
  auto_awesome: Sparkles,
  content_copy: Copy,
}

export interface IconProps extends Omit<LucideProps, "ref"> {
  name: string
}

export function Icon({
  name,
  size = 20,
  className,
  strokeWidth = 1.75,
  fill = "none",
  ...props
}: IconProps) {
  const Component = ICON_MAP[name]

  if (Component) {
    return (
      <Component
        size={size}
        strokeWidth={strokeWidth}
        className={cn("inline-block shrink-0 align-middle", className)}
        fill={fill}
        {...props}
      />
    )
  }

  // Graceful fallback to self-hosted font ligature
  return (
    <span
      className={cn("material-symbols-outlined select-none", className)}
      style={size ? { fontSize: typeof size === "number" ? `${size}px` : size } : undefined}
      {...(props as React.HTMLAttributes<HTMLSpanElement>)}
    >
      {name}
    </span>
  )
}
