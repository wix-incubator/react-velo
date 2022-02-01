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

        const page = await getPageAtUrl(browser, 'https://yurym4.wixsite.com/react-velo-e2e/repeater-item-count');

        const richTextElementsBeforeClick = await page.evaluate(getRichTextElements);

        expect(richTextElementsBeforeClick).toEqual(expect.arrayContaining([
            {"text": "", "visibility": "hidden"},
            {"text": "Odd", "visibility": "visible"},
            {"text": "Even", "visibility": "visible"},
            {"text": "", "visibility": "hidden"},
            {"text": "Odd", "visibility": "visible"},
        ]));
    }, 60000);

    afterAll(async () => {
        await browser.close();
    });
})