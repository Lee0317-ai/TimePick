import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 验证用户身份
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: '未提供认证信息' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 创建 Supabase 客户端验证 JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // 验证用户
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: '认证失败，请重新登录' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id)

    // 读取请求
    const { message } = await req.json()
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: '消息不能为空' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Calling Bailian API for user:', user.id, 'message:', message)

    // 调用阿里云百炼
    const apiKey = Deno.env.get('DASHSCOPE_API_KEY')
    
    if (!apiKey) {
      console.error('DASHSCOPE_API_KEY not found')
      return new Response(
        JSON.stringify({ error: 'API Key 未配置' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const baiLianResponse = await fetch('https://dashscope.aliyuncs.com/api/v1/apps/b464cfbaf21a45038b16a320606f0946/completion', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { prompt: message },
        parameters: { incremental_output: false }
      })
    })

    console.log('Bailian API response status:', baiLianResponse.status)

    if (!baiLianResponse.ok) {
      const errorText = await baiLianResponse.text()
      console.error('Bailian API error:', errorText)
      return new Response(
        JSON.stringify({ error: 'AI 服务调用失败', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await baiLianResponse.json()
    console.log('Bailian API success, returning data')
    
    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
