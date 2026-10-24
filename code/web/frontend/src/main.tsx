// ==============================================================================
// Copyright (c) 2026 herobib
// All rights reserved.
//
// Original repository: https://github.com/herobib/Project1-SUAI
// For licensing information, see the LICENSE file in the repository root.
// ==============================================================================

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
