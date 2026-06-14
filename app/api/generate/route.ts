import { NextRequest, NextResponse } from 'next/server';
import { GenerateRequestSchema, ResumeResultSchema } from '@/lib/schema';
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/prompts';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body = await request.json();
    const parsed = GenerateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: '请求参数格式错误', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userData, jdText, template } = parsed.data;

    // 2. Get API key
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: '服务端未配置 DEEPSEEK_API_KEY' },
        { status: 500 }
      );
    }

    // 3. Build prompts
    const templateNames: Record<string, string> = {
      'zh-classic': '央国企经典版',
      'zh-simple': '央国企简约版',
      'en-modern': '互联网现代版（双栏）',
      'en-creative': '互联网创意版（双栏）',
    };

    const userPrompt = buildUserPrompt({
      templateName: templateNames[template] || template,
      jdText,
      userDataJson: JSON.stringify(userData),
    });

    // 4. Call DeepSeek API
    const deepseekResponse = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error('DeepSeek API error:', deepseekResponse.status, errorText);
      return NextResponse.json(
        { error: `DeepSeek API 调用失败: ${deepseekResponse.status}` },
        { status: 502 }
      );
    }

    const deepseekData = await deepseekResponse.json();
    const content = deepseekData.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'DeepSeek 返回为空' },
        { status: 502 }
      );
    }

    // 5. Parse LLM response
    let parsedResult;
    try {
      const jsonResult = JSON.parse(content);
      parsedResult = ResumeResultSchema.safeParse(jsonResult);
    } catch {
      return NextResponse.json(
        { error: 'DeepSeek 返回格式异常，无法解析为 JSON' },
        { status: 502 }
      );
    }

    if (!parsedResult.success) {
      console.error('Schema validation error:', parsedResult.error.flatten());
      return NextResponse.json(
        {
          error: 'DeepSeek 返回内容不符合预期格式',
          details: parsedResult.error.flatten(),
        },
        { status: 502 }
      );
    }

    // 6. Return success
    return NextResponse.json({ data: parsedResult.data });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
