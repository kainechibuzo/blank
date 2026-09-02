import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Compare from './pages/Compare.jsx'
import ToolPage from './pages/ToolPage.jsx'
import Discover from './pages/Discover.jsx'
import Methodology from './pages/Methodology.jsx'
import Charter from './pages/Charter.jsx'
import Directory from './pages/Directory.jsx'
import SubmitListing from './pages/SubmitListing.jsx'
import Account from './pages/Account.jsx'
import Admin from './pages/Admin.jsx'
import Sponsors from './pages/Sponsors.jsx'
import NotFound from './pages/NotFound.jsx'
import DevStates from './pages/DevStates.jsx'
import Result from './pages/Result.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/what/:slug" element={<Result />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/tools/:id" element={<ToolPage />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/methodology" element={<Methodology />} />
        <Route path="/charter" element={<Charter />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/directory/submit" element={<SubmitListing />} />
        <Route path="/account" element={<Account />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/sponsors" element={<Sponsors />} />
        {/* Component sheet. Never linked from the navigation. */}
        <Route path="/dev/states" element={<DevStates />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
