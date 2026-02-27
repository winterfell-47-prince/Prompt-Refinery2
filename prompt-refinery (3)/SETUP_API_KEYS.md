# API Key Setup Guide

## How to Replace Placeholder API Keys

### Step 1: Get Your API Keys

#### Google Gemini (Required)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the generated key

#### OpenAI (Optional)
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Copy the generated key

#### Anthropic (Optional)
1. Go to [Anthropic Console](https://console.anthropic.com/settings/keys)
2. Click "Create Key"
3. Copy the generated key

#### DeepSeek (Optional)
1. Go to [DeepSeek Platform](https://platform.deepseek.com/api_keys)
2. Click "Create API Key"
3. Copy the generated key

### Step 2: Update .env.local File

Open the `.env.local` file in your project root and replace the placeholder values:

```bash
# Before (placeholder)
GEMINI_API_KEY=your_gemini_api_key_here

# After (with real key)
GEMINI_API_KEY=AIzaSyD1234567890abcdefghijklmnopqrstuvwxyz
```

### Step 3: Restart Development Server

After updating the `.env.local` file, restart your development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

### Step 4: Test the Configuration

1. Open your browser and go to http://localhost:3000
2. Navigate to Settings → LLM Provider Configuration
3. Select your preferred provider (e.g., Google Gemini)
4. The "Connected" status should appear next to the provider
5. Try optimizing a prompt to verify it works

### Step 5: Verify Security

✅ **Security Check**: The `.gitignore` file prevents your `.env.local` from being committed to GitHub

You can verify this by running:
```bash
git status
```

Your `.env.local` file should NOT appear in the list of untracked files.

## Troubleshooting

### API Key Not Working?
- Double-check for typos in the key
- Ensure no extra spaces before or after the key
- Verify the key is active in your provider's dashboard

### Provider Shows "Not Set"?
- Make sure you've updated the correct environment variable
- Restart the development server after making changes
- Check the browser console for any error messages

### Want to Use Multiple Providers?
- Add multiple API keys to `.env.local`
- Each provider will be available in the Settings menu
- Switch between providers as needed

## Security Best Practices

🔒 **Important Security Notes:**

1. **Never commit `.env.local` to GitHub** - The `.gitignore` file protects this
2. **Use strong, unique API keys** for each provider
3. **Monitor your API usage** to avoid unexpected charges
4. **Rotate keys regularly** for enhanced security
5. **Restrict API key permissions** to only what's needed

## Example .env.local File

```bash
# Google Gemini API Key (Required for Gemini provider)
GEMINI_API_KEY=AIzaSyD1234567890abcdefghijklmnopqrstuvwxyz

# Optional: OpenAI API Key (for OpenAI provider)
OPENAI_API_KEY=sk-1234567890abcdefghijklmnopqrstuvwxyz

# Optional: Anthropic API Key (for Anthropic provider)
ANTHROPIC_API_KEY=sk-ant-1234567890abcdefghijklmnopqrstuvwxyz

# Optional: DeepSeek API Key (for DeepSeek provider)
DEEPSEEK_API_KEY=sk-1234567890abcdefghijklmnopqrstuvwxyz
```

## Next Steps

Once your API keys are configured:
1. ✅ Test prompt optimization with real API keys
2. ✅ Verify all providers work correctly
3. ✅ Commit your code (`.env.local` will be ignored)
4. ✅ Deploy to GitHub with confidence

Your Prompt Refinery is now ready for production use! 🚀