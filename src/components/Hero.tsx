import { useEffect, useRef } from 'react'
import { openDemo } from '../lib/openDemo'
import './Hero.css'
import ArrowIcon from './ArrowIcon'
export default function Hero() {
  const section=useRef<HTMLElement>(null)
  useEffect(()=>{const el=section.current;if(!el)return;const update=()=>{el.style.setProperty('--light-play',document.hidden?'paused':'running')};const observer=new IntersectionObserver(([entry])=>el.style.setProperty('--light-play',entry.isIntersecting&&!document.hidden?'running':'paused'));observer.observe(el);document.addEventListener('visibilitychange',update);return()=>{observer.disconnect();document.removeEventListener('visibilitychange',update)}},[])
  return <section ref={section} className="hero" id="top"><div className="hero__light" aria-hidden="true" />
    <div className="container hero__inner"><div className="hero__copy">
      <h1>Experiences<br/>that matter.</h1>
      <p>Customer feedback and Google reviews.<br/>One simple tap or scan.</p>
      <div className="hero__actions"><button className="btn liquid-button" onClick={() => openDemo()}>Book a demo <ArrowIcon /></button><a className="btn btn-ghost" href="#flow">See how it works</a></div>
    </div><div className="hero__product"><img src="/assets/revora-selected.webp" alt="REVORA feedback stand with a translucent edge, custom business name, NFC and QR code" width="1254" height="1254" /></div></div>
    <a href="#customize" className="hero__scroll" aria-label="Customize your stand">⌄</a>
  </section>
}
