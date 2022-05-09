import puppeteer, { EvaluateFn } from 'puppeteer';
import { getPageAtUrl } from './browser-utils';

describe('style change sanity', () => {
    let browser: puppeteer.Browser;
    beforeAll(async () => {
        browser = await puppeteer.launch({
            //devtools: true,
            //slowMo: 100,
        });
    }, 30000);

    it('should set and remove backgroundColor style property', async () => {
        const page = await getPageAtUrl(browser, 'https://yurym4.wixsite.com/react-velo-e2e/remove-style');
        const coffeButton = await page.$('button[aria-label=Coffee]');
        const initialColor = await page.evaluate(() => window.getComputedStyle((document.querySelectorAll('[data-testid=container-bg]')[0])).backgroundColor);

        if (!coffeButton) {
            throw new Error(`Unable to find coffe button`);
        }
        
        await coffeButton.click();

        // wait for color to change from initial color
        await page.waitForFunction((color: string) => window.getComputedStyle((document.querySelectorAll('[data-testid=container-bg]')[0])).backgroundColor !== color, {}, initialColor);
        const newColor = await page.evaluate(() => window.getComputedStyle((document.querySelectorAll('[data-testid=container-bg]')[0])).backgroundColor);
        await coffeButton.click();
        await page.waitForFunction((color: string) => window.getComputedStyle((document.querySelectorAll('[data-testid=container-bg]')[0])).backgroundColor !== color, {}, newColor);

        const finalColor = await page.evaluate(() => window.getComputedStyle((document.querySelectorAll('[data-testid=container-bg]')[0])).backgroundColor);
        expect(finalColor).toBe(initialColor);
        expect(finalColor).not.toBe(newColor);
    }, 60000);

    afterAll(async () => {
        await browser.close();
    });
});
