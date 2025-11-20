import express, { Application, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import path from 'path'
import authRoutes from './routes/authRoutes'

// Load environment variables from the correct path
dotenv.config({ path: path.resolve(__dirname, '../.env') })

// Validate required environment variables
if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error('❌ Missing required environment variables!')
  console.error('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'MISSING')
  console.error('JWT_REFRESH_SECRET:', process.env.JWT_REFRESH_SECRET ? 'SET' : 'MISSING')
  process.exit(1)
}

const app: Application = express()
const PORT = process.env.PORT || 4000

// Trust proxy for Railway deployment
app.set('trust proxy', 1)

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}))
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  })
})

// API routes
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'E-Learning Platform API',
    version: process.env.API_VERSION || 'v1'
  })
})

// Authentication routes
app.use('/api/auth', authRoutes)

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack)
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' })
})

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
  console.log(`📚 Environment: ${process.env.NODE_ENV}`)
})

export default app
