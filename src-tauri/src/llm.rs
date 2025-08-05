use crate::shortcut::Clip;
use async_openai::{
    types::{
        responses::{
            Content, ContentType, CreateResponseArgs, Input, InputContent, InputImageArgs,
            InputItem, InputMessageArgs, OutputContent, Role,
        },
        ImageDetail,
    },
    Client,
};

use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct CategoryResponse {
    pub category: String,
    pub tags: Vec<String>,
}
pub async fn get_llm_category(clip: &Clip) -> Result<CategoryResponse, Box<dyn std::error::Error>> {
    let client = Client::new();

    let system_prompt = r#"You are a clipboard content categorizer. Your job is to categorize content into a primary category and suggest relevant tags.

IMPORTANT: Respond with ONLY a JSON object in this exact format:
{
  "category": "category_name",
  "tags": ["tag1", "tag2", "tag3"]
}

Use these primary categories (choose the best fit):
- code_snippet: Programming code, scripts, configuration files, JSON, XML, HTML, CSS, SQL queries
- technical_advice: Technical explanations, troubleshooting steps, how-to guides, technical discussions
- documentation: API docs, README files, technical specifications, user manuals
- url: Web links, file paths, network addresses
- credentials: Passwords, API keys, tokens, certificates (be careful with sensitive data)
- data: CSV data, logs, structured data, database records
- communication: Emails, messages, social media posts, chat conversations
- notes: Personal notes, reminders, todo items, quick thoughts
- reference: Phone numbers, addresses, contact info, reference materials
- creative: Writing, stories, poems, creative content
- business: Meeting notes, project plans, business documents, proposals
- academic: Research, papers, citations, study materials
- error_log: Error messages, stack traces, debug output
- command: Terminal commands, CLI instructions, scripts to run
- image: Screenshots, photos, diagrams, charts, memes, artwork, UI mockups
- other: Content that doesn't fit the above categories

For tags, suggest 2-4 specific, relevant tags that describe the content in more detail. Tags should be:
- Lowercase
- Single words or hyphenated (e.g., "react", "javascript", "error-handling", "screenshot", "diagram")
- Specific to the technology, topic, context, or visual content

For images, analyze the visual content and provide relevant tags like:
- screenshot, diagram, chart, photo, artwork, meme, ui-design, wireframe
- Technology-specific: react-app, code-editor, terminal, browser, mobile-app
- Content-specific: dashboard, graph, error-message, documentation, social-media

Examples:
Input: "const handleClick = () => { console.log('clicked'); }"
Output: {"category": "code_snippet", "tags": ["javascript", "function", "event-handler"]}

Input: "https://github.com/user/repo"
Output: {"category": "url", "tags": ["github", "repository", "git"]}

Input: [Image of a code editor with React code]
Output: {"category": "image", "tags": ["screenshot", "code-editor", "react", "development"]}

Input: [Image of a terminal with error messages]
Output: {"category": "image", "tags": ["screenshot", "terminal", "error-message", "debugging"]}

Input: [Image of a website mockup]
Output: {"category": "image", "tags": ["screenshot", "ui-design", "website", "mockup"]}"#;

    let request_items = match clip {
        Clip::Text { plain } => {
            let content = if plain.len() > 2000 {
                format!("{}...", &plain[..2000])
            } else {
                plain.clone()
            };

            let user_prompt = format!("Categorize this text content:\n\n{}", content);

            vec![
                InputItem::Message(
                    InputMessageArgs::default()
                        .role(Role::System)
                        .content(system_prompt)
                        .build()?,
                ),
                InputItem::Message(
                    InputMessageArgs::default()
                        .role(Role::User)
                        .content(user_prompt)
                        .build()?,
                ),
            ]
        }
        Clip::Image {
            data,
            width,
            height,
        } => {
            let user_prompt = format!(
                "Categorize this image content. Image dimensions: {}x{}. Analyze what you see in the image and provide appropriate category and tags.",
                width, height
            );

            let image_url = format!("data:image/png;base64,{}", data);

            let im = InputImageArgs::default()
                .image_url(image_url)
                .detail(ImageDetail::Auto)
                .build()?;

            let content = InputContent::InputItemContentList(vec![ContentType::InputImage(im)]);

            vec![
                InputItem::Message(
                    InputMessageArgs::default()
                        .role(Role::System)
                        .content(system_prompt)
                        .build()?,
                ),
                InputItem::Message(
                    InputMessageArgs::default()
                        .role(Role::User)
                        .content(user_prompt)
                        .build()?,
                ),
                InputItem::Message(
                    InputMessageArgs::default()
                        .role(Role::User)
                        .content(content)
                        .build()?,
                ),
            ]
        }
    };

    let request = CreateResponseArgs::default()
        .max_output_tokens(100u32)
        .model("gpt-4o") // Use GPT-4o for vision capabilities
        .input(Input::Items(request_items))
        .build()?;

    let response = client.responses().create(request).await?;

    // Extract the JSON response and parse it
    for output in response.output {
        if let Some(content) = extract_content_from_output(&output) {
            let trimmed_content = content.trim();

            // Try to parse as JSON
            if let Ok(category_response) = serde_json::from_str::<CategoryResponse>(trimmed_content)
            {
                println!(
                    "LLM categorized as: {} with tags: {:?}",
                    category_response.category, category_response.tags
                );
                return Ok(category_response);
            }
            // Fallback: try to extract category if JSON parsing fails
            if let Ok(json_value) = serde_json::from_str::<serde_json::Value>(trimmed_content) {
                if let (Some(category), Some(tags)) = (
                    json_value.get("category").and_then(|v| v.as_str()),
                    json_value.get("tags").and_then(|v| v.as_array()),
                ) {
                    let tag_strings: Vec<String> = tags
                        .iter()
                        .filter_map(|tag| tag.as_str().map(|s| s.to_string()))
                        .collect();
                    return Ok(CategoryResponse {
                        category: category.to_string(),
                        tags: tag_strings,
                    });
                }
            }
        }
    }

    // Fallback based on clip type
    match clip {
        Clip::Text { .. } => Ok(CategoryResponse {
            category: "other".to_string(),
            tags: vec!["uncategorized".to_string()],
        }),
        Clip::Image { .. } => Ok(CategoryResponse {
            category: "image".to_string(),
            tags: vec!["screenshot".to_string()],
        }),
    }
}

