import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

class TextToSpeech {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async generateSpeech(
    text: string,
    filename: string = "speech.mp3"
  ): Promise<string> {
    const response = await this.openai.audio.speech.create({
      model: "tts-1",
      input: text,
      voice: "alloy",
    });

    // Convert the response to a buffer
    const buffer = Buffer.from(await response.arrayBuffer());

    // Save to file relative to the current file
    const filePath = path.resolve(__dirname, filename);
    fs.writeFileSync(filePath, buffer);

    return filePath;
  }
}

async function main() {
  const textToSpeech = new TextToSpeech(process.env.OPENAI_API_KEY as string);
  const speech = await textToSpeech.generateSpeech(
    "Hello, how are you?",
    "speech.mp3"
  );
  console.log({ speechFilePath: speech });
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main();
}
