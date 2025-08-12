import { NextResponse } from 'next/server';
import { getHealthStatus } from '@/lib/mcp-zedashboard';

export async function GET() {
  try {
    console.log('🏥 Health check requested...');
    
    const healthStatus = await getHealthStatus();
    
    console.log('🏥 Health check result:', healthStatus);
    
    return NextResponse.json({
      success: true,
      health: healthStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('🏥 Health check failed:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
