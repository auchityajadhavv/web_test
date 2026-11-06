import { useEffect, useRef, useState, type CSSProperties } from 'react'
import './StandCustomizer.css'
const presets = [{name:'Graphite',color:'#202124'},{name:'Forest',color:'#183c32'},{name:'Burgundy',color:'#522634'},{name:'Midnight',color:'#17263d'},{name:'Porcelain',color:'#e6e2d9'}]
const defaults = {name:'YOUR BUSINESS',color:'#202124',base:'#777b80'}
function initial() { try { const v = JSON.parse(localStorage.getItem('revora-stand-preview') || 'null'); return v && typeof v.name === 'string' && /^#[a-f\d]{6}$/i.test(v.color) && /^#[a-f\d]{6}$/i.test(v.base) ? {...v,name:v.name.slice(0,32)} : defaults } catch { return defaults } }
function ink(color:string) { const rgb=color.slice(1).match(/../g)!.map(v=>{const s=parseInt(v,16)/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.179?'#141516':'#ffffff' }
export default function StandCustomizer(){
 const section = useRef<HTMLElement>(null)
 const [design,setDesign]=useState(initial),[present,setPresent]=useState(false)
 useEffect(()=>{try{localStorage.setItem('revora-stand-preview',JSON.stringify(design))}catch{/* Preview remains usable when storage is unavailable. */}},[design])
 useEffect(()=>{
   if(!present || !section.current)return
   const el=section.current, previous=document.activeElement as HTMLElement|null, overflow=document.body.style.overflow
   const hidden=[...document.querySelectorAll<HTMLElement>('header.morph-nav, footer, main > section')].filter(n=>n!==el)
   const old=hidden.map(n=>n.inert);hidden.forEach(n=>n.inert=true);document.body.style.overflow='hidden'
   const focusable=()=>[...el.querySelectorAll<HTMLElement>('button,input,a[href]')]
   focusable().find(n=>n.textContent==='Exit presentation')?.focus()
   const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setPresent(false);if(e.key==='Tab'){const items=focusable(),first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}
   document.addEventListener('keydown',key)
   return()=>{document.removeEventListener('keydown',key);hidden.forEach((n,i)=>n.inert=old[i]);document.body.style.overflow=overflow;previous?.focus()}
 },[present])
 return <section ref={section} role={present ? "dialog" : undefined} aria-modal={present || undefined} className={`section customizer ${present?'is-presenting':''}`} id="customize" aria-labelledby="customizer-title">
 <div className="container"><div className="customizer__heading"><div><p className="customizer__intro">Made for your business</p><h2 className="h2" id="customizer-title">Your name.<br/>Your finishing touch.</h2></div><p className="lead">For salons, shops, cafés, clinics, hotels—and every business that values its customers.</p></div>
 <div className="customizer__layout"><div className="customizer__stage" aria-label={`Stand preview for ${design.name || 'YOUR BUSINESS'}`}>
 <div className="stand-model" style={{'--face':design.color,'--ink':ink(design.color),'--metal':design.base} as CSSProperties}>
 <div className="stand-model__glass"><div className="stand-model__face"><strong className="stand-model__name">{design.name.trim() || 'YOUR BUSINESS'}</strong><small>Powered by REVORA</small>
 <div className="stand-model__nfc"><svg width="52" height="54" viewBox="0 0 52 54" fill="none" aria-hidden="true"><path d="M8 22q5 5 0 10M19 15q12 12 0 24M30 8q19 19 0 38M41 2q25 25 0 50" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg><b>NFC</b></div><p>Tap to share feedback</p><img className="stand-model__qr" src="/assets/revora-website-qr.png" alt="QR code linking to the REVORA website" width="656" height="656"/><p>Or scan here</p><small className="stand-model__note">Your feedback helps us improve.</small></div></div><div className="stand-model__base">REVORA</div></div>
 <p className="customizer__caption">A live design preview. Final materials and colours may vary.</p></div>
 <div className="customizer__controls"><label htmlFor="business-name">Your business name</label><input id="business-name" value={design.name} maxLength={32} placeholder="Enter your business name" onChange={e=>setDesign({...design,name:e.target.value})}/><span className="customizer__hint">Up to 32 characters. Your changes stay on this device.</span>
 <fieldset><legend>Card colour</legend><div className="customizer__swatches">{presets.map(p=><button key={p.name} type="button" aria-label={p.name} aria-pressed={design.color===p.color} title={p.name} style={{background:p.color}} onClick={()=>setDesign({...design,color:p.color})}/>)}</div><label className="customizer__color">Choose any colour<input type="color" aria-label="Custom card colour" value={design.color} onChange={e=>setDesign({...design,color:e.target.value})}/><span>{design.color.toUpperCase()}</span></label></fieldset>
 <label className="customizer__color">Base finish<input type="color" aria-label="Base colour" value={design.base} onChange={e=>setDesign({...design,base:e.target.value})}/><span>{design.base.toUpperCase()}</span></label>
 <div className="customizer__buttons"><button className="btn liquid-button" onClick={()=>setPresent(!present)} aria-pressed={present}>{present?'Exit presentation':'Presentation view'}</button><button className="btn btn-ghost" onClick={()=>setDesign(defaults)}>Reset</button></div><p className="customizer__hint">Use presentation view during an in-person demo. The sample QR opens the REVORA website.</p>
 </div></div></div></section>
}
