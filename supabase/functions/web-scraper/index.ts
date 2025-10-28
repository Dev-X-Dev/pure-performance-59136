import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  content: string;
  source: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic } = await req.json();
    
    if (!topic) {
      return new Response(
        JSON.stringify({ error: 'Topic is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scraping topic:', topic);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    if (authHeader) {
      const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user } } = await supabaseClient.auth.getUser();
      userId = user?.id;
    }

    // Scrape multiple educational sources
    const results: SearchResult[] = [];

    // 1. Wikipedia
    try {
      const wikiResult = await scrapeWikipedia(topic);
      if (wikiResult) results.push(wikiResult);
    } catch (e) {
      console.error('Wikipedia scrape error:', e);
    }

    // 2. Khan Academy (search)
    try {
      const khanResult = await scrapeKhanAcademy(topic);
      if (khanResult) results.push(khanResult);
    } catch (e) {
      console.error('Khan Academy scrape error:', e);
    }

    // 3. MIT OpenCourseWare
    try {
      const mitResult = await scrapeMITOCW(topic);
      if (mitResult) results.push(mitResult);
    } catch (e) {
      console.error('MIT OCW scrape error:', e);
    }

    // 4. Stanford Encyclopedia
    try {
      const stanfordResult = await scrapeStanfordEncyclopedia(topic);
      if (stanfordResult) results.push(stanfordResult);
    } catch (e) {
      console.error('Stanford Encyclopedia scrape error:', e);
    }

    // 5. Coursera (course info)
    try {
      const courseraResult = await scrapeCoursera(topic);
      if (courseraResult) results.push(courseraResult);
    } catch (e) {
      console.error('Coursera scrape error:', e);
    }

    // Store results in cache
    if (results.length > 0 && userId) {
      try {
        await supabase.from('search_cache').insert({
          user_id: userId,
          search_query: topic,
          results: results,
        });
      } catch (e) {
        console.error('Cache storage error:', e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, results, count: results.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function scrapeWikipedia(topic: string): Promise<SearchResult | null> {
  try {
    // Wikipedia API
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.query?.search?.[0]) return null;

    const pageTitle = searchData.query.search[0].title;
    const snippet = searchData.query.search[0].snippet.replace(/<[^>]*>/g, '');

    // Get full page content
    const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(pageTitle)}&format=json&origin=*`;
    const contentRes = await fetch(contentUrl);
    const contentData = await contentRes.json();

    const pages = contentData.query?.pages;
    const pageId = Object.keys(pages)[0];
    const extract = pages[pageId]?.extract || snippet;

    return {
      title: pageTitle,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`,
      snippet: snippet.substring(0, 200),
      content: extract.substring(0, 2000),
      source: 'Wikipedia'
    };
  } catch (e) {
    console.error('Wikipedia error:', e);
    return null;
  }
}

async function scrapeKhanAcademy(topic: string): Promise<SearchResult | null> {
  try {
    // Khan Academy uses a search API
    const searchUrl = `https://www.khanacademy.org/api/internal/graphql/searchContentByTitle`;
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operationName: 'searchContentByTitle',
        query: topic,
        variables: { query: topic, pageSize: 1 }
      })
    });

    const data = await response.json();
    
    if (data?.data?.searchContent?.hits?.[0]) {
      const hit = data.data.searchContent.hits[0];
      return {
        title: hit.title || topic,
        url: `https://www.khanacademy.org${hit.url || ''}`,
        snippet: hit.description || 'Khan Academy educational content',
        content: `Khan Academy resource on ${topic}: ${hit.description || 'Educational videos and practice exercises'}`,
        source: 'Khan Academy'
      };
    }
    
    return null;
  } catch (e) {
    console.error('Khan Academy error:', e);
    // Fallback to general Khan Academy link
    return {
      title: `${topic} - Khan Academy`,
      url: `https://www.khanacademy.org/search?referer=&page_search_query=${encodeURIComponent(topic)}`,
      snippet: 'Free online courses, lessons and practice',
      content: `Educational resources about ${topic} from Khan Academy, including videos and practice exercises.`,
      source: 'Khan Academy'
    };
  }
}

async function scrapeMITOCW(topic: string): Promise<SearchResult | null> {
  try {
    // MIT OCW search
    const searchUrl = `https://ocw.mit.edu/search/?q=${encodeURIComponent(topic)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EducationalBot/1.0)'
      }
    });
    
    const html = await response.text();
    
    // Basic HTML parsing for title and link
    const titleMatch = html.match(/<h3[^>]*class="[^"]*course-title[^"]*"[^>]*>(.*?)<\/h3>/i);
    const linkMatch = html.match(/href="(\/courses\/[^"]+)"/);
    const descMatch = html.match(/<p[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)<\/p>/i);
    
    if (linkMatch) {
      return {
        title: titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : `${topic} - MIT OpenCourseWare`,
        url: `https://ocw.mit.edu${linkMatch[1]}`,
        snippet: descMatch ? descMatch[1].replace(/<[^>]*>/g, '').substring(0, 200) : 'Free MIT course materials',
        content: `MIT OpenCourseWare content on ${topic}. Free lecture notes, exams, and videos from MIT.`,
        source: 'MIT OpenCourseWare'
      };
    }
    
    // Fallback
    return {
      title: `${topic} - MIT OpenCourseWare`,
      url: `https://ocw.mit.edu/search/?q=${encodeURIComponent(topic)}`,
      snippet: 'Free MIT course materials',
      content: `Search results for ${topic} on MIT OpenCourseWare - access free course materials from MIT.`,
      source: 'MIT OpenCourseWare'
    };
  } catch (e) {
    console.error('MIT OCW error:', e);
    return null;
  }
}

async function scrapeStanfordEncyclopedia(topic: string): Promise<SearchResult | null> {
  try {
    // Stanford Encyclopedia of Philosophy search
    const searchUrl = `https://plato.stanford.edu/search/searcher.py?query=${encodeURIComponent(topic)}`;
    const response = await fetch(searchUrl);
    const html = await response.text();
    
    // Basic parsing
    const linkMatch = html.match(/href="(\/entries\/[^"]+)"/);
    const titleMatch = html.match(/<a[^>]*href="\/entries\/[^"]*"[^>]*>(.*?)<\/a>/);
    
    if (linkMatch) {
      return {
        title: titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : topic,
        url: `https://plato.stanford.edu${linkMatch[1]}`,
        snippet: 'Stanford Encyclopedia of Philosophy entry',
        content: `Academic encyclopedia entry on ${topic} from Stanford Encyclopedia of Philosophy.`,
        source: 'Stanford Encyclopedia'
      };
    }
    
    return null;
  } catch (e) {
    console.error('Stanford Encyclopedia error:', e);
    return null;
  }
}

async function scrapeCoursera(topic: string): Promise<SearchResult | null> {
  try {
    // Coursera search page
    const searchUrl = `https://www.coursera.org/search?query=${encodeURIComponent(topic)}`;
    
    return {
      title: `${topic} - Coursera Courses`,
      url: searchUrl,
      snippet: 'Online courses and specializations',
      content: `Find online courses and learning paths about ${topic} on Coursera from top universities and companies.`,
      source: 'Coursera'
    };
  } catch (e) {
    console.error('Coursera error:', e);
    return null;
  }
}
