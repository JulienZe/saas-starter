import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { brands } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, and, desc, sql } from 'drizzle-orm';

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
      return NextResponse.json({ brands: [] });
    }

    const brandList = await db
      .select()
      .from(brands)
      .where(eq(brands.teamId, team.teamId))
      .orderBy(desc(brands.createdAt));

    return NextResponse.json({
      brands: brandList.map(b => ({
        ...b,
        values: b.values ? JSON.parse(b.values) : [],
        targetAudience: b.targetAudience ? JSON.parse(b.targetAudience) : null,
      })),
    });
  } catch (error: any) {
    console.error('获取品牌列表失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const team = await db.query.teamMembers.findFirst({
      where: (tm: any, { eq }: any) => eq(tm.userId, user.id),
    });

    if (!team) {
      return NextResponse.json({ error: '未找到团队' }, { status: 404 });
    }

    const body = await request.json();
    const { name, industry, description, values, tone, targetAudience } = body;

    if (!name) {
      return NextResponse.json({ error: '品牌名称为必填项' }, { status: 400 });
    }

    const [newBrand] = await db.insert(brands).values({
      teamId: team.teamId,
      name,
      industry: industry || null,
      description: description || null,
      values: values ? JSON.stringify(values) : null,
      tone: tone || null,
      targetAudience: targetAudience ? JSON.stringify(targetAudience) : null,
    }).returning();

    return NextResponse.json({
      brand: {
        ...newBrand,
        values: newBrand.values ? JSON.parse(newBrand.values) : [],
        targetAudience: newBrand.targetAudience ? JSON.parse(newBrand.targetAudience) : null,
      },
    });
  } catch (error: any) {
    console.error('创建品牌失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const team = await db.query.teamMembers.findFirst({
      where: (tm: any, { eq }: any) => eq(tm.userId, user.id),
    });

    if (!team) {
      return NextResponse.json({ error: '未找到团队' }, { status: 404 });
    }

    const body = await request.json();
    const { id, name, industry, description, values, tone, targetAudience } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少品牌ID' }, { status: 400 });
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (industry !== undefined) updates.industry = industry;
    if (description !== undefined) updates.description = description;
    if (values !== undefined) updates.values = JSON.stringify(values);
    if (tone !== undefined) updates.tone = tone;
    if (targetAudience !== undefined) updates.targetAudience = JSON.stringify(targetAudience);

    const [updated] = await db
      .update(brands)
      .set(updates)
      .where(and(eq(brands.id, id), eq(brands.teamId, team.teamId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: '品牌不存在或无权限' }, { status: 404 });
    }

    return NextResponse.json({
      brand: {
        ...updated,
        values: updated.values ? JSON.parse(updated.values) : [],
        targetAudience: updated.targetAudience ? JSON.parse(updated.targetAudience) : null,
      },
    });
  } catch (error: any) {
    console.error('更新品牌失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const team = await db.query.teamMembers.findFirst({
      where: (tm: any, { eq }: any) => eq(tm.userId, user.id),
    });

    if (!team) {
      return NextResponse.json({ error: '未找到团队' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0');

    if (!id) {
      return NextResponse.json({ error: '缺少品牌ID' }, { status: 400 });
    }

    const [deleted] = await db
      .delete(brands)
      .where(and(eq(brands.id, id), eq(brands.teamId, team.teamId)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: '品牌不存在或无权限' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('删除品牌失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
