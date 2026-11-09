import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from 'react'

export type AuthUser={id:number;username:string;display_name:string;is_staff:boolean;memberships:Array<{target_id:string;role:string}>}
type AuthState={user:AuthUser|null;loading:boolean;login:(username:string,password:string)=>Promise<void>;logout:()=>Promise<void>;apiFetch:(url:string,init?:RequestInit)=>Promise<Response>}
const AuthContext=createContext<AuthState|null>(null)
type Credentials={access:string;user:AuthUser}
const cookies=()=>document.cookie.split('; ').find(v=>v.startsWith('csrftoken='))?.slice('csrftoken='.length)
const csrfHeader=():Record<string,string>=>cookies()?{'X-CSRFToken':decodeURIComponent(cookies()!)}:{}
const requestJson=async(response:Response):Promise<Credentials>=>{
 const body=await response.json().catch(()=>null)
 if(!response.ok)throw new Error(typeof body?.detail==='string'?body.detail:'Authentication failed ('+response.status+').')
 if(typeof body?.access!=='string'||!body?.user)throw new Error('Unexpected login response.')
 return body
}
export function AuthProvider({children}:{children:React.ReactNode}){
 const [user,setUser]=useState<AuthUser|null>(null)
 const [loading,setLoading]=useState(true)
 const access=useRef<string|null>(null)
 const inFlight=useRef<Promise<boolean>|null>(null)
 const mounted=useRef(true)
 const bootstrap=useCallback(async()=>{await fetch('/api/auth/csrf/',{credentials:'same-origin',cache:'no-store'})},[])
 const renew=useCallback(async():Promise<boolean>=>{
  if(inFlight.current)return inFlight.current
  const promise=(async()=>{
   try{
    await bootstrap()
    const creds=await requestJson(await fetch('/api/auth/refresh/',{
      method:'POST',credentials:'same-origin',headers:csrfHeader(),cache:'no-store',
    }))
    access.current=creds.access
    if(mounted.current)setUser(creds.user)
    return true
   }catch{
    access.current=null
    if(mounted.current)setUser(null)
    return false
   }
  })()
  inFlight.current=promise
  try{return await promise}finally{inFlight.current=null}
 },[bootstrap])
 useEffect(()=>{
  mounted.current=true
  void renew().finally(()=>{if(mounted.current)setLoading(false)})
  return()=>{mounted.current=false}
 },[renew])
 const login=useCallback(async(username:string,password:string)=>{
  await bootstrap()
  const creds=await requestJson(await fetch('/api/auth/login/',{
   method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{'Content-Type':'application/json',...csrfHeader()},
   body:JSON.stringify({username,password}),
  }))
  access.current=creds.access
  setUser(creds.user)
 },[bootstrap])
 const logout=useCallback(async()=>{
  access.current=null;setUser(null)
  try{await bootstrap();await fetch('/api/auth/logout/',{method:'POST',credentials:'same-origin',headers:csrfHeader()})}catch{}
 },[bootstrap])
 const apiFetch=useCallback(async(url:string,init:RequestInit={})=>{
  if(!access.current){
   const ok=await renew()
   if(!ok)return new Response(JSON.stringify({detail:'Please sign in.'}),{status:401,headers:{'Content-Type':'application/json'}})
  }
  const perform=()=>fetch(url,{...init,credentials:'same-origin',headers:{...Object.fromEntries(new Headers(init.headers)),Authorization:'Bearer '+access.current}})
  let response=await perform()
  if(response.status===401&&await renew())response=await perform()
  return response
 },[renew])
 return <AuthContext.Provider value={{user,loading,login,logout,apiFetch}}>{children}</AuthContext.Provider>
}
export function useAuth():AuthState{
 const result=useContext(AuthContext)
 if(!result)throw new Error('AuthProvider missing')
 return result
}
