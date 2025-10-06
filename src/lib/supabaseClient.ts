import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Cliente para componentes del lado del cliente
export const createClient = () => createClientComponentClient()
