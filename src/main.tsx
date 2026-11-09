import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import LoginPage from './LoginPage'
import {AuthProvider,useAuth} from './auth'
import {LanguageProvider} from './i18n'
import './styles.css'
function AuthGate(){
 const {user,loading}=useAuth()
 if(loading)return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',color:'#b6edda'}}>Data Mine · Loading authentication…</div>
 return user?<App/>:<LoginPage/>
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><LanguageProvider><AuthProvider><AuthGate/></AuthProvider></LanguageProvider></React.StrictMode>)