import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('Edge Function loaded');

serve(async (req) => {
  console.log('===== EDGE FUNCTION INVOKED =====');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing request...');
    
    // 获取授权令牌
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ 
          error: 'Missing authorization header',
          success: false
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 创建Supabase客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('Supabase URL:', supabaseUrl?.substring(0, 30) + '...');
    console.log('Supabase Key present:', !!supabaseKey);

    const supabaseClient = createClient(
      supabaseUrl ?? '',
      supabaseKey ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // 获取当前用户
    console.log('Getting user...');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError) {
      console.error('User error:', userError);
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed: ' + userError.message,
          success: false
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (!user) {
      console.error('No user found');
      return new Response(
        JSON.stringify({ 
          error: 'User not found',
          success: false
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('User ID:', user.id);

    // 获取出生日期
    console.log('Fetching profile...');
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('birth_date')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch profile: ' + profileError.message,
          success: false
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Profile:', profile);

    if (!profile || !profile.birth_date) {
      console.log('Birth date not set');
      return new Response(
        JSON.stringify({ 
          error: 'birth_date_required',
          message: '请先设置您的出生日期',
          success: false
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const birthDate = profile.birth_date;
    const today = new Date().toISOString().split('T')[0];
    console.log('Birth date:', birthDate);
    console.log('Today:', today);

    // 检查今天是否已抽签
    console.log('Checking existing draw...');
    const { data: existingDraw, error: checkError } = await supabaseClient
      .from('fortune_draws')
      .select('*')
      .eq('user_id', user.id)
      .eq('draw_date', today)
      .maybeSingle();

    if (checkError) {
      console.error('Check error:', checkError);
    }

    if (existingDraw && existingDraw.birth_date === birthDate) {
      console.log('Returning cached draw');
      return new Response(
        JSON.stringify({
          success: true,
          cached: true,
          data: {
            image_url: existingDraw.image_url,
            fortune_content: existingDraw.fortune_content,
            draw_date: existingDraw.draw_date,
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 调用Coze API
    const cozeApiKey = Deno.env.get('COZE_API_KEY');
    console.log('COZE_API_KEY present:', !!cozeApiKey);
    
    if (!cozeApiKey) {
      console.error('COZE_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          error: 'COZE_API_KEY not configured',
          success: false
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Calling Coze API...');
    const cozeResponse = await fetch('https://api.coze.cn/v1/workflow/run', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cozeApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow_id: '7599134379873468470',
        parameters: { birth: birthDate }
      })
    });

    console.log('Coze status:', cozeResponse.status);

    if (!cozeResponse.ok) {
      const errorText = await cozeResponse.text();
      console.error('Coze error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Coze API failed: ' + cozeResponse.status,
          success: false
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const cozeData = await cozeResponse.json();
    console.log('Coze code:', cozeData.code);

    if (cozeData.code !== 0) {
      console.error('Coze workflow failed:', cozeData.msg);
      return new Response(
        JSON.stringify({ 
          error: 'Coze workflow failed: ' + cozeData.msg,
          success: false
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let fortuneData;
    try {
      fortuneData = JSON.parse(cozeData.data);
    } catch (e) {
      console.error('Parse error:', e);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response format',
          success: false
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!fortuneData.img || !fortuneData.yunshi) {
      console.error('Missing data');
      return new Response(
        JSON.stringify({ 
          error: '识别失败，请重试',
          success: false
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 保存结果
    console.log('Saving to database...');
    const { error: insertError } = await supabaseClient
      .from('fortune_draws')
      .upsert({
        user_id: user.id,
        birth_date: birthDate,
        draw_date: today,
        image_url: fortuneData.img,
        fortune_content: fortuneData.yunshi,
      }, {
        onConflict: 'user_id,draw_date'
      });

    if (insertError) {
      console.error('Insert error:', insertError);
    }

    console.log('===== SUCCESS =====');
    return new Response(
      JSON.stringify({
        success: true,
        cached: false,
        data: {
          image_url: fortuneData.img,
          fortune_content: fortuneData.yunshi,
          draw_date: today,
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('===== ERROR =====');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});