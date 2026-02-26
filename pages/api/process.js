export default async function handler(req, res) {
  const { text } = JSON.parse(req.body);

  // 这里调用豆包 (火山方舟 ARK) 的 API
  // 提示词工程：在一个 Request 中要求它返回术语和笔记的 JSON 格式
  const prompt = `你是一位同传助手。针对以下句子： "${text}"
  1. 提取专业术语并解释。
  2. 将其转化为口译缩写笔记（多用符号）。
  以 JSON 格式返回：{"terms": [{"word": "...", "mean": "..."}], "notes": "..."}`;

  const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.ARK_API_KEY}`
    },
    body: JSON.stringify({
      model: "ep-xxxxxx-xxxx", // 你的豆包 Pro 2.0 模型接入点 ID
      messages: [{ role: "user", content: prompt }]
    })
  });

  const result = await response.json();
  // 解析结果并返回给前端
  res.status(200).json(JSON.parse(result.choices[0].message.content));
}
