# Google Cloud Vision Setup Guide

## For Production OCR

To enable high-quality OCR for electrical inspection images, you can set up Google Cloud Vision API:

### 1. Get Google Cloud Vision API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Vision API
4. Create an API key in "APIs & Services" > "Credentials"
5. Copy the API key

### 2. Update Environment Variables

Replace `your-google-cloud-vision-api-key-here` in your `.env` file with your actual API key:

```env
GOOGLE_CLOUD_VISION_API_KEY=AIzaSyC...your-key-here
```

### 3. Test the Setup

The system will automatically use Google Cloud Vision when the API key is available. If the API key is missing or invalid, it will fall back to mock data for development.

### Alternative: Service Account (More Secure)

For production deployments, consider using a service account instead of an API key:

1. Create a service account in Google Cloud Console
2. Download the JSON key file
3. Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the path of the JSON file
4. Remove the `GOOGLE_CLOUD_VISION_API_KEY` from .env

The OCR implementation will automatically detect and use the appropriate authentication method.