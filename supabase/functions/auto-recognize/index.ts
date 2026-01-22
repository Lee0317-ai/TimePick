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
    console.log('Auto-recognize called')
    
    const { url } = await req.json()
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL 不能为空' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Recognizing URL:', url)

    // 获取 Coze API Key
    const apiKey = Deno.env.get('COZE_API_KEY')
    
    if (!apiKey) {
      console.error('COZE_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'API Key 未配置' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Calling Coze workflow...')

    // 调用 Coze 工作流
    const cozeResponse = await fetch(
      'https://api.coze.cn/v1/workflow/run',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow_id: '7598180679860289572',
          parameters: {
            url: url
          }
        })
      }
    )

    console.log('Coze API response status:', cozeResponse.status)

    if (!cozeResponse.ok) {
      const errorText = await cozeResponse.text()
      console.error('Coze API error response:', errorText)
      return new Response(
        JSON.stringify({ 
          error: '识别服务调用失败', 
          details: errorText 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = await cozeResponse.json()
    console.log('Coze API success')
    
    // 提取数据
    if (result.data) {
      const { title, content, img } = result.data
      
      return new Response(
        JSON.stringify({
          title: title || '',
          content: content || '',
          img: img || ''
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({ error: '识别失败，未返回有效数据' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
  } catch (error) {
    console.error('Function error:', error.message)
    console.error('Error stack:', error.stack)
    return new Response(
      JSON.stringify({ 
        error: '识别失败，请重试', 
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
