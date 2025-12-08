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
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="პრომო კოდი"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={() => setShowPromoInput(false)}
            className="px-3 py-2 text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            გაუქმება
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowPromoInput(true)}
          className="text-sm text-blue-600 hover:text-blue-700"
          disabled={loading}
        >
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
          bg-blue-600 text-white
          rounded-lg font-semibold
          hover:bg-blue-700
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
