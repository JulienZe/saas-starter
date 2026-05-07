import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { stories } from '@/lib/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const team = await db.query.teamMembers.findFirst({
      where: (tm: any, { eq }: any) => eq(tm.userId, user.id),
    });

    if (!team) {
      return NextResponse.json({ stories: [], stats: { total: 0, totalWords: 0, avgWords: 0, favCount: 0 } });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const favoritesOnly = searchParams.get('favorites') === 'true';

    let conditions = [eq(stories.teamId, team.teamId)];

    if (favoritesOnly) {
      conditions.push(eq(stories.isFavorite, 1));
    }

    if (search) {
      conditions.push(
        sql`(${stories.productName} ILIKE ${`%${search}%`} OR ${stories.productDesc} ILIKE ${`%${search}%`})`
      );
    }

    const storyList = await db
      .select()
      .from(stories)
      .where(and(...conditions))
      .orderBy(desc(stories.createdAt));

    const statsResult = await db
      .select({
        total: sql<number>`count(*)::int`,
        totalWords: sql<number>`coalesce(sum(${stories.wordCount}), 0)::int`,
        favCount: sql<number>`coalesce(sum(${stories.isFavorite}), 0)::int`,
      })
      .from(stories)
      .where(eq(stories.teamId, team.teamId));

    const stats = statsResult[0] || { total: 0, totalWords: 0, favCount: 0 };
    const avgWords = stats.total > 0 ? Math.round(stats.totalWords / stats.total) : 0;

    return NextResponse.json({
      stories: storyList.map(s => ({
        ...s,
        resultData: s.resultData ? JSON.parse(s.resultData) : null,
        productFeatures: s.productFeatures ? JSON.parse(s.productFeatures) : [],
      })),
      stats: { ...stats, avgWords },
    });
  } catch (error: any) {
    console.error('获取故事列表失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { id, isFavorite, rating, status, title, content } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少故事ID' }, { status: 400 });
    }

    const team = await db.query.teamMembers.findFirst({
      where: (tm: any, { eq }: any) => eq(tm.userId, user.id),
    });

    if (!team) {
      return NextResponse.json({ error: '未找到团队' }, { status: 404 });
    }

    const existing = await db
      .select()
      .from(stories)
      .where(and(eq(stories.id, id), eq(stories.teamId, team.teamId)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    }

    const updates: Record<string, any> = {};
    if (isFavorite !== undefined) updates.isFavorite = isFavorite ? 1 : 0;
    if (rating !== undefined) updates.rating = rating;
    if (status !== undefined) updates.status = status;
    if (title !== undefined) updates.title = title;
    if (content !== undefined) {
      updates.content = content;
      updates.wordCount = content.length;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '无更新内容' }, { status: 400 });
    }

    await db
      .update(stories)
      .set(updates)
      .where(eq(stories.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('更新故事失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少故事ID' }, { status: 400 });
    }

    const team = await db.query.teamMembers.findFirst({
      where: (tm: any, { eq }: any) => eq(tm.userId, user.id),
    });

    if (!team) {
      return NextResponse.json({ error: '未找到团队' }, { status: 404 });
    }

    await db
      .delete(stories)
      .where(and(eq(stories.id, parseInt(id)), eq(stories.teamId, team.teamId)));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('删除故事失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
