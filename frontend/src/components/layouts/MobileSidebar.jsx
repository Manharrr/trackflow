import { Menu } from 'lucide-react'

export default function MobileSidebar() {
  return (
    <button
      className="
        md:hidden
        p-2
        rounded-lg
        border
      "
    >
      <Menu size={22} />
    </button>
  )
}