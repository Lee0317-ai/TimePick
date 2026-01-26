import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Draw fortune called');
    
    // 获取请求体
    const { userId, birthDate } = await req.json();
    
    if (!userId || !birthDate) {
      return new Response(
        JSON.stringify({ 
          error: 'userId and birthDate are required',
          success: false
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User ID:', userId);
    console.log('Birth date:', birthDate);

    // 创建Supabase客户端（用于数据库操作）
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // 获取今天的日期
    const today = new Date().toISOString().split('T')[0];
    console.log('Today:', today);

    // 检查今天是否已经抽过签
    console.log('Checking existing draw...');
    const { data: existingDraw, error: checkError } = await supabase
      .from('fortune_draws')
      .select('*')
      .eq('user_id', userId)
      .eq('draw_date', today)
      .maybeSingle();

    if (checkError) {
      console.error('Check error:', checkError);
    }

    // 如果已经抽过签且出生日期未改变，返回缓存结果
    if (existingDraw && existingDraw.birth_date === birthDate) {
      console.log('Returning cached draw from database');
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
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('No cached draw found, calling Coze API...');

    // 获取Coze API Key
    const apiKey = Deno.env.get('COZE_API_KEY');
    
    if (!apiKey) {
      console.error('COZE_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          error: 'API Key 未配置',
          success: false
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 调用Coze工作流
    const cozeResponse = await fetch(
      'https://api.coze.cn/v1/workflow/run',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow_id: '7599134379873468470',
          parameters: {
            birth: birthDate
          }
        })
      }
    );

    console.log('Coze API response status:', cozeResponse.status);

    if (!cozeResponse.ok) {
      const errorText = await cozeResponse.text();
      console.error('Coze API error response:', errorText);
      return new Response(
        JSON.stringify({ 
          error: '抽签服务调用失败',
          details: errorText,
          success: false
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await cozeResponse.json();
    console.log('Coze API response code:', result.code);
    
    // 检查Coze响应
    if (result.code !== 0) {
      console.error('Coze workflow failed:', result.msg);
      return new Response(
        JSON.stringify({ 
          error: 'Coze workflow failed: ' + result.msg,
          success: false
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 解析data字段
    let parsedData = result.data;
    if (typeof result.data === 'string') {
      try {
        parsedData = JSON.parse(result.data);
      } catch (e) {
        console.error('Failed to parse data string:', e);
        return new Response(
          JSON.stringify({ 
            error: '数据解析失败',
            success: false
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    const { img, yunshi } = parsedData;
    
    console.log('Extracted - img present:', !!img, 'yunshi present:', !!yunshi);
    
    if (!img || !yunshi) {
      console.error('Missing img or yunshi');
      return new Response(
        JSON.stringify({ 
          error: '识别失败，请重试',
          success: false
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 保存抽签结果到数据库
    console.log('Saving fortune draw to database...');
    const { error: saveError } = await supabase
      .from('fortune_draws')
      .upsert({
        user_id: userId,
        birth_date: birthDate,
        draw_date: today,
        image_url: img,
        fortune_content: yunshi,
      }, {
        onConflict: 'user_id,draw_date'
      });

    if (saveError) {
      console.error('Save error:', saveError);
      // 不阻断返回，只记录错误
    } else {
      console.log('Fortune draw saved successfully');
    }

    return new Response(
      JSON.stringify({
        success: true,
        cached: false,
        data: {
          image_url: img,
          fortune_content: yunshi,
          draw_date: today
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Function error:', error.message);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: '抽签失败，请重试',
        message: error.message,
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});