pub async fn get_clip_summary(clip: &Clip) -> Result<String, Box<dyn std::error::Error>> {
    let client = Client::new();

    let content = match clip {
        Clip::Text { plain } => {
            if plain.len() > 2000 {
                format!("{}...", &plain[..2000])
            } else {
                plain.clone()
            }
        }
        Clip::Image { .. } => {
            return Ok("image".to_string());
        }
    };

    let system_prompt = r#"You are a concise summarization assistant.
Provide a clear, bullet-point summary of the key points.
Do not include citations or extra commentary."#;
    let user_prompt = format!(
        "Please summarize the following content. If it came from a URL, provide a short overview of the page's main points.\n\n{:?}",
        content
    );

    let request = CreateResponseArgs::default()
        // .max_output_tokens(50u32)
        .model("gpt-4.1")
        .input(Input::Items(vec![
            InputItem::Message(
                InputMessageArgs::default()
                    .role(Role::System)
                    .content(system_prompt)
                    .build()?,
            ),
            InputItem::Message(
                InputMessageArgs::default()
                    .role(Role::User)
                    .content(user_prompt)
                    .build()?,
            ),
        ]))
        .build()?;

    let response = client.responses().create(request).await?;

    for output in response.output {
        if let Some(content) = extract_content_from_output(&output) {
            let summary = content.trim(); // Don't convert to lowercase!

            if !summary.is_empty() {
                println!("LLM summary: {}", summary);
                return Ok(summary.to_string());
            }
        }
    }

    Ok("No summary available".to_string())
}

fn extract_content_from_output(output: &OutputContent) -> Option<String> {
    match output {
        OutputContent::Message(message) => {
            for content_item in &message.content {
                match content_item {
                    Content::OutputText(output_text) => {
                        return Some(output_text.text.clone());
                    }
                    _ => continue,
                }
            }
            None
        }
        _ => None,
    }
}
