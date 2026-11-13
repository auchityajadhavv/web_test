import { test, expect } from '@playwright/test'
test('business preview updates, persists, resets and presents', async ({page})=>{
 await page.goto('/');await page.locator('#customize').scrollIntoViewIfNeeded()
 await page.getByLabel('Your business name',{exact:true}).fill('Studio & Co')
 await expect(page.locator('.stand-model__name')).toHaveText('Studio & Co')
 await page.getByRole('button',{name:'Forest',exact:true}).click()
 await page.getByRole('button',{name:'Editorial',exact:true}).click()
 await page.reload();await expect(page.getByLabel('Your business name',{exact:true})).toHaveValue('Studio & Co')
 await expect(page.getByRole('button',{name:'Forest',exact:true})).toHaveAttribute('aria-pressed','true')
 await expect(page.getByRole('button',{name:'Editorial',exact:true})).toHaveAttribute('aria-pressed','true')
 await page.getByRole('button',{name:'Presentation view'}).click();await expect(page.locator('.customizer')).toHaveClass(/is-presenting/)
 await page.keyboard.press('Escape');await expect(page.locator('.customizer')).not.toHaveClass(/is-presenting/)
 await page.getByRole('button',{name:'Reset',exact:true}).click();await expect(page.getByLabel('Your business name',{exact:true})).toHaveValue('YOUR BUSINESS')
})
test('wordmark docks reversibly and layouts fit narrow screens',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/')
 const logo=page.locator('.morph-nav__logo');const start=await logo.boundingBox()
 await page.evaluate(()=>window.scrollTo({top:500,behavior:'instant'}));await expect(page.locator('.morph-nav')).toHaveClass(/is-docked/)
 const end=await logo.boundingBox();expect(end!.width).toBeLessThan(start!.width/2)
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await expect(page.locator('.morph-nav')).not.toHaveClass(/is-docked/)
 for(const width of [360,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)}
})

test('wordmark transition never crosses the hero headline on presentation screens',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'})
 for(const viewport of [{width:834,height:1194},{width:1194,height:834},{width:390,height:844},{width:1440,height:900}]){
  await page.setViewportSize(viewport);await page.goto('/')
  const end=viewport.width<700?145:viewport.width<1100?185:225
  for(const top of [0,.2,.4,.6,.8,1].map(n=>Math.round(end*n))){
   await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),top)
   await page.evaluate(()=>new Promise(requestAnimationFrame))
   const logo=await page.locator('.morph-nav__logo').boundingBox()
   const title=await page.locator('.hero__copy h1').boundingBox()
   const overlap=Boolean(logo&&title&&logo.x<title.x+title.width&&logo.x+logo.width>title.x&&logo.y<title.y+title.height&&logo.y+logo.height>title.y)
   expect(overlap,`${viewport.width}x${viewport.height} at ${top}px`).toBe(false)
  }
 }
})
