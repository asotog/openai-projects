import OpenAI from "openai";

interface BlogPost {
  title: string;
  content: string;
  author: string;
  publishedAt: Date;
}

class BlogGenerator {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async debug() {
    const models = await this.openai.models.list();
    console.log(models);
  }

  async generateBlogPost(topic: string): Promise<BlogPost> {
    const prompt = `
    You are a copy writer with years of experience in writing blog posts.
    Your taski is to write a blog post about the given topic. Make sure to write in a way that works for Medium.
    Each blog should be separated into segments that have  titles and subtitles. Each paragraph should be three sentences long.
    Write a blog post about: ${topic}
    Additional pointers: None
    `;
    try {
      const completion = await this.openai.completions.create({
        prompt,
        model: "gpt-3.5-turbo-instruct",
        max_tokens: 700,
        temperature: 1,
      });

      const content = completion.choices[0]?.text || "No content generated";

      return {
        title: `Blog Post: ${topic}`,
        content: content,
        author: "AI Assistant",
        publishedAt: new Date(),
      };
    } catch (error) {
      console.error("Error generating blog post:", error);
      throw error;
    }
  }

  displayBlogPost(post: BlogPost): void {
    console.log("\n=== BLOG POST ===");
    console.log(`Title: ${post.title}`);
    console.log(`Author: ${post.author}`);
    console.log(`Published: ${post.publishedAt.toLocaleDateString()}`);
    console.log("\nContent:");
    console.log(post.content);
    console.log("\n================\n");
  }
}

// Example usage
async function main() {
  // Note: You'll need to set your OpenAI API key as an environment variable
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("Please set OPENAI_API_KEY environment variable");
    process.exit(1);
  }

  const generator = new BlogGenerator(apiKey);

  //   await generator.debug();

  try {
    const blogPost = await generator.generateBlogPost(
      "TypeScript Best Practices"
    );
    generator.displayBlogPost(blogPost);
  } catch (error) {
    console.error("Failed to generate blog post:", error);
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main();
}

export { BlogGenerator, BlogPost };
