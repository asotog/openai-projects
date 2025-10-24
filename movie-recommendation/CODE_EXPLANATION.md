# Movie Recommendation System - Code Explanation

## Overview

This TypeScript application implements a **movie recommendation system** that uses **semantic similarity** to find movies based on user input. The system leverages OpenAI's embedding models and can work with either a local similarity calculation or Pinecone vector database for efficient similarity search.

## Architecture

The system is built around a `MovieRecommendation` class that provides two different approaches for movie recommendations:

1. **Local Similarity Search**: Uses cosine similarity calculations on embeddings
2. **Pinecone Vector Database**: Uses Pinecone for scalable vector similarity search

## Dependencies

- **OpenAI**: For generating text embeddings using `text-embedding-3-small` model
- **Pinecone**: Vector database for efficient similarity search
- **Math.js**: For mathematical operations (dot product, vector norms)
- **CSV Parser**: For reading movie metadata from CSV files
- **Dotenv**: For environment variable management

## Core Components

### 1. Constructor and Initialization

```typescript
constructor(apiKey?: string)
```

- Initializes OpenAI client with API key
- Sets up Pinecone connection and index
- Validates required API keys

### 2. Dataset Loading

```typescript
async initializeDataset(): Promise<void>
```

**What it does:**

- Reads movie data from `movies_metadata.csv`
- Extracts movie ID, title, and overview
- Limits to first 100 movies for performance
- Filters out movies without overview text

**Data Structure:**

```typescript
{
  id: string,
  original_title: string,
  overview: string
}
```

### 3. Embedding Generation

```typescript
async calculateInputEmbedding(input: string)
```

**What it does:**

- Converts text input into a high-dimensional vector representation
- Uses OpenAI's `text-embedding-3-small` model
- Returns a numerical array representing semantic meaning

### 4. Vector Database Operations

#### Upsert Movies to Pinecone

```typescript
async upsertMoviesToPinecone()
```

**What it does:**

- Generates embeddings for all movie overviews
- Stores movies in Pinecone with:
  - Movie ID as vector ID
  - Title and overview as metadata
  - Embedding as vector values

#### Search in Pinecone

```typescript
async searchMoviesInPinecone(inputEmbedding: number[])
```

**What it does:**

- Performs vector similarity search in Pinecone
- Returns top 5 most similar movies
- Uses cosine similarity under the hood

### 5. Local Similarity Search

#### Calculate Cosine Similarity

```typescript
calculateCosineSimilarity(inputVector: number[], datasetVector: number[])
```

**Mathematical Process:**

1. **Dot Product**: `A · B = Σ(Ai × Bi)`
2. **Vector Magnitudes**: `||A|| = √(Σ(Ai²))`
3. **Cosine Similarity**: `cos(θ) = (A · B) / (||A|| × ||B||)`

**Result Range:**

- `1.0`: Identical vectors (perfect similarity)
- `0.0`: Orthogonal vectors (no similarity)
- `-1.0`: Opposite vectors (maximum dissimilarity)

#### Search Matching Movies

```typescript
async searchMatchingMovies(inputEmbedding: number[])
```

**What it does:**

1. Generates embeddings for all movie overviews
2. Calculates cosine similarity between input and each movie
3. Sorts movies by similarity score (descending)
4. Returns top 5 movies with scores

## Current Execution Flow

When the script runs directly (`require.main === module`):

1. **Creates** a `MovieRecommendation` instance
2. **Generates** embedding for the query: `"I want some toys movie"`
3. **Searches** Pinecone for similar movies
4. **Logs** the results

### Commented Out Code

The following operations are currently disabled:

- Dataset initialization from CSV
- Upserting movies to Pinecone
- Local similarity search (alternative to Pinecone)

## Use Cases

This system can be used for:

- **Content-based filtering**: Find movies similar to user preferences
- **Semantic search**: Search movies by meaning, not just keywords
- **Recommendation engines**: Suggest movies based on descriptions
- **Movie discovery**: Help users find movies they might like

## Performance Considerations

- **Dataset Size**: Limited to 100 movies for demo purposes
- **Embedding Model**: Uses `text-embedding-3-small` (faster, cheaper)
- **Vector Database**: Pinecone provides scalable similarity search
- **Local Calculation**: Alternative approach for smaller datasets

## Environment Variables Required

- `OPENAI_API_KEY`: For generating embeddings
- `PINECONE_API_KEY`: For vector database access

## Example Output

When searching for "I want some toys movie", the system might return:

- Toy Story
- Toy Story 2
- Toy Story 3
- The Lego Movie
- Small Soldiers

The system understands semantic meaning, so it can find movies about toys even if the exact word "toys" isn't in the movie title or description.
