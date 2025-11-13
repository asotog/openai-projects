import OpenAI from "openai";
import * as path from "path";
import * as fs from "fs";

class ImageClassification {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async classifyImage(imageBase64: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o", // instead of deprecated "gpt-4-vision",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Act as image classifier. Classify the image into a category: Outdoor, Pool, Living Room, Other. Provide only classes and nothing else",
              // text: "What's happening in this image?",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    });
    return response.choices[0].message.content || "";
  }

  transformImageToBase64(imagePath: string): string {
    const image = fs.readFileSync(imagePath);
    return image.toString("base64");
  }
}

async function main() {
  const imageClassification = new ImageClassification(
    process.env.OPENAI_API_KEY as string
  );
  const imageBase64 = imageClassification.transformImageToBase64(
    path.resolve(__dirname, "test_img.jpg")
  );
  const classification = await imageClassification.classifyImage(imageBase64);
  console.log({ classification });
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main();
}
