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

  console.log('=== Fortune agent started ===')

  try {
    // 获取请求数据
    const requestBody = await req.json()
    console.log('Request body:', JSON.stringify(requestBody))
    
    const { message } = requestBody
    
    if (!message) {
      console.log('No message provided')
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const apiKey = Deno.env.get('DASHSCOPE_API_KEY')
    console.log('API Key exists:', !!apiKey)
    
    if (!apiKey) {
      console.error('DASHSCOPE_API_KEY not found in environment')
      return new Response(JSON.stringify({ error: 'API服务配置错误，请联系管理员' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const appId = 'b464cfbaf21a45038b16a320606f0946'
    const apiUrl = `https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`
    
    console.log('Calling DashScope API:', apiUrl)
    
    const dashscopeResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          prompt: message
        },
        parameters: {
          incremental_output: false
        }
      })
    })

    console.log('DashScope response status:', dashscopeResponse.status)

    if (!dashscopeResponse.ok) {
      const errorText = await dashscopeResponse.text()
      console.error('DashScope API error response:', errorText)
      
      return new Response(JSON.stringify({ 
        error: 'AI服务响应错误',
        details: errorText,
        status: dashscopeResponse.status
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const data = await dashscopeResponse.json()
    console.log('DashScope success response:', JSON.stringify(data))
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
    
  } catch (error) {
    console.error('=== Fortune agent error ===')
    console.error('Error type:', error?.constructor?.name)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    
    return new Response(JSON.stringify({ 
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : String(error)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
