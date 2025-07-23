use crate::shortcut::Clip;
use async_openai::{
    types::responses::{
        CreateResponseArgs, Input, InputItem, InputMessageArgs, OutputContent, Role,
    },
    Client,
};

pub async fn get_llm_category(clip: &Clip) -> Result<String, Box<dyn std::error::Error>> {
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

    println!("calling llm for categorization");

    let system_prompt = r#"You are a clipboard content categorizer. Your job is to categorize text content into high-level categories.

IMPORTANT: Respond with ONLY the category name, nothing else. Do not include explanations, punctuation, or additional text.

Use these categories when possible (reuse existing categories):
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
- other: Content that doesn't fit the above categories

Examples:
- "const handleClick = () => { console.log('clicked'); }" → code_snippet
- "To fix this issue, first check your network connection..." → technical_advice  
- "https://github.com/user/repo" → url
- "Meeting with client at 2pm tomorrow" → notes
- "npm install react" → command
- "TypeError: Cannot read property 'map' of undefined" → error_log"#;

    let user_prompt = format!("Categorize this content:\n\n{}", content);

    let request = CreateResponseArgs::default()
        .max_output_tokens(50u32)
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

    // Extract the category from the response
    for output in response.output {
        if let Some(content) = extract_content_from_output(&output) {
            let category = content.trim().to_lowercase();

            if !category.is_empty() && category.len() < 50 {
                println!("LLM categorized as: {}", category);
                return Ok(category);
            }
        }
    }

    Ok("other".to_string())
}

fn extract_content_from_output(output: &OutputContent) -> Option<String> {
    use async_openai::types::responses::{Content, OutputContent};

    match output {
        OutputContent::Message(message) => {
            // Extract text from the content array
            for content_item in &message.content {
                match content_item {
                    Content::OutputText(output_text) => {
                        return Some(output_text.text.clone());
                    }
                    Content::Refusal(_) => {
                        // Model refused to respond
                        continue;
                    }
                }
            }
            None
        }
        // For other variants, we don't expect text content for categorization
        _ => None,
    }
}
