'use client'

import { useSearchParams, useRouter } from 'next/navigation'

export default function PaymentFailedPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('orderId')

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
        <div className="text-red-500 text-6xl mb-4">✕</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">გადახდა ვერ შესრულდა</h1>
        <p className="text-gray-600 mb-6">
          სამწუხაროდ, გადახდა ვერ განხორციელდა. გთხოვთ სცადოთ თავიდან.
        </p>
        {orderId && (
          <p className="text-sm text-gray-400 mb-6">შეკვეთის ID: {orderId}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            ხელახლა ცდა
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            მთავარ გვერდზე
          </button>
        </div>
      </div>
    </div>
  )
}
