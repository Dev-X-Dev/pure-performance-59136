import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CrawlRequest {
  topic: string;
  sources?: string[];
}

const EDUCATIONAL_SOURCES = {
  'studocu': 'https://www.studocu.com/search?q=',
  'coursenotes': 'https://www.coursenotes.org/search?q=',
  'mitocw': 'https://ocw.mit.edu/search/?q=',
  'docsity': 'https://www.docsity.com/search?q=',
  'hippocampus': 'https://www.hippocampus.org/search?q='
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { topic, sources = Object.keys(EDUCATIONAL_SOURCES) }: CrawlRequest = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from token
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const crawlResults = []

    // Crawl each source
    for (const source of sources) {
      if (EDUCATIONAL_SOURCES[source as keyof typeof EDUCATIONAL_SOURCES]) {
        try {
          const searchUrl = EDUCATIONAL_SOURCES[source as keyof typeof EDUCATIONAL_SOURCES] + encodeURIComponent(topic)
          console.log(`Crawling ${source}: ${searchUrl}`)
          
          const response = await fetch(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          })
          
          if (response.ok) {
            const html = await response.text()
            
            // Extract content based on source
            let extractedContent = ''
            switch (source) {
              case 'studocu':
                extractedContent = extractStudocuContent(html, topic)
                break
              case 'mitocw':
                extractedContent = extractMITContent(html, topic)
                break
              case 'docsity':
                extractedContent = extractDocsityContent(html, topic)
                break
              default:
                extractedContent = extractGenericContent(html, topic)
            }
            
            if (extractedContent) {
              crawlResults.push({
                source,
                topic,
                content: extractedContent,
                url: searchUrl,
                crawled_at: new Date().toISOString()
              })
            }
          }
        } catch (error) {
          console.error(`Error crawling ${source}:`, error)
        }
      }
    }

    // Store crawled content in database
    const { data: storedContent, error } = await supabaseClient
      .from('crawled_content')
      .insert(crawlResults.map(result => ({
        ...result,
        user_id: user.id
      })))
      .select()

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: crawlResults,
        stored: storedContent?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

function extractStudocuContent(html: string, topic: string): string {
  // Extract relevant content from Studocu HTML
  const titleMatches = html.match(/<h[1-4][^>]*>([^<]*(?:${topic}|study|notes)[^<]*)<\/h[1-4]>/gi)
  const contentMatches = html.match(/<p[^>]*>([^<]*(?:${topic}|definition|concept)[^<]*)<\/p>/gi)
  
  let content = ''
  if (titleMatches) content += titleMatches.slice(0, 3).map(m => m.replace(/<[^>]*>/g, '')).join('\n')
  if (contentMatches) content += contentMatches.slice(0, 5).map(m => m.replace(/<[^>]*>/g, '')).join('\n')
  
  return content.substring(0, 2000) // Limit content length
}

function extractMITContent(html: string, topic: string): string {
  // Extract relevant content from MIT OCW HTML
  const courseMatches = html.match(/<h3[^>]*class="course-title"[^>]*>([^<]*)<\/h3>/gi)
  const descMatches = html.match(/<p[^>]*class="course-description"[^>]*>([^<]*)<\/p>/gi)
  
  let content = ''
  if (courseMatches) content += courseMatches.slice(0, 3).map(m => m.replace(/<[^>]*>/g, '')).join('\n')
  if (descMatches) content += descMatches.slice(0, 3).map(m => m.replace(/<[^>]*>/g, '')).join('\n')
  
  return content.substring(0, 2000)
}

function extractDocsityContent(html: string, topic: string): string {
  // Extract relevant content from Docsity HTML
  const docMatches = html.match(/<h[1-4][^>]*>([^<]*)<\/h[1-4]>/gi)
  const summaryMatches = html.match(/<div[^>]*class="summary"[^>]*>([^<]*)<\/div>/gi)
  
  let content = ''
  if (docMatches) content += docMatches.slice(0, 3).map(m => m.replace(/<[^>]*>/g, '')).join('\n')
  if (summaryMatches) content += summaryMatches.slice(0, 3).map(m => m.replace(/<[^>]*>/g, '')).join('\n')
  
  return content.substring(0, 2000)
}

function extractGenericContent(html: string, topic: string): string {
  // Generic content extraction
  const headingMatches = html.match(/<h[1-6][^>]*>([^<]*)<\/h[1-6]>/gi)
  const paraMatches = html.match(/<p[^>]*>([^<]*)<\/p>/gi)
  
  let content = ''
  if (headingMatches) content += headingMatches.slice(0, 3).map(m => m.replace(/<[^>]*>/g, '')).join('\n')
  if (paraMatches) content += paraMatches.slice(0, 5).map(m => m.replace(/<[^>]*>/g, '')).join('\n')
  
  return content.substring(0, 2000)
}