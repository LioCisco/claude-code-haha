import Anthropic from '@anthropic-ai/sdk'
import type { PluginManifest, PluginTool } from './pluginEngine'

const apiKey = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY
const baseURL = process.env.ANTHROPIC_BASE_URL

const anthropic = new Anthropic({
  apiKey: apiKey || '',
  baseURL,
})

const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

// ================== Plugin Code Generation ==================

export interface PluginGenerationRequest {
  name: string
  description: string
  category: string
  tools: Array<{
    name: string
    description: string
    parameters: Array<{
      name: string
      type: string
      description: string
      required?: boolean
    }>
  }>
  requirements?: string[]
}

export interface PluginGenerationResult {
  manifest: PluginManifest
  code: string
  explanation: string
}

export async function generatePluginCode(
  request: PluginGenerationRequest
): Promise<PluginGenerationResult> {
  const systemPrompt = `You are an expert JavaScript/TypeScript developer specializing in creating Claude Code plugins.

Your task is to generate a complete, production-ready plugin based on the user's requirements.

The plugin code must:
1. Be valid JavaScript that runs in a sandboxed environment
2. Export async functions matching the tool names
3. Handle errors gracefully
4. Include helpful comments
5. Follow best practices for Claude Code plugins

Available sandbox APIs:
- console.log/error/warn/info - for logging
- fetch - for HTTP requests (with timeout)
- JSON - parse/stringify
- TextEncoder/TextDecoder
- Date, setTimeout/clearTimeout
- Math, Object, Array, String, Number, Boolean, RegExp, Error, Promise
- __pluginId and __pluginName - plugin metadata

The code should be wrapped in an async IIFE that registers the handlers.
Example structure:
\`\`\`javascript
(async function() {
  // Helper functions
  async function helperFn() { ... }

  // Main tool functions
  async function myTool({ param1, param2 }) {
    try {
      // Implementation
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Register handlers
  __registerHandler('myTool', myTool);
})();
\`\`\`

Respond with a JSON object containing:
- manifest: The plugin manifest with tools array
- code: The complete plugin code
- explanation: A brief explanation of how the plugin works`

  const userPrompt = `Generate a Claude Code plugin with the following specifications:

Name: ${request.name}
Description: ${request.description}
Category: ${request.category}

Tools to implement:
${request.tools.map(tool => `
- ${tool.name}: ${tool.description}
  Parameters:
  ${tool.parameters.map(p => `  - ${p.name} (${p.type}${p.required !== false ? ', required' : ''}): ${p.description}`).join('\n  ')}
`).join('\n')}

${request.requirements?.length ? `Additional Requirements:\n${request.requirements.map(r => `- ${r}`).join('\n')}` : ''}

Generate the complete plugin code that implements all these tools.`

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract JSON from response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                      content.match(/```\s*([\s\S]*?)\s*```/) ||
                      [null, content]

    const jsonStr = jsonMatch[1].trim()
    const result = JSON.parse(jsonStr) as PluginGenerationResult

    return result
  } catch (error) {
    console.error('[AnthropicService] Failed to generate plugin code:', error)
    throw new Error('Failed to generate plugin code: ' + (error as Error).message)
  }
}

// ================== Plugin Enhancement ==================

export interface PluginEnhancementRequest {
  currentCode: string
  currentManifest: PluginManifest
  enhancementRequest: string
}

export async function enhancePlugin(
  request: PluginEnhancementRequest
): Promise<PluginGenerationResult> {
  const systemPrompt = `You are an expert plugin developer. Enhance an existing Claude Code plugin based on user requirements.

Respond with a JSON object containing:
- manifest: The updated plugin manifest
- code: The complete updated plugin code
- explanation: What changes were made`

  const userPrompt = `Enhance the following plugin:

Current Manifest:
\`\`\`json
${JSON.stringify(request.currentManifest, null, 2)}
\`\`\`

Current Code:
\`\`\`javascript
${request.currentCode}
\`\`\`

Enhancement Request:
${request.enhancementRequest}

Provide the complete updated plugin.`

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''

    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                      content.match(/```\s*([\s\S]*?)\s*```/) ||
                      [null, content]

    const jsonStr = jsonMatch[1].trim()
    const result = JSON.parse(jsonStr) as PluginGenerationResult

    return result
  } catch (error) {
    console.error('[AnthropicService] Failed to enhance plugin:', error)
    throw new Error('Failed to enhance plugin: ' + (error as Error).message)
  }
}

// ================== Plugin Description Generation ==================

