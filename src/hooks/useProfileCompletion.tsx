import { useState, useEffect } from 'react'
import { Merchant, Customer } from '@/types'

export const useProfileCompletion = (
  merchant: Merchant | null,
  customer: Customer | null
) => {
  const [shouldShowModal, setShouldShowModal] = useState(false)
  const [hasShownModal, setHasShownModal] = useState(false)

  const isMerchantProfileIncomplete = (m: Merchant | null): boolean => {
    if (!m) return false

    // 🔒 SINGLE SOURCE OF TRUTH
    if (typeof (m as any).profile_complete === 'boolean') {
      return !(m as any).profile_complete
    }

    // If we do not yet know, assume NOT incomplete
    return false
  }

  const isCustomerProfileIncomplete = (c: Customer | null): boolean => {
    if (!c) return false

    // 🔒 SINGLE SOURCE OF TRUTH
    if (typeof (c as any).profile_complete === 'boolean') {
      return !(c as any).profile_complete
    }

    // If we do not yet know, assume NOT incomplete
    return false
  }

  const shouldShowModalForUser = (): boolean => {
    const isMerchant = !!merchant
    const isCustomer = !!customer

    if (!isMerchant && !isCustomer) return false

    const userId = (merchant as any)?.id || (customer as any)?.id
    if (!userId) return false

    const key = `profile_completion_dismissed_${userId}`
    if (sessionStorage.getItem(key)) return false

    const incomplete = isMerchant
      ? isMerchantProfileIncomplete(merchant)
      : isCustomerProfileIncomplete(customer)

    return incomplete
  }

  const markModalAsShown = () => {
    const userId = (merchant as any)?.id || (customer as any)?.id
    if (userId) {
      sessionStorage.setItem(`profile_completion_dismissed_${userId}`, 'true')
    }
    setHasShownModal(true)
    setShouldShowModal(false)
  }

  useEffect(() => {
    if ((merchant || customer) && !hasShownModal) {
      const shouldShow = shouldShowModalForUser()
      if (shouldShow) {
        const timer = setTimeout(() => setShouldShowModal(true), 1000)
        return () => clearTimeout(timer)
      }
    }
  }, [merchant, customer, hasShownModal])

  return {
    shouldShowModal,
    setShouldShowModal,
    markModalAsShown,
    isProfileIncomplete: merchant
      ? isMerchantProfileIncomplete(merchant)
      : isCustomerProfileIncomplete(customer),
  }
}
