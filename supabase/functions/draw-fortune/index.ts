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
    
    if (!birthDate) {
      return new Response(
        JSON.stringify({ 
          error: 'birth_date_required',
          message: '请先设置您的出生日期',
          success: false
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Birth date:', birthDate);

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

    console.log('Calling Coze workflow...');

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
    console.log('Coze API full response:', JSON.stringify(result));
    
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
    
    console.log('Extracted - img:', img?.substring(0, 50), 'yunshi:', yunshi?.substring(0, 50));
    
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

    return new Response(
      JSON.stringify({
        success: true,
        cached: false,
        data: {
          image_url: img,
          fortune_content: yunshi,
          draw_date: new Date().toISOString().split('T')[0]
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