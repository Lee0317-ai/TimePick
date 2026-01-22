import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Fortune agent called')
    
    // 读取请求体
    const { message } = await req.json()
    
    if (!message) {
      console.error('Empty message')
      return new Response(
        JSON.stringify({ error: '消息不能为空' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Message received:', message.substring(0, 50))

    // 获取阿里云百炼 API Key
    const apiKey = Deno.env.get('DASHSCOPE_API_KEY')
    
    if (!apiKey) {
      console.error('DASHSCOPE_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'API Key 未配置，请联系管理员' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Calling Bailian API...')

    // 创建超时控制器（50秒超时）
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 50000)

    try {
      // 调用阿里云百炼 API
      const baiLianResponse = await fetch(
        'https://dashscope.aliyuncs.com/api/v1/apps/b464cfbaf21a45038b16a320606f0946/completion',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: { prompt: message },
            parameters: { 
              incremental_output: false 
            }
          }),
          signal: controller.signal
        }
      )

      clearTimeout(timeoutId)

      console.log('Bailian API response status:', baiLianResponse.status)

      if (!baiLianResponse.ok) {
        const errorText = await baiLianResponse.text()
        console.error('Bailian API error response:', errorText)
        return new Response(
          JSON.stringify({ 
            error: 'AI 服务调用失败', 
            details: errorText,
            status: baiLianResponse.status 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const data = await baiLianResponse.json()
      console.log('Bailian API success, response keys:', Object.keys(data))
      
      return new Response(
        JSON.stringify(data),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        console.error('Bailian API timeout after 50s')
        return new Response(
          JSON.stringify({ 
            error: 'AI 响应超时，问题可能较复杂，请简化后重试' 
          }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw fetchError
    }
    
  } catch (error) {
    console.error('Function error:', error.message)
    console.error('Error stack:', error.stack)
    return new Response(
      JSON.stringify({ 
        error: '服务器内部错误', 
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
