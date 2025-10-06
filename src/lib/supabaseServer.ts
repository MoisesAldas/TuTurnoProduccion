import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Cliente para route handlers y server actions
export const createServerClient = () => createRouteHandlerClient({ cookies })
