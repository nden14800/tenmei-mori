/**
 * UptimeWorker - Modern Status Page Monitoring
 * Copyright (c) 2025 Slym B.
 * Licensed under the Apache License, Version 2.0
 */

import { Routes, Route } from 'react-router-dom'
import StatusPage from './pages/StatusPage'
import NotFound from './pages/NotFound'

function App() {
  return (
    <Routes>
      <Route path="/" element={<StatusPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
