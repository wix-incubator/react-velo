import puppeteer from 'puppeteer';
import { getPageAtUrl } from './browser-utils';

describe('sanity for repeater with the same item id', () => {
    let browser: puppeteer.Browser;
    beforeAll(async () => {
        browser = await puppeteer.launch({
            // devtools: true,
            // slowMo: 100,
        });
    }, 30000);

    it('should add and remove repeater item with same item id properly', async () => {
        const waitForTextCount = (value: number) => {
            return Array.from(document.querySelectorAll('[data-testid="richTextElement"]')).map(el => (el as HTMLElement).innerText).length === value;
        }

        const page = await getPageAtUrl(browser, 'https://yurym4.wixsite.com/react-velo-e2e/repeater-same-id-item');
        const noteButton = await page.$('button[aria-label=Note]');

        if (!noteButton) {
            throw new Error(`Unable to find star button`);
        }
        
        await noteButton.click();
        await page.waitForFunction(waitForTextCount, {}, 2);
        await noteButton.click();
        await page.waitForFunction(waitForTextCount, {}, 0);
        await noteButton.click();
        await page.waitForFunction(waitForTextCount, {}, 2);

        const texts = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="richTextElement"]')).map(el => (el as HTMLElement).innerText));
        expect(texts).toEqual([
            "hello",
            "world!"
        ]);
    }, 60000);

    afterAll(async () => {
        await browser.close();
    });
});
