import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { HiOutlinePlus, HiOutlineMagnifyingGlass, HiOutlineArrowUpTray, HiOutlineXCircle, HiOutlineArrowPath } from 'react-icons/hi2'
import { useDebounce } from '../../hooks/useDebounce'
import PaginationBar from '../../components/ui/PaginationBar'
import { SkeletonTable } from '../../components/ui/Skeleton'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

interface Employee {
  id: number
  name: string
  department: string
  designation: string
  anonymous_code: string
  code_short: string
  is_active: boolean
}

const PAGE_SIZE = 50

export default function EmployeeListPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [toggleTarget, setToggleTarget] = useState<{ emp: Employee; activate: boolean } | null>(null)
  const debouncedSearch = useDebounce(search, 300)

  const fetchEmployees = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (includeInactive) params.set('include_inactive', 'true')
    api.get(`/employees/?${params}`).then(({ data }) => {
      setEmployees(data.results ?? data)
      setTotal(data.count ?? (data.results ?? data).length)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [page, debouncedSearch, includeInactive])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  const handleSearch = (val: string) => {
    setSearch(val)
    setPage(1)
  }

  const handleToggleActive = async () => {
    if (!toggleTarget) return
    const { emp, activate } = toggleTarget
    try {
      await api.patch(`/employees/${emp.id}/`, { is_active: activate })
      fetchEmployees()
      toast.success(`${emp.name} ${activate ? 'reactivated' : 'deactivated'}`)
    } catch {
      toast.error(`Failed to ${activate ? 'reactivate' : 'deactivate'}`)
    }
    setToggleTarget(null)
  }

  const filtered = employees

  if (loading && employees.length === 0) return <div className="space-y-4"><div className="h-8 bg-gray-200 rounded w-32 animate-pulse" /><SkeletonTable rows={8} cols={4} /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Employees</h1>
        <div className="flex gap-2">
          <Link to="/employees/upload" className="flex items-center gap-1.5 bg-mindwell text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-mindwell-dark transition"><HiOutlineArrowUpTray className="text-base" /> Upload CSV</Link>
          <Link to="/employees/lookup" className="flex items-center gap-1.5 border border-gray-300 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition"><HiOutlineMagnifyingGlass className="text-base" /> Lookup</Link>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <input type="text" placeholder="Search by name, department, or code..." value={search} onChange={(e) => handleSearch(e.target.value)} className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mindwell" />
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={includeInactive} onChange={(e) => { setIncludeInactive(e.target.checked); setPage(1) }} className="rounded border-gray-300 text-mindwell focus:ring-mindwell" />
          Show inactive
        </label>
      </div>

      {filtered.length > 0 ? (
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Department</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Designation</th>
                  <th className="text-left px-4 py-3 font-medium">Code</th>
                  <th className="text-center px-4 py-3 font-medium w-20">Status</th>
                  <th className="text-center px-4 py-3 font-medium w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium">{emp.name}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.department || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{emp.designation || '—'}</td>
                    <td className="px-4 py-3"><span className="code-badge text-xs">{emp.code_short}</span></td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${emp.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {emp.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {emp.is_active ? (
                        <button onClick={() => setToggleTarget({ emp, activate: false })} className="text-gray-400 hover:text-red-500 transition" title="Deactivate employee" aria-label={`Deactivate ${emp.name}`}>
                          <HiOutlineXCircle className="text-lg" />
                        </button>
                      ) : (
                        <button onClick={() => setToggleTarget({ emp, activate: true })} className="text-gray-400 hover:text-green-500 transition" title="Reactivate employee" aria-label={`Reactivate ${emp.name}`}>
                          <HiOutlineArrowPath className="text-lg" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar count={total} page={page} pageSize={PAGE_SIZE} onPage={setPage} />
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <HiOutlinePlus className="text-5xl mx-auto mb-3" />
          <p className="mb-1">No employees found.</p>
          <Link to="/employees/upload" className="text-mindwell font-medium hover:underline text-sm">Upload your first CSV</Link>
        </div>
      )}
      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.activate ? 'Reactivate Employee' : 'Deactivate Employee'}
        message={toggleTarget?.activate ? `Re-enable "${toggleTarget.emp.name}" for future screenings?` : `Remove "${toggleTarget?.emp.name}" from active screenings? They can be re-activated later.`}
        confirmLabel={toggleTarget?.activate ? 'Reactivate' : 'Deactivate'}
        danger={!toggleTarget?.activate}
        onConfirm={handleToggleActive}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  )
}
