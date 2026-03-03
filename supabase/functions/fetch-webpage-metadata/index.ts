// Supabase Edge Function: 获取网页元数据
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
      }
    })
  }

  try {
    const { url } = await req.json()

    console.log("[fetch-webpage-metadata] Fetching URL:", url)

    if (!url || !url.startsWith("http")) {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      })
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ShiGuangBot/1.0; +https://shiguang.app)"
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`)
    }

    const html = await response.text()
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1] || ""
    const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] || ""

    console.log("[fetch-webpage-metadata] Extracted:", { title, description })

    let score = 50
    let level = "medium"
    const domain = new URL(url).hostname.toLowerCase()

    if (domain.includes("github.com") || domain.includes("stackoverflow.com") || domain.includes("gitlab.com")) {
      score = 80
      level = "high"
    } else if (domain.includes("youtube.com") || domain.includes("bilibili.com")) {
      score = 50
      level = "medium"
    } else {
      score = 20
      level = "low"
    }

    const breakdown = {
      base_score: score,
      keyword_score: 0,
      learning_score: 0,
      tag_score: 0
    }

    return new Response(JSON.stringify({
      title: title || url,
      description: description,
      level: level,
      score: score,
      breakdown: breakdown,
      suggested_tags: []
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    })

  } catch (error) {
    console.error("[fetch-webpage-metadata] Error:", error)
    return new Response(JSON.stringify({
      error: error.message || "Failed to fetch webpage"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    })
  }
}
