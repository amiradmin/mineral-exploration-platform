import React,{useState} from 'react'
import {LockKeyhole,Mountain,Eye,EyeOff,ArrowRight,ShieldCheck} from 'lucide-react'
import {useAuth} from './auth'
import {useI18n} from './i18n'
import './LoginPage.css'

export default function LoginPage(){
 const {login}=useAuth()
 const {t,language,setLanguage}=useI18n()
 const [username,setUsername]=useState('')
 const [password,setPassword]=useState('')
 const [visible,setVisible]=useState(false)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();if(busy)return
  setBusy(true);setError('')
  try{await login(username,password)}
  catch(e){setError(e instanceof Error?e.message:t('Unable to sign in.'))}
  finally{setBusy(false);setPassword('')}
 }
 return <main className="dm-login-page">
  <div className="dm-login-language" aria-label={t('Language')}>
   <button type="button" className={language==='en'?'active':''} onClick={()=>setLanguage('en')}>EN</button>
   <button type="button" className={language==='fa'?'active':''} onClick={()=>setLanguage('fa')}>فا</button>
  </div>
  <div className="dm-login-panel">
   <div className="dm-login-brand"><span><Mountain size={29}/></span><div><strong>Data Mine</strong><small>{t('Mineral Exploration Platform')}</small></div></div>
   <div className="dm-login-shield"><ShieldCheck size={17}/>{t('Secure access to geological intelligence')}</div>
   <h1>{t('Sign in')}</h1>
   <p>{t('Enter your Data Mine credentials to continue to the decision dashboard.')}</p>
   <form onSubmit={submit}>
    <label htmlFor="dm-login-username">{t('Username')}</label>
    <input id="dm-login-username" value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" required autoFocus disabled={busy}/>
    <label htmlFor="dm-login-password">{t('Password')}</label>
    <div className="dm-login-password">
     <input id="dm-login-password" type={visible?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required disabled={busy}/>
     <button type="button" onClick={()=>setVisible(v=>!v)} aria-label={t(visible?'Hide password':'Show password')}>{visible?<EyeOff size={16}/>:<Eye size={16}/>}</button>
    </div>
    {error&&<div className="dm-login-error" role="alert">{error}</div>}
    <button className="dm-login-submit" type="submit" disabled={busy||!username||!password}><LockKeyhole size={17}/>{busy?t('Signing in…'):t('Sign in')}<ArrowRight size={16}/></button>
   </form>
   <div className="dm-login-foot"><ShieldCheck size={15}/>{t('Access is based on your assigned project roles. Contact an administrator for an account.')}</div>
  </div>
 </main>
}
