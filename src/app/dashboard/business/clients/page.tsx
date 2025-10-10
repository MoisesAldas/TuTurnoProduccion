'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { Plus, Edit, Search as SearchIcon, Download, Trash2, CheckCircle2, XCircle } from 'lucide-react'

interface BusinessClient {
  id: string
  first_name: string
  last_name: string | null
  phone: string | null
  email: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  total_count?: number
}

export default function ClientsPage() {
  const supabase = createClient()
  const { authState } = useAuth()

  const [businessId, setBusinessId] = useState<string>('')

  const [rows, setRows] = useState<BusinessClient[]>([])
  const totalCount = rows?.[0]?.total_count ?? 0

  const [search, setSearch] = useState('')
  const [onlyActive, setOnlyActive] = useState<'true' | 'false'>('true')
  const [sortBy, setSortBy] = useState('first_name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const [limit, setLimit] = useState(25)
  const [page, setPage] = useState(1)
  const totalPages = useMemo(() => Math.max(1, Math.ceil((totalCount || 0) / limit)), [totalCount, limit])

  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false)
  const [editing, setEditing] = useState<BusinessClient | null>(null)

  // Form
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (authState.user) loadBusiness()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.user?.id])

  useEffect(() => {
    if (businessId) fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, search, onlyActive, sortBy, sortDir, limit, page])

  const loadBusiness = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', authState.user!.id)
        .single()
      if (error) throw error
      setBusinessId(data!.id)
    } catch (e) {
      console.error('Error loading business id', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchList = async () => {
    try {
      setFetching(true)
      const offset = (page - 1) * limit
      const { data, error } = await supabase.rpc('list_business_clients', {
        p_business_id: businessId,
        p_search: search.trim() || null,
        p_only_active: onlyActive === 'true',
        p_limit: limit,
        p_offset: offset,
        p_sort_by: sortBy,
        p_sort_dir: sortDir,
      })
      if (error) throw error
      setRows((data as any) || [])
    } catch (e) {
      console.error('Error listing clients', e)
    } finally {
      setFetching(false)
    }
  }

  const resetForm = () => {
    setEditing(null)
    setFirstName('')
    setLastName('')
    setPhone('')
    setEmail('')
    setNotes('')
    setIsActive(true)
  }

  const openCreate = () => {
    resetForm()
    setOpenDialog(true)
  }

  const openEdit = async (row: BusinessClient) => {
    try {
      const { data, error } = await supabase.rpc('get_business_client', {
        p_business_id: businessId,
        p_client_id: row.id,
      })
      if (error) throw error
      const r = data as BusinessClient
      setEditing(r)
      setFirstName(r.first_name || '')
      setLastName(r.last_name || '')
      setPhone(r.phone || '')
      setEmail(r.email || '')
      setNotes(r.notes || '')
      setIsActive(!!r.is_active)
      setOpenDialog(true)
    } catch (e) {
      console.error('Error fetching client', e)
    }
  }

  const saveClient = async () => {
    try {
      const { data, error } = await supabase.rpc('upsert_business_client', {
        p_business_id: businessId,
        p_first_name: firstName.trim(),
        p_last_name: lastName.trim() || null,
        p_phone: phone.trim() || null,
        p_email: email.trim() || null,
        p_notes: notes.trim() || null,
        p_is_active: isActive,
        p_client_id: editing?.id ?? null,
      })
      if (error) throw error
      setOpenDialog(false)
      resetForm()
      fetchList()
    } catch (e) {
      console.error('Error saving client', e)
    }
  }

  const deactivateClient = async (row: BusinessClient) => {
    try {
      const { error } = await supabase.rpc('deactivate_business_client', {
        p_business_id: businessId,
        p_client_id: row.id,
      })
      if (error) throw error
      fetchList()
    } catch (e) {
      console.error('Error deactivating client', e)
    }
  }

  const exportCSV = () => {
    const header = ['Nombre','Apellido','Teléfono','Email','Activo']
    const lines = rows.map(r => [
      r.first_name,
      r.last_name || '',
      r.phone || '',
      r.email || '',
      r.is_active ? 'Sí' : 'No'
    ])
    const csv = [header, ...lines].map(cols => cols.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clientes.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="p-6">Cargando...</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600 mt-1">Gestiona tu base de datos de clientes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" /> Exportar CSV
          </Button>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 text-white" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" /> Nuevo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
                <div>
                  <label className="text-sm text-gray-600">Nombre</label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Apellido</label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Teléfono</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Email</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm text-gray-600">Notas</label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Estado</label>
                  <Select value={isActive ? 'true' : 'false'} onValueChange={(v: any) => setIsActive(v === 'true')}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Activo</SelectItem>
                      <SelectItem value="false">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancelar</Button>
                <Button onClick={saveClient} className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 text-white">Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="text-sm text-gray-600">Nombre/Teléfono/Email</label>
            <div className="flex gap-2">
              <Input placeholder="Ej: Juan, 099..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
              <Button variant="outline" onClick={() => { setSearch(''); setPage(1) }}>
                <SearchIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600">Estado</label>
            <Select value={onlyActive} onValueChange={(v: any) => { setOnlyActive(v); setPage(1) }}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Activos</SelectItem>
                <SelectItem value="false">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Orden</label>
            <Select value={sortBy} onValueChange={(v: any) => { setSortBy(v); setPage(1) }}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="first_name">Nombre</SelectItem>
                <SelectItem value="last_name">Apellido</SelectItem>
                <SelectItem value="phone">Teléfono</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="created_at">Creación</SelectItem>
                <SelectItem value="updated_at">Actualización</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Dirección</label>
            <Select value={sortDir} onValueChange={(v: any) => { setSortDir(v); setPage(1) }}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascendente</SelectItem>
                <SelectItem value="desc">Descendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Teléfono</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {fetching ? (
                <tr><td className="px-4 py-6" colSpan={5}>Cargando...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-4 py-6" colSpan={5}>Sin resultados</td></tr>
              ) : (
                rows.map(r => (
                  <tr key={r.id} className="border-b">
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">{r.first_name} {r.last_name}</div>
                      {r.notes && <div className="text-xs text-gray-500 truncate max-w-[360px]" title={r.notes}>{r.notes}</div>}
                    </td>
                    <td className="px-4 py-2">{r.phone}</td>
                    <td className="px-4 py-2">{r.email}</td>
                    <td className="px-4 py-2">
                      {r.is_active ? (
                        <Badge className="bg-green-100 text-green-700">Activo</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-gray-700">Inactivo</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        {r.is_active ? (
                          <Button variant="outline" size="sm" onClick={() => deactivateClient(r)}>
                            <XCircle className="w-4 h-4 text-red-600" />
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">Desactivado</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Mostrando {(rows.length > 0) ? ((page-1)*limit+1) : 0} - {Math.min(page*limit, totalCount)} de {totalCount}</div>
        <div className="flex items-center gap-2">
          <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1) }}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))}>Anterior</Button>
          <div className="text-sm">{page} / {totalPages}</div>
          <Button variant="outline" disabled={page>=totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))}>Siguiente</Button>
        </div>
      </div>
    </div>
  )
}
