# Hindi Translation Assistant (हिंदी अनुवाद सहायक)

A fast, friendly translation assistant with playful text animations that translates text to Hindi by default, with support for multiple languages.

## Deployment

### Vercel Setup

1. **Create a DeepL Account**
   - Sign up at [https://www.deepl.com/pro](https://www.deepl.com/pro)
   - Get your DeepL API key from the account settings

2. **Set up Environment Variable in Vercel**
   - Go to your Vercel project settings
   - Navigate to Environment Variables
   - Add a new variable:
     - Name: `DEEPL_API_KEY`
     - Value: Your DeepL API key
   - Make sure to add this variable for all environments (Production, Preview, Development)

3. **Deploy to Vercel**
   - Push your code to GitHub/GitLab/Bitbucket
   - Import the project in Vercel
   - Vercel will automatically detect the configuration and deploy

## Features

- **Auto-detection**: Automatically detects the source language
- **Hindi by default**: Translates to Hindi unless manually specified
- **Multi-language support**: English, Spanish, French, Hindi, Mandarin, Vietnamese, and more
- **Manual mode**: Override auto-detection and select specific source/target languages
- **Playful animations**: Text appears with smooth letter-by-letter animations
- **Intent parsing**: Understands natural language requests like "How do I say X in Hindi?"

## Language Support

The application supports translation between:
- English (EN)
- Spanish (ES) 
- French (FR)
- Hindi (HI)
- Mandarin (ZH)
- Vietnamese (VI)
- Portuguese (PT-PT)
- German (DE)
- Italian (IT)
- Arabic (AR)
- Japanese (JA)
- Korean (KO)
- Russian (RU)

## API

Uses DeepL API for high-quality translations. The free tier supports up to 500,000 characters per month.
