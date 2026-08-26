import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
    },
});

export const uploadFileToS3 = async (file) => {

    if (!file) {
        throw new Error('No se proporcionó ningún archivo');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new Error('Formato de imagen no válido. Solo se permiten archivos JPEG, PNG o WEBP.');
    }
    const fileKey = `profile-${Date.now()}-${file.originalname}`;

    const uploadParams = {
        Bucket: process.env.AWS_S3_NAME,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    return fileKey;
};

export const getSignedFileUrl = async (fileKey) => {
    if (!fileKey) return null;

    const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_NAME,
        Key: fileKey,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return signedUrl;
};

export const formatUserProfilePicture = async (profilePicture) => {
    if (!profilePicture) return null;

    if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
        return profilePicture;
    }

    try {
        return await getSignedFileUrl(profilePicture);
    } catch (error) {
        console.error('Error al generar URL firmada para S3:', error);
        return null;
    }
};