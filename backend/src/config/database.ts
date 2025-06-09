// We no longer need dotenv here as it's handled in index.ts
// import dotenv from 'dotenv';
// dotenv.config();

export const config = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/opensource-tms',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  emailConfig: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || ''
    }
  },
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  saferApiKey: process.env.SAFER_API_KEY || '',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  awsRegion: process.env.AWS_REGION || '',
  s3BucketName: process.env.S3_BUCKET_NAME || '',
  fileStorageStrategy: process.env.FILE_STORAGE_STRATEGY || 'local',
};