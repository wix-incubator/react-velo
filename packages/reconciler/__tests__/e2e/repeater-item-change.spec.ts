import puppeteer from 'puppeteer';
import { getPageAtUrl } from './browser-utils';

describe('todo list repeater', () => {
    let browser: puppeteer.Browser;
    beforeAll(async () => {
        browser = await puppeteer.launch({
            //devtools: true,
            //slowMo: 100,
        });
    }, 30000);

    it('should create 3 task items', async () => {
        const getRichTextElements = () => Array.from(document.querySelectorAll('[data-testid="richTextElement"]')).map((el) => ({
            text: (el as HTMLElement).innerText,
            visibility: window.getComputedStyle(el).getPropertyValue('visibility'),
            })
        );

        const page = await getPageAtUrl(browser, 'https://yurym4.wixsite.com/react-velo-e2e/repeater-item-change');

        const richTextElementsBeforeClick = await page.evaluate(getRichTextElements);

        expect(richTextElementsBeforeClick).toEqual(expect.arrayContaining([
            {"text": "Off", "visibility": "visible"},
            {"text": "", "visibility": "hidden"},
            {"text": "Off", "visibility": "visible"},
            {"text": "", "visibility": "hidden"},
            {"text": "Off", "visibility": "visible"},
        ]));

        const toggle = await page.$(`[data-testid=buttonContent]`);
        
        if (!toggle) {
            throw new Error(`Unable to find toggle button`);
        }
        await toggle.click();
        await page.waitForFunction(() => Array.from(document.querySelectorAll('[data-testid="richTextElement"]')).map(el => (el as HTMLElement).innerText).filter(t => t === 'On').length === 3);

        const richTextElementsAfterClick = await page.evaluate(getRichTextElements);

        expect(richTextElementsAfterClick).toEqual(expect.arrayContaining([
            {"text": "On", "visibility": "visible"},
            {"text": "", "visibility": "hidden"},
            {"text": "On", "visibility": "visible"},
            {"text": "", "visibility": "hidden"},
            {"text": "On", "visibility": "visible"},
        ]));

    }, 60000);

    afterAll(async () => {
        await browser.close();
    });
})