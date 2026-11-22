import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * SYS-01: Health check endpoint
 * Tidak membocorkan informasi rahasia atau database connection strings!
 */
export async function GET() {
  try {
    // Ping database secara aman
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "healthy",
        app: "WarungOS",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        database: "connected",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        app: "WarungOS",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        database: "disconnected",
      },
      { status: 503 }
    );
  }
}
