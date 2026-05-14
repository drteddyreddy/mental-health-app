import { Link } from 'react-router-dom'
import { HiOutlineHeart, HiOutlineShieldCheck, HiOutlineChartBarSquare, HiOutlineClipboardDocumentList } from 'react-icons/hi2'

const features = [
  { icon: HiOutlineShieldCheck, title: 'Fully Anonymous', desc: 'Employees identified only by unique codes. No personal data linked to screening results.' },
  { icon: HiOutlineChartBarSquare, title: 'Aggregate Insights', desc: 'HR sees department-level trends and severity distributions — never individual results.' },
  { icon: HiOutlineClipboardDocumentList, title: 'Clinical Tools', desc: 'Uses validated PHQ-9 and GAD-7 questionnaires with auto-scoring.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-mindwell text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <HiOutlineHeart className="text-2xl" />
            MindWell
          </div>
          <div className="flex gap-3">
            <Link to="/login" className="text-sm font-medium hover:text-white/80 transition">Log In</Link>
            <Link to="/register" className="bg-white text-mindwell px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-100 transition">Get Started</Link>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-br from-mindwell-dark to-mindwell text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">MindWell</h1>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Anonymous mental health screening for your workplace.<br />Confidential. Actionable. Supportive.
          </p>
          <Link to="/register" className="inline-block bg-white text-mindwell-dark font-bold px-8 py-3 rounded-xl text-lg hover:bg-gray-100 transition shadow-lg">
            Get Started
          </Link>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          {features.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
              <f.icon className="text-4xl text-mindwell mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 py-20 px-4 flex-1">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
          <div className="space-y-4">
            {['Register your company and set up your account', 'Upload employees via CSV — anonymous codes are auto-generated', 'Create a campaign and select questionnaires (PHQ-9, GAD-7)', 'Share anonymous links — employees take screening privately', 'View aggregate results on the dashboard and download PDF reports'].map((step, i) => (
              <div key={i} className="flex items-start gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <span className="bg-mindwell text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0">{i + 1}</span>
                <p className="text-gray-700 pt-1">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 py-4 text-center text-sm text-gray-500">
        MindWell &copy; {new Date().getFullYear()}
      </footer>
    </div>
  )
}
