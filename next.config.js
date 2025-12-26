/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_YWRhcHRpbmctcGlnbGV0LTE1LmNsZXJrLmFjY291bnRzLmRldiQ',
  },
}

module.exports = nextConfig
