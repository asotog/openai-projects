import OpenAI from "openai";
import * as readline from "readline";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const systemPrompt: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
  role: "system",
  content: "You are a helpful assistant that can answer questions",
};

class Chatbot {
  private openai: OpenAI;
  private conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
    [];

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error(
        "OpenAI API key is required. Set OPENAI_API_KEY environment variable or pass it to the constructor."
      );
    }

    this.openai = new OpenAI({
      apiKey: key,
    });
  }

  async sendMessage(message: string): Promise<string> {
    try {
      // Add user message to conversation history
      this.conversationHistory.push({
        role: "user",
        content: message,
      });

      // Send request to OpenAI
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [systemPrompt, ...this.conversationHistory],
        max_tokens: 50,
        temperature: 0.7,
      });

      const response =
        completion.choices[0]?.message?.content ||
        "Sorry, I couldn't generate a response.";

      // Add assistant response to conversation history
      this.conversationHistory.push({
        role: "assistant",
        content: response,
      });

      return response;
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      return "Sorry, there was an error processing your request.";
    }
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  getHistory(): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return [...this.conversationHistory];
  }
}

// CLI Interface
class ChatbotCLI {
  private chatbot: Chatbot;
  private rl: readline.Interface;

  constructor() {
    try {
      this.chatbot = new Chatbot();
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
    } catch (error) {
      console.error("Failed to initialize chatbot:", error);
      process.exit(1);
    }
  }

  async start(): Promise<void> {
    console.log("🤖 Chatbot CLI - Type your messages and press Enter");
    console.log(
      "Commands: 'exit' to quit, 'clear' to clear conversation history"
    );
    console.log("=".repeat(50));

    const askQuestion = (): void => {
      this.rl.question("You: ", async (input) => {
        if (input.toLowerCase() === "exit") {
          console.log("Goodbye! 👋");
          this.rl.close();
          return;
        }

        if (input.toLowerCase() === "clear") {
          this.chatbot.clearHistory();
          console.log("Conversation history cleared.");
          askQuestion();
          return;
        }

        if (input.trim() === "") {
          askQuestion();
          return;
        }

        try {
          console.log("Bot: Thinking...");
          const response = await this.chatbot.sendMessage(input);
          console.log(`Bot: ${response}\n`);
        } catch (error) {
          console.error("Error:", error);
        }

        askQuestion();
      });
    };

    askQuestion();
  }
}

// Start the CLI if this file is run directly
if (require.main === module) {
  const cli = new ChatbotCLI();
  cli.start().catch(console.error);
}

export { Chatbot, ChatbotCLI };
