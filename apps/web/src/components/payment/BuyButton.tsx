'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { initiatePayment } from '@/lib/api/paymentApi'

interface BuyButtonProps {
  courseId: string
  price: number
  originalPrice?: number // თუ ფასდაკლებაა
  disabled?: boolean
  className?: string
}

export default function BuyButton({
  courseId,
  price,
  originalPrice,
  disabled = false,
  className = '',
}: BuyButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [showPromoInput, setShowPromoInput] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleBuy = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await initiatePayment(courseId, promoCode || undefined)

      if (response.success && response.data?.redirectUrl) {
        // გადამისამართება BOG-ის გადახდის გვერდზე
        window.location.href = response.data.redirectUrl
      } else {
        setError(response.message || 'შეცდომა მოხდა')
      }
    } catch (err: any) {
      // თუ არ არის ავტორიზებული - გადამისამართება login-ზე
      if (err.response?.status === 401) {
        router.push('/auth/login')
        return
      }
      setError('შეცდომა მოხდა. გთხოვთ სცადოთ თავიდან.')
    } finally {
      setLoading(false)
    }
  }

  const hasDiscount = originalPrice && originalPrice > price

  return (
    <div className="space-y-3">
      {/* ფასი */}
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-gray-900">{price} ₾</span>
        {hasDiscount && (
          <span className="text-lg text-gray-400 line-through">{originalPrice} ₾</span>
        )}
      </div>

      {/* პრომო კოდის სექცია */}
      {showPromoInput ? (
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="შეიყვანე პრომო კოდი"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900 focus:border-primary-900 transition-colors"
                disabled={loading}
              />
            </div>
            <button
              onClick={() => {
                setShowPromoInput(false)
                setPromoCode('')
              }}
              className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
              title="გაუქმება"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {promoCode && (
            <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-primary-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              კოდი გამოყენებული იქნება გადახდისას
            </p>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowPromoInput(true)}
          className="flex items-center gap-1.5 text-sm text-primary-900 hover:text-primary-700 transition-colors"
          disabled={loading}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          გაქვს პრომო კოდი?
        </button>
      )}

      {/* შეცდომის შეტყობინება */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* შეძენის ღილაკი */}
      <button
        onClick={handleBuy}
        disabled={disabled || loading}
        className={`
          w-full px-6 py-3
          bg-accent-600 text-white
          rounded-lg font-semibold
          hover:bg-accent-700
          disabled:opacity-50 disabled:cursor-not-allowed
          transition
          ${className}
        `}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            მიმდინარეობს...
          </span>
        ) : (
          `შეძენა - ${price} ₾`
        )}
      </button>
    </div>
  )
}
