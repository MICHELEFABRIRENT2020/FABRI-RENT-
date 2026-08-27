import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const extras = await prisma.extraService.findMany({
    where: { active: true },
    orderBy: { label: "asc" },
  });
  return NextResponse.json({ extras });
}
