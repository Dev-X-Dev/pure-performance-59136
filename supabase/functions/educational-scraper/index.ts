import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScrapingRequest {
  topic: string;
  sources?: string[];
  jobId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { topic, sources = ['educational'], jobId }: ScrapingRequest = await req.json()
    
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

    // Get Groq API key
    const groqKey = Deno.env.get('GROQ_API_KEY')
    if (!groqKey) throw new Error('Groq API key not configured')

    // Skip job status updates for now since tables don't exist yet

    // Generate educational content using AI
    const scrapingResults = await generateEducationalContent(topic, sources, groqKey, user.id, supabaseClient, jobId)

    // Try to save to scraped_notes table first, fallback to notes table
    let savedNote
    let transformedNote
    
    try {
      // Attempt to save to scraped_notes table
      const { data: scrapedNote, error: scrapedError } = await supabaseClient
        .from('scraped_notes')
        .insert({
          topic,
          key_points: scrapingResults.keyPoints,
          sources: scrapingResults.sources,
          condensed_notes: scrapingResults.condensedNotes,
          raw_data: scrapingResults.rawData,
          user_id: user.id
        })
        .select()
        .single()

      if (scrapedError) throw scrapedError
      
      transformedNote = scrapedNote
    } catch (error) {
      console.warn('Scraped notes table not found, using regular notes table:', error)
      
      // Fallback to saving in regular notes table
      const { data: regularNote, error: regularError } = await supabaseClient
        .from('notes')
        .insert({
          title: topic,
          content: scrapingResults.condensedNotes,
          tags: scrapingResults.keyPoints.slice(0, 5), // Use first 5 key points as tags
          user_id: user.id
        })
        .select()
        .single()

      if (regularError) throw regularError

      // Transform to expected format
      transformedNote = {
        id: regularNote.id,
        topic: regularNote.title,
        key_points: scrapingResults.keyPoints,
        sources: scrapingResults.sources,
        condensed_notes: regularNote.content,
        raw_data: scrapingResults.rawData,
        created_at: regularNote.created_at,
        updated_at: regularNote.updated_at,
        user_id: regularNote.user_id
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: transformedNote,
        scraping_results: scrapingResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Educational scraper error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

async function generateEducationalContent(
  topic: string, 
  sources: string[], 
  apiKey: string, 
  userId: string,
  supabase: any,
  jobId?: string
): Promise<any> {
  const educationalSources = [
    { name: 'Comprehensive Study Guide', type: 'comprehensive' },
    { name: 'Key Concepts Summary', type: 'summary' },
    { name: 'Detailed Explanation', type: 'detailed' },
    { name: 'Practice Examples', type: 'examples' }
  ]

  const results: any[] = []
  const keyPoints: string[] = []
  const sourcesList: string[] = []
  let progressStep = 20

  for (const [index, source] of educationalSources.entries()) {
    try {
      // Skip progress updates for now

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are an expert educational content creator. Generate ${source.type} educational material about the topic. Focus on accuracy, clarity, and educational value. Include key concepts, definitions, examples, and practical applications.`
            },
            {
              role: 'user',
              content: `Create ${source.type} educational content about: ${topic}. 
              ${source.type === 'comprehensive' ? 'Provide a complete overview with main concepts, subtopics, and detailed explanations.' : ''}
              ${source.type === 'summary' ? 'Extract and list the most important key points and concepts.' : ''}
              ${source.type === 'detailed' ? 'Provide in-depth explanations with examples and applications.' : ''}
              ${source.type === 'examples' ? 'Provide practical examples, exercises, and real-world applications.' : ''}`
            }
          ],
          max_tokens: 1500,
          temperature: 0.3
        })
      })

      const data = await response.json()
      const content = data.choices[0].message.content

      results.push({
        source: source.name,
        type: source.type,
        content: content,
        topic: topic,
        scraped_at: new Date().toISOString()
      })

      // Extract key points for summary
      if (source.type === 'summary') {
        const points = content.split('\n').filter((line: string) => 
          line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().startsWith('*')
        ).map((point: string) => point.trim().replace(/^[-•*]\s*/, ''))
        keyPoints.push(...points)
      }

      sourcesList.push(source.name)

    } catch (error) {
      console.error(`Error generating content for ${source.name}:`, error)
    }
  }

  // Generate condensed notes from all content
  const allContent = results.map(r => r.content).join('\n\n')
  const condensedNotes = await generateCondensedNotes(allContent, topic, apiKey)

  return {
    keyPoints,
    sources: sourcesList,
    condensedNotes,
    rawData: results,
    topic
  }
}

async function generateCondensedNotes(content: string, topic: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at condensing educational content into clear, organized notes. Create well-structured, concise notes that capture the essential information.'
          },
          {
            role: 'user',
            content: `Please condense the following educational content about "${topic}" into clear, organized study notes. Focus on key concepts, definitions, and important points:\n\n${content}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.2
      })
    })

    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error('Error generating condensed notes:', error)
    return content.substring(0, 1000) + '...' // Fallback to truncated content
  }
}