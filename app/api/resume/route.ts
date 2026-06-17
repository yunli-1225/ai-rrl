import { NextRequest, NextResponse } from 'next/server';
import { saveResume, listResumesPaginated, getResume, deleteResume, clearAllResumes } from '@/lib/db';
import { logger } from '@/lib/logger';

const MODULE = 'ResumeAPI';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resumeJson, jdText, template, userDataJson, title, scoreTotal, scoreSkill, scoreExperience, modelPreference, ragKeywords } = body;

    if (!resumeJson) {
      return NextResponse.json({ error: '缺少 resumeJson' }, { status: 400 });
    }

    const id = await saveResume({
      resumeJson,
      jdText: jdText || '',
      template: template || 'zh-classic',
      userDataJson: userDataJson || '{}',
      title: title || '未命名简历',
      scoreTotal: typeof scoreTotal === 'number' ? scoreTotal : 0,
      scoreSkill: typeof scoreSkill === 'number' ? scoreSkill : 0,
      scoreExperience: typeof scoreExperience === 'number' ? scoreExperience : 0,
      modelPreference: modelPreference || 'deepseek',
      ragKeywords: Array.isArray(ragKeywords) ? ragKeywords : [],
    });

    if (id === -1) {
      return NextResponse.json({ error: '保存失败，请重试' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    logger.error(MODULE, 'POST 异常', err);
    return NextResponse.json({ error: err.message || '保存失败' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');

    if (idParam) {
      const id = parseInt(idParam, 10);
      if (isNaN(id)) {
        return NextResponse.json({ error: '无效的 id' }, { status: 400 });
      }
      const record = await getResume(id);
      if (!record) {
        return NextResponse.json({ error: '记录不存在' }, { status: 404 });
      }
      return NextResponse.json({ ok: true, record });
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const result = await listResumesPaginated(
      Math.max(1, page),
      Math.max(1, Math.min(100, pageSize)),
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    logger.error(MODULE, 'GET 异常', err);
    return NextResponse.json({ error: err.message || '查询失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clear = searchParams.get('clear');
    const idParam = searchParams.get('id');

    if (clear === 'true') {
      const ok = await clearAllResumes();
      if (!ok) {
        return NextResponse.json({ error: '清空失败' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, action: 'cleared' });
    }

    if (!idParam) {
      return NextResponse.json({ error: '缺少 id 参数' }, { status: 400 });
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: '无效的 id' }, { status: 400 });
    }

    const ok = await deleteResume(id);
    if (!ok) {
      return NextResponse.json({ error: '未找到该记录' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    logger.error(MODULE, 'DELETE 异常', err);
    return NextResponse.json({ error: err.message || '删除失败' }, { status: 500 });
  }
}
