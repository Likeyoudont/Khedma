const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const b=await chromium.launch({executablePath:process.env.BROWSER_PATH || '/usr/bin/brave-browser',args:['--no-sandbox'],headless:true});const p=await b.newPage({viewport:{width:390,height:844},hasTouch:true});let checks=0;const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.route(url=>url.pathname.startsWith('/api/'),r=>r.fulfill({status:401,json:{message:'Unauthenticated'}}));
await p.goto('http://127.0.0.1:5173/developer/worker/practice');await p.waitForSelector('#worker-proposal');
await p.locator('#worker-proposal [name=price]').fill('200');await p.locator('[name=visit_day]').fill('31');await p.locator('[name=visit_month]').fill('2');await p.locator('[name=visit_time]').fill('14:00');await p.locator('[name=fees_accepted]').check();await p.locator('#worker-proposal button[type=submit], #worker-proposal button:not([type])').first().click();await p.waitForSelector('.schedule-error');checks++;
await p.locator('[name=visit_day]').fill('31');await p.locator('[name=visit_month]').fill('12');
await p.locator('#worker-proposal button[type=submit], #worker-proposal button:not([type])').first().click();await p.waitForSelector('.practice-panel button:not([disabled])');checks++;
await p.locator('.practice-panel button').click();await p.waitForSelector('.fee-payment-actions button');checks++;

assert.equal(await p.locator('.fee-payment-actions button').count(),1);assert.match(await p.locator('.fee-payment-actions button').textContent(),/Cash Plus/);checks++;await p.locator('.fee-payment-actions button').first().click();await p.waitForTimeout(150);

const simulate=p.locator('.booking-fees > button');if(await simulate.count())await simulate.click();else await p.getByRole('button',{name:/client.*fee|client.*pay|simulate.*client/i}).click();await p.waitForTimeout(200);checks++;

await p.getByRole('button',{name:/^Start/i}).click();await p.waitForTimeout(200);checks++;
await p.locator('.practice-panel button').click();await p.waitForTimeout(200);assert(await p.locator('.job-status-summary').textContent());assert.equal(await p.locator('#worker-proposal').count(),0);checks++;
await p.screenshot({path:'/tmp/khedma-practice-completed.png',fullPage:true});
await p.goto('http://127.0.0.1:5173/developer/client/job/1');await p.waitForSelector('.job-card');await p.getByRole('button',{name:/^Cancel/i}).click();await p.getByRole('button',{name:'Go back',exact:true}).click();assert.equal(await p.locator('[name=reason]').count(),0);checks++;
await p.getByRole('button',{name:/^Cancel/i}).click();await p.locator('[name=reason]').selectOption('changed_plans');await p.getByRole('button',{name:'Yes, cancel the booking',exact:true}).click();await p.waitForTimeout(200);checks++;
const report={interactionChecks:checks,runtimeErrors:errors,flows:['impossible date rejection','future offer','client acceptance','both fake fee payments','start','completion/review','dismiss cancellation','confirmed cancellation']};await fs.writeFile('/tmp/khedma-browser/flows-results.json',JSON.stringify(report,null,2));console.log(report);await b.close();
