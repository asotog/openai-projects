import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import ffmpeg from "fluent-ffmpeg";

class VoiceoverVideo {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async extractFramesAsBase64(
    videoPath: string,
    fps: number = 1
  ): Promise<string[]> {
    const framesBase64: string[] = [];
    const tempDir = path.join(__dirname, "temp_frames");

    // Create temp directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([
          `-vf fps=${fps}`, // Extract frames at specified fps
        ])
        .output(path.join(tempDir, "frame_%04d.png"))
        .on("end", () => {
          // Read all extracted frames and convert to base64
          const frameFiles = fs
            .readdirSync(tempDir)
            .filter((file) => file.endsWith(".png"))
            .sort();

          for (const frameFile of frameFiles) {
            const framePath = path.join(tempDir, frameFile);
            const frameBuffer = fs.readFileSync(framePath);
            const base64 = frameBuffer.toString("base64");
            framesBase64.push(base64);
            // Clean up temp file
            fs.unlinkSync(framePath);
          }

          // Remove temp directory
          fs.rmdirSync(tempDir);
          resolve(framesBase64);
        })
        .on("error", (err: Error) => {
          // Clean up on error
          if (fs.existsSync(tempDir)) {
            fs.readdirSync(tempDir).forEach((file) => {
              fs.unlinkSync(path.join(tempDir, file));
            });
            fs.rmdirSync(tempDir);
          }
          reject(err);
        })
        .run();
    });
  }

  async processFrames(framesBase64: string[]): Promise<void> {
    const batchSize = 5; // Process 5 frames at a time to stay within token limits
    const narrationParts: string[] = [];

    // Process frames in batches
    for (let i = 0; i < framesBase64.length; i += batchSize) {
      const batch = framesBase64.slice(i, i + batchSize);
      const batchMessages: any = [
        {
          role: "user",
          content: [
            "There are frames from a video. Create a short voice over narration for these images. Include only narration, no descriptions.",
          ],
        },
      ];

      // Add frames from this batch
      for (const frameBase64 of batch) {
        batchMessages[0].content.push({
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${frameBase64}`,
            detail: "low", // Use 'low' detail to reduce token usage
          },
        });
      }

      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(
          framesBase64.length / batchSize
        )} (frames ${i + 1}-${Math.min(i + batchSize, framesBase64.length)})`
      );

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: batchMessages,
        max_tokens: 300, // Reduced per batch
      });

      const narration = response.choices[0].message.content;
      if (narration) {
        narrationParts.push(narration.trim());
      }

      // Add a small delay between batches to help with rate limiting
      if (i + batchSize < framesBase64.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    // Combine all narration parts
    const fullNarration = narrationParts.join(" ");

    console.log(`Generated narration (${fullNarration.length} characters)`);

    const speech = "speech.mp3";

    // create speech from response
    const speechResponse = await this.openai.audio.speech.create({
      model: "tts-1",
      input: fullNarration,
      voice: "echo",
    });
    // write file relative to the current file
    fs.writeFileSync(
      path.resolve(__dirname, speech),
      Buffer.from(await speechResponse.arrayBuffer())
    );
    console.log({ speechFilePath: path.resolve(__dirname, speech) });
  }
}

async function main() {
  const voiceoverVideo = new VoiceoverVideo(
    process.env.OPENAI_API_KEY as string
  );

  const videoPath = path.resolve(__dirname, "experiment_video_desc.mp4");
  console.log({ videoPath });
  const framesBase64 = await voiceoverVideo.extractFramesAsBase64(videoPath, 1); // 1 frame per second
  console.log(`Extracted ${framesBase64.length} frames as base64`);
  await voiceoverVideo.processFrames(framesBase64);
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main();
}