export async function generatePluginDescription(
  name: string,
  tools: PluginTool[]
): Promise<{ shortDescription: string; fullDescription: string; readme: string }> {
  const systemPrompt = `Generate compelling plugin descriptions based on the plugin name and tools.

Respond with a JSON object:
- shortDescription: One-line description (max 100 chars) for listings
- fullDescription: Detailed description (2-3 sentences) for the detail page
- readme: A complete markdown README with usage examples`

  const userPrompt = `Generate descriptions for a plugin called "${name}" with these tools:
${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}`

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''

    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                      content.match(/```\s*([\s\S]*?)\s*```/) ||
                      [null, content]

    const jsonStr = jsonMatch[1].trim()
    return JSON.parse(jsonStr)
  } catch (error) {
    console.error('[AnthropicService] Failed to generate description:', error)
    // Return fallback
    return {
      shortDescription: `${name} - A Claude Code plugin`,
      fullDescription: `This plugin provides ${tools.length} tools to enhance your workflow.`,
      readme: `# ${name}\n\n## Tools\n${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}`,
    }
  }
}

// ================== Smart Plugin Recommendations ==================

export interface RecommendationContext {
  recentPlugins?: string[]
  userRole?: string
  commonTasks?: string[]
  installedPlugins?: string[]
}

export async function getPluginRecommendations(
  context: RecommendationContext,
  availablePlugins: Array<{ id: string; name: string; description: string; category: string; tags: string[] }>
): Promise<Array<{ id: string; reason: string; confidence: number }>> {
  const systemPrompt = `You are a plugin recommendation expert. Analyze the user's context and available plugins to provide personalized recommendations.

Respond with a JSON array of recommendations, sorted by confidence (highest first):
[
  { "id": "plugin-id", "reason": "Why this plugin is recommended", "confidence": 0.95 }
]`

  const userPrompt = `User Context:
${context.userRole ? `- Role: ${context.userRole}` : ''}
${context.commonTasks?.length ? `- Common Tasks: ${context.commonTasks.join(', ')}` : ''}
${context.installedPlugins?.length ? `- Installed Plugins: ${context.installedPlugins.join(', ')}` : ''}
${context.recentPlugins?.length ? `- Recently Viewed: ${context.recentPlugins.join(', ')}` : ''}

Available Plugins:
${availablePlugins.map(p => `- ${p.id}: ${p.name} (${p.category}) - ${p.description} [${p.tags.join(', ')}]`).join('\n')}

Recommend up to 5 most relevant plugins with reasons.`

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''

    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                      content.match(/```\s*([\s\S]*?)\s*```/) ||
                      content.match(/\[\s*\{[\s\S]*\}\s*\]/) ||
                      [null, '[]']

    const jsonStr = jsonMatch[1].trim()
    return JSON.parse(jsonStr)
  } catch (error) {
    console.error('[AnthropicService] Failed to get recommendations:', error)
    // Return top 3 plugins as fallback
    return availablePlugins.slice(0, 3).map((p, i) => ({
      id: p.id,
      reason: 'Popular in ' + p.category,
      confidence: 0.7 - i * 0.1,
    }))
  }
}

// ================== Plugin Code Review ==================

export async function reviewPluginCode(
  code: string,
  manifest: PluginManifest
): Promise<{
  score: number
  issues: Array<{ severity: 'error' | 'warning' | 'info'; message: string; line?: number }>
  suggestions: string[]
}> {
  const systemPrompt = `You are a code review expert for Claude Code plugins. Review the code for:
1. Security issues
2. Performance problems
3. Error handling
4. Code quality
5. Best practices

Respond with a JSON object:
{
  "score": 0-100,
  "issues": [{ "severity": "error|warning|info", "message": "description", "line": 123 }],
  "suggestions": ["suggestion 1", "suggestion 2"]
}`

  const userPrompt = `Review this plugin code:

Manifest:
\`\`\`json
${JSON.stringify(manifest, null, 2)}
\`\`\`

Code:
\`\`\`javascript
${code}
\`\`\``

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''

    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                      content.match(/```\s*([\s\S]*?)\s*```/) ||
                      [null, content]

    const jsonStr = jsonMatch[1].trim()
    return JSON.parse(jsonStr)
  } catch (error) {
    console.error('[AnthropicService] Code review failed:', error)
    return {
      score: 50,
      issues: [{ severity: 'info', message: 'Could not complete automated review' }],
      suggestions: ['Please review the code manually'],
    }
  }
}

// ================== Natural Language to Plugin ==================

export async function generatePluginFromNaturalLanguage(
  description: string
): Promise<{
  name: string
  category: string
  tools: Array<{ name: string; description: string; parameters: any[] }>
  manifest: PluginManifest
  code: string
}> {
  const systemPrompt = `Convert a natural language description into a complete Claude Code plugin.

Understand what the user wants to accomplish and generate:
1. An appropriate plugin name
2. A suitable category
3. The necessary tools with proper parameters
4. Complete working code

Respond with a JSON object containing all the plugin details.`

  const userPrompt = `Create a plugin based on this description:
"${description}"`

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''

    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                      content.match(/```\s*([\s\S]*?)\s*```/) ||
                      [null, content]

    const jsonStr = jsonMatch[1].trim()
    return JSON.parse(jsonStr)
  } catch (error) {
    console.error('[AnthropicService] Natural language generation failed:', error)
    throw new Error('Failed to generate plugin from description: ' + (error as Error).message)
  }
}
