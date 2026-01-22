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
    console.log('Fortune agent called with streaming')
    
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

    console.log('Calling Bailian API with streaming...')

    // 调用阿里云百炼 API（启用流式输出）
    const baiLianResponse = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/apps/b464cfbaf21a45038b16a320606f0946/completion',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-SSE': 'enable', // 启用 SSE
        },
        body: JSON.stringify({
          input: { prompt: message },
          parameters: { 
            incremental_output: true // 启用增量输出
          }
        })
      }
    )

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

    // 创建流式响应
    const stream = new ReadableStream({
      async start(controller) {
        const reader = baiLianResponse.body?.getReader()
        const decoder = new TextDecoder()
        
        if (!reader) {
          controller.close()
          return
        }

        try {
          while (true) {
            const { done, value } = await reader.read()
            
            if (done) {
              console.log('Stream complete')
              controller.close()
              break
            }

            // 解码并转发数据
            const chunk = decoder.decode(value, { stream: true })
            console.log('Streaming chunk:', chunk.substring(0, 100))
            
            // 直接转发原始 SSE 数据
            controller.enqueue(new TextEncoder().encode(chunk))
          }
        } catch (error) {
          console.error('Stream error:', error)
          controller.error(error)
        }
      }
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
    
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
