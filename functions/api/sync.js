export async function onRequestPost(context) {
  // Read token from environment variables set in Cloudflare Pages Dashboard
  const githubToken = context.env.GITHUB_TOKEN;
  
  if (!githubToken) {
    return new Response(JSON.stringify({ 
      error: "GITHUB_TOKEN não configurado nas variáveis de ambiente da Cloudflare." 
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  const repoOwner = "mfxmanager-spec";
  const repoName = "nossa-biblia-livre";
  const workflowId = "sync.yml";

  try {
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/${workflowId}/dispatches`, {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Nossa-Biblia-Livre-Pages-Function"
      },
      body: JSON.stringify({
        ref: "main"
      })
    });

    if (response.status === 204) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Sincronização iniciada com sucesso no GitHub!" 
      }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } else {
      const errorText = await response.text();
      return new Response(JSON.stringify({ 
        error: `Erro do GitHub (Status ${response.status}): ${errorText}` 
      }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ 
      error: `Erro interno ao disparar sincronização: ${err.message}` 
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}

// Add OPTIONS support for CORS preflight if needed
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    }
  });
}
