# LogoPilotAi

LogoPilotAi is an AI-powered branding tool that generates unique brand names and slogans for any industry and style using OpenAI's GPT models, integrated with n8n for workflow automation.

## Features
- Generate brand names and slogans with AI
- Easy-to-use React frontend
- n8n workflow for backend automation

## Setup
1. **Clone the repository:**
   ```sh
   git clone https://github.com/fusioncapital1/LogoPilotAi1.0.git
   cd LogoPilotAi1.0
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Configure environment variables:**
   - Create a `.env` file for sensitive data (e.g., API keys). Example:
     ```env
     OPENAI_API_KEY=sk-...
     ```
   - The `.env` file is already in `.gitignore` and will not be committed.
4. **Start the frontend:**
   ```sh
   npm start
   ```
5. **Set up n8n workflow:**
   - Import or recreate the workflow as described in the documentation.
   - Add your OpenAI API key in the HTTP Request node (do not commit this key).

## Security
- **Never commit your API key or sensitive data to the repository.**
- Use environment variables for all secrets.

## License
MIT 