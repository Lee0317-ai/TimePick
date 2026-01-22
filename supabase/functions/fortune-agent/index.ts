import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('Fortune agent function invoked')
  console.log('Method:', req.method)
  console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers)))
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. 读取请求体
    let requestBody
    try {
      const text = await req.text()
      console.log('Request text:', text)
      requestBody = JSON.parse(text)
      console.log('Parsed request body:', JSON.stringify(requestBody))
    } catch (e) {
      console.error('Failed to parse request body:', e)
      return new Response(JSON.stringify({ 
        error: '请求格式错误',
        details: e.message 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    
    const { message } = requestBody
    
    if (!message) {
      console.log('No message in request')
      return new Response(JSON.stringify({ 
        error: '缺少消息内容' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 2. 检查 API Key
    const apiKey = Deno.env.get('DASHSCOPE_API_KEY')
    console.log('API Key check:', apiKey ? `exists (length: ${apiKey.length})` : 'NOT FOUND')
    
    if (!apiKey) {
      console.error('DASHSCOPE_API_KEY environment variable is not set')
      return new Response(JSON.stringify({ 
        error: 'API配置错误',
        details: 'DASHSCOPE_API_KEY 未设置'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // 3. 调用阿里云百炼 API
    const appId = 'b464cfbaf21a45038b16a320606f0946'
    const apiUrl = `https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`
    
    console.log('Calling DashScope API...')
    console.log('API URL:', apiUrl)
    console.log('User message:', message)
    
    const payload = {
      input: {
        prompt: message
      },
      parameters: {
        incremental_output: false
      }
    }
    console.log('API payload:', JSON.stringify(payload))
    
    const dashscopeResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    console.log('DashScope response status:', dashscopeResponse.status)
    console.log('DashScope response headers:', JSON.stringify(Object.fromEntries(dashscopeResponse.headers)))

    const responseText = await dashscopeResponse.text()
    console.log('DashScope response text:', responseText)

    if (!dashscopeResponse.ok) {
      console.error('DashScope API returned error status')
      return new Response(JSON.stringify({ 
        error: 'AI服务调用失败',
        status: dashscopeResponse.status,
        details: responseText
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    let data
    try {
      data = JSON.parse(responseText)
      console.log('Parsed DashScope response:', JSON.stringify(data))
    } catch (e) {
      console.error('Failed to parse DashScope response:', e)
      return new Response(JSON.stringify({ 
        error: 'AI响应解析失败',
        details: responseText
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }
    
    console.log('Success! Returning data to client')
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
    
  } catch (error) {
    console.error('=== FATAL ERROR ===')
    console.error('Error name:', error?.name)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    
    return new Response(JSON.stringify({ 
      error: '服务器内部错误',
      type: error?.name,
      message: error?.message,
      stack: error?.stack
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
