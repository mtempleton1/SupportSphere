import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { ticketId } = req.query
  const authHeader = req.headers.authorization

  if (!ticketId) {
    return res.status(400).json({ error: 'Missing ticketId parameter' })
  }

  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/fetch-ticket?ticketId=${ticketId}`,
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()
    return res.status(200).json(data)
  } catch (error) {
    console.error('Error in fetch-ticket API route:', error)
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    })
  }
} 