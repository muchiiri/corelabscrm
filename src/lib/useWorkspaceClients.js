import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { logActivity } from '@/lib/logActivity'

export function useWorkspaceClients(workspaceId) {
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!workspaceId) {
        setClients([])
        setLoading(false)
        return
      }

      setLoading(true)

      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, phone, company, website, industry, owner_id, relationship, notes')
        .eq('workspace_id', workspaceId)
        .order('name', { ascending: true })

      if (cancelled) {
        return
      }

      if (error) {
        console.error('Failed to load clients:', error)
        setClients([])
      } else {
        setClients(data)
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [workspaceId])

  async function createClient(values) {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        workspace_id: workspaceId,
        name: values.name.trim(),
        email: values.email.trim() || null,
        phone: values.phone.trim() || null,
        company: values.company.trim() || null,
        website: values.website.trim() || null,
        // Optional-chained (unlike the fields above) because the embedded
        // form calling this doesn't have these keys until feature 36d's
        // Step 3 replaces it with the modal - plain .trim() would throw
        // on undefined for a key that's simply absent.
        industry: values.industry?.trim() || null,
        owner_id: values.ownerId || null,
        relationship: values.relationship || 'Prospect',
        notes: values.notes?.trim() || null,
      })
      .select('id, name, email, phone, company, website, industry, owner_id, relationship, notes')
      .single()

    if (error) {
      throw error
    }

    setClients((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))

    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single()
    const actorName = actorProfile?.name || user.email
    logActivity(workspaceId, user.id, `${actorName} added client "${data.name}"`, 'client', data.id)

    return data
  }

  return { clients, loading, createClient }
}
