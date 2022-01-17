import puppeteer, { EvaluateFn } from 'puppeteer';
import { getPageAtUrl } from './browser-utils';

describe('counter with side effect', () => {
    let browser: puppeteer.Browser;
    beforeAll(async () => {
        browser = await puppeteer.launch({
            //devtools: true,
            //slowMo: 100,
        });
    }, 30000);

    it('should show proper elements on counter', async () => {
        const getRichTextElements = () => Array.from(document.querySelectorAll('[data-testid="richTextElement"]')).map((el) => ({
            text: (el as HTMLElement).innerText,
            visibility: window.getComputedStyle(el).getPropertyValue('visibility'),
            })
        );

        const waitForCounterValue = (value: number) => {
            return Array.from(document.querySelectorAll('[data-testid="richTextElement"]')).map(el => (el as HTMLElement).innerText).map(s => s.match(/^\d+$/) ? parseInt(s, 10) : null).filter(i => i !== null)[0] === value;
        }

        const page = await getPageAtUrl(browser, 'https://yurym4.wixsite.com/react-velo-e2e/');
        const increment = await page.$('button[aria-label=\\+]');

        if (!increment) {
            throw new Error(`Unable to find increment button`);
        }
        
        await increment.click();

        // wait for counter value = 1
        await page.waitForFunction(waitForCounterValue, {}, 1);


        const richTextElements = await page.evaluate(getRichTextElements);

        expect(richTextElements).toEqual(expect.arrayContaining([
            {"text": "Counter Fun", "visibility": "visible"},
            {"text": "1", "visibility": "visible"},
            {"text": "Hello", "visibility": "visible"},
            {"text": "odd", "visibility": "visible"}
        ]));

        await increment.click();

        // wait for counter value = 2
        await page.waitForFunction(waitForCounterValue, {}, 2);

        const richTextElementsAfterClick = await page.evaluate(getRichTextElements);

        expect(richTextElementsAfterClick).toEqual(expect.arrayContaining([
            {"text": "Counter Fun", "visibility": "visible"},
            {"text": "2", "visibility": "visible"},
            {"text": "", "visibility": "hidden"},
            {"text": "even", "visibility": "visible"}
        ]));


    }, 60000);

    afterAll(async () => {
        await browser.close();
    });
});
