'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'

export default function TestPGMQ() {
  const [testing, setTesting] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  const testPGMQSend = async () => {
    setTesting(true)
    try {
      console.log('🧪 Testing pgmq_send...')
      
      // EXACTAMENTE como Special Hours
      const { error: queueError } = await supabase.rpc('pgmq_send', {
        queue_name: 'email_reschedule_required',
        msg: {
          appointment_id: 'test-id',
          type: 'reschedule_required',
          closed_date: '2026-01-16',
          reason: 'test'
        }
      })

      if (queueError) {
        console.error('❌ Error:', queueError)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: JSON.stringify(queueError)
        })
      } else {
        console.log('✅ Success!')
        toast({
          title: 'Success',
          description: 'pgmq_send worked!'
        })
      }
    } catch (error) {
      console.error('💥 Exception:', error)
      toast({
        variant: 'destructive',
        title: 'Exception',
        description: String(error)
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="p-4">
      <Button onClick={testPGMQSend} disabled={testing}>
        {testing ? 'Testing...' : 'Test PGMQ Send'}
      </Button>
    </div>
  )
}
