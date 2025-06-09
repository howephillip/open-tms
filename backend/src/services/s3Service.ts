import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from '../config/database';
import { logger } from "../utils/logger";

const s3Client = new S3Client({
    region: config.awsRegion, // Now reads from our central config
    credentials: {
        accessKeyId: config.awsAccessKeyId, // Now reads from our central config
        secretAccessKey: config.awsSecretAccessKey, // Now reads from our central config
    }
});

export class S3Service {
    public async uploadFile(file: Express.Multer.File): Promise<{ key: string; location: string }> {
        const key = `uploads/${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
        
        const command = new PutObjectCommand({
            Bucket: config.s3BucketName, // Reads from config
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        });

        try {
            await s3Client.send(command);
            const location = `https://${config.s3BucketName}.s3.${config.awsRegion}.amazonaws.com/${key}`;
            logger.info(`File uploaded successfully to S3: ${key}`);
            return { key, location };
        } catch (error) {
            logger.error('Error uploading file to S3:', error);
            throw new Error('S3 upload failed.');
        }
    }

    public async getSignedUrl(key: string): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: config.s3BucketName,
            Key: key,
        });
        return getSignedUrl(s3Client, command, { expiresIn: 3600 });
    }

    public async deleteFile(key: string): Promise<void> {
        const command = new DeleteObjectCommand({
            Bucket: config.s3BucketName,
            Key: key,
        });

        try {
            await s3Client.send(command);
            logger.info(`File deleted successfully from S3: ${key}`);
        } catch (error) {
            logger.error(`Error deleting file from S3: ${key}`, error);
        }
    }
    
    public async getDownloadUrl(doc: any): Promise<string> {
        if (!doc || !doc.s3Key) {
            throw new Error("Document key is missing for generating signed URL.");
        }
        
        const command = new GetObjectCommand({
            Bucket: config.s3BucketName,
            Key: doc.s3Key,
        });

        // The URL will be valid for 1 hour by default.
        return getSignedUrl(s3Client, command, { expiresIn: 3600 });
    }
}