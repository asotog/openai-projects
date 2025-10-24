import OpenAI from "openai";
import * as dotenv from "dotenv";
import * as math from "mathjs";

// Load environment variables
dotenv.config();

class MovieRecommendation {
  private openai: OpenAI;

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

  async calculateInputEmbedding(input: string) {
    const embeddings = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: input,
    });
    return embeddings.data[0].embedding;
  }

  async searchMatchingMovies(inputEmbedding: number[]) {
    const toyDataset = [
      "The Terminator is a movie about AI going rogue and trying to kill humans",
      "Harry Potter is a movie about a boy who is a wizard",
      "In the movie Matrix, the protagonist is a hacker who is trying to save the world from the machine",
    ];
    const embeddings = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: toyDataset,
    });
    const cleanEmbeddings = embeddings.data.map(
      (embedding) => embedding.embedding
    );
    const similarityScores = cleanEmbeddings.map((embedding) =>
      this.calculateCosineSimilarity(inputEmbedding, embedding)
    );

    // get the index of the highest similarity score
    const highestSimilarityIndex = similarityScores.indexOf(
      Math.max(...similarityScores)
    );
    return toyDataset[highestSimilarityIndex];
  }

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
}

if (require.main === module) {
  const movieRecommendation = new MovieRecommendation();
  (async () => {
    const inputEmbedding = await movieRecommendation.calculateInputEmbedding(
      "I want a movie about people murdered"
    );
    const matchingMovies = await movieRecommendation.searchMatchingMovies(
      inputEmbedding
    );
    console.log(matchingMovies);
  })();
}
