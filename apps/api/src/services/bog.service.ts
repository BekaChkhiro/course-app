import crypto from 'crypto'

// eslint-disable-next-line import/no-unresolved
import axios, { AxiosInstance } from 'axios'

interface BOGTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface BOGOrderRequest {
  callback_url: string
  external_order_id: string
  purchase_units: {
    currency: string
    total_amount: number
    basket: Array<{
      product_id: string
      description?: string
      quantity: number
      unit_price: number
    }>
  }
  redirect_urls: {
    success: string
    fail: string
  }
  ttl?: number
}

interface BOGOrderResponse {
  id: string
  _links: {
    details: { href: string }
    redirect: { href: string }
  }
}

interface BOGPaymentDetails {
  order_id: string
  external_order_id: string
  order_status: {
    key: string
    value: string
  }
  purchase_units: {
    request_amount: string
    transfer_amount: string
    currency_code: string
  }
  payment_detail?: {
    transfer_method: {
      key: string
      value: string
    }
    transaction_id: string
    payer_identifier: string
    card_type: string
  }
}

class BOGService {
  private accessToken: string | null = null
  private tokenExpiresAt: number = 0
  private axiosInstance: AxiosInstance

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 30000,
    })
  }

  // Lazy getters - იკითხება მხოლოდ როცა საჭიროა
  private get clientId(): string {
    return process.env.BOG_CLIENT_ID || ''
  }

  private get clientSecret(): string {
    return process.env.BOG_CLIENT_SECRET || ''
  }

  private get apiUrl(): string {
    return process.env.BOG_API_URL || 'https://api.bog.ge'
  }

  private get authUrl(): string {
    return process.env.BOG_AUTH_URL || 'https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token'
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now()

    if (this.accessToken && this.tokenExpiresAt > now + 6000) {
      return this.accessToken
    }

    try {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')

      const response = await this.axiosInstance.post<BOGTokenResponse>(
        this.authUrl,
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`,
          },
        }
      )

      this.accessToken = response.data.access_token
      this.tokenExpiresAt = now + response.data.expires_in * 1000

      console.log('✅ BOG access token obtained successfully')
      return this.accessToken
    } catch (error: any) {
      console.error('❌ Failed to get BOG access token:', error.response?.data || error.message)
      throw new Error('BOG authentication failed')
    }
  }

  async createOrder(params: {
    externalOrderId: string
    amount: number
    currency?: string
    courseId: string
    courseTitle: string
    callbackUrl: string
    successUrl: string
    failUrl: string
    ttl?: number
    language?: 'ka' | 'en'
  }): Promise<BOGOrderResponse> {
    const token = await this.getAccessToken()

    const orderRequest: BOGOrderRequest = {
      callback_url: params.callbackUrl,
      external_order_id: params.externalOrderId,
      purchase_units: {
        currency: params.currency || 'GEL',
        total_amount: params.amount,
        basket: [
          {
            product_id: params.courseId,
            description: params.courseTitle,
            quantity: 1,
            unit_price: params.amount,
          },
        ],
      },
      redirect_urls: {
        success: params.successUrl,
        fail: params.failUrl,
      },
      ttl: params.ttl || 15,
    }

    try {
      const response = await this.axiosInstance.post<BOGOrderResponse>(
        `${this.apiUrl}/payments/v1/ecommerce/orders`,
        orderRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'Accept-Language': params.language || 'ka',
          },
        }
      )

      console.log('✅ BOG order created:', response.data.id)
      return response.data
    } catch (error: any) {
      console.error('❌ Failed to create BOG order:', error.response?.data || error.message)
      throw new Error(error.response?.data?.message || 'Failed to create payment order')
    }
  }

  async getOrderDetails(orderId: string): Promise<BOGPaymentDetails> {
    const token = await this.getAccessToken()

    try {
      const response = await this.axiosInstance.get<BOGPaymentDetails>(
        `${this.apiUrl}/payments/v1/receipt/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      return response.data
    } catch (error: any) {
      console.error('❌ Failed to get BOG order details:', error.response?.data || error.message)
      throw new Error(error.response?.data?.message || 'Failed to get payment details')
    }
  }

  verifyCallbackSignature(body: string, signature: string): boolean {
    const publicKey = `-----BEGIN PUBLIC KEY-----
  MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu4RUyAw3+CdkS3ZNILQh
  zHI9Hemo+vKB9U2BSabppkKjzjjkf+0Sm76hSMiu/HFtYhqWOESryoCDJoqffY0Q
  1VNt25aTxbj068QNUtnxQ7KQVLA+pG0smf+EBWlS1vBEAFbIas9d8c9b9sSEkTrr
  TYQ90WIM8bGB6S/KLVoT1a7SnzabjoLc5Qf/SLDG5fu8dH8zckyeYKdRKSBJKvhx
  tcBuHV4f7qsynQT+f2UYbESX/TLHwT5qFWZDHZ0YUOUIvb8n7JujVSGZO9/+ll/g
  4ZIWhC1MlJgPObDwRkRd8NFOopgxMcMsDIZIoLbWKhHVq67hdbwpAq9K9WMmEhPn
  PwIDAQAB
  -----END PUBLIC KEY-----`
    try {
      const verifier = crypto.createVerify('SHA256')
      verifier.update(body)
      return verifier.verify(publicKey, signature, 'base64')
    } catch (error) {
      console.error('❌ Signature verification failed:', error)
      return false
    }
  }
}

export const bogService = new BOGService()
