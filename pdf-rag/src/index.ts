import OpenAI from "openai";
import * as dotenv from "dotenv";
import * as math from "mathjs";
import * as fs from "fs";
import * as path from "path";
import csv from "csv-parser";
import { Pinecone } from "@pinecone-database/pinecone";
import { PDFParse } from "pdf-parse";

// Load environment variables
dotenv.config();

type ChunkBy = "word" | "char";

const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
  {
    role: "system",
    content:
      'I want you to act as a support agent. Your name is "My Super Assistant". You will provide me with answers from the given info.  Never break character.',
  },
];

class ChatFromPDFAsRAG {
  private openai: OpenAI;
  private pinecone: Pinecone;
  private pineconeIndex: any;
  private pdfParser: PDFParse;

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

    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY as string,
    });

    const pdfPath = path.join(__dirname, "..", "state_of_ai_docs.pdf");

    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file not found at path: ${pdfPath}`);
    }

    this.pineconeIndex = this.pinecone.Index("rag-test");

    this.pdfParser = new PDFParse({ url: pdfPath });
  }

  async parsePDFPages() {
    const result = await this.pdfParser.getText();
    return result.pages.map((page) => page.text).join("\n");
  }

  chunkText(
    text: string,
    chunkSize = 1000,
    chunkOverlap = 100,
    by: ChunkBy = "word"
  ) {
    const chunks = [];
    let tokens;

    if (by === "word") {
      tokens = text.split(/\s+/);
    } else {
      tokens = Array.from(text);
    }

    let currentChunkStart = 0;

    while (currentChunkStart < tokens.length) {
      const currentChunkEnd = currentChunkStart + chunkSize;

      const chunk =
        by === ("word" as ChunkBy)
          ? tokens.slice(currentChunkStart, currentChunkEnd).join(" ")
          : tokens.slice(currentChunkStart, currentChunkEnd).join("");

      chunks.push(chunk);

      currentChunkStart += chunkSize - chunkOverlap;

      if (chunks.length > 10) break; // Limit output
    }

    return chunks;
  }

  async loadChunksToPinecone(chunks: string[]) {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await this.openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });
      const cleanEmbedding = embedding.data[0].embedding;

      await this.pineconeIndex.upsert([
        {
          id: String(i),
          values: cleanEmbedding,
          metadata: {
            originalText: chunk,
          },
        },
      ]);
    }
  }

  async askAQuestion(question: string) {
    const embedding = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question,
    });
    const cleanEmbedding = embedding.data[0].embedding;

    const queryResponse = await this.pineconeIndex.query({
      vector: cleanEmbedding,
      topK: 5,
      includeMetadata: true,
    });

    return queryResponse.matches.map(
      (match: any) => match.metadata.originalText
    );
  }

  async respond(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  ) {
    const completion = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      max_tokens: 50,
      temperature: 0, // O to only use provided context
    });

    return completion.choices[0]?.message?.content;
  }
}

if (require.main === module) {
  const chatFromPDFAsRAG = new ChatFromPDFAsRAG();
  (async () => {
    // Read PDF -> Chunk -> Load to Pinecone
    //// const content = await chatFromPDFAsRAG.parsePDFPages();
    //// const chunks = chatFromPDFAsRAG.chunkText(content, 500, 100, "word");
    //// await chatFromPDFAsRAG.loadChunksToPinecone(chunks);
    const question = "What are the top AI trends in 2023/2024?";
    const queryResponse = await chatFromPDFAsRAG.askAQuestion(question);

    messages.push({ role: "user", content: queryResponse.join("\n") });
    messages.push({ role: "user", content: question });

    console.log("Answer to the question:");
    const answer = await chatFromPDFAsRAG.respond(messages);
    console.log(answer);
  })();
}

/// I want you to act as a support agent. Your name is "My Super Assistant". You will provide me with answers from the given info. If the answer is not included, say exactly "Ooops! I don't know that." and stop after that. Refuse to answer any question not about the info. Never break character.
