import OpenAI from "openai";
import fs from "fs";
import path from "path";

const getMessages = (
  lang: string
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => [
  {
    role: "system",
    content: `I want you to act as an algorithm for translation to language {}. Systep will provide you with a text, and your only task is to translate it to ${lang}. Never break character.`,
  },
];

class AudioAnalyzer {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async transcribeAudio(audioUrl: string): Promise<string> {
    const response = await this.openai.audio.transcriptions.create({
      file: fs.createReadStream(audioUrl),
      model: "whisper-1",
      response_format: "text",
    });
    return response || "";
  }

  async translateAudio(text: string): Promise<string> {
    const messages = getMessages("Spanish");
    messages.push({ role: "user", content: text });

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    });
    return response.choices[0].message.content || "";
  }
}

async function main() {
  const audioAnalyzer = new AudioAnalyzer(process.env.OPENAI_API_KEY as string);
  const audioUrl = path.resolve(__dirname, "../audio_file_whisper.mp3");
  const transcript = await audioAnalyzer.transcribeAudio(audioUrl);
  console.log({ transcript });
  const translation = await audioAnalyzer.translateAudio(transcript);
  console.log({ translation });
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main();
}
