import OpenAI from "openai";
import * as dotenv from "dotenv";
import * as math from "mathjs";
import * as fs from "fs";
import * as path from "path";
import csv from "csv-parser";
import { Pinecone } from "@pinecone-database/pinecone";

// Load environment variables
dotenv.config();

class MovieRecommendation {
  private openai: OpenAI;
  private moviesData: any[] = [];
  private pinecone: Pinecone;
  private pineconeIndex: any;
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

    this.pineconeIndex = this.pinecone.Index("movies");
  }

  async initializeDataset(): Promise<void> {
    const csvPath = path.join(__dirname, "..", "movies_metadata.csv");

    try {
      const movies: any[] = [];

      const stream = fs.createReadStream(csvPath).pipe(csv());

      for await (const data of stream) {
        movies.push({
          id: data.id,
          original_title: data.original_title,
          overview: data.overview,
        });
      }

      this.moviesData = movies
        .slice(0, 100)
        .filter((movie) => !!movie.overview && !!movie.overview.trim()); // Limit for performance
    } catch (error) {
      console.error("Error initializing dataset:", error);
      this.moviesData = [];
    }
  }

  async calculateInputEmbedding(input: string) {
    const embeddings = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: input,
    });
    return embeddings.data[0].embedding;
  }

  async upsertMoviesToPinecone() {
    const records = [];

    for (const movie of this.moviesData) {
      const embedding = await this.calculateInputEmbedding(movie.overview);
      records.push({
        id: movie.id,
        metadata: {
          title: movie.original_title,
          overview: movie.overview,
        },
        values: embedding,
      });
    }

    await this.pineconeIndex.upsert(records);
  }

  /**
   * Instead of using Pinecone, we can use the local similarity search to find the matching movies
   * @param inputEmbedding
   * @returns
   */
  async searchMatchingMovies(inputEmbedding: number[]) {
    const embeddings = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: this.moviesData.map((movie) => movie.overview),
    });
    const cleanEmbeddings = embeddings.data.map(
      (embedding) => embedding.embedding
    );
    const similarityScores = cleanEmbeddings.map((embedding) =>
      this.calculateCosineSimilarity(inputEmbedding, embedding)
    );

    // Create array of objects with movie data and similarity scores
    const moviesWithScores = this.moviesData.map((movie, index) => ({
      ...movie,
      similarityScore: similarityScores[index],
    }));

    // Sort by similarity score in descending order and get top 5
    const topMovies = moviesWithScores
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 5);

    return topMovies.map((movie) => ({
      title: movie.original_title,
      similarityScore: movie.similarityScore,
    }));
  }

  /**
   * Calculate the cosine similarity between two vectors insted of using Pinecone
   * @param inputVector
   * @param datasetVector
   * @returns
   */
  calculateCosineSimilarity(inputVector: number[], datasetVector: number[]) {
    // Calculate the dot product (sum of element-wise multiplication) between the two vectors
    // This measures how much the vectors point in the same direction
    const dotProduct = math.dot(inputVector, datasetVector);

    // Calculate the magnitude (length) of the input vector using Euclidean norm
    // This is the square root of the sum of squared elements
    const magnitude1 = math.norm(inputVector) as number;

    // Calculate the magnitude (length) of the dataset vector using Euclidean norm
    const magnitude2 = math.norm(datasetVector) as number;

    // Return the cosine similarity: dot product divided by the product of magnitudes
    // This gives us a value between -1 and 1:
    // 1 = identical direction, 0 = orthogonal (no similarity), -1 = opposite direction
    return dotProduct / (magnitude1 * magnitude2);
  }

  async searchMoviesInPinecone(inputEmbedding: number[]) {
    const results = await this.pineconeIndex.query({
      vector: inputEmbedding,
      topK: 5,
      includeMetadata: true,
    });
    return results.matches.map((match: any) => match.metadata.title);
  }
}

if (require.main === module) {
  const movieRecommendation = new MovieRecommendation();
  (async () => {
    // Initialize the dataset
    // await movieRecommendation.initializeDataset();
    // await movieRecommendation.upsertMoviesToPinecone();

    const inputEmbedding = await movieRecommendation.calculateInputEmbedding(
      "I want some toys movie"
    );

    const matchingMovies = await movieRecommendation.searchMoviesInPinecone(
      inputEmbedding
    );
    console.log(matchingMovies);

    // const matchingMovies = await movieRecommendation.searchMatchingMovies(
    //   inputEmbedding
    // );
    // console.log("Top 5 matching movies:");
    // matchingMovies.forEach((movie, index) => {
    //   console.log(
    //     `${index + 1}. ${
    //       movie.title
    //     } (similarity: ${movie.similarityScore.toFixed(4)})`
    //   );
    // });
  })();
}
