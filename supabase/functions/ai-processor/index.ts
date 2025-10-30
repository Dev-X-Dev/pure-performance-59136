import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AIRequest {
  action: 'condense' | 'flashcards' | 'quiz' | 'chat' | 'practice-problems' | 'edit-note';
  content?: string;
  noteIds?: string[];
  message?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  prompt?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { action, content, noteIds, message, difficulty = 'medium', prompt }: AIRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) throw new Error('Gemini API key not configured');

    console.log('AI Processor request:', { action, noteIds, difficulty });

    let result;

    switch (action) {
      case 'condense':
        result = await condenseNotes(content || '', geminiKey);
        break;
      case 'flashcards':
        const notesContent = await fetchNotesContent(supabaseClient, noteIds || [], user.id);
        result = await generateFlashcards(notesContent, geminiKey, difficulty);
        break;
      case 'quiz':
        const quizContent = await fetchNotesContent(supabaseClient, noteIds || [], user.id);
        result = await generateQuiz(quizContent, geminiKey, difficulty);
        break;
      case 'chat':
        result = await chatWithAI(message || '', geminiKey);
        break;
      case 'practice-problems':
        const problemsContent = content || await fetchNotesContent(supabaseClient, noteIds || [], user.id);
        result = await generatePracticeProblems(problemsContent, geminiKey, difficulty);
        break;
      case 'edit-note':
        result = await editNoteWithAI(content || '', prompt || '', geminiKey);
        break;
      default:
        throw new Error('Invalid action');
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('AI Processor error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});

async function fetchNotesContent(supabase: any, noteIds: string[], userId: string): Promise<string> {
  const { data: notes } = await supabase
    .from('notes')
    .select('title, content')
    .in('id', noteIds)
    .eq('user_id', userId);

  return notes?.map((note: any) => `${note.title}\n${note.content}`).join('\n\n') || '';
}

async function callGemini(apiKey: string, prompt: string, systemInstruction: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function condenseNotes(content: string, apiKey: string): Promise<string> {
  const systemInstruction = 'You are an expert study assistant. Condense the given notes into the most important key points, maintaining accuracy while making them easier to study. Format with clear headings and bullet points.';
  const prompt = `Please condense these notes into key study points:\n\n${content}`;

  return await callGemini(apiKey, prompt, systemInstruction);
}

async function generateFlashcards(content: string, apiKey: string, difficulty: string): Promise<any[]> {
  const systemInstruction = `Create ${difficulty} level flashcards from the given content. Return a JSON array of objects with "front" and "back" properties. Make 8-12 flashcards focusing on key concepts. Return ONLY valid JSON, no other text.`;
  const prompt = `Generate flashcards from this content:\n\n${content}`;

  const result = await callGemini(apiKey, prompt, systemInstruction);

  try {
    const cleanedResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanedResult);
  } catch (e) {
    console.error('Failed to parse flashcards JSON:', e, result);
    return [];
  }
}

async function generateQuiz(content: string, apiKey: string, difficulty: string): Promise<any[]> {
  const systemInstruction = `Create a ${difficulty} level multiple choice quiz from the given content. Return a JSON array of objects with "question", "options" (array of 4 choices), "correct" (correct answer index 0-3), and "explanation" properties. Make 5-8 questions. Return ONLY valid JSON, no other text.`;
  const prompt = `Generate a quiz from this content:\n\n${content}`;

  const result = await callGemini(apiKey, prompt, systemInstruction);

  try {
    const cleanedResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanedResult);
  } catch (e) {
    console.error('Failed to parse quiz JSON:', e, result);
    return [];
  }
}

async function chatWithAI(message: string, apiKey: string): Promise<string> {
  const systemInstruction = 'You are an expert AI tutor. Help students understand concepts, answer questions, and provide clear explanations. Be encouraging and educational.';

  return await callGemini(apiKey, message, systemInstruction);
}

async function generatePracticeProblems(content: string, apiKey: string, difficulty: string): Promise<string> {
  const systemInstruction = `Generate ${difficulty} level practice problems based on the given content. Create 3-5 problems with detailed solutions. Include the problem statement and step-by-step solutions.`;
  const prompt = `Generate practice problems from this content:\n\n${content}`;

  return await callGemini(apiKey, prompt, systemInstruction);
}

async function editNoteWithAI(content: string, prompt: string, apiKey: string): Promise<string> {
  const systemInstruction = `You are a helpful AI assistant that edits note content based on user instructions. You should modify the content according to the user's request while maintaining the overall structure and meaning unless specifically asked to change it. Return ONLY the edited content, without any explanations or meta-commentary.`;
  const userPrompt = `Here is the current note content:\n\n${content}\n\nPlease make the following changes:\n${prompt}`;

  return await callGemini(apiKey, userPrompt, systemInstruction);
}
