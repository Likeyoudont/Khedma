const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH || '/usr/bin/brave-browser',args:['--no-sandbox'],headless:true});
const errors=[], failures=[]; let layouts=0, checks=0;
const routes=['/','/search','/login','/register','/forgot-password','/guide','/missing','/developer/client','/developer/worker','/developer/client/account','/developer/worker/account','/developer/client/worker/1',...Array.from({length:7},(_,i)=>`/developer/${i%2?'worker':'client'}/job/${i+1}`)];
for(const language of (process.argv.includes('--interactions-only') ? [] : ['en','fr','ar'])) for(const theme of ['light','dark']) {
 const context=await browser.newContext();await context.addInitScript(({language,theme})=>{localStorage.setItem('khedma-language',language);localStorage.setItem('khedma-preferences',JSON.stringify({theme}));},{language,theme});
 const page=await context.newPage();await page.route(url=>url.hostname!=='127.0.0.1',r=>r.abort());page.on('pageerror',e=>errors.push(e.message));
 await page.route(url=>url.pathname.startsWith('/api/'),route=>{const url=route.request().url();if(url.endsWith('/api/auth/me'))return route.fulfill({status:401,json:{message:'Unauthenticated'}});if(url.endsWith('/api/workers'))return route.fulfill({json:[]});if(url.endsWith('/options'))return route.fulfill({json:{enabled:false,providers:[]}});return route.fulfill({status:503,json:{message:'Service unavailable'}})});
 await page.goto('http://127.0.0.1:5173',{waitUntil:'domcontentloaded'});
 for(const [width,height] of [[320,740],[390,844],[430,932],[1024,650],[1440,900]]){
 await page.setViewportSize({width,height});for(const path of routes){await page.evaluate(path=>{history.pushState(null,'',path);dispatchEvent(new PopStateEvent('popstate'));},path);await page.waitForTimeout(150);await page.waitForSelector('.page-route-content h1, .page-route-content h2');const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(overflow)failures.push({language,theme,width,path,reason:'horizontal overflow'});layouts++;}
 }
 await context.close();await fs.writeFile('/tmp/khedma-browser/layout-results.json',JSON.stringify({layouts,failures,runtimeErrors:[...new Set(errors)]},null,2));console.log('Layout progress',layouts);
}
const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));
await page.route(url=>url.pathname.startsWith('/api/'),route=>route.fulfill({status:route.request().url().endsWith('/workers')?200:401,json:route.request().url().endsWith('/workers')?[]:{message:'Unauthenticated'}}));
await page.goto('http://127.0.0.1:5173');await page.waitForSelector('.hero-story-animated');
assert(await page.locator('.hero-story-animated').count()); checks++;
await page.locator('.story-mode-button').click();await page.waitForTimeout(200);assert(await page.locator('.scroll-experience.is-static').count());checks++;
await page.reload();await page.waitForSelector('.scroll-experience.is-static');assert(await page.locator('.scroll-experience.is-static').count());checks++;
await page.locator('.story-mode-button').click();await page.waitForTimeout(200);assert(await page.locator('.scroll-experience.is-animated').count());checks++;
for(const role of ['client','worker']){await page.locator('.experience-heading [data-story-role="'+role+'"]').click();for(let index=0;index<5;index++){await page.locator('.experience-step-nav button').nth(index).click();await page.waitForTimeout(1900);assert.equal(await page.locator('.experience-step-nav [aria-current="step"]').textContent(),await page.locator('.experience-step-nav button').nth(index).textContent());checks++;}}
await page.locator('.experience-step-nav button').nth(4).press('Home');await page.waitForTimeout(1900);assert.equal(await page.locator('.experience-step-nav [aria-current="step"] span').textContent(),'01');checks++;
await page.goto('http://127.0.0.1:5173');await page.waitForSelector('.hero-scroll-stage');await page.screenshot({path:'/tmp/khedma-desktop-final.png'});
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);assert.equal(await page.locator('.hero-story-animated').count(),0);checks++;assert.equal(await page.locator('.service-card:visible').count(),6);checks++;
await page.locator('.services-expand').click();assert.equal(await page.locator('.service-card:visible').count(),18);checks++;await page.locator('.services-expand').click();assert.equal(await page.locator('.service-card:visible').count(),6);checks++;
await page.locator('.navigation-toggle').click();assert.equal(await page.locator('.navigation-toggle').getAttribute('aria-expanded'),'true');checks++;await page.keyboard.press('Escape');assert.equal(await page.locator('.navigation-toggle').getAttribute('aria-expanded'),'false');checks++;
await page.locator('[name=service]').fill('plumbr');await page.locator('[role=option]').first().click();assert.equal(await page.locator('[name=service]').inputValue(),'Plumbing');checks++;
await page.locator('[name=location]').fill('Rabat');await page.locator('.hero-search-box button[type=submit]').click();await page.waitForURL('**/search?**');assert(new URL(page.url()).searchParams.get('service')==='plumbing');checks++;
await page.goto('http://127.0.0.1:5173');await page.waitForSelector('.hero-scroll-stage');await page.screenshot({path:'/tmp/khedma-phone-final.png'});
await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(200);assert.equal(await page.locator('.hero-story-animated').count(),0);checks++;
const report={layouts,interactionChecks:checks,failures,runtimeErrors:[...new Set(errors)],limits:'Chromium viewport emulation; API intercepted for public layouts; demos use isolated sample data.'};await fs.writeFile('/tmp/khedma-browser/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();if(failures.length||errors.length)process.exitCode=1;
