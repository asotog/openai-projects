# Chatbot CLI

A simple chatbot that accepts prompts from the command line interface using OpenAI's API.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the chatbot directory with your OpenAI API key:

   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Usage

### Run the CLI chatbot:

```bash
npm run dev
```

### Or run the compiled version:

```bash
npm start
```

## Commands

- Type any message and press Enter to chat with the bot
- Type `exit` to quit the program
- Type `clear` to clear the conversation history

## Features

- **Chatbot Class**: A reusable `Chatbot` class that can be imported and used in other projects
- **CLI Interface**: Interactive command-line interface for chatting
- **Conversation History**: Maintains context throughout the conversation
- **Error Handling**: Graceful error handling for API failures
- **Environment Variables**: Secure API key management

## API

### Chatbot Class

```typescript
import { Chatbot } from "./src/index";

const bot = new Chatbot(); // Uses OPENAI_API_KEY from environment
// or
const bot = new Chatbot("your-api-key");

// Send a message
const response = await bot.sendMessage("Hello!");

// Clear conversation history
bot.clearHistory();

// Get conversation history
const history = bot.getHistory();
```
