import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
// 폰트 → 토큰(CSS 변수) → 전역 스타일 순서로 import해야 올바르게 적용됨
import './styles/fonts.css'
import './styles/tokens.css'
import './styles/global.css'
import App from './App'

document.getElementById('root')
const rootElemet = document.getElementById('root');

if (!rootElemet) throw new Error('Root element를 찾을 수 없습니다!');

createRoot(rootElemet).render(
    <StrictMode>
        <App/>
    </StrictMode>,
)

