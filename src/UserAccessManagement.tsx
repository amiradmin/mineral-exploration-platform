import {useCallback,useEffect,useMemo,useState} from 'react'
import {ShieldCheck,Users,UserPlus,RefreshCw,UserX,UserCheck,KeyRound,LockKeyhole} from 'lucide-react'
import {useAuth} from './auth'
import {useI18n} from './i18n'
import './UserAccessManagement.css'

type Member={id:number;target_id:string;role:string;active:boolean}
type User={id:number;username:string;first_name:string;last_name:string;email:string;is_active:boolean;is_staff:boolean;is_superuser:boolean;memberships:Member[]}
type ListResponse={users:User[];targets:{id:string;name:string}[];roles:string[]}
const roleNames:Record<string,string>={expert:'Technical Expert',cp:'Competent Person',chair:'Committee Chair',board:'Board Member',auditor:'Auditor'}
export default function UserAccessManagement(){
 const {apiFetch,user:current}=useAuth()
 const {t}=useI18n()
 const [data,setData]=useState<ListResponse|null>(null)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [busy,setBusy]=useState(false)
 const [search,setSearch]=useState('')
 const [selected,setSelected]=useState<number|null>(null)
 const [username,setUsername]=useState('')
 const [password,setPassword]=useState('')
 const [email,setEmail]=useState('')
 const [targetId,setTargetId]=useState('')
 const [role,setRole]=useState('expert')
 const load=useCallback(async()=>{
  const response=await apiFetch('/api/admin-access/users/',{cache:'no-store'})
  const content=await response.json().catch(()=>null)
  if(!response.ok)throw Error(content?.detail||'Could not load access records.')
  setData(content)
 },[apiFetch])
 useEffect(()=>{void load().catch(e=>setError(String(e.message||e)))},[load])
 const action=async(url:string,method:'POST'|'PATCH'|'DELETE',payload?:object)=>{
  setBusy(true);setNotice('');setError('')
  try{
   const response=await apiFetch(url,{method,headers:{'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined})
   const result=await response.json().catch(()=>null)
   if(!response.ok)throw Error(result?.detail||'Request failed.')
   await load();setNotice(t('Changes saved and audited.'))
   return true
  }catch(e){setError(String(e instanceof Error?e.message:e));return false}
  finally{setBusy(false)}
 }
 const people=useMemo(()=>data?.users.filter(u=>(u.username+' '+u.email+' '+u.first_name+' '+u.last_name).toLowerCase().includes(search.toLowerCase()))??[],[data,search])
 const focused=data?.users.find(u=>u.id===selected)??null
 const create=async(e:React.FormEvent)=>{
  e.preventDefault()
  const done=await action('/api/admin-access/users/','POST',{username,email,password})
  if(done){setUsername('');setEmail('');setPassword('')}
 }
 const grant=async(e:React.FormEvent)=>{
  e.preventDefault()
  if(focused&&targetId)await action('/api/admin-access/users/'+focused.id+'/memberships/','POST',{target_id:targetId,role})
 }
 if(!current?.is_superuser)return <section className="ua-panel"><LockKeyhole/><h2>{t('Administrator access required')}</h2><p>{t('Only an active Django superuser can manage users and committee memberships.')}</p></section>
 return <section className="ua-wrap">
  <div className="ua-heading"><div><span className="ua-eyebrow"><ShieldCheck size={15}/>{t('ADMINISTRATION')}</span><h1>{t('User Access Management')}</h1><p>{t('Create accounts and assign target-specific expert committee permissions.')}</p></div><button type="button" disabled={busy} onClick={()=>void load().catch(e=>setError(String(e)))}><RefreshCw size={15}/>{t('Refresh')}</button></div>
  {error&&<p className="ua-error" role="alert">{error}</p>}
  {notice&&<p className="ua-success" role="status">{notice}</p>}
  <div className="ua-grid">
   <div className="ua-panel"><h2><UserPlus size={18}/>{t('Create user')}</h2><form className="ua-form" onSubmit={create}>
    <label>{t('Username')}<input value={username} autoComplete="off" required minLength={3} maxLength={150} onChange={e=>setUsername(e.target.value)}/></label>
    <label>{t('Email (optional)')}<input value={email} type="email" autoComplete="off" onChange={e=>setEmail(e.target.value)}/></label>
    <label>{t('Temporary password (minimum 8 characters)')}<input value={password} type="password" autoComplete="new-password" required minLength={8} onChange={e=>setPassword(e.target.value)}/></label>
    <button type="submit" disabled={busy}>{t('Create user')}</button>
   </form><p className="ua-note">{t('Accounts are created without administrator privileges. Assign committee permissions separately.')}</p></div>
   <div className="ua-panel ua-list"><h2><Users size={18}/>{t('Users')} <span>{data?.users.length??0}</span></h2><input aria-label={t('Search users')} placeholder={t('Search users')} value={search} onChange={e=>setSearch(e.target.value)}/><div className="ua-people">{people.map(u=><button key={u.id} type="button" onClick={()=>{setSelected(u.id);setTargetId(data?.targets[0]?.id??'')}} className={'ua-person '+(selected===u.id?'selected':'')}><span className="ua-avatar">{u.username.slice(0,2).toUpperCase()}</span><span><b>{u.username}</b><small>{u.email||'—'} · {u.is_superuser?t('Administrator'):u.is_staff?t('Staff'):t('User')}</small></span><span className={'ua-status '+(u.is_active?'active':'inactive')}>{t(u.is_active?'Active':'Inactive')}</span></button>)}{people.length===0&&<p>{t('No matching users')}</p>}</div></div>
   <div className="ua-panel ua-detail"><h2><KeyRound size={18}/>{t('Project role assignments')}</h2>{focused?<><div className="ua-selected"><div><strong>{focused.username}</strong><small>{focused.email||'—'}</small></div><button type="button" disabled={busy||(focused.id===current.id&&focused.is_active)} onClick={()=>void action('/api/admin-access/users/'+focused.id+'/','PATCH',{is_active:!focused.is_active})}>{focused.is_active?<><UserX size={15}/>{t('Deactivate')}</>:<><UserCheck size={15}/>{t('Reactivate')}</>}</button></div><div className="ua-memberships">{focused.memberships.filter(m=>m.active).map(m=><div key={m.id}><span>{data?.targets.find(t=>t.id===m.target_id)?.name??m.target_id} · {t(roleNames[m.role]??m.role)}</span><button type="button" disabled={busy} onClick={()=>void action('/api/admin-access/memberships/'+m.id+'/','DELETE')}>{t('Revoke')}</button></div>)}{!focused.memberships.some(m=>m.active)&&<p>{t('No active committee memberships')}</p>}</div><form className="ua-form ua-role-form" onSubmit={grant}><label>{t('Exploration target')}<select value={targetId} required onChange={e=>setTargetId(e.target.value)}>{data?.targets.map(x=><option value={x.id} key={x.id}>{x.id} · {x.name}</option>)}</select></label><label>{t('Committee role')}<select value={role} onChange={e=>setRole(e.target.value)}>{data?.roles.map(x=><option value={x} key={x}>{t(roleNames[x]??x)}</option>)}</select></label><button type="submit" disabled={busy||!targetId}>{t('Assign role')}</button></form></>:<p>{t('Select a user to manage project access.')}</p>}</div>
  </div>
  <p className="ua-footnote">{t('Only superusers can create, deactivate, grant or revoke access. Every change is recorded in the audit trail.')}</p>
 </section>
}
