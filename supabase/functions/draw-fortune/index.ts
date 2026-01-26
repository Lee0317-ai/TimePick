import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== Draw Fortune Function Started ===');

  try {
    // 获取授权令牌
    const authHeader = req.headers.get('Authorization');
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
    
    console.log('Supabase URL:', supabaseUrl ? 'OK' : 'MISSING');
    console.log('Supabase Key:', supabaseKey ? 'OK' : 'MISSING');

    const supabaseClient = createClient(
      supabaseUrl ?? '',
      supabaseKey ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // 获取当前用户
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) {
      console.error('Get user error:', userError);
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
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

    console.log('User authenticated:', user.id);

    // 获取用户的出生日期
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('birth_date')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile query error:', profileError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch profile',
          success: false
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!profile || !profile.birth_date) {
      console.log('Birth date not set for user:', user.id);
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

    // 检查今天是否已经抽过签
    const { data: existingDraw, error: checkError } = await supabaseClient
      .from('fortune_draws')
      .select('*')
      .eq('user_id', user.id)
      .eq('draw_date', today)
      .maybeSingle();

    if (checkError) {
      console.error('Check existing draw error:', checkError);
    }

    // 如果已经抽过签且出生日期未改变，返回已有结果
    if (existingDraw && existingDraw.birth_date === birthDate) {
      console.log('Returning cached fortune draw');
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

    // 调用Coze工作流
    const cozeApiKey = Deno.env.get('COZE_API_KEY');
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

    console.log('COZE_API_KEY:', cozeApiKey ? `${cozeApiKey.substring(0, 10)}...` : 'MISSING');
    console.log('Calling Coze workflow with birth date:', birthDate);

    const cozePayload = {
      workflow_id: '7599134379873468470',
      parameters: {
        birth: birthDate
      }
    };
    console.log('Coze request payload:', JSON.stringify(cozePayload));

    const cozeResponse = await fetch('https://api.coze.cn/v1/workflow/run', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cozeApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cozePayload)
    });

    console.log('Coze response status:', cozeResponse.status);

    if (!cozeResponse.ok) {
      const errorText = await cozeResponse.text();
      console.error('Coze API error:', cozeResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `Coze API failed: ${cozeResponse.status}`,
          details: errorText,
          success: false
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const cozeData = await cozeResponse.json();
    console.log('Coze response:', JSON.stringify(cozeData).substring(0, 200) + '...');

    // 检查Coze响应
    if (cozeData.code !== 0) {
      console.error('Coze workflow failed:', cozeData.msg);
      return new Response(
        JSON.stringify({ 
          error: `Coze workflow failed: ${cozeData.msg || 'Unknown error'}`,
          success: false
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 解析返回的数据
    let fortuneData;
    try {
      fortuneData = JSON.parse(cozeData.data);
      console.log('Parsed fortune data:', JSON.stringify(fortuneData).substring(0, 100) + '...');
    } catch (e) {
      console.error('Failed to parse Coze data:', cozeData.data);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response format from Coze',
          success: false
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!fortuneData.img || !fortuneData.yunshi) {
      console.error('Missing img or yunshi in fortune data:', fortuneData);
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

    // 保存抽签结果
    console.log('Saving fortune draw to database...');
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
      console.error('Insert fortune draw error:', insertError);
      // 不抛出错误，继续返回结果
    } else {
      console.log('Fortune draw saved successfully');
    }

    console.log('=== Draw Fortune Function Completed Successfully ===');
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
    console.error('=== Error in draw-fortune function ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
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