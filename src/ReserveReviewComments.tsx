import {useCallback,useEffect,useState} from 'react'
import {MessageSquare,RefreshCw} from 'lucide-react'
import {useAuth} from './auth'
import './ReserveReviewComments.css'

type ReviewComment={id:number;author:string;author_id:number;body:string;created_at:string}
type ReviewData={roles:string[];can_comment:boolean;comments:ReviewComment[]}

export default function ReserveReviewComments({targetId,draft,onDraftChange,onAccessChange,refreshKey}:{targetId:string;draft:string;onDraftChange:(v:string)=>void;onAccessChange:(v:boolean)=>void;refreshKey:number}){
 const {apiFetch}=useAuth()
 const [data,setData]=useState<ReviewData|null>(null)
 const [error,setError]=useState('')
 const base='/api/targets/'+encodeURIComponent(targetId)+'/reserve-reviews/comments/'
 const load=useCallback(async(signal?:AbortSignal)=>{
  const response=await apiFetch(base,{signal,cache:'no-store'})
  const result=await response.json()
  if(!response.ok)throw new Error(result.detail||'Unable to load review comments.')
  if(!signal?.aborted){setData(result);setError('');onAccessChange(result.can_comment)}
 },[apiFetch,base,onAccessChange])
 useEffect(()=>{
  const controller=new AbortController()
  setData(null);setError('');onAccessChange(false)
  void load(controller.signal).catch(e=>{if(!controller.signal.aborted){setError(e instanceof Error?e.message:String(e));onAccessChange(false)}})
  return()=>controller.abort()
 },[load,refreshKey,onAccessChange])
 return <section className="rs-comments" aria-label="Gate 2 technical review comments">
  <div className="rs-comments-head"><h2><MessageSquare size={19}/> Technical Review & Comments</h2><button type="button" onClick={()=>void load().catch(e=>setError(String(e)))}><RefreshCw size={15}/> Refresh</button></div>
  <p className="rs-comments-sub">Gate 2 discussion for target {targetId}. Comments are recorded with reviewer identity and submitted using Prepare Gate 3 Review. Comments do not constitute formal approvals.</p>
  {error&&<p className="rs-comments-error" role="alert">{error}</p>}
  {data?<><div className="rs-comments-feed">{data.comments.length===0?<p>No review comments yet.</p>:data.comments.map(item=><article key={item.id} className="rs-comment"><div><strong>{item.author}</strong><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time></div><p>{item.body}</p></article>)}</div>
   {data.can_comment?<div className="rs-comment-compose"><label htmlFor="rs-new-comment">Gate 3 review comment (required)</label><textarea id="rs-new-comment" minLength={3} maxLength={4000} required rows={3} value={draft} onChange={e=>onDraftChange(e.target.value)} placeholder="Document your findings, concerns, or recommendations…"/><p className="rs-comments-sub">Complete both sign-offs, then click Prepare Gate 3 Review to save this comment.</p></div>:<p className="rs-comments-sub">You have read-only access to this review.</p>}
  </>:<p className="rs-comments-sub">Comments require active committee membership for this target.</p>}
 </section>
}
