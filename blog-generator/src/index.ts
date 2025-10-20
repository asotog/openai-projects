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

  async generateBlogPost(topic: string): Promise<BlogPost> {
    try {
      const completion = await this.openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that generates blog posts. Create engaging, informative content.",
          },
          {
            role: "user",
            content: `Write a blog post about: ${topic}`,
          },
        ],
        model: "gpt-3.5-turbo",
      });

      const content =
        completion.choices[0]?.message?.content || "No content generated";

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
