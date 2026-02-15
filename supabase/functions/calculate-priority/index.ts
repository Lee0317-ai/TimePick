// Supabase Edge Function: 计算链接优先级
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
    const { url, title, user_id } = await req.json()

    console.log("[calculate-priority] Calculating for:", { url, title })

    if (!title || !user_id) {
      return new Response(JSON.stringify({
        error: "Missing required fields: title and user_id"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      })
    }

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

    console.log("[calculate-priority] Result:", { level, score, breakdown })

    return new Response(JSON.stringify({
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
    console.error("[calculate-priority] Error:", error)
    return new Response(JSON.stringify({
      error: error.message || "Failed to calculate priority"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    })
  }
})
