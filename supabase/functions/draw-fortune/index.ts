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

  try {
    // 获取授权令牌
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // 创建Supabase客户端
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // 获取当前用户
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // 获取用户的出生日期
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('birth_date')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.birth_date) {
      return new Response(
        JSON.stringify({ 
          error: 'birth_date_required',
          message: '请先设置您的出生日期' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const birthDate = profile.birth_date;
    const today = new Date().toISOString().split('T')[0];

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
      throw new Error('COZE_API_KEY not configured');
    }

    console.log('Calling Coze workflow with birth date:', birthDate);

    const cozeResponse = await fetch('https://api.coze.cn/v1/workflow/run', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cozeApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow_id: '7599134379873468470',
        parameters: {
          birth: birthDate
        }
      })
    });

    if (!cozeResponse.ok) {
      const errorText = await cozeResponse.text();
      console.error('Coze API error:', cozeResponse.status, errorText);
      throw new Error(`Coze API request failed: ${cozeResponse.status}`);
    }

    const cozeData = await cozeResponse.json();
    console.log('Coze response:', JSON.stringify(cozeData));

    // 检查Coze响应
    if (cozeData.code !== 0) {
      throw new Error(`Coze workflow failed: ${cozeData.msg || 'Unknown error'}`);
    }

    // 解析返回的数据
    let fortuneData;
    try {
      fortuneData = JSON.parse(cozeData.data);
    } catch (e) {
      console.error('Failed to parse Coze data:', cozeData.data);
      throw new Error('Invalid response format from Coze');
    }

    if (!fortuneData.img || !fortuneData.yunshi) {
      throw new Error('识别失败，请重试');
    }

    // 保存抽签结果
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
    }

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
    console.error('Error in draw-fortune function:', error);
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