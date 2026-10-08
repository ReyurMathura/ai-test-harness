export async function generateStructuredOutput({
  prompt,
  schema,
  model = 'qwen3:14b'
}) {

  const response = await fetch(
    'http://localhost:11434/api/generate',
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({
        model,

        prompt,

        stream: false,

        format: schema,

        options: {
          temperature: 0.2
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      `Ollama request failed: ${response.status} ${response.statusText}`
    );
  }

  const result = await response.json();

  return JSON.parse(result.response);
}