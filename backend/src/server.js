import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db.js';
import { resolveTenant } from './middlewares/tenantMiddleware.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import approvalRoutes from './routes/approvalRoutes.js';
import sseRoutes from './routes/sseRoutes.js';
import auditRoutes from './routes/auditRoutes.js';

// Load environment variables
dotenv.config();

// Initialize database connection
connectDB();

const app = express();

// Security & Parsing Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true, // Required for HttpOnly cookies
}));

app.use(express.json());
app.use(cookieParser());

// Resolve multi-tenant context globally for API routes
app.use('/api', resolveTenant);

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/requests', approvalRoutes);
app.use('/api/events', sseRoutes);
app.use('/api/audit-logs', auditRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'active', message: 'Aegis API is running securely.' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// Start Server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
