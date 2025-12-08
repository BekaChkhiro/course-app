'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { checkPaymentStatus } from '@/lib/api/paymentApi'

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('orderId')

  const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'error'>('loading')
  const [courseSlug, setCourseSlug] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    if (!orderId) {
      setStatus('error')
      setErrorMessage('შეკვეთის ID ვერ მოიძებნა')
      return
    }

    const checkStatus = async () => {
      try {
        const response = await checkPaymentStatus(orderId)

        if (response.success && response.data) {
          setCourseSlug(response.data.course.slug)

          if (response.data.status === 'COMPLETED') {
            setStatus('success')
          } else if (response.data.status === 'PENDING') {
            setStatus('pending')
            // თუ ჯერ pending-ია, 3 წამში ხელახლა შევამოწმოთ
            setTimeout(checkStatus, 3000)
          } else {
            setStatus('error')
            setErrorMessage('გადახდა ვერ დადასტურდა')
          }
        } else {
          setStatus('error')
          setErrorMessage(response.message || 'შეცდომა მოხდა')
        }
      } catch (error) {
        setStatus('error')
        setErrorMessage('სერვერთან კავშირი ვერ მოხერხდა')
      }
    }

    checkStatus()
  }, [orderId])

  // Loading / Pending state
  if (status === 'loading' || status === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">გადახდის დადასტურება...</p>
      </div>
    )
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">✕</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">შეცდომა</h1>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            მთავარ გვერდზე დაბრუნება
          </button>
        </div>
      </div>
    )
  }

  // Success state
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
        <div className="text-green-500 text-6xl mb-4">✓</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">გადახდა წარმატებულია!</h1>
        <p className="text-gray-600 mb-6">თქვენ წარმატებით შეიძინეთ კურსი</p>
        <button
          onClick={() => router.push(`/dashboard/courses/${courseSlug}`)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          სწავლის დაწყება
        </button>
      </div>
    </div>
  )
}
