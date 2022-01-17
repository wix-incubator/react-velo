import puppeteer from 'puppeteer';
import fs from 'fs';
import { Protocol } from 'devtools-protocol';

async function waitForPerformanceEntry(page: puppeteer.Page, entry: string) {
    return page.waitForFunction(
      (entry: string) =>
        performance
          .getEntries()
          .map(mark => mark.name)
          .filter(name =>
            name.includes(entry),
          ).length > 0,
      { polling: 1 * 1000 },
    entry);
}

export async function getPageAtUrl(browser: puppeteer.Browser, url: string) {
    const page = await browser.newPage();
    const client = await page.target().createCDPSession();
    await client.send("Fetch.enable", {
        patterns: [{ requestStage: "Response" }]
      });
    
      client.on("Fetch.requestPaused", async (event: Protocol.Fetch.RequestPausedEvent) => {
        const { requestId } = event;
        //console.log(`Request "${requestId}" paused.`);

        if (event.request.url.endsWith('react-velo-bundle.js') && (event.responseErrorReason || event.responseStatusCode)) {
            // const responseCdp = await client.send("Fetch.getResponseBody", { requestId });
            // console.log(`Response body for ${requestId} is ${responseCdp.body.length} bytes`);
            console.log(`${requestId} - ${event.request.url} paused.`);
            const bundleData = await (await fs.promises.readFile('./dist/react-velo-bundle.js')).toString('base64');
            await client.send("Fetch.fulfillRequest", { requestId, responseCode: 200, body: bundleData, responseHeaders: [{ name: "Content-Type", value: "application/javascript" }] });
            console.log(`${bundleData.length} bytes bundle sent`);
            return;
        }

        await client.send("Fetch.continueRequest", { requestId });
    });

    let reactVeloRenderedResolve: any = null;
    const reactVeloRenderedPromise = new Promise((resolve) => reactVeloRenderedResolve = resolve);

    const pageConsoleHandler = (event: puppeteer.ConsoleMessage) => {
        if (reactVeloRenderedResolve && event.text() === 'react-velo rendered') {
            reactVeloRenderedResolve(true);
            reactVeloRenderedResolve = null;
            page.off('console', pageConsoleHandler);
        }
    };
    page.on('console', pageConsoleHandler);
    

    await page.goto(url, { waitUntil: 'networkidle0'});
    await waitForPerformanceEntry(page, 'page interactive (beat 33)');
    console.log('Got beat 33');
    await reactVeloRenderedPromise;
    console.log('Got react velo rendered');
    console.log(`We are ready to start the test.`);
    
    return page;
}