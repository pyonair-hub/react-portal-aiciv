import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// __ENABLE_SW__ is a build-time constant (vite `define`). It defaults to true
// for the live/default, /qa and /qa4 builds. The /qa5 build sets it to false so
// that staging NEVER installs a service worker (a leftover SW on Jord's phone
// was serving the old cached app shell BEFORE the network, defeating even
// content-hashed asset URLs). /qa5 also self-cleans existing SWs in index.html.
declare const __ENABLE_SW__: boolean
const _enableSW = (typeof __ENABLE_SW__ === 'undefined') ? true : __ENABLE_SW__
if (_enableSW && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
