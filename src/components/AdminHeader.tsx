// src/components/AdminHeader.tsx
import { Button } from '@/components/ui/button'
import Masthead from './Masthead'

interface AdminHeaderProps {
  onDownloadCSV: () => void
  onManageAdmins?: () => void
  onLogout?: () => void
}

export function AdminHeader({ onDownloadCSV, onManageAdmins, onLogout }: AdminHeaderProps) {
  const logo = (
    <div className="w-9 h-9 bg-[#1E293B] rounded-md flex items-center justify-center">
      <img
        src="https://d64gsuwffb70l.cloudfront.net/683946324043f54d19950def_1748962689213_38277572.png"
        alt="Dine Deals Logo"
        className="w-5 h-5 object-contain"
      />
    </div>
  )

  const actions = (
    <>
      {onManageAdmins && (
        <Button
          onClick={onManageAdmins}
          variant="outline"
          size="sm"
          className="bg-[#1E293B] text-white border border-[#334155] hover:bg-[#334155] hover:text-white"
        >
          Manage Admins
        </Button>
      )}

      <Button
        onClick={onDownloadCSV}
        variant="outline"
        size="sm"
        className="bg-[#1E293B] text-white border border-[#334155] hover:bg-[#334155] hover:text-white"
      >
        Export CSV
      </Button>

      {onLogout && (
        <Button
          onClick={() => onLogout?.()}
          variant="outline"
          size="sm"
          className="bg-transparent text-[#E2E8F0] border border-[#334155] hover:bg-[#1E293B]"
        >
          Sign out
        </Button>
      )}
    </>
  )

  return (
    <div className="bg-[#0F172A] border-b border-[#1E293B] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <Masthead
            logo={logo}
            title="Dine Deals Admin"
            subtitle="User Management Dashboard"
            showNotifications={false}   // ✅ THIS REMOVES THE BELL
            titleClassName="text-lg sm:text-xl font-semibold text-white"
            subtitleClassName="text-xs sm:text-sm text-[#94A3B8]"
            containerClassName="pl-0 pr-0 py-0"
          />

          <div className="flex items-center gap-2 sm:gap-3">
            {actions}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminHeader