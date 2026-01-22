import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('Fortune agent invoked')

  try {
    // 验证用户身份
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    console.log('Checking user authentication...')
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      console.log('User not authenticated')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    console.log('User authenticated:', user.id)

    // 获取请求数据
    const { message } = await req.json()
    console.log('User message:', message)

    const apiKey = Deno.env.get('DASHSCOPE_API_KEY')
    if (!apiKey) {
      console.error('DASHSCOPE_API_KEY not found')
      return new Response(JSON.stringify({ error: 'API Key not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const appId = 'b464cfbaf21a45038b16a320606f0946'

    console.log('Calling DashScope API...')
    const response = await fetch(`https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`, {
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

    console.log('DashScope API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DashScope API error:', errorText)
      return new Response(JSON.stringify({ 
        error: 'AI service error',
        details: errorText 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const data = await response.json()
    console.log('DashScope API response:', JSON.stringify(data))
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Fortune agent error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
