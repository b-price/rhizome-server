import type { Request, Response } from 'express';

export async function labelClusters(req: Request, res: Response) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'AI labeling not configured' });
    return;
  }

  const { clusters } = req.body;
  if (!Array.isArray(clusters) || clusters.length === 0) {
    res.status(400).json({ error: 'clusters array required' });
    return;
  }

  const clusterList = clusters
    .map(({ id, tags }: { id: string; tags: string[] }) => `"${id}": [${tags.join(', ')}]`)
    .join('\n');

  const prompt = `You are a music genre expert. Each entry below is a cluster of listeners grouped by their most common Last.fm tags. Give each cluster a concise name (1–3 words) that captures the musical subculture or sound scene — not just the genre name, but the vibe or scene if it fits.

Clusters (ID → top listener tags):
${clusterList}

Return only a JSON object mapping each cluster ID to its label. Example: {"id1": "Thrash Metal", "id2": "Ambient Drone"}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      res.status(502).json({ error: `OpenAI API error: ${response.status}` });
      return;
    }

    const data = await response.json();
    const labels = JSON.parse(data.choices[0].message.content);
    res.json({ labels });
  } catch {
    res.status(502).json({ error: 'Failed to generate cluster labels' });
  }
}
