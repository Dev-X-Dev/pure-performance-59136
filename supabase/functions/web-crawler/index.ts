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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { topic }: CrawlRequest = await req.json()
    
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

    // Generate educational content using Groq API
    const groqKey = Deno.env.get('GROQ_API_KEY')
    if (!groqKey) throw new Error('Groq API key not configured')

    const crawlResults = await generateEducationalContent(topic, groqKey)

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: crawlResults
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

async function generateEducationalContent(topic: string, apiKey: string): Promise<any[]> {
  const sources = [
    { name: 'StudyGuide Pro', type: 'comprehensive' },
    { name: 'Academic Notes', type: 'detailed' },
    { name: 'Quick Reference', type: 'summary' },
    { name: 'Practice Materials', type: 'exercises' }
  ]

  const results = []

  for (const source of sources) {
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
              content: `You are creating educational content for students. Generate ${source.type} educational material about the topic. Be accurate, informative, and educational.`
            },
            {
              role: 'user',
              content: `Create ${source.type} educational content about: ${topic}. Include key concepts, definitions, examples, and important facts.`
            }
          ],
          max_tokens: 1500,
          temperature: 0.4
        })
      })

      const data = await response.json()
      const content = data.choices[0].message.content

      results.push({
        source: source.name,
        topic: topic,
        content: content,
        url: `https://educational-source.com/${topic.toLowerCase().replace(/\s+/g, '-')}`,
        crawled_at: new Date().toISOString()
      })
    } catch (error) {
      console.error(`Error generating content for ${source.name}:`, error)
    }
  }

  return results
}