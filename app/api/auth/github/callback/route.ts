import { NextRequest, NextResponse } from 'next/server'
import { saveApiKeys } from '@/lib/vault'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const userId = searchParams.get('state')

  if (!code || !userId) {
    return NextResponse.redirect(new URL('/onboarding?error=missing_params', process.env.NEXT_PUBLIC_APP_URL))
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      return NextResponse.redirect(new URL('/onboarding?error=github_auth_failed', process.env.NEXT_PUBLIC_APP_URL))
    }

    await saveApiKeys(userId, { github: tokenData.access_token })

    return NextResponse.redirect(new URL('/onboarding?github=connected', process.env.NEXT_PUBLIC_APP_URL))
  } catch (error) {
    console.error('GitHub OAuth error:', error)
    return NextResponse.redirect(new URL('/onboarding?error=github_error', process.env.NEXT_PUBLIC_APP_URL))
  }
}