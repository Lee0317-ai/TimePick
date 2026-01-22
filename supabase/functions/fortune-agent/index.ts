import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('=== Fortune Agent Started ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. 验证用户身份
    console.log('Step 1: Verifying user authentication...')
    
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header exists:', !!authHeader)
    
    if (!authHeader) {
      console.log('No authorization header found')
      return new Response(
        JSON.stringify({ error: '缺少认证信息' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    console.log('Supabase URL exists:', !!supabaseUrl)
    console.log('Supabase Key exists:', !!supabaseKey)
    
    const supabase = createClient(supabaseUrl!, supabaseKey!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    console.log('User verification result:', {
      hasUser: !!user,
      userId: user?.id,
      error: userError?.message
    })

    if (userError || !user) {
      console.log('User verification failed')
      return new Response(
        JSON.stringify({ error: '用户认证失败' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('User authenticated successfully:', user.id)

    // 2. 读取请求体
    console.log('Step 2: Reading request body...')
    const requestBody = await req.json()
    console.log('Request body:', JSON.stringify(requestBody))
    
    const { message } = requestBody
    
    if (!message) {
      console.log('No message in request')
      return new Response(
        JSON.stringify({ error: '缺少消息内容' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 3. 检查 API Key
    console.log('Step 3: Checking DashScope API key...')
    const apiKey = Deno.env.get('DASHSCOPE_API_KEY')
    console.log('API Key exists:', !!apiKey, 'Length:', apiKey?.length)
    
    if (!apiKey) {
      console.error('DASHSCOPE_API_KEY not found')
      return new Response(
        JSON.stringify({ error: 'AI服务配置错误' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 4. 调用阿里云百炼 API
    console.log('Step 4: Calling DashScope API...')
    const appId = 'b464cfbaf21a45038b16a320606f0946'
    const apiUrl = `https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`
    
    const payload = {
      input: { prompt: message },
      parameters: { incremental_output: false }
    }
    
    console.log('API URL:', apiUrl)
    console.log('Payload:', JSON.stringify(payload))
    
    const dashscopeResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    console.log('DashScope response status:', dashscopeResponse.status)

    const responseText = await dashscopeResponse.text()
    console.log('DashScope response text:', responseText)

    if (!dashscopeResponse.ok) {
      console.error('DashScope API error')
      return new Response(
        JSON.stringify({ 
          error: 'AI服务调用失败',
          status: dashscopeResponse.status,
          details: responseText
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const data = JSON.parse(responseText)
    console.log('DashScope parsed response:', JSON.stringify(data))
    
    console.log('=== Success! Returning data ===')
    return new Response(
      JSON.stringify(data),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
    
  } catch (error) {
    console.error('=== FATAL ERROR ===')
    console.error('Error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: '服务器内部错误',
        message: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
