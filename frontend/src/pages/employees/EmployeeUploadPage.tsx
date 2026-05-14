import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { HiOutlineArrowUpTray, HiOutlineCheckCircle } from 'react-icons/hi2'

interface CsvRow {
  name: string
  department: string
  designation: string
}

export default function EmployeeUploadPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<CsvRow[]>([])
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter(Boolean)
      const parsed: CsvRow[] = []
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
        if (cols[0]) parsed.push({ name: cols[0], department: cols[1] || '', designation: cols[2] || '' })
      }
      setRows(parsed)
    }
    reader.readAsText(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] }, maxFiles: 1 })

  const handleUpload = async () => {
    if (rows.length === 0) return
    setUploading(true)
    const csvContent = ['name,department,designation', ...rows.map((r) => `"${r.name}","${r.department}","${r.designation}"`)].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const formData = new FormData()
    formData.append('file', blob, 'employees.csv')

    try {
      const { data } = await api.post('/employees/upload/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(data)
      if (data.imported > 0) {
        toast.success(`${data.imported} employees imported!`)
      }
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (result) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4">
        <HiOutlineCheckCircle className="text-5xl text-green-500 mx-auto" />
        <h2 className="text-xl font-bold">Import Complete</h2>
        <p className="text-gray-600">{result.imported} employees imported successfully.</p>
        {result.errors.length > 0 && (
          <div className="bg-amber-50 rounded-lg p-3 text-sm text-left">
            <p className="font-medium text-amber-800 mb-1">Errors:</p>
            {result.errors.map((e, i) => <p key={i} className="text-amber-700">{e}</p>)}
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setRows([]); setResult(null) }} className="border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Upload More</button>
          <button onClick={() => navigate('/employees')} className="bg-mindwell text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-mindwell-dark transition">View Employees</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Upload Employees</h1>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
        <p className="text-sm text-gray-500">CSV must have columns: <code className="bg-gray-100 px-1 rounded">name</code>, <code className="bg-gray-100 px-1 rounded">department</code>, <code className="bg-gray-100 px-1 rounded">designation</code></p>

        <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${isDragActive ? 'border-mindwell bg-teal-50' : 'border-gray-300 hover:border-gray-400'}`}>
          <input {...getInputProps()} />
          <HiOutlineArrowUpTray className="text-3xl text-gray-400 mx-auto mb-2" />
          {isDragActive ? <p className="text-mindwell font-medium">Drop CSV here</p> : <p className="text-gray-500">Drag & drop a CSV file, or click to select</p>}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Preview ({rows.length} rows)</h2>
            <button onClick={handleUpload} disabled={uploading} className="bg-mindwell text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-mindwell-dark transition disabled:opacity-50">
              {uploading ? 'Importing...' : `Import ${rows.length} Employees`}
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Name</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Department</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 hidden sm:table-cell">Designation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 text-gray-600">{r.department}</td>
                    <td className="px-3 py-2 text-gray-600 hidden sm:table-cell">{r.designation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rows.length === 0 && (
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-sm text-gray-500">
          <p className="font-medium text-gray-700 mb-1">Sample CSV format:</p>
          <pre className="bg-white p-3 rounded-lg border text-xs">{'name,department,designation\nAlice Johnson,Engineering,Senior Developer\nBob Smith,Marketing,Manager'}</pre>
        </div>
      )}
    </div>
  )
}
