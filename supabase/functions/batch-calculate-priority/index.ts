import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Maximum concurrent calculations
const MAX_CONCURRENT = 5;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { link_ids } = await req.json();

    // Validate required fields
    if (!link_ids || !Array.isArray(link_ids) || link_ids.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'MISSING_IDS',
          message: 'link_ids 参数必须是非空数组'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Batch calculating priority for ${link_ids.length} links`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all links
    const { data: links, error: fetchError } = await supabase
      .from('try_queue_links')
      .select('id, url, title, description, user_id, tags')
      .in('id', link_ids);

    if (fetchError) {
      console.error('Error fetching links:', fetchError);
      return new Response(
        JSON.stringify({
          error: 'FETCH_ERROR',
          message: '获取链接失败',
          details: fetchError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!links || links.length === 0) {
      return new Response(
        JSON.stringify({
          updated_count: 0,
          failed_count: 0,
          errors: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process links with concurrency control
    const results: {
      id: string;
      success: boolean;
      score?: number;
      level?: 'high' | 'medium' | 'low';
      error?: string;
    }[] = [];

    // Process in batches
    for (let i = 0; i < links.length; i += MAX_CONCURRENT) {
      const batch = links.slice(i, i + MAX_CONCURRENT);

      // Process batch concurrently
      const batchPromises = batch.map(async (link) => {
        try {
          // Call calculate-priority function
          const calculateUrl = new URL('/functions/v1/calculate-priority', supabaseUrl.replace('/rest/v1', ''));
          const response = await fetch(calculateUrl.toString(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              url: link.url,
              title: link.title,
              description: link.description,
              user_id: link.user_id,
              tags: link.tags,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            return {
              id: link.id,
              success: false,
              error: `HTTP ${response.status}: ${errorText}`
            };
          }

          const result = await response.json();

          // Update database
          const { error: updateError } = await supabase
            .from('try_queue_links')
            .update({
              priority_score: result.score,
              priority_level: result.level,
              updated_at: new Date().toISOString(),
            })
            .eq('id', link.id);

          if (updateError) {
            return {
              id: link.id,
              success: false,
              error: updateError.message
            };
          }

          return {
            id: link.id,
            success: true,
            score: result.score,
            level: result.level
          };

        } catch (error) {
          return {
            id: link.id,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      console.log(`Processed batch ${i / MAX_CONCURRENT + 1}/${Math.ceil(links.length / MAX_CONCURRENT)}`);
    }

    // Calculate statistics
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const errors = results
      .filter(r => !r.success)
      .map(r => `${r.id}: ${r.error}`);

    console.log(`Batch calculation complete: ${successCount} success, ${failCount} failed`);

    // Return success response
    return new Response(
      JSON.stringify({
        updated_count: successCount,
        failed_count: failCount,
        errors,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Function error:', error.message);
    console.error('Error stack:', error.stack);

    return new Response(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: '服务器内部错误',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
