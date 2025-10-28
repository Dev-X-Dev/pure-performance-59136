import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AIRequest {
  action: 'condense' | 'flashcards' | 'quiz' | 'chat' | 'practice-problems' | 'edit-note';
  content?: string;
  noteIds?: string[];
  message?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  prompt?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, content, noteIds, message, difficulty = 'medium', prompt }: AIRequest = await req.json()
    
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

    const groqKey = Deno.env.get('GROQ_API_KEY')
    if (!groqKey) throw new Error('Groq API key not configured')

    console.log('AI Processor request:', { action, noteIds, difficulty })

    let result
    
    switch (action) {
      case 'condense':
        result = await condenseNotes(content || '', groqKey)
        break
      case 'flashcards':
        const notesContent = await fetchNotesContent(supabaseClient, noteIds || [], user.id)
        result = await generateFlashcards(notesContent, groqKey, difficulty)
        break
      case 'quiz':
        const quizContent = await fetchNotesContent(supabaseClient, noteIds || [], user.id)
        result = await generateQuiz(quizContent, groqKey, difficulty)
        break
      case 'chat':
        result = await chatWithAI(message || '', groqKey)
        break
      case 'practice-problems':
        const problemsContent = content || await fetchNotesContent(supabaseClient, noteIds || [], user.id)
        result = await generatePracticeProblems(problemsContent, groqKey, difficulty)
        break
      case 'edit-note':
        result = await editNoteWithAI(content || '', prompt || '', groqKey)
        break
      default:
        throw new Error('Invalid action')
    }

    return new Response(
      JSON.stringify({ success: true, result }),
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

async function fetchNotesContent(supabase: any, noteIds: string[], userId: string): Promise<string> {
  const { data: notes } = await supabase
    .from('notes')
    .select('title, content')
    .in('id', noteIds)
    .eq('user_id', userId)
  
  return notes?.map((note: any) => `${note.title}\n${note.content}`).join('\n\n') || ''
}

async function condenseNotes(content: string, apiKey: string): Promise<string> {
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
          content: 'You are an expert study assistant. Condense the given notes into the most important key points, maintaining accuracy while making them easier to study. Format with clear headings and bullet points.'
        },
        {
          role: 'user',
          content: `Please condense these notes into key study points:\n\n${content}`
        }
      ],
      max_tokens: 1500,
      temperature: 0.3
    })
  })
  
  const data = await response.json()
  return data.choices[0].message.content
}

async function generateFlashcards(content: string, apiKey: string, difficulty: string): Promise<any[]> {
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
          content: `Create ${difficulty} level flashcards from the given content. Return a JSON array of objects with "front" and "back" properties. Make 8-12 flashcards focusing on key concepts.`
        },
        {
          role: 'user',
          content: `Generate flashcards from this content:\n\n${content}`
        }
      ],
      max_tokens: 2000,
      temperature: 0.4
    })
  })
  
  const data = await response.json()
  try {
    return JSON.parse(data.choices[0].message.content)
  } catch {
    return []
  }
}

async function generateQuiz(content: string, apiKey: string, difficulty: string): Promise<any[]> {
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
          content: `Create a ${difficulty} level multiple choice quiz from the given content. Return a JSON array of objects with "question", "options" (array of 4 choices), "correct" (correct answer index), and "explanation" properties. Make 5-8 questions.`
        },
        {
          role: 'user',
          content: `Generate a quiz from this content:\n\n${content}`
        }
      ],
      max_tokens: 2500,
      temperature: 0.4
    })
  })
  
  const data = await response.json()
  try {
    return JSON.parse(data.choices[0].message.content)
  } catch {
    return []
  }
}

async function chatWithAI(message: string, apiKey: string): Promise<string> {
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
          content: 'You are an expert AI tutor. Help students understand concepts, answer questions, and provide clear explanations. Be encouraging and educational.'
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  })
  
  const data = await response.json()
  return data.choices[0].message.content
}

async function generatePracticeProblems(content: string, apiKey: string, difficulty: string): Promise<string> {
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
          content: `Generate ${difficulty} level practice problems based on the given content. Create 3-5 problems with detailed solutions. Include the problem statement and step-by-step solutions.`
        },
        {
          role: 'user',
          content: `Generate practice problems from this content:\n\n${content}`
        }
      ],
      max_tokens: 2500,
      temperature: 0.5
    })
  })
  
  const data = await response.json()
  return data.choices[0].message.content
}

async function editNoteWithAI(content: string, prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a helpful AI assistant that edits note content based on user instructions. 
          You should modify the content according to the user's request while maintaining the overall structure and meaning unless specifically asked to change it.
          Return ONLY the edited content, without any explanations or meta-commentary.`
        },
        {
          role: 'user',
          content: `Here is the current note content:\n\n${content}\n\nPlease make the following changes:\n${prompt}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })
  })
  
  const data = await response.json()
  return data.choices[0].message.content
}