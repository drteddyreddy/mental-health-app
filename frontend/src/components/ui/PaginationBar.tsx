import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi2'

interface Props {
  count: number
  page: number
  pageSize: number
  onPage: (p: number) => void
}

export default function PaginationBar({ count, page, pageSize, onPage }: Props) {
  const totalPages = Math.ceil(count / pageSize)
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <HiOutlineChevronLeft className="text-sm" /> Prev
      </button>
      <span className="text-sm text-gray-500">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Next <HiOutlineChevronRight className="text-sm" />
      </button>
    </div>
  )
}
