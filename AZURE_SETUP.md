# Azure Document Intelligence Setup Guide

Azure Document Intelligence (formerly Form Recognizer) is an optional but powerful service for extracting fields with bounding boxes from any PDF, even non-form documents.

## Why Azure?

- **Auto-detects key-value pairs** without training
- Returns **pixel-accurate bounding boxes** for field positions
- Works with **scanned/image-based PDFs** (includes OCR)
- Handles **complex multi-column layouts** (perfect for EICR-style forms)
- Free tier: **500 pages/month**

## Setup Steps

### 1. Create an Azure Account

If you don't have one:
- Go to https://azure.microsoft.com/free
- Sign up (requires credit card but free tier is genuinely free)
- You get $200 credit for 30 days + always-free services

### 2. Create a Document Intelligence Resource

1. Go to https://portal.azure.com
2. Click **"Create a resource"**
3. Search for **"Document Intelligence"** (or "Form Recognizer")
4. Click **"Create"**
5. Fill in:
   - **Subscription**: Your subscription
   - **Resource group**: Create new or use existing (e.g., `ai-certify-rg`)
   - **Region**: Choose closest to you (e.g., `UK South`, `West Europe`, `East US`)
   - **Name**: Something memorable (e.g., `ai-certify-doc-intel`)
   - **Pricing tier**: Select **Free F0** (500 pages/month)
6. Click **"Review + create"** → **"Create"**

### 3. Get Your Keys

Once deployment completes:
1. Click **"Go to resource"**
2. In the left sidebar, click **"Keys and Endpoint"**
3. Copy:
   - **KEY 1** (or KEY 2, either works)
   - **Endpoint** (looks like `https://ai-certify-doc-intel.cognitiveservices.azure.com`)

### 4. Add to Your Environment

Add these to your `.env` file:

```bash
AZURE_FORM_RECOGNIZER_ENDPOINT=https://YOUR-RESOURCE-NAME.cognitiveservices.azure.com
AZURE_FORM_RECOGNIZER_KEY=your_32_character_key_here
```

Replace:
- `YOUR-RESOURCE-NAME` with your actual resource name
- `your_32_character_key_here` with KEY 1

### 5. Restart Your Dev Server

```bash
# Press Ctrl+C to stop the current server, then:
pnpm run dev
```

### 6. Test It

1. Go to http://localhost:4001/admin/reports/disseminator
2. Upload or select a PDF template
3. Click **"Azure AI (optional)"**
4. You should see fields with bounding boxes extracted automatically

## Usage Limits

**Free Tier (F0):**
- 500 pages/month
- 20 concurrent requests
- No cost

**Standard Tier (S0)** (if you need more):
- $1.50 per 1,000 pages
- Unlimited throughput

## Troubleshooting

**Error: "quota exceeded"**
- You've hit the 500 pages/month free tier limit
- Wait until next month or upgrade to Standard tier

**Error: "access denied"**
- Check your KEY is correct
- Verify the endpoint URL format

**Error: "resource not found"**
- Make sure the endpoint matches your resource's region
- Check the resource is deployed and running

## Alternative: Skip Azure

If you don't want to set up Azure:
- Use **"Auto-extract (AcroForm)"** for PDFs with embedded form fields
- Use **"OCR Text"** for simple text extraction via pdf-parse
- Manually add fields with the **"Add Field"** button

Azure is most useful for complex reports without pre-existing form fields.
