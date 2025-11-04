import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import * as url from "url";
import sharp from "sharp";

class ImageGenerator {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  /**
   * Downloads an image from a URL and saves it to a local file
   * @param imageUrl - The URL of the image to download
   * @param filename - The filename to save the image as (relative to the current file)
   * @returns The path to the saved image file
   */
  async downloadAndSaveImage(
    imageUrl: string,
    filename: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const parsedUrl = url.parse(imageUrl);
      const protocol = parsedUrl.protocol === "https:" ? https : http;

      protocol
        .get(imageUrl, (response) => {
          if (response.statusCode !== 200) {
            reject(
              new Error(`Failed to download image: ${response.statusCode}`)
            );
            return;
          }

          // Create the directory if it doesn't exist
          const savePath = path.resolve(__dirname, filename);
          const dir = path.dirname(savePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          const fileStream = fs.createWriteStream(savePath);
          response.pipe(fileStream);

          fileStream.on("finish", () => {
            fileStream.close();
            resolve(savePath);
          });

          fileStream.on("error", (err) => {
            fs.unlink(savePath, () => {}); // Delete the file on error
            reject(err);
          });
        })
        .on("error", (err) => {
          reject(err);
        });
    });
  }

  /**
   * Generates an image using OpenAI's DALL-E API
   * @param prompt - The text prompt for image generation
   * @returns The URL of the generated image
   */
  async generateImage(prompt: string): Promise<string> {
    const response = await this.openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1, // Number of images to generate
      size: "1024x1024",
    });

    return response.data?.[0]?.url || "";
  }

  /**
   * Generates an image and saves it to a local file
   * @param prompt - The text prompt for image generation
   * @param filename - The filename to save the image as (relative to the current file)
   * @returns The path to the saved image file
   */
  async generateAndSaveImage(
    prompt: string,
    filename: string
  ): Promise<string> {
    const imageUrl = await this.generateImage(prompt);
    if (!imageUrl) {
      throw new Error("Failed to generate image");
    }
    return await this.downloadAndSaveImage(imageUrl, filename);
  }

  /**
   * Also can use tool like https://ai-image-editor.netlify.app/ to create image
   * mask and then tell ai to edit the image based on the mask and the prompt
   *
   * @param imageUrl
   * @param prompt
   * @returns
   */
  async editImage(imageUrl: string, prompt: string): Promise<string> {
    // Read the file and convert it to RGBA format required by OpenAI
    const imageBuffer = fs.readFileSync(imageUrl);

    // Convert to RGBA format using sharp
    const convertedBuffer = await sharp(imageBuffer)
      .ensureAlpha() // Ensure the image has an alpha channel (converts RGB to RGBA)
      .png() // Ensure it's in PNG format
      .toBuffer();

    const filename = path.basename(imageUrl);

    // Create a File object with proper MIME type
    const file = new File([convertedBuffer], filename, {
      type: "image/png",
    });

    const response = await this.openai.images.edit({
      prompt: prompt,
      image: file,
    });
    return response.data?.[0]?.url || "";
  }
}

async function main() {
  const imageGenerator = new ImageGenerator(
    process.env.OPENAI_API_KEY as string
  );
  // const imageUrl = await imageGenerator.generateImage(
  //   "A beautiful sunset over a calm ocean"
  // );
  // await imageGenerator.downloadAndSaveImage(imageUrl, "sunset.png");
  const editedImageUrl = await imageGenerator.editImage(
    path.resolve(__dirname, "sunset.png"),
    "Add a beautiful beach to the image"
  );
  if (!editedImageUrl) {
    throw new Error("Failed to edit image");
  }
  await imageGenerator.downloadAndSaveImage(
    editedImageUrl,
    "edited-sunset.png"
  );
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main();
}
