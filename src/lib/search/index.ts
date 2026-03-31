// Web search utility for enriching AI course generation with current information

export interface SearchResult {
  title: string
  url: string
  content: string
  publishedDate?: string
  score?: number
}

export interface SearchResponse {
  results: SearchResult[]
  answer?: string
  query: string
}

/**
 * Detects whether a topic likely refers to recent/current events that would
 * benefit from live web search context (post AI knowledge cutoff).
 */
export function isRecentTopic(topic: string): boolean {
  const lower = topic.toLowerCase()

  // Year references for recent years
  const currentYear = new Date().getFullYear()
  for (let y = 2024; y <= currentYear; y++) {
    if (lower.includes(String(y))) return true
  }

  // News/current events keywords
  const newsKeywords = [
    'war', 'conflict', 'invasion', 'attack', 'strike',
    'election', 'vote', 'president', 'prime minister', 'chancellor',
    'crisis', 'sanctions', 'ceasefire', 'peace talks', 'treaty',
    'breaking', 'latest', 'recent', 'current events', 'today',
    'this year', 'last year', 'this week', 'this month',
    'news', 'developing', 'ongoing',
    'covid', 'pandemic', 'epidemic',
    'earthquake', 'hurricane', 'flood', 'disaster',
    'stock market', 'inflation', 'recession', 'economy',
    'ai model', 'new model', 'gpt', 'gemini', 'claude',
    'trump', 'biden', 'harris', 'zelensky', 'putin', 'netanyahu',
    'ukraine', 'russia', 'gaza', 'israel', 'iran', 'taiwan',
  ]

  return newsKeywords.some(keyword => lower.includes(keyword))
}

/**
 * Searches the web using the Tavily API.
 * Returns null if TAVILY_API_KEY is not set or if the search fails (non-blocking).
 */
export async function searchWeb(query: string, maxResults = 5): Promise<SearchResponse | null> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    console.log('[Search] TAVILY_API_KEY not set, skipping web search')
    return null
  }

  try {
    console.log('[Search] Searching web for:', query)
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'advanced',
        include_answer: true,
        include_raw_content: false,
        max_results: maxResults,
        include_domains: [],
        exclude_domains: [],
      }),
    })

    if (!response.ok) {
      console.error('[Search] Tavily API error:', response.status, await response.text())
      return null
    }

    const data = await response.json()
    console.log('[Search] Got', data.results?.length || 0, 'results')

    return {
      query,
      answer: data.answer,
      results: (data.results || []).map((r: SearchResult & { published_date?: string }) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        publishedDate: r.published_date || r.publishedDate,
        score: r.score,
      })),
    }
  } catch (error) {
    console.error('[Search] Web search failed:', error)
    return null
  }
}

/**
 * Formats search results into a compact context block suitable for injection
 * into an AI prompt.
 */
export function formatSearchContext(searchResponse: SearchResponse): string {
  const lines: string[] = [
    '=== CURRENT WEB SEARCH RESULTS ===',
    `Query: "${searchResponse.query}"`,
    '',
  ]

  if (searchResponse.answer) {
    lines.push('AI Summary from search:')
    lines.push(searchResponse.answer)
    lines.push('')
  }

  lines.push('Recent sources:')
  for (const result of searchResponse.results) {
    lines.push(`\n[${result.title}]`)
    if (result.publishedDate) {
      lines.push(`Published: ${result.publishedDate}`)
    }
    // Truncate content to keep prompt size reasonable
    const snippet = result.content.length > 500
      ? result.content.slice(0, 500) + '...'
      : result.content
    lines.push(snippet)
  }

  lines.push('')
  lines.push('=== END SEARCH RESULTS ===')
  lines.push('')
  lines.push('Use the above current information to supplement your knowledge. Prioritize this for recent events, but rely on your training data for historical context, mechanisms, and analysis.')

  return lines.join('\n')
}
